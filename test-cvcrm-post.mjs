#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

const baseUrl = process.env.CVCRM_BASE_URL;
const email = process.env.CVCRM_EMAIL;

// Test IMOBILIARIA with POST
async function testImobiliaria() {
  const token = process.env.CVCRM_TOKEN_IMOBILIARIA;
  console.log('\n🏢 Testando IMOBILIARIA com POST...');
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/cadastros/imobiliarias`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'email': email,
        'token': token
      },
      body: JSON.stringify({ limit: 1 })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  // Try GET with query params
  console.log('\n🔄 Tentando GET com query params...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/cadastros/imobiliarias`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': email,
        'token': token
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Test INFORMAR_VENDA with POST
async function testInformarVenda() {
  const token = process.env.CVCRM_TOKEN_INFORMAR_VENDA;
  console.log('\n💰 Testando INFORMAR_VENDA com POST...');
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/comercial/vendas`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'email': email,
        'token': token
      },
      body: JSON.stringify({ limit: 1 })
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  // Try GET with query params
  console.log('\n🔄 Tentando GET...');
  try {
    const response = await fetch(`${baseUrl}/api/v1/comercial/vendas`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': email,
        'token': token
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Test RESERVA with timeout handling
async function testReserva() {
  const token = process.env.CVCRM_TOKEN_RESERVA;
  console.log('\n🎫 Testando RESERVA com timeout aumentado...');
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s
    
    const response = await fetch(`${baseUrl}/api/v1/comercial/reservas?limit=1`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': email,
        'token': token
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log('Response length:', text.length);
    console.log('Response:', text.substring(0, 500));
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Timeout após 30s');
    } else {
      console.error('❌ Erro:', error.message);
    }
  }
}

async function main() {
  await testImobiliaria();
  await testInformarVenda();
  await testReserva();
}

main();
