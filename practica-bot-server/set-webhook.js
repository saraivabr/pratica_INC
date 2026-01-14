const axios = require('axios');
const config = require('./src/config/evolution');

async function setWebhook() {
    const url = `${config.apiUrl}/webhook/set/${config.instanceName}`;
    const webhookUrl = 'https://pratica-bot-server-saraiva.netlify.app/webhook';

    console.log(`Setting Webhook to: ${webhookUrl}`);
    console.log(`Endpoint: ${url}`);

    try {
        const response = await axios.post(url, {
            webhook: {
                enabled: true,
                url: webhookUrl,
                events: [
                    "MESSAGES_UPSERT"
                ]
            }
        }, {
            headers: {
                'apikey': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Webhook Set Successfully:', response.data);
    } catch (error) {
        console.error('❌ Error setting webhook:', error.response ? error.response.data : error.message);
    }
}

setWebhook();
