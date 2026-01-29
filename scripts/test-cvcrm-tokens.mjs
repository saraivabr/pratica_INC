import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

const TOKENS = {
    LEAD: process.env.CVCRM_TOKEN_LEAD,
    EMPREENDIMENTO: process.env.CVCRM_TOKEN_EMPREENDIMENTO,
    UNIDADE: process.env.CVCRM_TOKEN_UNIDADE,
    CORRETOR: process.env.CVCRM_TOKEN_CORRETOR,
    IMOBILIARIA: process.env.CVCRM_TOKEN_IMOBILIARIA,
    USUARIO: process.env.CVCRM_TOKEN_USUARIO
};

const ENDPOINTS = {
    LEAD: '/api/v1/comercial/leads?limit=1',
    EMPREENDIMENTO: '/api/v1/cadastros/empreendimentos?limit=1',
    UNIDADE: '/api/cvio/unidade', // Requires POST
    CORRETOR: '/api/v1/cadastros/corretores?limit=1',
    IMOBILIARIA: '/api/v1/cadastros/imobiliarias?limit=1',
    USUARIO: '/api/v1/cadastros/usuarios?limit=1'
};

async function testToken(name, endpoint, token) {
    console.log(`Testing ${name}...`);
    if (!token) {
        console.log(`❌ ${name}: Token missing in .env.local`);
        return;
    }

    const url = `${BASE_URL}${endpoint}`;
    const method = name === 'UNIDADE' ? 'POST' : 'GET';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'accept': 'application/json',
                'email': EMAIL,
                'token': token,
                'Content-Type': 'application/json'
            },
            body: method === 'POST' ? JSON.stringify({}) : undefined
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ ${name}: SUCCESS (HTTP ${response.status})`);
            // console.log(JSON.stringify(data).slice(0, 100) + '...');
        } else {
            const text = await response.text();
            console.log(`❌ ${name}: FAILED (HTTP ${response.status}) - ${text.slice(0, 100)}`);
        }
    } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
    }
}

async function runTests() {
    console.log("--- CV CRM Token Validation ---");
    console.log(`URL: ${BASE_URL}`);
    console.log(`Email: ${EMAIL}`);
    console.log("");

    for (const name of Object.keys(TOKENS)) {
        await testToken(name, ENDPOINTS[name], TOKENS[name]);
    }
}

runTests();
