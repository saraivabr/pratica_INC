#!/usr/bin/env node

/**
 * MONITOR DE TOKENS CVCRM
 * Valida todos os tokens e alerta sobre problemas
 * Uso: node scripts/monitor-tokens.mjs
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config({ path: '.env.local' });

const TOKENS = {
  LEAD: process.env.CVCRM_TOKEN_LEAD,
  EMPREENDIMENTO: process.env.CVCRM_TOKEN_EMPREENDIMENTO,
  UNIDADE: process.env.CVCRM_TOKEN_UNIDADE,
  SERIE: process.env.CVCRM_TOKEN_SERIE,
  RESERVA: process.env.CVCRM_TOKEN_RESERVA,
  CORRETOR: process.env.CVCRM_TOKEN_CORRETOR,
  IMOBILIARIA: process.env.CVCRM_TOKEN_IMOBILIARIA,
  DISPONIBILIDADE: process.env.CVCRM_TOKEN_DISPONIBILIDADE,
  INFORMAR_VENDA: process.env.CVCRM_TOKEN_INFORMAR_VENDA
};

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

const ENDPOINTS = {
  LEAD: '/api/v1/comercial/leads?limit=1',
  EMPREENDIMENTO: '/api/v1/cadastros/empreendimentos?limit=1',
  UNIDADE: '/api/cvio/unidade?limit=1',
  SERIE: '/api/cvio/serie?limit=1',
  RESERVA: '/api/v1/comercial/reservas?limit=1',
  CORRETOR: '/api/v1/cadastros/corretores?limit=1',
  DISPONIBILIDADE: '/api/cvio/unidade/situacao?limit=1'
};

const WRITE_ONLY = ['IMOBILIARIA', 'INFORMAR_VENDA'];

/**
 * @typedef {Object} TokenStatus
 * @property {string} name
 * @property {'OK'|'WARNING'|'FAIL'|'WRITE_ONLY'} status
 * @property {number} [httpStatus]
 * @property {string} message
 * @property {string} timestamp
 */

const results = [];

async function testToken(name, token) {
  const timestamp = new Date().toISOString();

  // Write-only tokens
  if (WRITE_ONLY.includes(name)) {
    return {
      name,
      status: 'WRITE_ONLY',
      message: 'Token write-only (não requer teste de leitura)',
      timestamp
    };
  }

  // Missing token
  if (!token) {
    return {
      name,
      status: 'FAIL',
      message: 'Token não configurado no .env',
      timestamp
    };
  }

  const endpoint = ENDPOINTS[name];
  if (!endpoint) {
    return {
      name,
      status: 'WARNING',
      message: 'Endpoint não mapeado',
      timestamp
    };
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': EMAIL,
        'token': token
      },
      signal: AbortSignal.timeout(30000)
    });

    if (response.status === 204) {
      return {
        name,
        status: 'OK',
        httpStatus: 204,
        message: 'Token válido (sem conteúdo)',
        timestamp
      };
    } else if (response.ok) {
      const data = await response.json();
      const count = data.total || data.registros?.length || 0;
      return {
        name,
        status: 'OK',
        httpStatus: response.status,
        message: `${count} registros disponíveis`,
        timestamp
      };
    } else if (response.status === 204) {
      return {
        name,
        status: 'OK',
        httpStatus: 204,
        message: 'Token válido (sem conteúdo)',
        timestamp
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        name,
        status: 'FAIL',
        httpStatus: response.status,
        message: 'Token inválido ou expirado',
        timestamp
      };
    } else {
      return {
        name,
        status: 'WARNING',
        httpStatus: response.status,
        message: `HTTP ${response.status} - ${response.statusText}`,
        timestamp
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    
    if (message.includes('timeout')) {
      return {
        name,
        status: 'WARNING',
        message: 'Timeout (>30s) - endpoint lento',
        timestamp
      };
    }

    return {
      name,
      status: 'FAIL',
      message: message,
      timestamp
    };
  }
}

async function monitorAllTokens() {
  console.log('🔐 MONITOR DE TOKENS CVCRM');
  console.log('═'.repeat(70));
  console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(`📧 Email: ${EMAIL}`);
  console.log('═'.repeat(70));
  console.log('');

  // Test all tokens
  for (const [name, token] of Object.entries(TOKENS)) {
    const result = await testToken(name, token);
    results.push(result);

    const icon = 
      result.status === 'OK' ? '✅' :
      result.status === 'WRITE_ONLY' ? '📝' :
      result.status === 'WARNING' ? '⚠️' : '❌';

    console.log(`${icon} ${name.padEnd(20)} ${result.status.padEnd(12)} ${result.message}`);
  }

  console.log('');
  console.log('═'.repeat(70));

  // Summary
  const ok = results.filter(r => r.status === 'OK' || r.status === 'WRITE_ONLY').length;
  const warning = results.filter(r => r.status === 'WARNING').length;
  const fail = results.filter(r => r.status === 'FAIL').length;

  console.log('📊 RESUMO:');
  console.log(`   ✅ OK/Write-only: ${ok}`);
  console.log(`   ⚠️  Avisos:        ${warning}`);
  console.log(`   ❌ Falhas:        ${fail}`);
  console.log('');

  const health = Math.round((ok / results.length) * 100);
  console.log(`🏥 Saúde: ${health}%`);
  console.log('═'.repeat(70));

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { ok, warning, fail, health: `${health}%` },
    tokens: results
  };

  const reportPath = './logs/token-monitor-' + new Date().toISOString().split('T')[0] + '.json';
  
  // Ensure logs directory exists
  if (!fs.existsSync('./logs')) {
    fs.mkdirSync('./logs', { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Relatório salvo: ${reportPath}`);

  // Alert if critical issues
  if (fail > 0) {
    console.log('');
    console.log('🚨 ALERTA: Tokens com falha crítica detectados!');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
  }

  if (warning > 0) {
    console.log('');
    console.log('⚠️  ATENÇÃO: Tokens com avisos detectados:');
    results
      .filter(r => r.status === 'WARNING')
      .forEach(r => console.log(`   - ${r.name}: ${r.message}`));
  }

  // Exit with error code if any failures
  process.exit(fail > 0 ? 1 : 0);
}

// Check recent reports
function checkRecentReports() {
  const logsDir = './logs';
  if (!fs.existsSync(logsDir)) return;

  const reports = fs.readdirSync(logsDir)
    .filter(f => f.startsWith('token-monitor-') && f.endsWith('.json'))
    .sort()
    .reverse()
    .slice(0, 7); // Last 7 days

  if (reports.length > 0) {
    console.log('\n📅 Histórico (últimos 7 dias):');
    reports.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(logsDir, file), 'utf8'));
        const date = file.replace('token-monitor-', '').replace('.json', '');
        console.log(`   ${date}: ${data.summary.health} (${data.summary.ok} OK, ${data.summary.fail} fail)`);
      } catch (error) {
        // Ignore invalid files
      }
    });
  }
}

// Main
async function main() {
  checkRecentReports();
  await monitorAllTokens();
}

main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
