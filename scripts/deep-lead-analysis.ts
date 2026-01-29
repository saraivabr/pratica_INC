/**
 * Análise Profunda de Leads para Reativação
 *
 * Busca expandida com mais critérios e análise de padrões
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface LeadCompleto {
  id: number;
  idlead: number;
  nome: string;
  telefone: string;
  email: string;
  documento: string;
  profissao: string;
  cidade: string;
  estado: string;
  renda_familiar: number;
  cv_score: number;
  origem: string;
  midias: string[];
  corretor: any;
  situacao: any;
  empreendimento: any[];
  tags: string[];
  campos_adicionais: any;
  dias_cadastro: number;
  simulacoes: number;
  reservas: number;
  valor_negocio: number;

  // Scores
  score_total: number;
  score_completude: number;
  score_recencia: number;
  score_engajamento: number;
  score_situacao: number;
  score_intencao: number;

  // Análise
  perfil: string;
  temperatura: string;
  abordagem: string;
  pontos_fortes: string[];
  pontos_fracos: string[];
}

async function deepLeadAnalysis() {
  console.log('='.repeat(80));
  console.log('ANÁLISE PROFUNDA DE LEADS PARA REATIVAÇÃO COM LUNA');
  console.log('='.repeat(80));
  console.log('');

  const client = await pool.connect();

  try {
    // ============================================
    // 1. VISÃO GERAL DA BASE
    // ============================================
    console.log('📊 VISÃO GERAL DA BASE DE LEADS\n');

    const totalQuery = await client.query(`SELECT COUNT(*) as total FROM cvcrm_leads`);
    const comTelQuery = await client.query(`
      SELECT COUNT(*) as total FROM cvcrm_leads
      WHERE telefone IS NOT NULL AND telefone != ''
      AND LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')) >= 10
    `);

    console.log(`Total de leads na base: ${totalQuery.rows[0].total}`);
    console.log(`Leads com telefone válido: ${comTelQuery.rows[0].total}`);
    console.log('');

    // Por situação detalhada
    const situacaoQuery = await client.query(`
      SELECT
        situacao->>'nome' as situacao,
        COUNT(*) as total,
        COUNT(CASE WHEN data_cad > NOW() - INTERVAL '30 days' THEN 1 END) as ultimos_30d,
        COUNT(CASE WHEN data_cad > NOW() - INTERVAL '60 days' AND data_cad <= NOW() - INTERVAL '30 days' THEN 1 END) as "30_60d",
        COUNT(CASE WHEN data_cad > NOW() - INTERVAL '90 days' AND data_cad <= NOW() - INTERVAL '60 days' THEN 1 END) as "60_90d",
        COUNT(CASE WHEN data_cad <= NOW() - INTERVAL '90 days' THEN 1 END) as "mais_90d"
      FROM cvcrm_leads
      WHERE telefone IS NOT NULL AND telefone != ''
      GROUP BY situacao->>'nome'
      ORDER BY total DESC
    `);

    console.log('Distribuição por Situação e Idade:\n');
    console.log('Situação                          | Total  | <30d  | 30-60d | 60-90d | >90d');
    console.log('-'.repeat(85));
    for (const row of situacaoQuery.rows) {
      const sit = (row.situacao || 'Sem situação').substring(0, 33).padEnd(33);
      console.log(`${sit} | ${String(row.total).padStart(6)} | ${String(row.ultimos_30d).padStart(5)} | ${String(row['30_60d']).padStart(6)} | ${String(row['60_90d']).padStart(6)} | ${String(row.mais_90d).padStart(5)}`);
    }
    console.log('');

    // ============================================
    // 2. ANÁLISE DE ORIGENS E MÍDIAS
    // ============================================
    console.log('\n📈 ANÁLISE DE ORIGENS (que não converteram)\n');

    const origemQuery = await client.query(`
      SELECT
        origem,
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(situacao->>'nome') NOT LIKE '%perdido%'
                   AND LOWER(situacao->>'nome') NOT LIKE '%venda%'
                   AND LOWER(situacao->>'nome') NOT LIKE '%reserva%' THEN 1 END) as ativos,
        ROUND(AVG(score)::numeric, 1) as score_medio
      FROM cvcrm_leads
      WHERE telefone IS NOT NULL AND telefone != ''
        AND data_cad > NOW() - INTERVAL '180 days'
      GROUP BY origem
      HAVING COUNT(*) >= 5
      ORDER BY total DESC
      LIMIT 15
    `);

    console.log('Origem                    | Total | Ativos | Score Médio');
    console.log('-'.repeat(60));
    for (const row of origemQuery.rows) {
      const orig = (row.origem || 'Não informada').substring(0, 24).padEnd(24);
      console.log(`${orig} | ${String(row.total).padStart(5)} | ${String(row.ativos).padStart(6)} | ${String(row.score_medio || 0).padStart(11)}`);
    }

    // ============================================
    // 3. BUSCA EXPANDIDA DE LEADS
    // ============================================
    console.log('\n\n' + '='.repeat(80));
    console.log('🔍 BUSCA EXPANDIDA - LEADS PARA REATIVAÇÃO');
    console.log('='.repeat(80));
    console.log('\nCritérios expandidos:');
    console.log('  • Telefone válido');
    console.log('  • 7 a 180 dias de cadastro');
    console.log('  • Exclui: perdido, vendido, reserva, análise crédito, montagem');
    console.log('  • Limite: 500 leads\n');

    const leadsQuery = await client.query(`
      SELECT
        id,
        idlead,
        nome,
        telefone,
        email,
        documento,
        profissao,
        cidade,
        estado,
        renda_familiar,
        score as cv_score,
        origem,
        midias,
        corretor,
        situacao,
        empreendimento,
        tags,
        campos_adicionais,
        data_cad,
        EXTRACT(DAY FROM NOW() - data_cad)::int as dias_cadastro,
        qtde_simulacoes_associadas,
        qtde_reservas_associadas,
        valor_negocio
      FROM cvcrm_leads
      WHERE
        telefone IS NOT NULL
        AND telefone != ''
        AND LENGTH(REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')) >= 10
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
        AND data_cad < NOW() - INTERVAL '7 days'
        AND data_cad > NOW() - INTERVAL '180 days'
      ORDER BY data_cad DESC
      LIMIT 500
    `);

    console.log(`Encontrados ${leadsQuery.rows.length} leads para análise.\n`);

    // Processar e pontuar todos os leads
    const leadsAnalisados: LeadCompleto[] = [];

    for (const lead of leadsQuery.rows) {
      const analisado = analisarLeadProfundo(lead);
      leadsAnalisados.push(analisado);
    }

    // Ordenar por score
    leadsAnalisados.sort((a, b) => b.score_total - a.score_total);

    // ============================================
    // 4. SEGMENTAÇÃO POR PERFIL
    // ============================================
    console.log('👥 SEGMENTAÇÃO POR PERFIL\n');

    const perfis = {
      'Quente com Interesse': leadsAnalisados.filter(l => l.temperatura === 'quente' && l.empreendimento.length > 0),
      'Quente sem Definição': leadsAnalisados.filter(l => l.temperatura === 'quente' && l.empreendimento.length === 0),
      'Morno com Interesse': leadsAnalisados.filter(l => l.temperatura === 'morno' && l.empreendimento.length > 0),
      'Morno sem Definição': leadsAnalisados.filter(l => l.temperatura === 'morno' && l.empreendimento.length === 0),
      'Frio Recuperável': leadsAnalisados.filter(l => l.temperatura === 'frio' && l.score_total >= 40),
      'Frio Difícil': leadsAnalisados.filter(l => l.temperatura === 'frio' && l.score_total < 40),
    };

    for (const [perfil, leads] of Object.entries(perfis)) {
      const icon = perfil.includes('Quente') ? '🔥' :
                   perfil.includes('Morno') ? '🌡️' : '❄️';
      console.log(`${icon} ${perfil}: ${leads.length} leads`);
    }

    // ============================================
    // 5. TOP 50 DETALHADO
    // ============================================
    console.log('\n\n' + '='.repeat(80));
    console.log('🏆 TOP 50 LEADS PARA CONTATO');
    console.log('='.repeat(80) + '\n');

    for (let i = 0; i < Math.min(50, leadsAnalisados.length); i++) {
      const lead = leadsAnalisados[i];
      const temp = lead.temperatura === 'quente' ? '🔥' :
                   lead.temperatura === 'morno' ? '🌡️' : '❄️';

      console.log(`${temp} #${(i + 1).toString().padStart(2)} | Score: ${lead.score_total.toFixed(0)}/100 | ${lead.nome}`);
      console.log(`   📱 ${formatPhone(lead.telefone)}${lead.email ? ' | ✉️ ' + lead.email : ''}`);

      if (lead.empreendimento.length > 0) {
        console.log(`   🏠 ${lead.empreendimento.map((e: any) => e.nome).join(', ')}`);
      }

      console.log(`   📊 ${lead.situacao?.nome || 'Sem situação'} | ⏰ ${lead.dias_cadastro} dias | Origem: ${lead.origem || 'N/I'}`);

      if (lead.corretor?.nome) {
        console.log(`   👤 Corretor: ${lead.corretor.nome}`);
      }

      // Dados extras encontrados
      const extras: string[] = [];
      if (lead.profissao) extras.push(`Profissão: ${lead.profissao}`);
      if (lead.cidade) extras.push(`${lead.cidade}/${lead.estado || ''}`);
      if (lead.renda_familiar > 0) extras.push(`Renda: R$ ${lead.renda_familiar.toLocaleString('pt-BR')}`);
      if (lead.simulacoes > 0) extras.push(`${lead.simulacoes} simulações`);

      if (extras.length > 0) {
        console.log(`   📋 ${extras.join(' | ')}`);
      }

      // Pontos fortes e fracos
      if (lead.pontos_fortes.length > 0) {
        console.log(`   ✅ ${lead.pontos_fortes.slice(0, 3).join(', ')}`);
      }

      console.log(`   💬 ABORDAGEM: ${lead.abordagem}`);
      console.log('');
    }

    // ============================================
    // 6. ANÁLISE DE EMPREENDIMENTOS
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('🏢 LEADS POR EMPREENDIMENTO DE INTERESSE');
    console.log('='.repeat(80) + '\n');

    const empMap = new Map<string, LeadCompleto[]>();

    for (const lead of leadsAnalisados) {
      if (lead.empreendimento.length > 0) {
        for (const emp of lead.empreendimento) {
          const nome = emp.nome;
          if (!empMap.has(nome)) {
            empMap.set(nome, []);
          }
          empMap.get(nome)!.push(lead);
        }
      }
    }

    const empSorted = [...empMap.entries()].sort((a, b) => b[1].length - a[1].length);

    for (const [empNome, leads] of empSorted.slice(0, 10)) {
      const quentes = leads.filter(l => l.temperatura === 'quente').length;
      const mornos = leads.filter(l => l.temperatura === 'morno').length;
      const frios = leads.filter(l => l.temperatura === 'frio').length;
      const mediaScore = leads.reduce((s, l) => s + l.score_total, 0) / leads.length;

      console.log(`📍 ${empNome}`);
      console.log(`   Total: ${leads.length} | 🔥 ${quentes} | 🌡️ ${mornos} | ❄️ ${frios} | Score médio: ${mediaScore.toFixed(0)}`);
      console.log(`   Top 3:`);

      for (const lead of leads.slice(0, 3)) {
        console.log(`     - ${lead.nome} (${formatPhone(lead.telefone)}) - Score: ${lead.score_total.toFixed(0)}`);
      }
      console.log('');
    }

    // ============================================
    // 7. LEADS SEM CORRETOR (OPORTUNIDADE)
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('⚠️ LEADS SEM CORRETOR ATRIBUÍDO (OPORTUNIDADE DIRETA)');
    console.log('='.repeat(80) + '\n');

    const semCorretor = leadsAnalisados.filter(l => !l.corretor?.id);
    console.log(`Total sem corretor: ${semCorretor.length} leads\n`);

    console.log('Top 15 sem corretor:\n');
    for (let i = 0; i < Math.min(15, semCorretor.length); i++) {
      const lead = semCorretor[i];
      console.log(`${(i + 1).toString().padStart(2)}. ${lead.nome} | ${formatPhone(lead.telefone)} | ${lead.dias_cadastro}d | Score: ${lead.score_total.toFixed(0)}`);
      console.log(`    ${lead.situacao?.nome || 'Sem situação'} | ${lead.empreendimento.length > 0 ? lead.empreendimento[0].nome : 'Sem empreendimento'}`);
    }

    // ============================================
    // 8. LEADS COM VISITA (ALTA CONVERSÃO)
    // ============================================
    console.log('\n\n' + '='.repeat(80));
    console.log('🎯 LEADS COM VISITA AGENDADA/REALIZADA (ALTA CONVERSÃO)');
    console.log('='.repeat(80) + '\n');

    const comVisita = leadsAnalisados.filter(l =>
      l.situacao?.nome?.toLowerCase().includes('visita')
    );

    console.log(`Total com visita: ${comVisita.length} leads\n`);

    for (let i = 0; i < Math.min(20, comVisita.length); i++) {
      const lead = comVisita[i];
      console.log(`${(i + 1).toString().padStart(2)}. ${lead.nome}`);
      console.log(`    📱 ${formatPhone(lead.telefone)}${lead.email ? ' | ✉️ ' + lead.email : ''}`);
      console.log(`    📊 ${lead.situacao?.nome} | ⏰ ${lead.dias_cadastro} dias`);
      if (lead.empreendimento.length > 0) {
        console.log(`    🏠 ${lead.empreendimento.map((e: any) => e.nome).join(', ')}`);
      }
      if (lead.corretor?.nome) {
        console.log(`    👤 ${lead.corretor.nome}`);
      }
      console.log(`    💬 ${lead.abordagem}`);
      console.log('');
    }

    // ============================================
    // 9. RESUMO FINAL
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO EXECUTIVO');
    console.log('='.repeat(80));

    const quentes = leadsAnalisados.filter(l => l.temperatura === 'quente');
    const mornos = leadsAnalisados.filter(l => l.temperatura === 'morno');
    const frios = leadsAnalisados.filter(l => l.temperatura === 'frio');

    console.log(`
📊 TOTAIS ANALISADOS: ${leadsAnalisados.length} leads

🌡️ TEMPERATURA:
   🔥 Quentes (score 65+): ${quentes.length} leads
   🌡️ Mornos (score 45-64): ${mornos.length} leads
   ❄️ Frios (score <45): ${frios.length} leads

🎯 OPORTUNIDADES PRIORITÁRIAS:
   • Leads sem corretor: ${semCorretor.length}
   • Leads com visita: ${comVisita.length}
   • Leads quentes com empreendimento: ${perfis['Quente com Interesse'].length}

💡 RECOMENDAÇÃO DE INÍCIO:
   1. Começar com os ${Math.min(10, comVisita.length)} leads que já tiveram visita
   2. Depois os ${Math.min(10, perfis['Quente com Interesse'].length)} quentes com interesse definido
   3. Por fim, os ${Math.min(10, semCorretor.filter(l => l.temperatura !== 'frio').length)} sem corretor (oportunidade direta)

📞 TOTAL PARA CONTATO IMEDIATO: ${Math.min(30, comVisita.length + perfis['Quente com Interesse'].length)} leads
`);

    // Lista final de ação
    console.log('='.repeat(80));
    console.log('📞 LISTA DE AÇÃO - TOP 30 PARA CONTATO IMEDIATO');
    console.log('='.repeat(80) + '\n');

    // Priorizar: visita > quente com interesse > quente sem interesse
    const prioridade = [
      ...comVisita.slice(0, 15),
      ...perfis['Quente com Interesse'].filter(l => !comVisita.includes(l)).slice(0, 10),
      ...perfis['Quente sem Definição'].filter(l => !comVisita.includes(l)).slice(0, 5),
    ];

    const uniquePrioridade = [...new Map(prioridade.map(l => [l.id, l])).values()].slice(0, 30);

    console.log('# | Nome                           | Telefone           | Situação              | Empreendimento');
    console.log('-'.repeat(110));

    for (let i = 0; i < uniquePrioridade.length; i++) {
      const l = uniquePrioridade[i];
      const nome = l.nome.substring(0, 30).padEnd(30);
      const tel = formatPhone(l.telefone).padEnd(18);
      const sit = (l.situacao?.nome || 'N/D').substring(0, 21).padEnd(21);
      const emp = l.empreendimento.length > 0 ? l.empreendimento[0].nome.substring(0, 25) : 'Não definido';

      console.log(`${(i + 1).toString().padStart(2)} | ${nome} | ${tel} | ${sit} | ${emp}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

function analisarLeadProfundo(lead: any): LeadCompleto {
  const dias = lead.dias_cadastro || 180;
  const empreendimentos = lead.empreendimento || [];
  const situacaoNome = lead.situacao?.nome?.toLowerCase() || '';

  // ========== SCORES ==========

  // Completude
  let completude = 0;
  if (lead.email?.trim()) completude += 25;
  if (lead.documento?.trim()) completude += 20;
  if (lead.profissao?.trim()) completude += 15;
  if (lead.cidade?.trim()) completude += 15;
  if (lead.renda_familiar && parseFloat(lead.renda_familiar) > 0) completude += 15;
  if (lead.tags?.length > 0) completude += 10;

  // Recência
  let recencia = 0;
  if (dias <= 14) recencia = 100;
  else if (dias <= 21) recencia = 90;
  else if (dias <= 30) recencia = 80;
  else if (dias <= 45) recencia = 65;
  else if (dias <= 60) recencia = 50;
  else if (dias <= 90) recencia = 35;
  else if (dias <= 120) recencia = 25;
  else recencia = 15;

  // Engajamento
  let engajamento = 20;
  const simulacoes = lead.qtde_simulacoes_associadas || 0;
  const reservas = lead.qtde_reservas_associadas || 0;
  const cvScore = lead.cv_score || 0;
  engajamento += simulacoes * 30;
  engajamento += reservas * 25;
  engajamento += cvScore * 0.4;
  engajamento = Math.min(100, engajamento);

  // Situação
  let situacao = 50;
  if (situacaoNome.includes('visita agendada')) situacao = 95;
  else if (situacaoNome.includes('visita realizada')) situacao = 90;
  else if (situacaoNome.includes('aguardando atendimento')) situacao = 85;
  else if (situacaoNome.includes('simulação')) situacao = 80;
  else if (situacaoNome.includes('em atendimento')) situacao = 70;

  // Intenção
  let intencao = 25;
  if (Array.isArray(empreendimentos) && empreendimentos.length > 0) intencao += 40;

  const origem = (lead.origem || '').toLowerCase();
  if (origem.includes('visita') || origem.includes('plantão')) intencao += 25;
  else if (origem.includes('ligação') || origem.includes('ligacao')) intencao += 20;
  else if (origem.includes('indicação')) intencao += 20;
  else if (origem.includes('site') || origem.includes('portal')) intencao += 10;

  const midias = lead.midias || [];
  if (Array.isArray(midias) && midias.length > 0) {
    const midiaStr = midias.join(' ').toLowerCase();
    if (midiaStr.includes('ação de rua') || midiaStr.includes('acao de rua')) intencao += 10;
    if (midiaStr.includes('indicação') || midiaStr.includes('indicacao')) intencao += 10;
  }
  intencao = Math.min(100, intencao);

  // Score total
  const total = (
    completude * 0.15 +
    recencia * 0.25 +
    engajamento * 0.20 +
    situacao * 0.20 +
    intencao * 0.20
  );

  // ========== TEMPERATURA ==========
  let temperatura: string;
  if (total >= 65 || (situacaoNome.includes('visita') && dias <= 60)) {
    temperatura = 'quente';
  } else if (total >= 45 || dias <= 30) {
    temperatura = 'morno';
  } else {
    temperatura = 'frio';
  }

  // ========== PONTOS FORTES E FRACOS ==========
  const pontos_fortes: string[] = [];
  const pontos_fracos: string[] = [];

  if (lead.email?.trim()) pontos_fortes.push('Tem email');
  if (empreendimentos.length > 0) pontos_fortes.push('Interesse definido');
  if (dias <= 21) pontos_fortes.push('Lead recente');
  if (simulacoes > 0) pontos_fortes.push(`${simulacoes} simulação(ões)`);
  if (situacaoNome.includes('visita')) pontos_fortes.push('Já teve/agendou visita');
  if (origem.includes('ligação')) pontos_fortes.push('Ligou (alto interesse)');
  if (origem.includes('indicação')) pontos_fortes.push('Veio por indicação');

  if (!lead.email?.trim()) pontos_fracos.push('Sem email');
  if (empreendimentos.length === 0) pontos_fracos.push('Sem interesse definido');
  if (dias > 60) pontos_fracos.push('Lead antigo');
  if (!lead.corretor?.id) pontos_fracos.push('Sem corretor');

  // ========== ABORDAGEM ==========
  let abordagem = '';

  if (situacaoNome.includes('visita agendada')) {
    abordagem = 'Confirmar se visita aconteceu e como foi a experiência';
  } else if (situacaoNome.includes('visita realizada')) {
    abordagem = 'Entender impressões da visita e resolver objeções';
  } else if (situacaoNome.includes('aguardando atendimento') && dias <= 21) {
    abordagem = empreendimentos.length > 0
      ? `Apresentar-se e explorar interesse no ${empreendimentos[0].nome}`
      : 'Apresentar-se, descobrir interesse e qualificar';
  } else if (situacaoNome.includes('aguardando atendimento') && dias > 21) {
    abordagem = 'Resgatar contato - perguntar se ainda busca imóvel';
  } else if (situacaoNome.includes('em atendimento') && dias <= 45) {
    abordagem = 'Retomar conversa - entender em que ponto parou';
  } else if (situacaoNome.includes('em atendimento')) {
    abordagem = 'Reativar lead - verificar se situação mudou';
  } else {
    abordagem = empreendimentos.length > 0
      ? `Retomar interesse no ${empreendimentos[0].nome}`
      : 'Fazer contato inicial e qualificar interesse';
  }

  return {
    id: lead.id,
    idlead: lead.idlead,
    nome: lead.nome || 'Sem nome',
    telefone: lead.telefone,
    email: lead.email || '',
    documento: lead.documento || '',
    profissao: lead.profissao || '',
    cidade: lead.cidade || '',
    estado: lead.estado || '',
    renda_familiar: parseFloat(lead.renda_familiar) || 0,
    cv_score: lead.cv_score || 0,
    origem: lead.origem || '',
    midias: lead.midias || [],
    corretor: lead.corretor || {},
    situacao: lead.situacao || {},
    empreendimento: empreendimentos,
    tags: lead.tags || [],
    campos_adicionais: lead.campos_adicionais || {},
    dias_cadastro: dias,
    simulacoes,
    reservas,
    valor_negocio: parseFloat(lead.valor_negocio) || 0,

    score_total: total,
    score_completude: completude,
    score_recencia: recencia,
    score_engajamento: engajamento,
    score_situacao: situacao,
    score_intencao: intencao,

    perfil: `${temperatura}_${empreendimentos.length > 0 ? 'com_interesse' : 'sem_interesse'}`,
    temperatura,
    abordagem,
    pontos_fortes,
    pontos_fracos,
  };
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

deepLeadAnalysis().catch(console.error);
