const aiService = require('./src/services/ai');

async function testAI() {
    console.log('🤖 Testing Gemini AI...');

    const questions = [
        "Olá, gostaria de saber sobre apartamentos na zona leste.",
        "Qual o valor do Aura?",
        "Aceita financiamento minha casa minha vida?",
        "Onde fica o escritório de vocês?"
    ];

    for (const q of questions) {
        console.log(`\n👤 User: ${q}`);
        // Passing empty history for this simple test
        const answer = await aiService.generateResponse(q, []);
        console.log(`🤖 Bot: ${answer}`);
    }
}

testAI();
