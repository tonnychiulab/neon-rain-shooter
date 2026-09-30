// 範例外掛道具：護盾 (Shield)
// 按 'S' 擊落，可抵擋一次漏接傷害
if (window.GameAPI) {
    window.GameAPI.registerItem({
        key: 'S',
        color: '#4287f5', // 藍色
        spawnChance: 0.05, // 5% 機率生成
        
        onSpawn: () => {
            return { swing: 0 };
        },
        
        onUpdate: (item, dt) => {
            // 自訂 S 型搖擺下落
            item.state.swing += dt * 3;
            item.x += Math.sin(item.state.swing) * 50 * dt;
            item.y += item.speed * dt;
        },
        
        onHit: (api, item) => {
            api.addScore(50);
            api.addLife(1); // 假設護盾就是回血
            api.showFeedback('🛡️ 獲得護盾！生命 +1');
        },
        
        onMiss: (api) => {
            // 漏接沒有懲罰
            api.showFeedback('護盾飄走了~');
        }
    });
}
