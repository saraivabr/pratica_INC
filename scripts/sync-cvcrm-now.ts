#!/usr/bin/env npx tsx
/**
 * Script de Sincronização CV CRM -> PostgreSQL
 * Sincroniza: Leads, Empreendimentos, Corretores, Unidades, Séries
 *
 * Uso: npx tsx scripts/sync-cvcrm-now.ts
 */

import { Pool } from 'pg';

// Configurações
const CONFIG = {
  cvcrm: {
    baseUrl: 'https://pratica.cvcrm.com.br',
    email: 'orcioli@pratica-inc.com.br',
    token: '0d06bcd2704de36ba8fadbb1c282cab646d1b256'
  },
  db: {
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:356d20e7786bbbe6f375@84.247.128.56:3005/pratica?sslmode=disable'
  },
  rateLimit: {
    delayMs: 350 // ~171 req/min
  }
};

const pool = new Pool({ connectionString: CONFIG.db.connectionString });

// Helpers
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

// ============================================
// SYNC: EMPREENDIMENTOS
// ============================================
async function syncEmpreendimentos() {
  console.log('\n📦 Sincronizando Empreendimentos...');

  const data = await fetchCVCRM('/api/v1/cadastros/empreendimentos');
  const empreendimentos = Array.isArray(data) ? data : data.empreendimentos || [];

  console.log(`   Encontrados: ${empreendimentos.length} empreendimentos`);

  let created = 0, updated = 0;

  for (const emp of empreendimentos) {
    const result = await pool.query(`
      INSERT INTO cvcrm_empreendimentos (
        cvcrm_id, nome, descricao, tipo, status,
        endereco_completo, cep, cidade, uf,
        data_lancamento, data_entrega_prevista, total_unidades,
        cvcrm_data, synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (cvcrm_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        tipo = EXCLUDED.tipo,
        status = EXCLUDED.status,
        endereco_completo = EXCLUDED.endereco_completo,
        cep = EXCLUDED.cep,
        cidade = EXCLUDED.cidade,
        uf = EXCLUDED.uf,
        total_unidades = EXCLUDED.total_unidades,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) as inserted
    `, [
      emp.idempreendimento,
      emp.nome,
      emp.descricao || emp.titulo,
      emp.tipo_empreendimento?.[0]?.nome || 'Vertical',
      emp.situacao_comercial?.[0]?.nome || 'Ativo',
      emp.endereco,
      emp.cep,
      emp.cidade,
      emp.sigla || emp.estado?.substring(0, 2),
      null, // data_lancamento
      emp.data_entrega ? new Date(emp.data_entrega.split('/').reverse().join('-')) : null,
      emp.unidades_disponiveis,
      JSON.stringify(emp)
    ]);

    if (result.rows[0]?.inserted) created++;
    else updated++;

    await sleep(50);
  }

  console.log(`   ✅ Criados: ${created}, Atualizados: ${updated}`);
  return { created, updated, total: empreendimentos.length };
}

// ============================================
// SYNC: CORRETORES
// ============================================
async function syncCorretores() {
  console.log('\n👥 Sincronizando Corretores...');

  let offset = 0;
  const limit = 100;
  let total = 0, created = 0, updated = 0;

  while (true) {
    const data = await fetchCVCRM('/api/v1/cadastros/corretores', { limit, offset });
    const corretores = data.corretores || [];

    if (corretores.length === 0) break;

    for (const cor of corretores) {
      const result = await pool.query(`
        INSERT INTO cvcrm_corretores (
          cvcrm_id, nome, cpf, email, telefone, celular,
          creci, creci_uf, categoria, nivel, time,
          imobiliaria_id, imobiliaria_nome, ativo,
          cvcrm_data, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        ON CONFLICT (cvcrm_id) DO UPDATE SET
          nome = EXCLUDED.nome,
          cpf = EXCLUDED.cpf,
          email = EXCLUDED.email,
          telefone = EXCLUDED.telefone,
          celular = EXCLUDED.celular,
          creci = EXCLUDED.creci,
          creci_uf = EXCLUDED.creci_uf,
          categoria = EXCLUDED.categoria,
          nivel = EXCLUDED.nivel,
          time = EXCLUDED.time,
          imobiliaria_id = EXCLUDED.imobiliaria_id,
          ativo = EXCLUDED.ativo,
          cvcrm_data = EXCLUDED.cvcrm_data,
          synced_at = NOW(),
          updated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `, [
        cor.idcorretor,
        cor.nome,
        cor.documento,
        cor.email,
        cor.telefone,
        cor.celular,
        cor.dados_creci?.creci,
        cor.dados_creci?.estado_creci,
        cor.categoria,
        cor.nivel,
        cor.time,
        cor.idimobiliaria,
        null, // imobiliaria_nome
        cor.ativo_login === 'S',
        JSON.stringify(cor)
      ]);

      if (result.rows[0]?.inserted) created++;
      else updated++;
    }

    total += corretores.length;
    console.log(`   Processados: ${total} corretores...`);

    offset += limit;
    await sleep(CONFIG.rateLimit.delayMs);
  }

  console.log(`   ✅ Criados: ${created}, Atualizados: ${updated}`);
  return { created, updated, total };
}

// ============================================
// SYNC: LEADS (tabela usa idlead em vez de cvcrm_id)
// ============================================
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
    }

    total += leads.length;
    if (total % 500 === 0) {
      console.log(`   Processados: ${total} leads...`);
    }

    offset += limit;
    await sleep(CONFIG.rateLimit.delayMs);

    // Limite de segurança para não travar
    if (total >= 25000) {
      console.log('   ⚠️ Limite de segurança atingido (25.000 leads)');
      break;
    }
  }

  console.log(`   ✅ Criados: ${created}, Atualizados: ${updated}`);
  return { created, updated, total };
}

// ============================================
// SYNC: UNIDADES (Espelho de Vendas)
// ============================================
async function syncUnidades() {
  console.log('\n🏠 Sincronizando Unidades (Espelho de Vendas)...');

  // Primeiro, buscar todos os empreendimentos
  const empResult = await pool.query('SELECT cvcrm_id FROM cvcrm_empreendimentos');
  const empreendimentoIds = empResult.rows.map(r => r.cvcrm_id);

  console.log(`   Empreendimentos para sincronizar: ${empreendimentoIds.length}`);

  let total = 0, created = 0, updated = 0;

  for (const empId of empreendimentoIds) {
    try {
      const data = await fetchCVCRM(`/api/cvio/empreendimento/${empId}/unidades`);

      // Extrair unidades de todas as etapas/blocos
      const unidades: any[] = [];
      if (data.etapas) {
        for (const etapa of data.etapas) {
          for (const bloco of etapa.blocos || []) {
            for (const unidade of bloco.unidades || []) {
              unidades.push({
                ...unidade,
                empreendimento_id: empId,
                empreendimento_nome: data.nome,
                bloco_nome: bloco.nome,
                etapa_nome: etapa.nome
              });
            }
          }
        }
      }

      for (const uni of unidades) {
        const result = await pool.query(`
          INSERT INTO cvcrm_unidades (
            cvcrm_id, codigo, nome, tipo,
            empreendimento_id, empreendimento_nome, bloco, andar,
            area_privativa, area_total, situacao, valor_venda,
            cvcrm_data, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (cvcrm_id) DO UPDATE SET
            codigo = EXCLUDED.codigo,
            nome = EXCLUDED.nome,
            tipo = EXCLUDED.tipo,
            empreendimento_id = EXCLUDED.empreendimento_id,
            empreendimento_nome = EXCLUDED.empreendimento_nome,
            bloco = EXCLUDED.bloco,
            andar = EXCLUDED.andar,
            area_privativa = EXCLUDED.area_privativa,
            situacao = EXCLUDED.situacao,
            valor_venda = EXCLUDED.valor_venda,
            cvcrm_data = EXCLUDED.cvcrm_data,
            synced_at = NOW(),
            updated_at = NOW()
          RETURNING (xmax = 0) as inserted
        `, [
          uni.idunidade,
          uni.idunidade_int || uni.nome,
          uni.nome,
          uni.tipo,
          uni.empreendimento_id,
          uni.empreendimento_nome,
          uni.bloco_nome,
          uni.andar,
          parseFloat(uni.area_privativa) || null,
          parseFloat(uni.area_comum) || null,
          uni.situacao?.situacao_mapa_disponibilidade?.toString() || 'disponivel',
          parseFloat(uni.valor) || null,
          JSON.stringify(uni)
        ]);

        if (result.rows[0]?.inserted) created++;
        else updated++;
      }

      total += unidades.length;
      console.log(`   Empreendimento ${empId}: ${unidades.length} unidades`);

      await sleep(CONFIG.rateLimit.delayMs);
    } catch (error: any) {
      console.log(`   ⚠️ Erro no empreendimento ${empId}: ${error.message}`);
    }
  }

  console.log(`   ✅ Criados: ${created}, Atualizados: ${updated}`);
  return { created, updated, total };
}

// ============================================
// SYNC: SÉRIES DE TABELA DE PREÇO
// ============================================
async function syncSeries() {
  console.log('\n💰 Sincronizando Séries de Tabela de Preço...');

  const data = await fetchCVCRM('/api/v1/cv/seriestabeladepreco', { registros_por_pagina: 100 });
  const series = data.dados || [];

  console.log(`   Encontradas: ${series.length} séries`);

  let created = 0, updated = 0;

  for (const serie of series) {
    const result = await pool.query(`
      INSERT INTO cvcrm_series (
        cvcrm_id, nome, descricao, ativo, cvcrm_data, synced_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (cvcrm_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        ativo = EXCLUDED.ativo,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = NOW()
      RETURNING (xmax = 0) as inserted
    `, [
      serie.idserie,
      serie.nome,
      `${serie.sigla} - ${serie.periodicidade} - ${serie.tp_juros}`,
      serie.ativo_painel === 'Sim',
      JSON.stringify(serie)
    ]);

    if (result.rows[0]?.inserted) created++;
    else updated++;
  }

  console.log(`   ✅ Criados: ${created}, Atualizados: ${updated}`);
  return { created, updated, total: series.length };
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('🚀 Iniciando sincronização CV CRM -> PostgreSQL');
  console.log('=' .repeat(50));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔗 API: ${CONFIG.cvcrm.baseUrl}`);
  console.log(`📧 Email: ${CONFIG.cvcrm.email}`);
  console.log('=' .repeat(50));

  const startTime = Date.now();
  const results: Record<string, any> = {};

  try {
    // Testar conexão com banco
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco de dados OK');

    // Sincronizar na ordem correta (dependências primeiro)
    results.empreendimentos = await syncEmpreendimentos();
    results.corretores = await syncCorretores();
    results.leads = await syncLeads();
    results.unidades = await syncUnidades();
    results.series = await syncSeries();

    // Resumo final
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '=' .repeat(50));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('=' .repeat(50));

    let totalCreated = 0, totalUpdated = 0, totalRecords = 0;

    for (const [key, value] of Object.entries(results)) {
      console.log(`${key}: ${value.total} registros (${value.created} novos, ${value.updated} atualizados)`);
      totalCreated += value.created;
      totalUpdated += value.updated;
      totalRecords += value.total;
    }

    console.log('-'.repeat(50));
    console.log(`TOTAL: ${totalRecords} registros`);
    console.log(`       ${totalCreated} criados, ${totalUpdated} atualizados`);
    console.log(`⏱️  Tempo: ${elapsed} segundos`);
    console.log('=' .repeat(50));
    console.log('✅ Sincronização concluída com sucesso!');

  } catch (error: any) {
    console.error('\n❌ ERRO NA SINCRONIZAÇÃO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
