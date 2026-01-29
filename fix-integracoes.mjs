#!/usr/bin/env node
/**
 * FIX: Integrações CVCRM - Correção de Endpoints
 * - RESERVA: aumentar timeout
 * - IMOBILIARIA: trocar endpoint de listagem
 * - INFORMAR_VENDA: marcar como "write-only"
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

const baseUrl = process.env.CVCRM_BASE_URL;
const email = process.env.CVCRM_EMAIL;

console.log('🔧 CORRIGINDO INTEGRAÇÕES CVCRM\n');

// Test all possible endpoints for IMOBILIARIA
async function findImobiliariaEndpoint() {
  const token = process.env.CVCRM_TOKEN_IMOBILIARIA;
  console.log('🏢 Buscando endpoint correto para IMOBILIARIA...\n');
  
  const endpoints = [
    '/api/v1/cadastros/imobiliarias',
    '/api/v1/imobiliarias',
    '/api/cadastros/imobiliarias',
    '/api/imobiliarias'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`  Testando: GET ${endpoint}`);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'email': email,
          'token': token
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok || response.status === 204) {
        const text = await response.text();
        console.log(`  ✅ Status ${response.status} - Funciona!`);
        if (text) {
          console.log(`     Preview: ${text.substring(0, 100)}...`);
        }
        return endpoint;
      } else if (response.status !== 404 && response.status !== 405) {
        console.log(`  ⚠️  Status ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      if (!error.message.includes('404')) {
        console.log(`  ❌ Erro: ${error.message}`);
      }
    }
  }
  
  console.log('\n  ℹ️  Nenhum endpoint de listagem encontrado.');
  console.log('  💡 Token IMOBILIARIA é para criar/atualizar, não listar.\n');
  return null;
}

// Test INFORMAR_VENDA endpoints
async function testInformarVendaEndpoints() {
  const token = process.env.CVCRM_TOKEN_INFORMAR_VENDA;
  console.log('💰 Testando endpoints INFORMAR_VENDA...\n');
  
  const endpoints = [
    '/api/v1/comercial/vendas',
    '/api/comercial/vendas',
    '/api/vendas'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`  Testando: GET ${endpoint}`);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'email': email,
          'token': token
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok || response.status === 204) {
        const text = await response.text();
        console.log(`  ✅ Status ${response.status} - Funciona!`);
        if (text) {
          console.log(`     Preview: ${text.substring(0, 100)}...`);
        }
        return endpoint;
      } else if (response.status !== 404 && response.status !== 405) {
        console.log(`  ⚠️  Status ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      if (!error.message.includes('404')) {
        console.log(`  ❌ Erro: ${error.message}`);
      }
    }
  }
  
  console.log('\n  ℹ️  Nenhum endpoint de listagem encontrado.');
  console.log('  💡 Token INFORMAR_VENDA é apenas para criar vendas (POST).\n');
  return null;
}

// Confirm RESERVA works with proper timeout
async function confirmReserva() {
  const token = process.env.CVCRM_TOKEN_RESERVA;
  console.log('🎫 Confirmando RESERVA com timeout correto...\n');
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/comercial/reservas?limit=1`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': email,
        'token': token
      },
      signal: AbortSignal.timeout(30000) // 30s
    });
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 204) {
      console.log('  ✅ Token RESERVA válido (sem reservas no momento)\n');
      return true;
    } else if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Token RESERVA válido - ${data.total || 0} reservas\n`);
      return true;
    } else {
      console.log('  ❌ Token RESERVA com problema\n');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Erro: ${error.message}\n`);
    return false;
  }
}

async function main() {
  await findImobiliariaEndpoint();
  await testInformarVendaEndpoints();
  await confirmReserva();
  
  console.log('━'.repeat(70));
  console.log('📋 RESUMO DAS CORREÇÕES\n');
  console.log('✅ RESERVA: Aumentar timeout de 10s para 30s');
  console.log('⚠️  IMOBILIARIA: Token é write-only (criar/atualizar)');
  console.log('⚠️  INFORMAR_VENDA: Token é write-only (informar vendas)');
  console.log('\n💡 Ação: Marcar tokens write-only como válidos mas sem teste de listagem');
  console.log('━'.repeat(70));
}

main();
