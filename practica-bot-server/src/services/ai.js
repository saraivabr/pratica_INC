const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fileLoader = require('./fileLoader');

class AIService {
    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY || 'AIzaSyCGWRrjSlc44uxrsrKBq6YYC1Ls_TGAYT8';
        if (!apiKey) {
            console.error('❌ GOOGLE_API_KEY is missing');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = null;
        this.context = '';
        this.init();
    }

    init() {
        this.context = fileLoader.loadContext();
        // Updated to use the user-requested and verified model
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            // Recent models support systemInstruction naturally
            systemInstruction: this.context
        });
    }

    async generateResponse(userMessage, history = []) {
        try {
            const chat = this.model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 2000,
                    temperature: 0.7,
                },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            const text = response.text();

            return text;
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            if (error.message && error.message.includes('not supported')) {
                return this.generateResponseLegacy(userMessage, history);
            }
            return "Puxa, tive um probleminha aqui no meu sistema... 😅 Pode repetir o que você disse? Quero muito te ajudar!";
        }
    }

    /**
     * Extracts structured lead information from the conversation.
     * Use this for internal tracking and notifications.
     */
    async extractLeadInfo(userMessage, history = []) {
        try {
            const extractionModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
                Analise a conversa abaixo e extraia dados do LEAD no formato JSON.
                JSON Schema: { name: string, property: string, budget: string, intent: 'low'|'medium'|'high', summary: string }
                
                Histórico: ${JSON.stringify(history)}
                Mensagem Atual: ${userMessage}
                
                Se não encontrar algum dado, deixe null. 
                intent 'high' é para quando o cliente quer visitar ou saber preço sério.
                Retorne APENAS o JSON.
            `;

            const result = await extractionModel.generateContent(prompt);
            const response = await result.response;
            const text = response.text().replace(/```json|```/g, '').trim();

            return JSON.parse(text);
        } catch (error) {
            console.warn('⚠️ Could not extract lead info:', error.message);
            return null;
        }
    }

    // Fallback for models that might not support systemInstruction param in this SDK version
    async generateResponseLegacy(userMessage, history) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const chat = model.startChat({ history: history });
            const fullPrompt = `${this.context}\n\nUser: ${userMessage}`;
            const result = await chat.sendMessage(fullPrompt);
            return result.response.text();
        } catch (e) {
            console.error('❌ Legacy fallback failed:', e);
            return "Erro crítico no sistema de IA.";
        }
    }
}

module.exports = new AIService();
