# 2D 字雨射擊：SDD 實作規格

版本：1.0｜日期：2026-09-30｜語言：繁體中文

本文件是以現有版本原始碼反向整理的 Specification-Driven Development 規格，供 agy CLI 從零實作與驗收。目標是重現原版的玩法、畫面與互動。不是另一款遊戲的設計提案。

參考遊戲：https://tonny-two-d-rain-0930.pink-sole-5575.chatgpt.site （需原持有人登入）。原版 source commit：`2f53b4fa753e0a9a7e108482c13b9b2056a70376`。

## 1. 使用方式與重現程度

- 練習模式：先只提供本文件與 `AGY-PROMPT.md`，完成後才開啟 `reference/` 比對。
- 精確模式：允許讀取 `reference/index.html`、`style.css`、`game.js`。同瀏覽器、同字型、同 viewport 下，以這些檔案作為排版與行為的最終參考。
- 字元位置、大小、顏色、速度與碎光使用 `Math.random()`；正常遊玩不要求逐幀或每一局相同。
- 若做截圖比對，測試工具應在載入遊戲前固定亂數序列；使用相同 Phaser 版本、viewport、DPR、字型與取樣時間。固定亂數只用於測試，不改正式版玩法。
- 規格與實作存在邊界差異時，先回報差異，不擅自加入新玩法。

## 2. 範圍與技術

製作單頁、单人、可用瀏覽器玩的 2D 射擊小遊戲。畫面持續落下大小不同、顏色繽紛的 `2` 和 `D`。按對字元即可立即擊落。滑鼠／觸控可直接點擊字元或下方射擊按鈕。

| 項目 | 規格 |
|---|---|
| 引擎 | Phaser 3.90.0；打包內含 `phaser.min.js` |
| 原版堆疊 | 原生 HTML、CSS、JavaScript；沒有 React、後端或 build step |
| 畫面 | Phaser canvas + DOM HUD、開始／結束卡片與按鈕 |
| 渲染 | `Phaser.AUTO`、透明 canvas、`Phaser.Scale.RESIZE` |
| 音效 | 關閉：`audio.noAudio = true` |
| 文字素材 | 即時文字與幾何粒子；無圖片、精靈圖或外部字型下載 |
| 保存 | 不保存分數、生命或關卡；重新整理回待開始 |
| 發佈 | 靜態檔案可直接部署；不必重用原站身份或發佈設定 |

若練習要用 TypeScript / Vite，可以改寫架構，但輸出畫面、參數、輸入行為不可改。不得增加帳號、排行榜、選關、玩家移動、武器升級、音樂或小寫 d 射擊。

## 3. 玩家流程與狀態

狀態列舉：`ready`、`playing`、`paused`、`over`。

| 狀態 | 模擬 | 玩家可做的事 |
|---|---|---|
| ready | 無可擊落字元；裝飾字元仍動畫 | 點「開始射擊」 |
| playing | 生成、移動、漏接、射擊與計分 | 2 / D 射擊、滑鼠射擊、點暫停 |
| paused | 不生成、不移動遊戲字元；射擊無效 | 點「繼續」；裝飾與既有特效仍可動畫 |
| over | 模擬停止；顯示結束卡片 | 點「再玩一次」 |

轉移：ready → playing；playing ↔ paused；playing → over；over → playing。
開始和重新開始必須重設 score=0、combo=0、lives=5、elapsed=0、spawnIn=0.2、nextId=0、items=[]，清除所有舊遊戲字元 view。隱藏 overlay，暫停按鈕改回「暫停」，清空 feedback。射擊不能代替開始按鈕啟動。

失去 window focus 或 document.hidden=true 時，只在 playing 狀態自動切成 paused。回到頁面不自動繼續，要用滑鼠點「繼續」。暫停鍵在 ready / over 無作用。

## 4. 資料模型與更新順序

Model 管理遊戲規則，Scene 只讀取 Model 並顯示字元、格線、光束與碎光。

```text
GameState: mode, items[], score, combo, lives, elapsed, spawnIn, nextId
FallingItem: id, char, x, y, size, color, speed, angle
char: '2' | 'D'
id: 遞增整數，每局從 1 起
elapsed / spawnIn: 秒
x / y / size: canvas 像素
speed: 像素／秒
angle: radians
```

每幀以 `dt = min(deltaMilliseconds / 1000, 0.05)` 更新。在 playing 以外立刻略過 Model update。

依序：elapsed += dt → spawnIn -= dt → 到期產生至多 1 個字元、重設 spawnIn → 遍歷 items 快照、移動與漏接 → 同步 view 與 HUD → 如果 playing 變 over，顯示結束卡片。

不能用 while 一次補產生大量字元；原版一次 update 至多生成一個。射擊立即移除 Model item；对应文字 view 於下次 update 銷毀。

## 5. 生成、落下與難度

下列 `U` 為每次新取樣、獨立的 `Math.random()`，範圍 `[0,1)`。w / h 是當下 canvas 寬高。

| 欄位 | 公式／規則 |
|---|---|
| size | `28 + U * 48`（28 至小於 76 px） |
| char | U < 0.5 是 `2`，否則 `D` |
| x | `50 + U * max(1, w - 100)` |
| y | `-60` |
| color | 六色等機率選一色 |
| speed | `42 + U * 34 + min(65, elapsed * 1.1)` |
| angle | `(U - 0.5) * 0.5` |
| 下次生成間隔 | `max(0.38, 1.05 - elapsed * 0.009)` 秒 |
| 移動 | `item.y += item.speed * dt` |

顏色陣列順序：`#8bf5d5`、`#ff83b6`、`#ffdc82`、`#b79bff`、`#75c9ff`、`#ff9d6e`。

速度只在生成時決定，不持續改變既有字元的速度。沒有通關終點。第一個遊戲字元於開始後累積約 0.2 秒生成，從 canvas 上方落入。

漏接條件：`item.y + item.size * 0.4 > h - 33`。漏接就刪除字元、lives = max(0, lives - 1)、combo=0，不扣分。生命到 0 設 mode=over 並中止當次漏接遍歷。生命變動時更新 HUD、顯示「漏接！剩下 N 次機會」。

## 6. 射擊、滑鼠與計分

### 6.1 鍵盤與射擊按鈕

只在 playing 有效。按 `2` 或 `D`，尋找該類所有 item，依 y 由大到小排序，擊落第一個。相同 y 時保持 items 原順序；畫面最下方、離防線最近的同類字元優先。沒有彈道延遲、實體子彈或傷害累計，每字元一擊消失。

有效命中先 combo += 1，再加分：

```text
本次加分 = 10 + min(combo - 1, 20) * 2
```

連續前 3 次加分為 10、12、14，累積 36 分；第 21 次起每次 50 分。空射不扣生命、不扣分，但 combo 歸零並提示「目前沒有 X，等它落下再射擊！」。

對應下方按鈕加 `fired` 狀態 120ms；即使空射也顯示按鈕反馈。

### 6.2 點擊字元

pointerdown 座標使用 Phaser canvas 本地座標。從 items 反向遍歷；重疊時優先命中較晚生成的第一個符合字元。

```text
abs(pointer.x - item.x) < max(24, item.size * 0.55)
且
abs(pointer.y - item.y) < max(24, item.size * 0.65)
```

點字元直接依 id 擊落，採同一計分流程，並閃爍該字元類別的射擊按鈕。點空白沒有任何副作用，尤其不能重置 combo。

下方「射擊 2／射擊 D」用 pointerdown 觸發並 preventDefault；桌面左鍵與手機點擊都可用，不用等待 pointerup。


### 6.3 擴充機制：金色字元與炸彈
為增加遊戲變化，系統會以機率生成兩類特殊字元：
1. **金色字元（2 或 D，10% 機率）**：
   - 與一般字元一樣會自然掉落，漏接會扣 1 命。
   - 成功擊落時，除了原本的加分與連擊外，會隨機觸發一項增益效果：
     - **清除全畫面**：瞬間消滅畫面上所有一般與金色字元，並依照消滅數量獲得額外加分（每個 10 分）。
     - **時間緩速**：畫面所有字元的掉落與生成速度減慢（乘以 0.4），持續 5 秒。
     - **回復生命**：恢復 1 點生命（不超過上限 5 點）。
2. **炸彈字元（紅色 X，10% 機率）**：
   - 絕對不能被擊落（不能按 X 鍵，也不能滑鼠點擊）。
   - 若誤擊炸彈，會立即扣除 1 點生命且 Combo 歸零，並有螢幕震動與警告提示。
   - 若不理會炸彈任其落至防線外，則安全無事（不會扣命）。


### 6.4 外掛道具包系統 (Plugin System)
為支援團隊協作開發，主程式暴露 `window.GameAPI.registerItem(config)` 供獨立的 JavaScript 檔案註冊新道具。
- **動態按鍵攔截**：若道具宣告 `key: 'S'`，系統會自動攔截 'S' 鍵並支援射擊判定。
- **生命週期 Hooks**：
  - `onSpawn()`：回傳自訂狀態。
  - `onUpdate(item, dt)`：可覆寫掉落軌跡（如 S 型移動）。
  - `onHit(api, item)`：擊落觸發。
  - `onMiss(api)`：漏接觸發。
- **API 封裝**：傳入的 `api` 參數提供安全的方法如 `api.addScore(pts)`、`api.addLife(pts)`、`api.showFeedback(msg)`、`api.shakeScreen()` 等，避免直接操作核心 Model。

## 7. 鍵盤攔截：必要需求

在 window capture phase 監聽 `keydown`、`keyup`、`keypress`。對收到的每一事件呼叫 `preventDefault()`、`stopImmediatePropagation()`。阻止頁面滾動、Tab 移動焦點、Enter 啟動按鈕等頁面預設行為。

只有滿足以下條件的 keydown 能射擊：

```text
!repeat && !ctrlKey && !altKey && !metaKey && !isComposing
且 event.key === '2' 或 event.key === 'D'
```

| 輸入 | 預期 |
|---|---|
| 主鍵盤 2 / NumPad2（key='2'） | 射擊 2 |
| Shift + d 產生 key='D' | 射擊 D；允許 shiftKey |
| Caps Lock 後產生 key='D' | 射擊 D |
| key='d' | 不射擊；顯示大寫提醒 |
| Shift+2 產生 @ | 不射擊 |
| 长按的 repeat=true | 不連射 |
| Ctrl/Alt/Meta + 2/D | 不射擊 |
| IME composing | 不射擊 |
| 空白、方向鍵、WASD、Escape、Tab、Enter | 不射擊；頁內預設行為被攔截 |
| keyup / keypress | 不射擊 |

小寫提醒：「請使用大寫 D：Shift + D 或 Caps Lock」。原版提醒不受 playing 限制，但射擊必須受 playing 限制。

網頁不能全面禁用瀏覽器／作業系統保留的快捷鍵。不要宣稱攔截 Alt+F4、Ctrl+W 或系統按鍵，也不要加入 OS 鍵盤 hook。鍵盤 Tab 被攔截是本遊戲的明確設計取捨；所有控制提供滑鼠操作。

## 8. 視覺與排版

### 8.1 全頁

採深夜色霓虹風格，遊戲區是主畫面，不加宣傳 landing page。DOM 順序：header → arena → footer。頁面繁體中文，title=`2D 字雨射擊`，viewport=device-width,initial-scale=1。無頁面垂直捲軸。

| 參數 | 原版值 |
|---|---|
| body | margin 0；background #080b17；color #ecf1ff；overflow hidden |
| 字體 | Arial, 'Noto Sans TC', sans-serif；不另外載入字型 |
| main | width min(1100px,100%)；height 100dvh；置中 flex column |
| main padding | 24px 30px 18px |
| header | flex；gap 30px；padding-bottom 20px |
| arena | flex 1；min-height 200px；relative；overflow hidden；radius 18px |
| arena border | 1px solid #283148 |
| arena background | radial-gradient(ellipse at 50% 60%, #1b1c3a, #0e1425 80%) |
| arena shadow | 0 20px 100px #0005 |
| footer | padding-top 18px |

Header 左側「2D」薄荷色 monospace 34px bold、letter-spacing -3px；下方「字雨射擊」12px、letter-spacing 2px。右側三組 HUD：分數、連擊、生命，最右是暫停按鈕。HUD 標籤 11px，數值 monospace 22px；生命 16px 粉色。分數至少補滿五位（不是截斷）：00000。連擊 `×0`。生命用 ● 與 ○ 組成五顆，每顆帶空白。

Arena 頂部 18px、左右 22px 顯示 `DROP ZONE` 與 `01 / INFINITE RAIN`，monospace 10px、letter-spacing 2px。底部防線文字「防線 / 別讓字元穿過這裡」，置中 10px，padding 9px，粉色細邊線。HUD 不蓋住遊戲主要區域。

Footer 的兩個射擊按鈕等寬、gap 14px、radius 13px、padding 13px 21px；左按鈕薄荷色，右按鈕淡紫色。內含 30px bold monospace 的 2 或 D、12px 射擊文字，最右 `↗`。底下注記「只接受 2 / 大寫 D」與「其他按鍵已在遊戲頁內攔截」。

### 8.2 開始與結束卡片

overlay 全部覆蓋 arena，z-index 2，background #0c1024bb，backdrop-filter blur(6px)，grid 置中。卡片置中文字、padding 25px。

原版文案及順序：

1. `TWO KEYS. ENDLESS RAIN.`（10px monospace、letter-spacing 4px）
2. `接住這場` 換行 `2D 字雨。`；第二行薄荷色 #86f6d6
3. `大小不一的繽紛字元，正在落下。` 換行 `按對字元，讓它在落地前化成煙火。`
4. 兩個鍵帽提示：`2 擊落 2`、`D 擊落 D`
5. `D 請用 Shift + D 或 Caps Lock。` 換行 `滑鼠可點擊字元，也可使用下方射擊按鈕。`
6. `開始射擊 ↗` 按鈕

h1 為 clamp(35px,5vw,60px)、line-height 1.15、letter-spacing -2px、margin 22px 0。開始按鈕 background #8bf5d5、color #10232c、radius 10px、padding 15px 27px、min-width 210px。

結束時同一張卡片改為 `字雨落幕。` 換行 `N 分`；說明 `再來一場？` 換行 `看準字元，接住更多連擊。`；按鈕改 `再玩一次 ↗`。其他提示保留。重新開始後卡片隱藏；不必把隱藏卡片恢復成初始標題。

### 8.3 Canvas

- 格線：水平／垂直每隔 48px；線寬 1px、color 0x65759a、alpha 0.07。
- 遊戲字元 origin=(0.5,0.5)，fontFamily='Arial Black,monospace'、bold、size 使用 item.size、color 使用 item.color。
- 字元描邊 #0c1024、strokeThickness=3；shadow offset=(0,0)、color=item.color、blur=15。
- 顯示 x=`min(item.x,w-25)`；y=item.y。原版縮放後只限制顯示 x，不回寫 Model 的 x。
- rotation=`item.angle + sin(timeMilliseconds/1500 + item.id)*0.1`。
- 9 個裝飾字元在 create 時生成；偶數 index 為 2、奇數為 D。monospace、size=30+U*45、alpha=.16、colors[index%6]，初始位置在 canvas 隨機。
- 裝飾字元 tween 到 h+80，duration=8000+U*5000 ms，repeat=-1，每次 repeat 將 y 設為 -80。它們沒有 hitbox、不計分、不扣命。

### 8.4 命中特效與提示

光束從 `(w/2,h-36)` 到目標座標，顏色為目標色，線寬 2px、alpha .7；180ms 淡出後 destroy。

命中產生 10 顆圓形碎光，每顆 radius=2+U*3、目標色；終點 x/y 各為目標座標加 `(U-.5)*130`；400+U*200 ms 內 alpha→0、scale→0，完成銷毀。原版 tween 使用預設 easing。沒有震屏、音效或 hit-stop。

feedback 在 arena 底部 60px、全寬置中，12px、#ffb4cf、pointer-events none，aria-live=polite。每次通知清除上一個 timeout，1400ms 後清空。

### 8.5 手機 breakpoint

寬度 <=600px 時：main padding=14px 12px 12px；header gap=12px、padding-bottom=14px；品牌 26px、子標 9px；HUD gap=14px、value 18px、label 9px、生命 10px；暫停按鈕 padding=8px、font-size 11px；右上 `01 / INFINITE RAIN` 隱藏；卡片 padding=15px；footer 第二段攔截說明隱藏；射擊按鈕 padding=10px 17px；hint=10px；h1 margin=15px 0；鍵帽提示 margin=14px 0。

非常矮的 viewport 在原版可能因 arena min-height 與 body overflow:hidden 造成裁切；不把這點當作新增版型需求。至少驗證 1440×900、1280×720、390×844、600px breakpoint 两侧。

## 9. 載入、生命週期與附帶功能

- 先載本地 Phaser，再載 game.js。Phaser 未定義時，卡片說明改「遊戲載入失敗，請重新整理頁面。」；停用開始按鈕。
- 每次 scale resize 重畫格線。
- item 移除後對應文字 view 要 destroy；重開也要 destroy 舊 views。光束與粒子完成自行銷毀，避免累積。
- favicon 為深底圓角、薄荷色 2D 的內嵌 SVG；完整內容見 reference/index.html。
- 原版會在 document.modelContext.registerTool 可用時嘗試註冊 `read_game_state` 與 `start_game`。前者回傳 score/lives/status，後者重開一局再回傳 status。皆用空物件 schema 且 additionalProperties=false；不存在或註冊失敗不影響遊戲。這是原版附帶相容行為，不需要安裝 MCP server。

## 10. 驗收條件

須交付可啟動的完整遊戲、啟動方式、測試結果與差異清單。建議用 Node 的單元測試 + Playwright 實際瀏覽器測試；不可只用 DOM 斷言宣稱 canvas 畫面驗證通過。

| ID | 測試情境 | 通過條件 |
|---|---|---|
| AC01 | 初次載入 | title 正確；HUD 00000/×0/五生命；開始卡片；無可擊落字元 |
| AC02 | 點開始 | overlay 隱藏；約 .2 秒生成首字元；持續下落 |
| AC03 | 同時有兩個 2、一個 D | 按 2 只移除 y 較大的 2，D 不受影響 |
| AC04 | Shift+D / Caps Lock D | 各次非 repeat keydown 射擊一次 D |
| AC05 | 小寫 d | 不移除、不加分，出現大寫提醒 |
| AC06 | 空白／方向／Tab／Enter／keyup | 無射擊；對可取消事件 defaultPrevented=true；頁面不滾動／按鈕不被鍵盤啟動 |
| AC07 | Ctrl/Alt/Meta、repeat、IME | 不射擊；先用合成事件驗證，實際桌面快捷鍵另註限制 |
| AC08 | 滑鼠點字元 | 依 hitbox 和逆序選中，計分与按鈕反馈一致 |
| AC09 | 點畫面空白 | 不加分、不扣命、不清 combo |
| AC10 | 滑鼠／觸控射擊按鈕 | 行為等同相應键盤射擊 |
| AC11 | 連中三次 | score=36、combo=3；長連擊每次最多 50 分 |
| AC12 | 沒有相應字元時射擊 | score/lives 不變，combo=0；顯示空射提示 |
| AC13 | 漏接 | 移除字元，lives 減一，combo 清零、score 不變 |
| AC14 | 第五次漏接 | mode=over；結束卡片顯示總分；不再接受射擊 |
| AC15 | 再玩一次 | score/生命/計時/生成器/id/views 全部重設 |
| AC16 | 暫停及失焦 | Model elapsed/位置/生成不變；射擊無效；手動繼續才恢復 |
| AC17 | responsive | 指定桌機／手機尺寸的主要控制可见、可點；无非預期水平捲軸 |
| AC18 | 視覺 | 截圖涵蓋 ready、playing、paused、over；與 reference 的版面、色彩、字體、位置比對 |
| AC19 | Phaser 不可用 | 友善錯誤文案；開始停用 |
| AC20 | 多次重新開局 | 舊字元消失；canvas 不重複建立；已完成特效被清理 |

Model 測試可以直接構造字元，避免等亂數碰巧出現。測試輸入時固定 char、y、speed、size；生成測試以指定 RNG 驗證欄位範圍，避免 flakiness。手機至少實測 pointer 射擊，不宣稱完全支援所有瀏覽器。

## 11. 原版相容細節與限制

以下為現有版本行為，精確重現時不能默默修正成另一種設計：

1. 暫停只停止 Model，不停止裝飾字元 tween、既有粒子或旋轉的 time 計算。
2. 漏接當幀仍可依上述 update 順序先生成一個新字元；over 後剩餘字元停留在覆蓋卡片後。
3. 開始畫面的裝飾字元不可擊落，它們的視覺不是遊戲目標。
4. 射擊按钮短時間連點使用獨立 timeout，原版没有長按自動連射。
5. 視窗縮小只夾住 view.x，pointer hitbox 仍使用 Model x；要改善此情況請列為額外變更，不宣稱完全一致。
6. feedback timeout 可跨過開始／暫停狀態；沒有要求訊息永久顯示。暫停状态由「繼續」按鈕辨識。
7. 真實瀏覽器輸入與截圖在原版製作時尚未驗證；已確認的僅是 JavaScript 語法与主要 Model 規則測試。agy CLI 必須另做遊玩測試，不繼承「已通過」的假設。

## 12. 建議實作任務順序

1. 建立靜態頁、favicon、HUD、overlay、footer 与 responsive CSS。
2. 建立獨立 Model，完成生成／移動／命中／漏接／score／mode，測試 AC03、AC11–16。
3. 接 Phaser Scene、view 映射、背景格線、裝飾與命中特效。
4. 接鍵盤 capture 攔截、大小寫判定、pointerdown 按鈕、canvas hitbox。
5. 檢查開始／暫停／失焦／結束／重新開始與載入失敗。
6. 跑瀏覽器桌機／手機流程，截圖；按 AC01–20 回報 pass/fail/not-run。
7. 對照 reference；提出仍有差異与原因。除非明確要求，不自動發佈、不套用參考站專案識別碼。

完成定義：核心 AC 全數通過；必要輸入限制成立；有實際 canvas 截圖；任何未測試項目与原版差異明確列出。
