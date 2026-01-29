#!/usr/bin/env npx tsx
/**
 * Script de Sincronização CV CRM - IMÓVEIS
 * Foco: Empreendimentos, Unidades, Plantas, Tabelas de Preço, Materiais
 *
 * Uso: npx tsx scripts/sync-imoveis.ts
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

// ============================================
// Criar tabelas se não existirem
// ============================================
async function ensureTables() {
  console.log('📋 Verificando/criando tabelas...');

  // Tabela de plantas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cvcrm_plantas (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cvcrm_id INTEGER UNIQUE NOT NULL,
      empreendimento_id INTEGER NOT NULL,
      nome VARCHAR(255),
      especificacoes TEXT,
      imagem_url TEXT,
      imagens JSONB DEFAULT '[]',
      cvcrm_data JSONB,
      synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_plantas_empreend ON cvcrm_plantas(empreendimento_id);
  `);

  // Tabela de materiais de campanha
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cvcrm_materiais_campanha (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cvcrm_id INTEGER UNIQUE NOT NULL,
      empreendimento_id INTEGER NOT NULL,
      nome VARCHAR(255),
      titulo VARCHAR(255),
      descricao TEXT,
      tipo VARCHAR(100),
      tamanho INTEGER,
      arquivo_url TEXT,
      cvcrm_data JSONB,
      synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_materiais_empreend ON cvcrm_materiais_campanha(empreendimento_id);
  `);

  // Tabela de tabelas de preço
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cvcrm_tabelas_preco (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      cvcrm_id INTEGER UNIQUE NOT NULL,
      empreendimento_id INTEGER NOT NULL,
      nome VARCHAR(255),
      forma VARCHAR(50),
      tipo VARCHAR(100),
      data_vigencia_de DATE,
      data_vigencia_ate DATE,
      aprovado BOOLEAN DEFAULT false,
      valor_metro DECIMAL(15,2),
      cvcrm_data JSONB,
      synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_tabelas_empreend ON cvcrm_tabelas_preco(empreendimento_id);
  `);

  console.log('   ✅ Tabelas verificadas/criadas');
}

// ============================================
// SYNC: EMPREENDIMENTOS COMPLETOS
// ============================================
async function syncEmpreendimentosCompletos() {
  console.log('\n🏢 Sincronizando Empreendimentos COMPLETOS...');

  // 1. Buscar lista básica de empreendimentos
  const data = await fetchCVCRM('/api/v1/cadastros/empreendimentos');
  const empreendimentos = Array.isArray(data) ? data : data.empreendimentos || [];

  console.log(`   Encontrados: ${empreendimentos.length} empreendimentos`);
  console.log('   Buscando detalhes completos de cada um...\n');

  const results = {
    empreendimentos: { total: 0, created: 0, updated: 0 },
    unidades: { total: 0, created: 0, updated: 0 },
    plantas: { total: 0, created: 0, updated: 0 },
    materiais: { total: 0, created: 0, updated: 0 },
    tabelas: { total: 0, created: 0, updated: 0 }
  };

  for (const empBasico of empreendimentos) {
    const empId = empBasico.idempreendimento;
    console.log(`\n   📍 ${empBasico.nome} (ID: ${empId})`);

    try {
      // Buscar dados completos via /api/cvio/empreendimento/{id}/series
      const empCompleto = await fetchCVCRM(`/api/cvio/empreendimento/${empId}/series`);
      await sleep(CONFIG.rateLimit.delayMs);

      // ======== SALVAR EMPREENDIMENTO ========
      const empResult = await pool.query(`
        INSERT INTO cvcrm_empreendimentos (
          cvcrm_id, nome, descricao, tipo, status,
          endereco_completo, cep, cidade, uf,
          data_entrega_prevista, total_unidades, cvcrm_data, synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (cvcrm_id) DO UPDATE SET
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          tipo = EXCLUDED.tipo,
          status = EXCLUDED.status,
          endereco_completo = EXCLUDED.endereco_completo,
          cvcrm_data = EXCLUDED.cvcrm_data,
          synced_at = NOW(),
          updated_at = NOW()
        RETURNING (xmax = 0) as inserted
      `, [
        empId,
        empCompleto.nome,
        empCompleto.descricao || empCompleto.titulo,
        empCompleto.tipo_empreendimento?.[0]?.nome || 'Vertical',
        empCompleto.situacao_comercial?.[0]?.nome || 'Ativo',
        empCompleto.endereco,
        empCompleto.cep,
        empCompleto.cidade,
        empCompleto.estado?.substring(0, 2) || empBasico.sigla,
        empCompleto.data_entrega ? new Date(empCompleto.data_entrega.split('/').reverse().join('-')) : null,
        empBasico.unidades_disponiveis,
        JSON.stringify({ ...empBasico, ...empCompleto })
      ]);

      if (empResult.rows[0]?.inserted) results.empreendimentos.created++;
      else results.empreendimentos.updated++;
      results.empreendimentos.total++;

      // ======== SALVAR TABELA DE PREÇO ========
      if (empCompleto.tabela) {
        const tabResult = await pool.query(`
          INSERT INTO cvcrm_tabelas_preco (
            cvcrm_id, empreendimento_id, nome, forma, tipo,
            data_vigencia_de, data_vigencia_ate, aprovado, valor_metro,
            cvcrm_data, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (cvcrm_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            forma = EXCLUDED.forma,
            tipo = EXCLUDED.tipo,
            data_vigencia_de = EXCLUDED.data_vigencia_de,
            data_vigencia_ate = EXCLUDED.data_vigencia_ate,
            aprovado = EXCLUDED.aprovado,
            cvcrm_data = EXCLUDED.cvcrm_data,
            synced_at = NOW()
          RETURNING (xmax = 0) as inserted
        `, [
          empCompleto.tabela.idtabela,
          empId,
          empCompleto.tabela.nome,
          empCompleto.tabela.forma,
          empCompleto.tabela.tipo,
          empCompleto.tabela.data_vigencia_de ? new Date(empCompleto.tabela.data_vigencia_de) : null,
          empCompleto.tabela.data_vigencia_ate ? new Date(empCompleto.tabela.data_vigencia_ate) : null,
          empCompleto.tabela.aprovado === 'S',
          empCompleto.tabela.valor_metro ? parseFloat(empCompleto.tabela.valor_metro) : null,
          JSON.stringify(empCompleto.tabela)
        ]);

        if (tabResult.rows[0]?.inserted) results.tabelas.created++;
        else results.tabelas.updated++;
        results.tabelas.total++;
        console.log(`      💰 Tabela: ${empCompleto.tabela.nome}`);
      }

      // ======== SALVAR PLANTAS ========
      if (empCompleto.plantas && empCompleto.plantas.length > 0) {
        for (const planta of empCompleto.plantas) {
          const plantaResult = await pool.query(`
            INSERT INTO cvcrm_plantas (
              cvcrm_id, empreendimento_id, nome, especificacoes,
              imagem_url, imagens, cvcrm_data, synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (cvcrm_id) DO UPDATE SET
              nome = EXCLUDED.nome,
              especificacoes = EXCLUDED.especificacoes,
              imagem_url = EXCLUDED.imagem_url,
              imagens = EXCLUDED.imagens,
              cvcrm_data = EXCLUDED.cvcrm_data,
              synced_at = NOW()
            RETURNING (xmax = 0) as inserted
          `, [
            planta.idplanta,
            empId,
            planta.nome,
            planta.especificacoes,
            planta.img_planta_servidor,
            JSON.stringify(planta.imagens || []),
            JSON.stringify(planta)
          ]);

          if (plantaResult.rows[0]?.inserted) results.plantas.created++;
          else results.plantas.updated++;
          results.plantas.total++;
        }
        console.log(`      🏠 Plantas: ${empCompleto.plantas.length}`);
      }

      // ======== SALVAR MATERIAIS DE CAMPANHA ========
      if (empCompleto.materiais_campanha && empCompleto.materiais_campanha.length > 0) {
        for (const material of empCompleto.materiais_campanha) {
          const matResult = await pool.query(`
            INSERT INTO cvcrm_materiais_campanha (
              cvcrm_id, empreendimento_id, nome, titulo, descricao,
              tipo, tamanho, arquivo_url, cvcrm_data, synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            ON CONFLICT (cvcrm_id) DO UPDATE SET
              nome = EXCLUDED.nome,
              titulo = EXCLUDED.titulo,
              descricao = EXCLUDED.descricao,
              arquivo_url = EXCLUDED.arquivo_url,
              cvcrm_data = EXCLUDED.cvcrm_data,
              synced_at = NOW()
            RETURNING (xmax = 0) as inserted
          `, [
            material.idarquivo,
            empId,
            material.nome,
            material.titulo,
            material.descricao,
            material.tipo,
            material.tamanho,
            material.arquivo,
            JSON.stringify(material)
          ]);

          if (matResult.rows[0]?.inserted) results.materiais.created++;
          else results.materiais.updated++;
          results.materiais.total++;
        }
        console.log(`      📄 Materiais: ${empCompleto.materiais_campanha.length}`);
      }

      // ======== SALVAR UNIDADES (Espelho de Vendas) ========
      if (empCompleto.etapas) {
        let unidadesCount = 0;
        for (const etapa of empCompleto.etapas) {
          for (const bloco of etapa.blocos || []) {
            // Pode haver paginação - buscar todas as páginas
            const totalPaginas = bloco.paginacao_unidade?.paginas_total || 1;

            for (let pagina = 1; pagina <= totalPaginas; pagina++) {
              let unidades = bloco.unidades || [];

              // Se houver mais páginas, buscar
              if (pagina > 1) {
                const maisUnidades = await fetchCVCRM(`/api/cvio/empreendimento/${empId}/unidades`, {
                  pagina_unidade: pagina
                });
                await sleep(CONFIG.rateLimit.delayMs);

                // Encontrar o bloco correto e extrair unidades
                for (const e of maisUnidades.etapas || []) {
                  for (const b of e.blocos || []) {
                    if (b.nome === bloco.nome) {
                      unidades = b.unidades || [];
                    }
                  }
                }
              }

              for (const uni of unidades) {
                const uniResult = await pool.query(`
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
                  empId,
                  empCompleto.nome,
                  bloco.nome,
                  uni.andar,
                  parseFloat(uni.area_privativa) || null,
                  parseFloat(uni.area_comum) || null,
                  getSituacaoNome(uni.situacao?.situacao_mapa_disponibilidade),
                  parseFloat(uni.valor) || null,
                  JSON.stringify(uni)
                ]);

                if (uniResult.rows[0]?.inserted) results.unidades.created++;
                else results.unidades.updated++;
                results.unidades.total++;
                unidadesCount++;
              }
            }
          }
        }
        console.log(`      🏠 Unidades: ${unidadesCount}`);
      }

    } catch (error: any) {
      console.log(`      ⚠️ Erro: ${error.message}`);
    }

    await sleep(CONFIG.rateLimit.delayMs);
  }

  return results;
}

function getSituacaoNome(codigo: number | undefined): string {
  const situacoes: Record<number, string> = {
    1: 'Disponível',
    2: 'Reservada',
    3: 'Vendida',
    4: 'Bloqueada',
    5: 'Em Análise'
  };
  return situacoes[codigo || 1] || 'Disponível';
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
  console.log('🏗️  SINCRONIZAÇÃO DE IMÓVEIS CV CRM -> PostgreSQL');
  console.log('=' .repeat(55));
  console.log(`📅 Data: ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🔗 API: ${CONFIG.cvcrm.baseUrl}`);
  console.log('=' .repeat(55));

  const startTime = Date.now();

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco de dados OK');

    await ensureTables();

    const results = await syncEmpreendimentosCompletos();
    const seriesResult = await syncSeries();

    // Resumo final
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '=' .repeat(55));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO DE IMÓVEIS');
    console.log('=' .repeat(55));
    console.log(`Empreendimentos: ${results.empreendimentos.total} (${results.empreendimentos.created} novos, ${results.empreendimentos.updated} atualizados)`);
    console.log(`Unidades:        ${results.unidades.total} (${results.unidades.created} novos, ${results.unidades.updated} atualizados)`);
    console.log(`Plantas:         ${results.plantas.total} (${results.plantas.created} novos, ${results.plantas.updated} atualizados)`);
    console.log(`Materiais:       ${results.materiais.total} (${results.materiais.created} novos, ${results.materiais.updated} atualizados)`);
    console.log(`Tabelas Preço:   ${results.tabelas.total} (${results.tabelas.created} novos, ${results.tabelas.updated} atualizados)`);
    console.log(`Séries:          ${seriesResult.total} (${seriesResult.created} novos, ${seriesResult.updated} atualizados)`);
    console.log('-'.repeat(55));
    console.log(`⏱️  Tempo total: ${elapsed} segundos`);
    console.log('=' .repeat(55));
    console.log('✅ Sincronização de imóveis concluída com sucesso!');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
