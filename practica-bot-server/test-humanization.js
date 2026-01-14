const messageService = require('./src/services/message');
const apiService = require('./src/services/api');

// Mock API Service to visualize timing
apiService.sendText = async (number, text) => {
    console.log(`[${new Date().toISOString()}] 📤 SENT: "${text}"`);
};

apiService.sendPresence = async (number, status, delay) => {
    console.log(`[${new Date().toISOString()}] 👤 STATUS: ${status} (waiting ${delay}ms)`);
};

apiService.markAsRead = async (messages) => {
    console.log(`[${new Date().toISOString()}] 👀 MARK AS READ: ${messages.length} message(s)`);
};

async function testHumanization() {
    console.log('🧪 Testing Humanized Flow...\n');

    const mockMsgKey = { remoteJid: '551199999999', id: 'TEST_MSG_ID_123' };

    // Simulate the flow manually as seen in message.js since we can't easily trigger the full class method without a real webhook payload in this simple script
    console.log("--- Simulating Full Flow ---");

    // 0. Mark Read
    await apiService.markAsRead([mockMsgKey]);

    // Cognitive Delay
    console.log("... Thinking (Cognitive Delay) ...");
    await new Promise(r => setTimeout(r, 1500));

    // Simulating a long AI response usually returned by Gemini
    const mockAIResponse = `Oii! Tudo bem com vc? 😊

Aqui é a Priscila da Prática Construtora. Que legal falar contigo!

Temos opções maravilhosas na Zona Leste. O Aura, por exemplo, fica a 260m do metrô e tá um sucesso absoluto! 🚀

Vc prefere visitar o decorado ou quer que eu te mande a tabela de preços primeiro?`;

    // Injecting the mock response directly into the splitter logic would require refactoring or mocking aiService.
    // Let's just call sendHumanizedResponse directly since it's a method on the instance.

    const targetNumber = '551199999999';

    await messageService.sendHumanizedResponse(targetNumber, mockAIResponse);

    console.log('\n✅ Test Complete.');
}

testHumanization();
