const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const line = envContent.split('\n').find(l => l.startsWith(`${key}=`));
  return line?.replace(`${key}=`, '').trim();
};

const CVCRM_BASE_URL = getEnv('CVCRM_BASE_URL');
const CVCRM_TOKEN_EMPREENDIMENTO = getEnv('CVCRM_TOKEN_EMPREENDIMENTO');

async function testCVCRM() {
  console.log('\n🏢 TESTE CVCRM API');
  console.log('==================\n');

  if (!CVCRM_BASE_URL || !CVCRM_TOKEN_EMPREENDIMENTO) {
    console.log('❌ Variáveis CVCRM não configuradas');
    return;
  }

  console.log(`📍 Base URL: ${CVCRM_BASE_URL}`);
  console.log(`🔑 Token: ${CVCRM_TOKEN_EMPREENDIMENTO.substring(0, 20)}...\n`);

  try {
    console.log('🔍 Buscando empreendimentos...');
    const response = await fetch(`${CVCRM_BASE_URL}/empreendimento`, {
      headers: {
        'token': CVCRM_TOKEN_EMPREENDIMENTO
      }
    });

    if (!response.ok) {
      console.log(`❌ Erro HTTP: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json();
    
    if (data.dados && Array.isArray(data.dados)) {
      console.log(`✅ ${data.dados.length} empreendimentos encontrados\n`);
      console.log('📋 Primeiros 5:');
      data.dados.slice(0, 5).forEach((emp, i) => {
        console.log(`   ${i + 1}. ${emp.nome} (${emp.cidade || 'N/A'})`);
      });
    } else {
      console.log('⚠️  Resposta em formato inesperado');
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    }

    console.log('\n==================');
    console.log('✅ Teste CVCRM concluído!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testCVCRM();
