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
                    maxOutputTokens: 2000, // Increased for 2.5
                    temperature: 0.7,
                },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            const text = response.text();

            return text;
        } catch (error) {
            console.error('❌ Error generating AI response:', error);
            // Fallback strategy if systemInstruction fails on this specific model version in SDK
            if (error.message && error.message.includes('not supported')) {
                return this.generateResponseLegacy(userMessage, history);
            }
            return "Desculpe, estou com uma instabilidade momentânea no meu sistema inteligente. Pode aguardar um instante ou tentar novamente?";
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
