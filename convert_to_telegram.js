const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('My workflow.json', 'utf8'));

    // 1. Rename Webhook to Telegram Trigger
    data.nodes.forEach(node => {
        if (node.name === 'Webhook') {
            node.name = 'Telegram Trigger';
            node.type = 'n8n-nodes-base.telegramTrigger';
            node.typeVersion = 1.1; // Standard version
            node.parameters = {
                updates: ["message"],
                download: true // Auto download attachments/voice
            };
            node.credentials = {
                telegramApi: {
                    id: "YOUR_TELEGRAM_CREDENTIAL_ID",
                    name: "Telegram account"
                }
            };
            // remove webhookId and httpMethod
            delete node.webhookId;
            delete node.httpMethod;
            delete node.path;
        }
    });

    // Update connections mapping from Webhook to Telegram Trigger
    if (data.connections['Webhook']) {
        data.connections['Telegram Trigger'] = data.connections['Webhook'];
        delete data.connections['Webhook'];
    }

    // 2. Global Expression Regex Replacements
    let jsonStr = JSON.stringify(data);

    // Replace references to Webhook node's data
    jsonStr = jsonStr.replace(/\$json\.body\.events\[0\]\.message\.text/g, '$json.message.text');
    jsonStr = jsonStr.replace(/\$json\.body\.events\[0\]\.message\.type/g, 'messageType'); // We'll handle type logic manually
    jsonStr = jsonStr.replace(/\$json\.body\.events\[0\]\.source\.groupId \|\| \$json\.body\.events\[0\]\.source\.userId/g, '$json.message.chat.id');
    jsonStr = jsonStr.replace(/\$\('Webhook'\)\.item\.json\.body\.events\[0\]\.message\.text/g, "$('Telegram Trigger').item.json.message.text");
    jsonStr = jsonStr.replace(/\$\('Webhook'\)\.item\.json\.body\.events\[0\]\.replyToken/g, "$('Telegram Trigger').item.json.message.chat.id"); // ReplyToken replaced by Chat ID for telegram
    jsonStr = jsonStr.replace(/\$\('Webhook'\)\.item\.json\.body\.events\[0\]/g, "$('Telegram Trigger').item.json.message");

    const workflow = JSON.parse(jsonStr);

    // 3. Node-specific updates
    const nodesToRemove = ['Get File Content', 'HTTP Request Audio DL1'];

    workflow.nodes = workflow.nodes.filter(n => !nodesToRemove.includes(n.name));

    workflow.nodes.forEach(node => {

        // --- FILTERS ---
        if (node.name === 'Filter Drive') {
            node.parameters.conditions = {
                options: {},
                combinator: "or",
                conditions: [
                    {
                        id: "t-img",
                        leftValue: "={{ $json.message.photo ? true : false }}",
                        rightValue: "={{ true }}",
                        operator: { type: "boolean", operation: "true" }
                    },
                    {
                        id: "t-vid",
                        leftValue: "={{ $json.message.video ? true : false }}",
                        rightValue: "={{ true }}",
                        operator: { type: "boolean", operation: "true" }
                    },
                    {
                        id: "t-doc",
                        leftValue: "={{ $json.message.document ? true : false }}",
                        rightValue: "={{ true }}",
                        operator: { type: "boolean", operation: "true" }
                    }
                ]
            };
        }

        if (node.name === 'Filter Audio1') {
            node.parameters.conditions = {
                options: {},
                combinator: "and",
                conditions: [
                    {
                        id: "t-voice",
                        leftValue: "={{ $json.message.voice ? true : false }}",
                        rightValue: "={{ true }}",
                        operator: { type: "boolean", operation: "true" }
                    }
                ]
            };
        }

        // --- REPLIES ---
        const replyNodesMap = {
            'Reply Group ID1': true,
            'Reply Upload Success': true,
            'HTTP Request Audio Reply1': true,
            'Reply Email Success': true,
            'Reply Help Context': true
        };

        if (replyNodesMap[node.name]) {
            // Extract text from LINE JSON Body
            let replyText = "";
            try {
                const bodyStr = node.parameters.jsonBody;
                if (bodyStr) {
                    const match = bodyStr.match(/"text":\s*"(.*?)"\n*\s*\}/);
                    if (match && match[1]) {
                        replyText = match[1].replace(/\\n/g, '\n');
                    } else {
                        // Fallback regex if formatting differs
                        const match2 = bodyStr.match(/"text":\s*"([\s\S]*?)"\s*\}/);
                        if (match2) replyText = match2[1].replace(/\\n/g, '\n');
                    }
                }
            } catch (e) {
                replyText = "Operation Successful";
            }

            node.type = 'n8n-nodes-base.telegram';
            node.typeVersion = 1.2;
            node.parameters = {
                resource: 'message',
                operation: 'sendMessage',
                chatId: "={{ $('Telegram Trigger').item.json.message.chat.id }}",
                text: `=${replyText}`
            };
            node.credentials = {
                telegramApi: {
                    id: "YOUR_TELEGRAM_CREDENTIAL_ID",
                    name: "Telegram account"
                }
            };
        }

        // --- CODE STRINGS ---
        if (node.type === 'n8n-nodes-base.code' && node.parameters.jsCode) {
            let code = node.parameters.jsCode;

            // Replace LINE event extraction with Telegram
            // LINE: const event = items[0].json.body.events[0];
            // TELEGRAM: const event = items[0].json.message;
            code = code.replace(/const event = items\[0\]\.json\.body\.events\[0\];/g, 'const event = items[0].json.message;');
            code = code.replace(/const event = \$\('Webhook'\)\.item\.json\.body\.events\[0\];/g, 'const event = $(\'Telegram Trigger\').item.json.message;');

            // Group/User logic
            code = code.replace(/const sourceId = event\.source\.groupId \|\| event\.source\.userId;/g, 'const sourceId = event.chat.id;');
            code = code.replace(/const sourceType = event\.source\.type;/g, 'const sourceType = event.chat.type; // private, group, supergroup');

            // Help node event parsing
            code = code.replace(/sourceType === 'room'/g, 'sourceType === \'supergroup\'');

            node.parameters.jsCode = code;
        }

        // --- GOOGLE DRIVE UPLOAD ---
        if (node.name === 'Google Drive Upload') {
            // Assuming download:true places binary in "data" or "download" property. Usually it's "data".
            // Or if property doesn't exist it defaults to 'data'.
            node.parameters.binaryPropertyName = 'data';
            node.parameters.name = "={{ $json.message.document?.file_name || 'telegram_file_' + $now.format('yyyyMMdd_HHmmss') }}";
        }

    });

    // 4. Update Connections for bypassed HTTP downloads
    // LINE: Determine Folder1 -> Get File Content -> Google Drive Upload
    // TG:   Determine Folder1 -> Google Drive Upload
    if (workflow.connections['Determine Folder1']) {
        workflow.connections['Determine Folder1']['main'][0] = [
            { node: 'Google Drive Upload', type: 'main', index: 0 }
        ];
    }

    // LINE: Check Voice Permission1 -> HTTP Request Audio DL1 -> Analyze audio1
    // TG:   Check Voice Permission1 -> Analyze audio1
    if (workflow.connections['Check Voice Permission1']) {
        workflow.connections['Check Voice Permission1']['main'][0] = [
            { node: 'Analyze audio1', type: 'main', index: 0 }
        ];
    }

    // 5. Final JSON property
    workflow.name = "Telegram Workflow Migration";

    fs.writeFileSync('Telegram workflow.json', JSON.stringify(workflow, null, 2));
    console.log('Conversion successful. Wrote to Telegram workflow.json');
} catch (error) {
    console.error('Error during conversion:', error);
}
