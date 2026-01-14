const apiService = require('./src/services/api');
const config = require('./src/config/evolution');

async function checkWebhook() {
    console.log('Checking Webhook URL for instance:', config.instanceName);
    try {
        // Fetch instance data
        const instances = await apiService.fetchInstances();
        const instance = instances.find(i => i.name === config.instanceName);

        if (instance) {
            console.log('Instance Data:', JSON.stringify(instance, null, 2));
            if (instance.webhook) {
                console.log('👉 CURRENT WEBHOOK:', instance.webhook);
            } else {
                console.log('❌ No webhook configured in instance object (might need specific endpoint).');
                // Some versions use /webhook/find
            }
        } else {
            console.log('❌ Instance not found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkWebhook();
