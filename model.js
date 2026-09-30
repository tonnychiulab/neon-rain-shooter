
const CustomItems = [];
const CustomKeys = new Set();

if (typeof window !== 'undefined') {
    window.GameAPI = {
        registerItem: (config) => {
            CustomItems.push(config);
            if (config.key) {
                CustomKeys.add(config.key.toUpperCase());
            }
        }
    };
}
class GameModel {
    constructor() {
        this.mode = 'ready'; // ready, playing, paused, over
        this.items = [];
        this.score = 0;
        this.combo = 0;
        this.lives = 5;
        this.elapsed = 0;
        this.spawnIn = 0.2;
        this.nextId = 0;
        
        this.colors = ['#8bf5d5', '#ff83b6', '#ffdc82', '#b79bff', '#75c9ff', '#ff9d6e'];
        this.buffTimeLeft = 0; // For slow motion
    }

    start() {
        this.mode = 'playing';
        this.items = [];
        this.score = 0;
        this.combo = 0;
        this.lives = 5;
        this.elapsed = 0;
        this.spawnIn = 0.2;
        this.nextId = 0;
        this.buffTimeLeft = 0;
    }

    pause() {
        if (this.mode === 'playing') this.mode = 'paused';
    }

    resume() {
        if (this.mode === 'paused') this.mode = 'playing';
    }

    update(dt, w, h) {
        if (this.mode !== 'playing') return [];
        
        let activeDt = dt;
        if (this.buffTimeLeft > 0) {
            this.buffTimeLeft -= dt;
            activeDt = dt * 0.4; // Slow motion effect
        }

        const missed = [];
        this.elapsed += dt; // spawn timer uses real time or active time? Let's use real time so they spawn at normal rate, but fall slower? Or use activeDt for both. Let's use activeDt so everything slows down.
        this.spawnIn -= activeDt;

        if (this.spawnIn <= 0) {
            this.spawnItem(w);
            this.spawnIn = Math.max(0.38, 1.05 - this.elapsed * 0.009);
        }

        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            if (item.type === 'custom' && item.customConfig.onUpdate) {
                item.customConfig.onUpdate(item, activeDt);
            } else {
                item.y += item.speed * activeDt;
            }
            
            if (item.y + item.size * 0.4 > h - 33) {
                if (item.type === 'custom') {
                    if (item.customConfig.onMiss) {
                        item.customConfig.onMiss(this.getAPI());
                    }
                    this.items.splice(i, 1);
                } else if (item.type === 'custom') {
                    if (item.customConfig.onHit) item.customConfig.onHit(this.getAPI(), item);
                    return { hit: true, item: item, customHit: true };
                } else if (item.type === 'bomb') {
                    // Missed bomb is safe, just remove
                    this.items.splice(i, 1);
                } else {
                    missed.push(item);
                    this.items.splice(i, 1);
                    this.lives = Math.max(0, this.lives - 1);
                    this.combo = 0;
                    
                    if (this.lives === 0) {
                        this.mode = 'over';
                        break;
                    }
                }
            }
        }
        
        return missed;
    }

    spawnItem(w) {
        let U = Math.random();
        let size = 28 + U * 48;
        
        // Determine type: 10% golden, 10% bomb, 80% normal
        let typeRand = Math.random();
        let type = 'normal';
        let customConfig = null;
        
        // Check custom items first
        for (let itemConfig of CustomItems) {
            if (Math.random() < (itemConfig.spawnChance || 0.05)) {
                type = 'custom';
                customConfig = itemConfig;
                break;
            }
        }
        
        let char = U < 0.5 ? '2' : 'D';
        let color = this.colors[Math.floor(Math.random() * 6)];
        
        if (type === 'custom') {
            char = customConfig.key || '?';
            color = customConfig.color || '#ffffff';
        } else if (typeRand < 0.1) {
            type = 'golden';
            color = '#ffd700'; // Gold
        } else if (typeRand < 0.2) {
            type = 'bomb';
            char = 'X';
            color = '#ff3333'; // Red
        }

        let x = 50 + Math.random() * Math.max(1, w - 100);
        let speed = 42 + Math.random() * 34 + Math.min(65, this.elapsed * 1.1);
        let angle = (Math.random() - 0.5) * 0.5;

        this.nextId++;
        this.items.push({
            id: this.nextId,
            char: char,
            x: x,
            y: -60,
            size: size,
            color: color,
            speed: speed,
            angle: angle,
            type: type,
            customConfig: customConfig,
            state: customConfig && customConfig.onSpawn ? customConfig.onSpawn() : {}
        });
    }

    
    getAPI() {
        return {
            addScore: (pts) => { this.score += pts; },
            addLife: (pts) => { this.lives = Math.min(5, this.lives + pts); },
            loseLife: (pts) => { 
                this.lives = Math.max(0, this.lives - pts); 
                if(this.lives === 0) this.mode = 'over'; 
            },
            resetCombo: () => { this.combo = 0; },
            addCombo: (pts) => { this.combo += pts; },
            clearScreen: () => {
                let normalItems = this.items.filter(i => i.type === 'normal' || i.type === 'golden');
                this.score += normalItems.length * 10;
                this.items = this.items.filter(i => i.type === 'bomb' || i.type === 'custom'); 
            },
            slowTime: (sec) => { this.buffTimeLeft = sec; },
            showFeedback: (msg) => { if(typeof window !== 'undefined' && window.showFeedback) window.showFeedback(msg); },
            shakeScreen: () => { if(typeof window !== 'undefined' && window.shakeScreen) window.shakeScreen(); }
        };
    }

    applyBuff() {
        let buffType = Math.floor(Math.random() * 3);
        if (buffType === 0) {
            // Clear board
            let normalItems = this.items.filter(i => i.type === 'normal' || i.type === 'golden');
            let addScore = normalItems.length * 10;
            this.score += addScore;
            this.items = this.items.filter(i => i.type === 'bomb'); // keep bombs
            return { type: 'clear', msg: '全清加分！' };
        } else if (buffType === 1) {
            // Slow motion
            this.buffTimeLeft = 5.0; // 5 seconds
            return { type: 'slow', msg: '時間緩速！' };
        } else {
            // +1 Life
            if (this.lives < 5) this.lives += 1;
            return { type: 'life', msg: '生命回復！' };
        }
    }

    shoot(char) {
        if (this.mode !== 'playing') return null;
        
        if (char === 'X') {
            let bombs = this.items.filter(i => i.type === 'bomb');
            if (bombs.length > 0) {
                bombs.sort((a, b) => b.y - a.y);
                let hitItem = bombs[0];
                this.items = this.items.filter(i => i.id !== hitItem.id);
                this.lives = Math.max(0, this.lives - 1);
                this.combo = 0;
                if (this.lives === 0) this.mode = 'over';
                return { hit: true, item: hitItem, penalty: true, msg: '誤擊炸彈！扣命！' };
            }
            return { hit: false, reason: 'empty' };
        }

        let targets = this.items.filter(i => i.char === char && i.type !== 'bomb');
        if (targets.length === 0) {
            this.combo = 0;
            return { hit: false, reason: 'empty' };
        }

        // Prioritize lowest y. Golden and normal have same priority.
        targets.sort((a, b) => b.y - a.y);
        let hitItem = targets[0];
        
        this.items = this.items.filter(i => i.id !== hitItem.id);
        
        this.combo += 1;
        let addScore = 10 + Math.min(this.combo - 1, 20) * 2;
        this.score += addScore;
        
        let buffRes = null;
        if (hitItem.type === 'golden') {
            buffRes = this.applyBuff();
        } else if (hitItem.type === 'custom' && hitItem.customConfig.onHit) {
            hitItem.customConfig.onHit(this.getAPI(), hitItem);
            return { hit: true, item: hitItem, customHit: true };
        }
        
        return { hit: true, item: hitItem, buff: buffRes };
    }

    shootAt(px, py) {
        if (this.mode !== 'playing') return null;
        
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            let dx = Math.abs(px - item.x);
            let dy = Math.abs(py - item.y);
            
            if (dx < Math.max(24, item.size * 0.55) && dy < Math.max(24, item.size * 0.65)) {
                this.items.splice(i, 1);
                
                if (item.type === 'bomb') {
                    this.lives = Math.max(0, this.lives - 1);
                    this.combo = 0;
                    if (this.lives === 0) this.mode = 'over';
                    return { hit: true, item: item, penalty: true, msg: '誤擊炸彈！扣命！' };
                } else {
                    this.combo += 1;
                    let addScore = 10 + Math.min(this.combo - 1, 20) * 2;
                    this.score += addScore;
                    
                    let buffRes = null;
                    if (item.type === 'golden') {
                        buffRes = this.applyBuff();
                    }
                    
                    return { hit: true, item: item, buff: buffRes };
                }
            }
        }
        
        return { hit: false, reason: 'miss' };
    }
}
if (typeof module !== "undefined") { module.exports = GameModel; }
