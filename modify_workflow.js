const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, 'My workflow.json');
const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const newNodes = [
  {
    "parameters": {
      "conditions": {
        "options": {
          "caseSensitive": false,
          "leftValue": "",
          "typeValidation": "strict",
          "version": 2
        },
        "conditions": [
          {
            "id": "1d8be8c4-a3f2-4911-aa95-f242555aa0a1",
            "leftValue": "={{ $json.body.events[0].message.text }}",
            "rightValue": "help",
            "operator": {
              "type": "string",
              "operation": "equals",
              "name": "filter.operator.equals"
            }
          },
          {
            "id": "31278152-d17b-4022-9dfd-b633bfac0f23",
            "leftValue": "={{ $json.body.events[0].message.text }}",
            "rightValue": "說明",
            "operator": {
              "type": "string",
              "operation": "equals",
              "name": "filter.operator.equals"
            }
          },
          {
            "id": "2b6ea93d-4c3e-4dca-847e-2cf0eb82db2e",
            "leftValue": "={{ $json.body.events[0].message.text }}",
            "rightValue": "功能",
            "operator": {
              "type": "string",
              "operation": "equals",
              "name": "filter.operator.equals"
            }
          }
        ],
        "combinator": "or"
      },
      "options": {}
    },
    "type": "n8n-nodes-base.filter",
    "typeVersion": 2.2,
    "position": [
      -240,
      -336
    ],
    "id": "7dc1abf9-90d2-45e0-b6f7-c208d0e51cc1",
    "name": "Filter Help"
  },
  {
    "parameters": {
      "resource": "workflow",
      "operation": "get",
      "workflowId": "={{ $workflow.id }}"
    },
    "type": "n8n-nodes-base.n8n",
    "typeVersion": 1,
    "position": [
      -16,
      -336
    ],
    "id": "32ebdafb-c8c7-43a9-8f9f-b98a1a3cc807",
    "name": "Get Workflow Details",
    "credentials": {
      "n8nApi": {
        "id": "YOUR_N8N_CREDENTIAL_ID_HERE",
        "name": "n8n account"
      }
    }
  },
  {
    "parameters": {
      "jsCode": "const event = $('Webhook').item.json.body.events[0];\nconst sourceType = event.source.type;\nconst nodes = $input.item.json.nodes;\n\nlet groupCommands = [];\nlet privateCommands = [];\n\nfor (const node of nodes) {\n  if (node.type === 'n8n-nodes-base.filter' && node.parameters?.conditions?.conditions) {\n    const conditions = node.parameters.conditions.conditions;\n    const triggers = conditions.map(c => c.rightValue).filter(v => v !== undefined && v !== '');\n    \n    if (triggers.length > 0) {\n      let triggerText = triggers.map(t => `'${t}'`).join(' 或 ');\n      let desc = '';\n      let isGroupFriendly = false;\n      \n      if (node.name.includes('Apify')) {\n        desc = '🔍 尋找 Google Maps 上評分熱絡的高評價點 (背後串接 Apify 與 Gemini分析)\\n   格式：好評推薦：[地點或餐廳]';\n        isGroupFriendly = true;\n      } else if (node.name.includes('Get ID')) {\n        desc = '🆔 讀取當前的 LINE User ID 或 Group ID (開發者常用)';\n        isGroupFriendly = true;\n      } else if (node.name.includes('Help')) {\n         continue;\n      } else {\n        desc = `⚙️ 觸發工作流特定功能 (${node.name})`;\n      }\n      \n      const cmdStr = `🔹 輸入 ${triggerText}\\n   ${desc}`;\n      privateCommands.push(cmdStr);\n      if (isGroupFriendly) groupCommands.push(cmdStr);\n    }\n  }\n}\n\n// Add file types triggers manually as they are not simple text equals\nconst fileDesc = `🔹 傳送 [圖片/影片/檔案]\\n   📂 自動備份該檔案至特定的 Google Drive 資料夾`;\nprivateCommands.push(fileDesc);\n\nconst audioDesc = `🔹 傳送 [語音訊息]\\n   🎙️ 利用 Gemini ASR 自動辨識語音並回傳逐字稿 (支援特定群組與私訊)`;\nprivateCommands.push(audioDesc);\ngroupCommands.push(audioDesc);\n\nlet helpMessage = '🤖 【自動化助理功能清單】\\n======================\\n';\n\nif (sourceType === 'group' || sourceType === 'room') {\n  helpMessage += '👥 目前在【群組】環境，以下是推薦使用的功能：\\n\\n';\n  helpMessage += groupCommands.join('\\n\\n');\n  helpMessage += '\\n\\n⚠️ 注意：某些功能 (如檔案備份) 在群組可能被限制或無效。';\n} else {\n  helpMessage += '👤 目前在【私訊】環境，您可使用以下完整功能：\\n\\n';\n  helpMessage += privateCommands.join('\\n\\n');\n}\n\nreturn { json: { helpMessage: helpMessage } };"
    },
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [
      208,
      -336
    ],
    "id": "ac886470-8ff9-49dd-a01b-cfa2b98242f2",
    "name": "Build Help Message"
  },
  {
    "parameters": {
      "method": "POST",
      "url": "https://api.line.me/v2/bot/message/reply",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": true,
      "headerParameters": {
        "parameters": [
          {
            "name": "Content-Type",
            "value": "application/json"
          }
        ]
      },
      "sendBody": true,
      "specifyBody": "json",
      "jsonBody": "={\n  \"replyToken\": \"{{ $('Webhook').item.json.body.events[0].replyToken }}\",\n  \"messages\": [\n    {\n      \"type\": \"text\",\n      \"text\": \"{{ $json.helpMessage }}\"\n    }\n  ]\n}",
      "options": {}
    },
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.3,
    "position": [
      432,
      -336
    ],
    "id": "e30ae1fc-fcd8-4033-bad6-7a87e07eb443",
    "name": "Reply Help Context",
    "credentials": {
      "httpHeaderAuth": {
        "id": "1pCDWzNejw3Uf0MX",
        "name": "高剛！！！"
      }
    }
  }
];

// Append new nodes
workflowData.nodes.push(...newNodes);

// Update connections for Webhook
if (workflowData.connections["Webhook"] && workflowData.connections["Webhook"]["main"] && workflowData.connections["Webhook"]["main"][0]) {
  workflowData.connections["Webhook"]["main"][0].unshift({
    "node": "Filter Help",
    "type": "main",
    "index": 0
  });
}

// Add connections for new nodes
workflowData.connections["Filter Help"] = {
  "main": [
    [
      {
        "node": "Get Workflow Details",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

workflowData.connections["Get Workflow Details"] = {
  "main": [
    [
      {
        "node": "Build Help Message",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

workflowData.connections["Build Help Message"] = {
  "main": [
    [
      {
        "node": "Reply Help Context",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync(workflowPath, JSON.stringify(workflowData, null, 2));
console.log('Workflow successfully updated.');
