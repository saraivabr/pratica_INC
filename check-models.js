const axios = require('axios');
require('dotenv').config({ path: 'practica-bot-server/.env' });

async function checkModels() {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
        console.error('No API Key found');
        return;
    }

    try {
        console.log('Querying Google API for models...');
        console.log(`Using Key: ${key.substring(0, 10)}...`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await axios.get(url);

        const models = response.data.models;
        if (models) {
            console.log('\n✅ Available Models:');
            models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
                }
            });
        } else {
            console.log('No models found in response.');
        }

    } catch (error) {
        console.error('❌ Error fetching models:', error.response ? error.response.data : error.message);
    }
}

checkModels();
