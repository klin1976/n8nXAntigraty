# n8nXAntigraty - n8n 多平台自動化助理

這是一個基於 **n8n** 建立的多功能自動化助理工作流程，支援 **LINE Bot** 與 **Telegram Bot**。透過串接 **Google Gemini AI**、**Apify 爬蟲**、**Google Drive** 與 **Gmail**，實現了從美食推薦到語音轉文字的全方位自動化。

## 🚀 核心功能

### 1. 🍽️ 智慧美食推薦 (Apify + Gemini)
- **指令**：`好評推薦：[地點或餐廳]`
- **運作**：自動驅動 Google Maps 爬蟲獲取即時評分，並透過 Gemini 轉換成精美的 HTML 美食週報寄送到您的 Gmail。

### 2. 📂 雲端儲存助手 (Google Drive)
- **運作**：當您傳送圖片、影片或任何檔案給機器人時，它會根據所在的群組或私訊環境，自動將檔案分類上傳至指定的 Google Drive 資料夾。

### 3. 🎙️ AI 語音逐字稿 (Gemini ASR)
- **運作**：傳送語音訊息（Voice Message），機器人會透過 Gemini 2.5 Flash 模型進行語音辨識，並回傳繁體中文逐字稿。

### 4. 🆔 環境 ID 查詢
- **指令**：`id` / `getid` / `查詢id`
- **運作**：快速回報當前對話的 User ID 或 Group ID，便於開發者進行權限配置。

### 5. ❓ 動態自動說明 (Environment Aware Help)
- **指令**：`help` / `說明` / `功能`
- **運作**：**動態解析引擎**。機器人會自動讀取目前 n8n 流程的架構，並根據你在「群組」還是「私訊」環境，自動產生不同的可用功能清單。

## 📁 檔案說明

- `My workflow.json`: **LINE 版本** 完整工作流程。
- `Telegram workflow.json`: **Telegram 版本** 完整工作流程 (已優化檔案下載流程)。
- `WorkflowIntroduction.md`: 工作流程的詳細設計邏輯。
- `modify_workflow.js`: 用於自動化注入 Help 節點的開發工具。
- `convert_to_telegram.js`: 用於將 LINE 流程轉換為 Telegram 邏輯的遷移工具。

## 🛠️ 安裝與使用

1. **匯入流程**：
   - 在您的 n8n 面板中新增 Workflow。
   - 選擇 `Import from file` 並選取 `My workflow.json` (LINE) 或 `Telegram workflow.json` (Telegram)。

2. **設定認證 (Credentials)**：
   您需要在 n8n 中配置以下服務的授權：
   - **LINE API** (針對 LINE 版本)
   - **Telegram API** (針對 Telegram 版本)
   - **Google Gemini (PaLM)**
   - **Google Drive**
   - **Gmail**
   - **Apify**
   - **n8n API** (用於 Help 動態說明功能)

3. **啟動**：
   將所有節點的 Credential 選取正確後，點擊「Execute Workflow」測試，確認沒問題後點擊「Active」即可。

---

## 📝 專案開發紀錄

本專案由開源開發助理 **Antigravity** 協作完成。所有的開發對話與決策過程皆詳實記錄於 `ConversationRecord.txt` 中。
