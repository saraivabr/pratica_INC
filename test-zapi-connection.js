const INSTANCE_ID = '3ED40028A79321A51CE376A164AA5E9E';
const TOKEN = '636347DC24AEBB3F31F4E04C';
const CLIENT_TOKEN = 'F9992ada0ed6b49a395fc8eb96ee9af70S';
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

async function checkConnection() {
  try {
    console.log('🔍 Verificando conexão Z-API...\n');
    
    const response = await fetch(`${BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Client-Token': CLIENT_TOKEN,
      },
    });

    const data = await response.json();
    
    console.log('📊 Resposta do Z-API:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');
    
    if (data.connected) {
      console.log('✅ Z-API CONECTADO!');
      console.log(`📱 Telefone: ${data.phone || 'N/A'}`);
    } else {
      console.log('❌ Z-API NÃO CONECTADO');
      console.log('🔧 Acesse: https://api.z-api.io/ para reconectar');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar conexão:', error.message);
  }
}

checkConnection();
