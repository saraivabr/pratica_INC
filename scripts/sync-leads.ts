#!/usr/bin/env npx tsx
/**
 * Script de Sincronização de Leads - CV CRM -> PostgreSQL
 *
 * Uso: npx tsx scripts/sync-leads.ts
 */

import { Pool } from 'pg';

// Configurações
const CONFIG = {
  cvcrm: {
    baseUrl: 'https://pratica.cvcrm.com.br',
    email: 'orcioli@pratica-inc.com.br',
    token: process.env.CVCRM_TOKEN_LEAD || ''
  },
  db: {
    connectionString: process.env.DATABASE_URL || ''
  },
  rateLimit: {
    delayMs: 350
  }
};

const pool = new Pool({ connectionString: CONFIG.db.connectionString });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCVCRM(endpoint: string, params: Record<string, any> = {}) {
  const url = new URL(`${CONFIG.cvcrm.baseUrl}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString(), {
    headers: {
      'accept': 'application/json',
      'email': CONFIG.cvcrm.email,
      'token': CONFIG.cvcrm.token
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CV CRM API error: ${response.status} - ${text}`);
  }

  return response.json();
}

async function syncLeads() {
  console.log('\n🎯 Sincronizando Leads...');

  let offset = 0;
  const limit = 100;
  let total = 0, created = 0, updated = 0;

  while (true) {
    const data = await fetchCVCRM('/api/v1/comercial/leads', { limit, offset });
    const leads = data.leads || data.data || [];

    if (leads.length === 0) break;

    for (const lead of leads) {
      try {
        const result = await pool.query(`
          INSERT INTO cvcrm_leads (
            idlead, nome, email, telefone, documento,
            data_cad, origem, midia_principal, midias,
            score, corretor_id, corretor, imobiliaria_id, imobiliaria,
            situacao_id, situacao, empreendimento,
            sexo, profissao, cep, endereco, bairro, cidade, estado,
            renda_familiar, valor_negocio
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
          ON CONFLICT (idlead) DO UPDATE SET
            nome = EXCLUDED.nome,
            email = EXCLUDED.email,
            telefone = EXCLUDED.telefone,
            documento = EXCLUDED.documento,
            origem = EXCLUDED.origem,
            midia_principal = EXCLUDED.midia_principal,
            midias = EXCLUDED.midias,
            corretor_id = EXCLUDED.corretor_id,
            corretor = EXCLUDED.corretor,
            imobiliaria_id = EXCLUDED.imobiliaria_id,
            imobiliaria = EXCLUDED.imobiliaria,
            situacao_id = EXCLUDED.situacao_id,
            situacao = EXCLUDED.situacao,
            empreendimento = EXCLUDED.empreendimento,
            score = EXCLUDED.score
          RETURNING (xmax = 0) as inserted
        `, [
          lead.idlead,
          lead.nome,
          lead.email,
          lead.telefone || lead.celular,
          lead.cpf || lead.documento,
          lead.data_cadastro ? new Date(lead.data_cadastro) : null,
          lead.origem?.nome || lead.origem,
          lead.midia?.nome || lead.midia,
          JSON.stringify(lead.midias || []),
          lead.score,
          lead.corretor?.idcorretor || lead.idcorretor,
          JSON.stringify(lead.corretor || {}),
          lead.imobiliaria?.idimobiliaria || lead.idimobiliaria,
          JSON.stringify(lead.imobiliaria || {}),
          lead.situacao?.idsituacao || lead.idsituacao,
          JSON.stringify(lead.situacao || {}),
          JSON.stringify(lead.empreendimentos || lead.empreendimento || []),
          lead.sexo,
          lead.profissao,
          lead.cep,
          lead.endereco,
          lead.bairro,
          lead.cidade,
          lead.estado,
          lead.renda_familiar ? parseFloat(lead.renda_familiar) : null,
          lead.valor_negocio ? parseFloat(lead.valor_negocio) : null
        ]);

        if (result.rows[0]?.inserted) created++;
        else updated++;
      } catch (error: any) {
        console.log(`   ⚠️ Erro no lead ${lead.idlead}: ${error.message}`);
      }
    }

    total += leads.length;
    if (total % 500 === 0 || leads.length < limit) {
      console.log(`   Processados: ${total} leads (${created} novos, ${updated} atualizados)`);
    }

    offset += limit;
    await sleep(CONFIG.rateLimit.delayMs);
  }

  return { created, updated, total };
}

async function main() {
  console.log('🚀 Sincronização de Leads CV CRM -> PostgreSQL');
  console.log('=' .repeat(55));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔗 API: ${CONFIG.cvcrm.baseUrl}`);
  console.log('=' .repeat(55));

  const startTime = Date.now();

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco de dados OK');

    const results = await syncLeads();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '=' .repeat(55));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO DE LEADS');
    console.log('=' .repeat(55));
    console.log(`Total:      ${results.total} leads`);
    console.log(`Criados:    ${results.created}`);
    console.log(`Atualizados: ${results.updated}`);
    console.log('-'.repeat(55));
    console.log(`⏱️  Tempo total: ${elapsed} segundos`);
    console.log('=' .repeat(55));
    console.log('✅ Sincronização de leads concluída com sucesso!');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
