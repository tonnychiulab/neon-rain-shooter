const model = new GameModel();

let game;
let scene;
let itemViews = new Map();
let decorViews = [];
let gridGraphics;
let feedbackTimeout;
let fireTimeouts = { '2': null, 'D': null };

const DOM = {
    score: document.getElementById('scoreVal'),
    combo: document.getElementById('comboVal'),
    lives: document.getElementById('livesVal'),
    pauseBtn: document.getElementById('pauseBtn'),
    overlay: document.getElementById('overlay'),
    cardTitle: document.getElementById('cardTitle'),
    cardDesc: document.getElementById('cardDesc'),
    cardSubtitle: document.getElementById('cardSubtitle'),
    cardNote: document.getElementById('cardNote'),
    startBtn: document.getElementById('startBtn'),
    feedback: document.getElementById('feedback'),
    btnShoot2: document.getElementById('btnShoot2'),
    btnShootD: document.getElementById('btnShootD'),
};

function initPhaser() {
    if (typeof Phaser === 'undefined') {
        DOM.cardTitle.innerHTML = '遊戲載入失敗，<br>請重新整理頁面。';
        DOM.startBtn.disabled = true;
        return;
    }

    const config = {
        type: Phaser.AUTO,
        parent: 'game-container',
        transparent: true,
        scale: {
            mode: Phaser.Scale.RESIZE,
            width: '100%',
            height: '100%'
        },
        scene: { create: create, update: update, resize: resize },
        audio: { noAudio: true }
    };

    game = new Phaser.Game(config);
}

function create() {
    scene = this;
    gridGraphics = scene.add.graphics();
    drawGrid(scene.scale.width, scene.scale.height);
    
    for (let i = 0; i < 9; i++) {
        let char = i % 2 === 0 ? '2' : 'D';
        let size = 30 + Math.random() * 45;
        let color = model.colors[i % 6];
        let x = Math.random() * scene.scale.width;
        let y = -80 + Math.random() * scene.scale.height;
        
        let text = scene.add.text(x, y, char, {
            fontFamily: 'monospace',
            fontSize: `${size}px`,
            color: color
        }).setOrigin(0.5).setAlpha(0.16);
        
        decorViews.push({ text: text, speed: 8000 + Math.random() * 5000 });
        
        scene.tweens.add({
            targets: text,
            y: scene.scale.height + 80,
            duration: 8000 + Math.random() * 5000,
            repeat: -1,
            onRepeat: () => { text.y = -80; }
        });
    }

    scene.input.on('pointerdown', (pointer) => {
        if (model.mode !== 'playing') return;
        let res = model.shootAt(pointer.x, pointer.y);
        if (res && res.hit) {
            handleHit(res.item);
            if (res.item.char !== 'X') triggerBtnFeedback(res.item.char);
            if (res.penalty) {
                showFeedback(res.msg);
                scene.cameras.main.shake(200, 0.01);
            } else if (res.buff) {
                showFeedback(res.buff.msg);
                if (res.buff.type === 'clear') {
                    // Sync views for clear
                    let activeIds = new Set(model.items.map(i => i.id));
                    for (let [id, view] of itemViews.entries()) {
                        if (!activeIds.has(id)) {
                            view.destroy();
                            itemViews.delete(id);
                        }
                    }
                }
            }
        }
    });

    updateHUD();
}

function drawGrid(w, h) {
    if (!gridGraphics) return;
    gridGraphics.clear();
    gridGraphics.lineStyle(1, 0x65759a, 0.07);
    for (let x = 0; x <= w; x += 48) { gridGraphics.moveTo(x, 0); gridGraphics.lineTo(x, h); }
    for (let y = 0; y <= h; y += 48) { gridGraphics.moveTo(0, y); gridGraphics.lineTo(w, y); }
}

function resize(gameSize) {
    if (scene) drawGrid(gameSize.width, gameSize.height);
}

function update(time, delta) {
    let dt = Math.min(delta / 1000, 0.05);
    
    let missed = model.update(dt, scene.scale.width, scene.scale.height);
    
    missed.forEach(item => {
        let view = itemViews.get(item.id);
        if (view) { view.destroy(); itemViews.delete(item.id); }
        showFeedback(`漏接！剩下 ${model.lives} 次機會`);
    });
    
    model.items.forEach(item => {
        let view = itemViews.get(item.id);
        if (!view) {
            view = scene.add.text(Math.min(item.x, scene.scale.width - 25), item.y, item.char, {
                fontFamily: 'Arial Black, monospace',
                fontSize: `${item.size}px`,
                color: item.color,
                stroke: '#0c1024',
                strokeThickness: 3,
                fontStyle: 'bold'
            }).setOrigin(0.5);
            view.setShadow(0, 0, item.color, 15, false, true);
            itemViews.set(item.id, view);
        }
        view.x = Math.min(item.x, scene.scale.width - 25);
        view.y = item.y;
        view.rotation = item.angle + Math.sin(time / 1500 + item.id) * 0.1;
    });

    if (model.mode === 'over' && DOM.overlay.classList.contains('hidden')) {
        showGameOver();
    }
    
    updateHUD();
}

function handleHit(item) {
    let view = itemViews.get(item.id);
    if (view) { view.destroy(); itemViews.delete(item.id); }
    
    let targetX = Math.min(item.x, scene.scale.width - 25);
    let targetY = item.y;
    
    let beam = scene.add.line(0, 0, scene.scale.width / 2, scene.scale.height - 36, targetX, targetY, Phaser.Display.Color.HexStringToColor(item.color).color, 0.7);
    beam.setOrigin(0);
    beam.setLineWidth(2);
    
    scene.tweens.add({
        targets: beam,
        alpha: 0,
        duration: 180,
        onComplete: () => beam.destroy()
    });
    
    for (let i = 0; i < 10; i++) {
        let U = Math.random();
        let U2 = Math.random();
        let particle = scene.add.circle(targetX, targetY, 2 + Math.random() * 3, Phaser.Display.Color.HexStringToColor(item.color).color);
        let destX = targetX + (U - 0.5) * 130;
        let destY = targetY + (U2 - 0.5) * 130;
        
        scene.tweens.add({
            targets: particle,
            x: destX,
            y: destY,
            alpha: 0,
            scale: 0,
            duration: 400 + Math.random() * 200,
            onComplete: () => particle.destroy()
        });
    }
}

function updateHUD() {
    DOM.score.innerText = model.score.toString().padStart(5, '0');
    DOM.combo.innerText = `×${model.combo}`;
    let livesStr = '';
    for (let i = 0; i < 5; i++) livesStr += i < model.lives ? '● ' : '○ ';
    DOM.lives.innerText = livesStr.trim();
    DOM.pauseBtn.innerText = model.mode === 'paused' ? '繼續' : '暫停';
}

function showFeedback(msg) {
    DOM.feedback.innerText = msg;
    clearTimeout(feedbackTimeout);
    feedbackTimeout = setTimeout(() => { DOM.feedback.innerText = ''; }, 1400);
}

function triggerBtnFeedback(char) {
    let btn = char === '2' ? DOM.btnShoot2 : DOM.btnShootD;
    btn.classList.add('fired');
    clearTimeout(fireTimeouts[char]);
    fireTimeouts[char] = setTimeout(() => { btn.classList.remove('fired'); }, 120);
}

function executeShoot(char) {
    if (model.mode !== 'playing') return;
    let res = model.shoot(char);
    if (char !== 'X') triggerBtnFeedback(char);
    if (res.hit) {
        handleHit(res.item);
        if (res.penalty) {
            showFeedback(res.msg);
            scene.cameras.main.shake(200, 0.01);
        } else if (res.buff) {
            showFeedback(res.buff.msg);
            if (res.buff.type === 'clear') {
                let activeIds = new Set(model.items.map(i => i.id));
                for (let [id, view] of itemViews.entries()) {
                    if (!activeIds.has(id)) {
                        view.destroy();
                        itemViews.delete(id);
                    }
                }
            }
        }
    } else if (res.reason === 'empty') {
        if (char !== 'X') showFeedback(`目前沒有 ${char}，等它落下再射擊！`);
    }
}

window.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
    
    if (e.key === '2') {
        executeShoot('2');
    } else if (e.key === 'D') {
        executeShoot('D');
    } else if (e.key === 'd') {
        showFeedback('請使用大寫 D：Shift + D 或 Caps Lock');
    } else if (e.key === 'X' || e.key === 'x') {
        executeShoot('X');
    }
}, true);

['keyup', 'keypress'].forEach(evt => {
    window.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);
});

window.addEventListener('blur', () => {
    if (model.mode === 'playing') model.pause();
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden && model.mode === 'playing') model.pause();
});

DOM.pauseBtn.addEventListener('click', () => {
    if (model.mode === 'playing') model.pause();
    else if (model.mode === 'paused') model.resume();
});

DOM.startBtn.addEventListener('click', () => {
    model.start();
    DOM.overlay.classList.add('hidden');
    DOM.pauseBtn.innerText = '暫停';
    itemViews.forEach(view => view.destroy());
    itemViews.clear();
    showFeedback('');
});

DOM.btnShoot2.addEventListener('pointerdown', (e) => { e.preventDefault(); executeShoot('2'); });
DOM.btnShootD.addEventListener('pointerdown', (e) => { e.preventDefault(); executeShoot('D'); });

function showGameOver() {
    DOM.overlay.classList.remove('hidden');
    DOM.cardTitle.innerHTML = `字雨落幕。<br><span class="mint">${model.score} 分</span>`;
    DOM.cardSubtitle.innerText = 'TWO KEYS. ENDLESS RAIN.';
    DOM.cardDesc.innerHTML = '再來一場？<br>看準字元，接住更多連擊。';
    DOM.startBtn.innerText = '再玩一次 ↗';
}

initPhaser();
