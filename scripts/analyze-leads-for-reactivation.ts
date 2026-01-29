/**
 * Análise de Leads para Reativação com Luna
 *
 * Identifica os melhores candidatos para reativação baseado em:
 * - Dias inativos
 * - Situação atual
 * - Interesse demonstrado
 * - Potencial de conversão
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function analyzeLeadsForReactivation() {
  console.log('='.repeat(70));
  console.log('ANÁLISE DE LEADS PARA REATIVAÇÃO COM LUNA');
  console.log('='.repeat(70));
  console.log('');

  const client = await pool.connect();

  try {
    // 1. Resumo geral por situação
    console.log('📊 RESUMO GERAL DOS LEADS POR SITUAÇÃO\n');

    const resumoQuery = await client.query(`
      SELECT
        situacao->>'nome' as situacao_nome,
        COUNT(*) as total,
        COUNT(CASE WHEN telefone IS NOT NULL AND telefone != '' THEN 1 END) as com_telefone
      FROM cvcrm_leads
      GROUP BY situacao->>'nome'
      ORDER BY total DESC
      LIMIT 15
    `);

    console.log('Situação                          | Total | Com Tel.');
    console.log('-'.repeat(55));
    for (const row of resumoQuery.rows) {
      const situacao = (row.situacao_nome || 'Sem situação').padEnd(33);
      const total = String(row.total).padStart(5);
      const comTel = String(row.com_telefone).padStart(8);
      console.log(`${situacao} | ${total} | ${comTel}`);
    }
    console.log('');

    // 2. Leads candidatos à reativação
    console.log('🎯 LEADS CANDIDATOS À REATIVAÇÃO\n');
    console.log('Critérios: Cadastrados 7-90 dias atrás, tem telefone, situação não perdida\n');

    const candidatosQuery = await client.query(`
      SELECT
        idlead as id,
        nome,
        telefone,
        email,
        situacao->>'nome' as situacao_nome,
        corretor->>'nome' as corretor_nome,
        corretor->>'id' as corretor_id,
        empreendimento as empreendimentos,
        origem,
        data_cad as data_cadastro,
        EXTRACT(DAY FROM NOW() - data_cad)::int as dias_desde_cadastro,
        score,
        qtde_simulacoes_associadas,
        qtde_reservas_associadas,
        valor_negocio
      FROM cvcrm_leads
      WHERE
        -- Tem telefone válido
        telefone IS NOT NULL
        AND telefone != ''
        AND LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')) >= 10
        -- Não está em situação de perdido/cancelado/vendido/reserva/crédito
        AND (
          situacao->>'nome' IS NULL
          OR (
            LOWER(situacao->>'nome') NOT LIKE '%perdido%'
            AND LOWER(situacao->>'nome') NOT LIKE '%cancelado%'
            AND LOWER(situacao->>'nome') NOT LIKE '%desistiu%'
            AND LOWER(situacao->>'nome') NOT LIKE '%vendido%'
            AND LOWER(situacao->>'nome') NOT LIKE '%convertido%'
            AND LOWER(situacao->>'nome') NOT LIKE '%venda%'
            AND LOWER(situacao->>'nome') NOT LIKE '%reserva%'
            AND LOWER(situacao->>'nome') NOT LIKE '%crédito%'
            AND LOWER(situacao->>'nome') NOT LIKE '%credito%'
            AND LOWER(situacao->>'nome') NOT LIKE '%montagem%'
          )
        )
        -- Cadastrado há pelo menos 7 dias
        AND data_cad < NOW() - INTERVAL '7 days'
        -- Não muito antigo (menos de 120 dias)
        AND data_cad > NOW() - INTERVAL '120 days'
      ORDER BY
        -- Prioriza leads com simulações (demonstraram interesse real)
        qtde_simulacoes_associadas DESC,
        -- Depois por score
        score DESC NULLS LAST,
        -- Depois por menos dias (mais recentes)
        data_cad DESC
      LIMIT 100
    `);

    if (candidatosQuery.rows.length === 0) {
      console.log('Nenhum lead encontrado com os critérios de reativação.');
      return;
    }

    console.log(`Encontrados ${candidatosQuery.rows.length} leads candidatos.\n`);

    // Classificar leads
    const altaPrioridade: any[] = [];
    const mediaPrioridade: any[] = [];
    const baixaPrioridade: any[] = [];

    for (const lead of candidatosQuery.rows) {
      const diasCad = lead.dias_desde_cadastro || 0;
      const simulacoes = lead.qtde_simulacoes_associadas || 0;
      const score = lead.score || 0;

      // Extrair nome do empreendimento
      let empNome = 'Não especificado';
      if (lead.empreendimentos && Array.isArray(lead.empreendimentos) && lead.empreendimentos.length > 0) {
        empNome = lead.empreendimentos.map((e: any) => e.nome).join(', ');
      }
      lead.empreendimento_interesse = empNome;

      // Score de reativação
      let reativScore = 50;

      // Bonifica por simulações (interesse real)
      reativScore += simulacoes * 20;

      // Bonifica por score do lead
      reativScore += score * 0.3;

      // Penaliza por dias desde cadastro
      if (diasCad > 60) reativScore -= 20;
      else if (diasCad > 30) reativScore -= 10;

      // Bonifica se tem interesse em empreendimento
      if (empNome !== 'Não especificado') {
        reativScore += 15;
      }

      lead.score_reativacao = Math.max(0, Math.min(100, reativScore));

      // Detectar motivo provável
      if (diasCad <= 21 && simulacoes > 0) {
        lead.motivo_provavel = 'Engajado recentemente';
        altaPrioridade.push(lead);
      } else if (diasCad <= 45 || simulacoes > 0) {
        lead.motivo_provavel = 'Potencial moderado';
        mediaPrioridade.push(lead);
      } else {
        lead.motivo_provavel = 'Lead frio';
        baixaPrioridade.push(lead);
      }
    }

    // Mostrar por prioridade
    if (altaPrioridade.length > 0) {
      console.log('🔴 ALTA PRIORIDADE - Engajados recentemente\n');
      printLeadTable(altaPrioridade.slice(0, 15));
      console.log('');
    }

    if (mediaPrioridade.length > 0) {
      console.log('🟡 MÉDIA PRIORIDADE - Potencial moderado\n');
      printLeadTable(mediaPrioridade.slice(0, 15));
      console.log('');
    }

    if (baixaPrioridade.length > 0) {
      console.log('🟢 BAIXA PRIORIDADE - Leads frios\n');
      printLeadTable(baixaPrioridade.slice(0, 10));
      console.log('');
    }

    // Resumo final
    console.log('='.repeat(70));
    console.log('RESUMO PARA REATIVAÇÃO');
    console.log('='.repeat(70));
    console.log(`
📊 Total de candidatos analisados: ${candidatosQuery.rows.length}
   🔴 Alta prioridade: ${altaPrioridade.length}
   🟡 Média prioridade: ${mediaPrioridade.length}
   🟢 Baixa prioridade: ${baixaPrioridade.length}

💡 RECOMENDAÇÃO:
   Começar com os ${Math.min(10, altaPrioridade.length)} leads de alta prioridade.
   Eles já fizeram simulações e demonstraram interesse real.
`);

    // Top 30 detalhado
    console.log('📋 TOP 30 LEADS PARA REATIVAÇÃO COM LUNA:\n');

    const top30 = [...altaPrioridade, ...mediaPrioridade, ...baixaPrioridade].slice(0, 30);

    for (let i = 0; i < top30.length; i++) {
      const lead = top30[i];
      const prioridade = altaPrioridade.includes(lead) ? '🔴' :
                         mediaPrioridade.includes(lead) ? '🟡' : '🟢';

      console.log(`${prioridade} ${(i + 1).toString().padStart(2)}. ${lead.nome}`);
      console.log(`    📱 ${formatPhone(lead.telefone)}`);
      console.log(`    🏠 ${lead.empreendimento_interesse}`);
      console.log(`    📊 Situação: ${lead.situacao_nome || 'Não definida'}`);
      console.log(`    ⏰ ${lead.dias_desde_cadastro} dias | Score: ${lead.score || 0} | Simulações: ${lead.qtde_simulacoes_associadas || 0}`);
      console.log(`    👤 Corretor: ${lead.corretor_nome || 'Não atribuído'}`);
      console.log(`    🎯 Score Reativação: ${lead.score_reativacao.toFixed(0)}/100`);
      console.log('');
    }

  } catch (error) {
    console.error('Erro ao analisar leads:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

function formatPhone(phone: string): string {
  if (!phone) return 'Sem telefone';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function printLeadTable(leads: any[]) {
  console.log('Nome                          | Dias | Score | Simul | Empreendimento');
  console.log('-'.repeat(85));

  for (const lead of leads) {
    const nome = (lead.nome || 'Sem nome').substring(0, 29).padEnd(29);
    const dias = String(lead.dias_desde_cadastro || 0).padStart(4);
    const score = String(lead.score || 0).padStart(5);
    const simul = String(lead.qtde_simulacoes_associadas || 0).padStart(5);
    const emp = (lead.empreendimento_interesse || '-').substring(0, 20);

    console.log(`${nome} | ${dias} | ${score} | ${simul} | ${emp}`);
  }
}

analyzeLeadsForReactivation().catch(console.error);
