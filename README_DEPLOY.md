# Proxy Arena 獨立發布指南（OpenAI 版）

這個版本已將 `websim` 的 AI 能力改為透過你自己的後端呼叫 OpenAI。

## 1. 本機啟動

1. 安裝相依套件

```bash
npm install
```

2. 建立環境變數

```bash
cp .env.example .env
```

3. 編輯 `.env`，填入你的 key

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

4. 啟動

```bash
npm start
```

5. 打開瀏覽器

- `http://localhost:3000`

## 2. 專案結構（與部署相關）

- `server.js`：Node/Express 伺服器，提供：
  - `POST /api/debate`（文字辯論）
  - `POST /api/tts`（語音）
- 其餘前端檔案（`index.html`, `app.js`, `physics.js`...）由同一個伺服器靜態提供。

## 3. 上線部署（Render 範例）

1. 將專案推到 GitHub。
2. 到 Render 建立一個 **Web Service**，連接此 repo。
3. 設定：
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 在 Render 的 Environment Variables 加入：
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`（可選，預設 `gpt-4o-mini`）
5. Deploy 完成後，用 Render 提供的網址開啟網站。

## 4. 成本與安全注意

- **不要**把 `OPENAI_API_KEY` 放在前端 JS。
- API key 只放在部署平台的環境變數。
- 可以在 `server.js` 加上簡單 rate limit，避免被濫用。

