const config = require('../config/evolution');
const axios = require('axios');

/**
 * NotifierService handles alerts for the sales team.
 * For now, it logs the alert, but it's ready to send a message to a specific manager number.
 */
class NotifierService {
    constructor() {
        // You can set a MANAGER_NUMBER in .env to receive these alerts
        this.managerNumber = process.env.MANAGER_NUMBER || null;
    }

    async notifyHotLead(leadData) {
        const message = `🔥 *NOVO LEAD QUENTE DETECTADO!* 🔥\n\n` +
            `👤 *Nome:* ${leadData.name || 'Não informado'}\n` +
            `🏢 *Interesse:* ${leadData.property || 'Não informado'}\n` +
            `💰 *Budget:* ${leadData.budget || 'Não informado'}\n` +
            `📝 *Resumo:* ${leadData.summary || 'Interessado em agendar visita.'}\n\n` +
            `🚀 Priscila está no comando, mas fique de olho!`;

        console.log('--- NOTIFICATION ---');
        console.log(message);
        console.log('--------------------');

        if (this.managerNumber) {
            try {
                // Send text to manager via Evolution API
                await axios.post(`${config.apiUrl}/message/sendText/${config.instanceName}`, {
                    number: this.managerNumber,
                    text: message
                }, {
                    headers: { 'apikey': config.apiKey }
                });
                console.log('✅ Notification sent to manager:', this.managerNumber);
            } catch (error) {
                console.error('❌ Failed to send manager notification:', error.message);
            }
        }
    }
}

module.exports = new NotifierService();
