const evolutionService = require('./src/services/api');

async function testConnection() {
    console.log('Testing connection to Evolution API...');
    try {
        // 1. Fetch Instances to verify auth
        console.log('Fetching instances...');
        const instances = await evolutionService.fetchInstances();
        console.log('Instances found:', instances.map(i => i.name).join(', '));

        const practiceInstance = instances.find(i => i.name === 'pratica');
        if (practiceInstance) {
            console.log('✅ Instance "pratica" found and connected.');
            console.log('   Status:', practiceInstance.connectionStatus);
            console.log('   Owner:', practiceInstance.ownerJid);
        } else {
            console.error('❌ Instance "pratica" NOT found in the list.');
        }

        // 2. Send Test Message (Optional - comment out if not wanted yet)
        // const testNumber = '5511999999999'; // Replace with a safe number or your own
        // console.log(`Sending test message to ${testNumber}...`);
        // await evolutionService.sendText(testNumber, 'Olá! Teste de conexão do Bot Prática Construtora. 🏗️');
        // console.log('✅ Message sent successfully.');

    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
}

testConnection();
