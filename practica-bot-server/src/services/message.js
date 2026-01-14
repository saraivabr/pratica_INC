const apiService = require('./api');
const aiService = require('./ai');

// Utility for delaying execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class MessageService {
    async processMessage(webhookData) {
        try {
            const eventType = webhookData.event;

            // Only process new messages
            if (eventType !== 'messages.upsert') return;

            const messageData = webhookData.data;
            const key = messageData.key;

            // Ignore own messages
            if (key.fromMe) return;

            const sender = key.remoteJid;
            const pushName = messageData.pushName || 'Cliente';

            // Extract text
            let text = '';
            if (messageData.message.conversation) {
                text = messageData.message.conversation;
            } else if (messageData.message.extendedTextMessage) {
                text = messageData.message.extendedTextMessage.text;
            }

            if (!text) return;

            console.log(`📩 Message from ${pushName}: ${text}`);

            // 0. Advanced Humanization: Mark as Read & Cognitive Delay
            // "I saw your message" (Blue Ticks)
            await apiService.markAsRead([{
                remoteJid: sender,
                fromMe: false,
                id: key.id
            }]);

            // Simulate "Reading/Thinking" time (Humans don't reply instantly after reading)
            await delay(Math.random() * 2000 + 1000); // 1-3 seconds pause

            // 1. Generate AI Response (Single Block)
            const history = []; // TODO: Add persistent history
            const aiResponse = await aiService.generateResponse(text, history);
            console.log(`🤖 AI Full Answer: ${aiResponse}`);

            // 2. Advanced Humanization: Split and Send
            await this.sendHumanizedResponse(sender, aiResponse);

        } catch (error) {
            console.error('Error processing message:', error);
        }
    }

    /**
     * Splits a long text into natural chunks and sends them with typing indicators.
     */
    async sendHumanizedResponse(sender, fullText) {
        // Split by double newlines (paragraphs) or bullet points to keep flow natural
        // If the AI uses single newlines for lists, we might want to keep them together or split carefully.
        // Strategy: Split by double newlines first. If a chunk is still huge, maybe split by single newlines.

        let chunks = fullText.split(/\n\n+/);

        // Filter empty chunks
        chunks = chunks.filter(c => c.trim().length > 0);

        for (const chunk of chunks) {
            const cleanChunk = chunk.trim();
            if (!cleanChunk) continue;

            // Calculate "Typing Time"
            // Average human typing speed: ~5-10 chars per second? Let's say 50ms per char.
            // But cap it so we don't wait 2 minutes for a long text.
            const typingSpeedMsPerChar = 60;
            let typingDuration = cleanChunk.length * typingSpeedMsPerChar;

            // Add some randomness
            typingDuration += Math.random() * 500;

            // Cap min and max
            if (typingDuration < 1500) typingDuration = 1500; // Minimum 1.5s to be noticed
            if (typingDuration > 8000) typingDuration = 8000; // Max 8s wait to not annoy user

            // 1. Send "Composing" status
            console.log(`💬 Typing for ${Math.floor(typingDuration)}ms...`);
            await apiService.sendPresence(sender, 'composing', typingDuration);

            // 2. Wait the duration
            await delay(typingDuration);

            // 3. Send the text chunk
            await apiService.sendText(sender, cleanChunk);

            // 4. Short pause between messages to not flood
            await delay(Math.random() * 1000 + 500);
        }
    }
}

module.exports = new MessageService();
