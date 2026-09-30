# Neon Rain Shooter / 2D 字雨射擊 🌧️⌨️

> A browser-based 2D typing/shooting game born from an AI-to-AI collaboration.
> 由 AI 間的協作所誕生的一款 2D 瀏覽器打字射擊遊戲。

[English](#english) | [繁體中文](#繁體中文)

---

<a id="繁體中文"></a>
## 🎮 2D 字雨射擊 (繁體中文)

這是一款使用原生 HTML/CSS/JavaScript 以及 Phaser 3 打造的網頁射擊小遊戲。畫面上會不斷落下霓虹風格的 `2` 與 `D` 字元，玩家必須在字元落地前使用對應的鍵盤按鍵或滑鼠將其擊落，以獲取連擊與高分！

### 🤖 關於這個專案的誕生

這個專案的開發流程非常特別：
- **概念與規格指導**：由 **Codex** 扮演資深工程師，撰寫了嚴謹的 `2D-Rain-SDD.md` (Specification-Driven Development) 規格文件。
- **實作與擴充**：由 **agy CLI (Antigravity)** 閱讀 SDD 後，從零開始編寫程式碼，並加入了金色增益字元與紅色炸彈等延伸變化。
- **運用技能 (SKILLS)**：在實作過程中，應用了類似 `phaser-2d-game` 與 `web-game-foundations` 的架構思維，確保原生環境下的效能與無依賴部署能力。

### ✨ 特色與玩法

- **防禦底線**：漏接一般字元會扣生命值，五命歸零即 Game Over。
- **擴充機制**：
  - 🟡 **金色字元**：擊落可獲得隨機增益（全畫面清除加分、時間緩速、或回復生命）。
  - 🔴 **紅色炸彈 (X)**：絕對不能打！誤擊將造成螢幕震動、扣命且連擊歸零。
- **純靜態部署**：無後端，可直接託管於 GitHub Pages 或 Render 等靜態伺服器。

### 🚀 如何遊玩

無需安裝任何套件包，只要啟動靜態伺服器即可：
```bash
python3 -m http.server 8080
# 或使用 Node.js
# npx http-server -p 8080
```
接著打開瀏覽器前往 `http://localhost:8080` 即可遊玩。

---

<a id="english"></a>
## 🎮 Neon Rain Shooter (English)

A fast-paced web-based shooting/typing game built with plain HTML/CSS/JavaScript and Phaser 3. Neon-styled characters `2` and `D` fall from the sky, and you must shoot them down using your keyboard or mouse before they hit the defense line!

### 🤖 How It Was Made

This project features a unique AI-to-AI workflow:
- **Specification & Guidance**: **Codex** acted as the senior developer, crafting a precise `2D-Rain-SDD.md` (Specification-Driven Development) document.
- **Implementation & Expansion**: The **agy CLI (Antigravity)** consumed the SDD, built the game from scratch, and further expanded it with golden buffs and red bomb mechanics.
- **Skills Utilized**: The architecture draws inspiration from the `phaser-2d-game` and `web-game-foundations` SKILLS, ensuring a robust, dependency-free static deployment.

### ✨ Features & Gameplay

- **Defend the Line**: Missing standard characters costs a life. The game ends when you lose all 5 lives.
- **Extended Mechanics**:
  - 🟡 **Golden Characters**: Shoot them for random buffs (Screen Clear, Slow Motion, or +1 Life).
  - 🔴 **Red Bombs (X)**: Do NOT shoot! Hitting a bomb causes screen shake, drops your combo to zero, and costs a life.
- **Static Deployment**: No backend required. Ready to be deployed to GitHub Pages or Render.

### 🚀 How to Run

No build step required. Just serve the static files:
```bash
python3 -m http.server 8080
# Or using Node.js
# npx http-server -p 8080
```
Then navigate to `http://localhost:8080` in your browser.
