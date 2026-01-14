const axios = require('axios');
const config = require('../config/evolution');

const api = axios.create({
    baseURL: config.apiUrl,
    headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey
    }
});

class EvolutionService {
    async sendText(number, text) {
        try {
            const response = await api.post(`/message/sendText/${config.instanceName}`, {
                number: number,
                text: text
            });
            return response.data;
        } catch (error) {
            console.error('Error sending message:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async sendPresence(number, presence = 'composing', delay = 1200) {
        try {
            // Evolution API endpoint for setting presence/typing status
            await api.post(`/chat/sendPresence/${config.instanceName}`, {
                number: number,
                presence: presence,
                delay: delay
            });
        } catch (error) {
            // Non-critical error, just log it
            console.warn('Error setting presence:', error.message);
        }
    }

    async markAsRead(readMessages) {
        try {
            await api.post(`/chat/markMessageAsRead/${config.instanceName}`, {
                readMessages: readMessages
            });
        } catch (error) {
            console.warn('Error marking messages as read:', error.message);
        }
    }

    async fetchInstances() {
        try {
            const response = await api.get('/instance/fetchInstances');
            return response.data;
        } catch (error) {
            console.error('Error fetching instances:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

module.exports = new EvolutionService();
