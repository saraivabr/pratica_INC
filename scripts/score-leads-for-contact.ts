/**
 * Sistema de Pontuação de Leads para Contato com Luna
 *
 * Analisa todos os dados disponíveis para criar um score de prioridade
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface LeadScore {
  id: number;
  idlead: number;
  nome: string;
  telefone: string;
  email: string;

  // Scores parciais (0-100 cada)
  score_completude: number;      // Dados preenchidos
  score_recencia: number;        // Quão recente é
  score_engajamento: number;     // Simulações, reservas, score CV
  score_situacao: number;        // Qualidade da situação
  score_intencao: number;        // Origem + interesse em empreendimento

  // Score final
  score_total: number;

  // Dados para contexto
  dias_cadastro: number;
  situacao: string;
  empreendimento: string;
  origem: string;
  midia: string;
  corretor: string;
  tem_email: boolean;
  simulacoes: number;

  // Recomendação de abordagem
  abordagem_sugerida: string;
}

async function scoreLeadsForContact() {
  console.log('='.repeat(70));
  console.log('PONTUAÇÃO DE LEADS PARA CONTATO COM LUNA');
  console.log('='.repeat(70));
  console.log('');

  const client = await pool.connect();

  try {
    // Buscar leads candidatos (mesmos filtros de antes)
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
        AND data_cad > NOW() - INTERVAL '120 days'
      ORDER BY data_cad DESC
      LIMIT 200
    `);

    console.log(`Analisando ${leadsQuery.rows.length} leads...\n`);

    const scoredLeads: LeadScore[] = [];

    for (const lead of leadsQuery.rows) {
      const scored = scoreLead(lead);
      scoredLeads.push(scored);
    }

    // Ordenar por score total
    scoredLeads.sort((a, b) => b.score_total - a.score_total);

    // Mostrar breakdown dos scores
    console.log('📊 SISTEMA DE PONTUAÇÃO\n');
    console.log('Cada dimensão vale 0-100 pontos:\n');
    console.log('  • Completude (20%): Email, documento, profissão, cidade');
    console.log('  • Recência (25%): Dias desde cadastro (recente = melhor)');
    console.log('  • Engajamento (20%): Simulações, reservas, score CV');
    console.log('  • Situação (15%): Tipo de situação atual');
    console.log('  • Intenção (20%): Origem, mídia, empreendimento definido');
    console.log('');

    // Top 30 detalhado
    console.log('='.repeat(70));
    console.log('TOP 30 LEADS PARA CONTATO - ORDENADOS POR SCORE');
    console.log('='.repeat(70));
    console.log('');

    for (let i = 0; i < Math.min(30, scoredLeads.length); i++) {
      const lead = scoredLeads[i];
      const prioridade = lead.score_total >= 70 ? '🔴' :
                         lead.score_total >= 50 ? '🟡' : '🟢';

      console.log(`${prioridade} #${(i + 1).toString().padStart(2)}  ${lead.nome}`);
      console.log(`    📱 ${formatPhone(lead.telefone)}${lead.tem_email ? ' | ✉️ ' + lead.email : ''}`);
      console.log(`    🏠 ${lead.empreendimento}`);
      console.log(`    📊 Situação: ${lead.situacao} | ⏰ ${lead.dias_cadastro} dias`);
      console.log(`    🎯 Origem: ${lead.origem} | Mídia: ${lead.midia}`);
      if (lead.corretor !== 'Não atribuído') {
        console.log(`    👤 Corretor: ${lead.corretor}`);
      }
      console.log('');
      console.log(`    SCORES: Total: ${lead.score_total.toFixed(0)}/100`);
      console.log(`      Completude: ${lead.score_completude.toFixed(0)} | Recência: ${lead.score_recencia.toFixed(0)} | Engajamento: ${lead.score_engajamento.toFixed(0)}`);
      console.log(`      Situação: ${lead.score_situacao.toFixed(0)} | Intenção: ${lead.score_intencao.toFixed(0)}`);
      console.log('');
      console.log(`    💬 ABORDAGEM: ${lead.abordagem_sugerida}`);
      console.log('');
      console.log('-'.repeat(70));
    }

    // Resumo estatístico
    console.log('\n' + '='.repeat(70));
    console.log('RESUMO ESTATÍSTICO');
    console.log('='.repeat(70));

    const alta = scoredLeads.filter(l => l.score_total >= 70).length;
    const media = scoredLeads.filter(l => l.score_total >= 50 && l.score_total < 70).length;
    const baixa = scoredLeads.filter(l => l.score_total < 50).length;

    console.log(`
📊 Distribuição por prioridade:
   🔴 Alta (70+):    ${alta} leads
   🟡 Média (50-69): ${media} leads
   🟢 Baixa (<50):   ${baixa} leads

📈 Médias dos scores:
   Completude:  ${(scoredLeads.reduce((s, l) => s + l.score_completude, 0) / scoredLeads.length).toFixed(1)}
   Recência:    ${(scoredLeads.reduce((s, l) => s + l.score_recencia, 0) / scoredLeads.length).toFixed(1)}
   Engajamento: ${(scoredLeads.reduce((s, l) => s + l.score_engajamento, 0) / scoredLeads.length).toFixed(1)}
   Situação:    ${(scoredLeads.reduce((s, l) => s + l.score_situacao, 0) / scoredLeads.length).toFixed(1)}
   Intenção:    ${(scoredLeads.reduce((s, l) => s + l.score_intencao, 0) / scoredLeads.length).toFixed(1)}
`);

    // Exportar lista para ação
    console.log('='.repeat(70));
    console.log('LISTA PARA AÇÃO - TOP 15');
    console.log('='.repeat(70));
    console.log('');
    console.log('Nome | Telefone | Empreendimento | Score | Abordagem');
    console.log('-'.repeat(100));

    for (let i = 0; i < Math.min(15, scoredLeads.length); i++) {
      const l = scoredLeads[i];
      const nome = l.nome.substring(0, 25).padEnd(25);
      const tel = formatPhone(l.telefone).padEnd(18);
      const emp = l.empreendimento.substring(0, 20).padEnd(20);
      const score = l.score_total.toFixed(0).padStart(3);
      console.log(`${nome} | ${tel} | ${emp} | ${score} | ${l.abordagem_sugerida.substring(0, 40)}`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

function scoreLead(lead: any): LeadScore {
  // 1. SCORE DE COMPLETUDE (0-100)
  // Quanto mais dados preenchidos, melhor
  let completude = 0;
  if (lead.email && lead.email.trim()) completude += 30;
  if (lead.documento && lead.documento.trim()) completude += 25;
  if (lead.profissao && lead.profissao.trim()) completude += 15;
  if (lead.cidade && lead.cidade.trim()) completude += 15;
  if (lead.renda_familiar && parseFloat(lead.renda_familiar) > 0) completude += 15;

  // 2. SCORE DE RECÊNCIA (0-100)
  // Leads mais recentes são mais quentes
  const dias = lead.dias_cadastro || 120;
  let recencia = 0;
  if (dias <= 14) recencia = 100;
  else if (dias <= 21) recencia = 90;
  else if (dias <= 30) recencia = 80;
  else if (dias <= 45) recencia = 65;
  else if (dias <= 60) recencia = 50;
  else if (dias <= 90) recencia = 35;
  else recencia = 20;

  // 3. SCORE DE ENGAJAMENTO (0-100)
  // Simulações e reservas indicam interesse real
  let engajamento = 20; // base
  const simulacoes = lead.qtde_simulacoes_associadas || 0;
  const reservas = lead.qtde_reservas_associadas || 0;
  const cvScore = lead.cv_score || 0;

  engajamento += simulacoes * 25; // cada simulação vale muito
  engajamento += reservas * 20;
  engajamento += cvScore * 0.3; // score do CV contribui
  engajamento = Math.min(100, engajamento);

  // 4. SCORE DE SITUAÇÃO (0-100)
  // Algumas situações são mais promissoras
  const situacaoNome = lead.situacao?.nome?.toLowerCase() || '';
  let situacao = 50; // default

  if (situacaoNome.includes('aguardando atendimento')) {
    situacao = 85; // Nunca foi atendido - oportunidade!
  } else if (situacaoNome.includes('visita agendada')) {
    situacao = 90; // Já teve interesse em visitar
  } else if (situacaoNome.includes('visita realizada')) {
    situacao = 80; // Visitou mas não avançou
  } else if (situacaoNome.includes('em atendimento')) {
    situacao = 70; // Está em atendimento mas parou
  } else if (situacaoNome.includes('simulação')) {
    situacao = 75; // Fez simulação
  }

  // 5. SCORE DE INTENÇÃO (0-100)
  // Origem + mídia + empreendimento definido
  let intencao = 30; // base

  // Empreendimento definido = sabe o que quer
  const empreendimentos = lead.empreendimento || [];
  if (Array.isArray(empreendimentos) && empreendimentos.length > 0) {
    intencao += 35;
  }

  // Origem indica qualidade do lead
  const origem = (lead.origem || '').toLowerCase();
  if (origem.includes('ligação') || origem.includes('ligacao')) {
    intencao += 20; // Ligou = interesse ativo
  } else if (origem.includes('visita') || origem.includes('plantão') || origem.includes('plantao')) {
    intencao += 25; // Visitou = muito interesse
  } else if (origem.includes('indicação') || origem.includes('indicacao')) {
    intencao += 20; // Indicação = confiança
  } else if (origem.includes('site') || origem.includes('portal')) {
    intencao += 10; // Online = interesse passivo
  }

  // Mídia específica
  const midias = lead.midias || [];
  if (Array.isArray(midias) && midias.length > 0) {
    const midiaStr = midias.join(' ').toLowerCase();
    if (midiaStr.includes('ação de rua') || midiaStr.includes('acao de rua')) {
      intencao += 10;
    } else if (midiaStr.includes('shopping')) {
      intencao += 5;
    }
  }

  intencao = Math.min(100, intencao);

  // SCORE TOTAL (média ponderada)
  const total = (
    completude * 0.20 +
    recencia * 0.25 +
    engajamento * 0.20 +
    situacao * 0.15 +
    intencao * 0.20
  );

  // Extrair dados para exibição
  const empNome = Array.isArray(empreendimentos) && empreendimentos.length > 0
    ? empreendimentos.map((e: any) => e.nome).join(', ')
    : 'Não especificado';

  const midiaStr = Array.isArray(midias) && midias.length > 0
    ? midias.join(', ')
    : 'Não informada';

  const corretorNome = lead.corretor?.nome || 'Não atribuído';

  // Gerar abordagem sugerida
  const abordagem = gerarAbordagem(lead, { completude, recencia, engajamento, situacao, intencao });

  return {
    id: lead.id,
    idlead: lead.idlead,
    nome: lead.nome || 'Sem nome',
    telefone: lead.telefone,
    email: lead.email || '',

    score_completude: completude,
    score_recencia: recencia,
    score_engajamento: engajamento,
    score_situacao: situacao,
    score_intencao: intencao,
    score_total: total,

    dias_cadastro: dias,
    situacao: lead.situacao?.nome || 'Não definida',
    empreendimento: empNome,
    origem: lead.origem || 'Não informada',
    midia: midiaStr,
    corretor: corretorNome,
    tem_email: !!(lead.email && lead.email.trim()),
    simulacoes: lead.qtde_simulacoes_associadas || 0,

    abordagem_sugerida: abordagem,
  };
}

function gerarAbordagem(lead: any, scores: any): string {
  const situacao = lead.situacao?.nome?.toLowerCase() || '';
  const dias = lead.dias_cadastro || 0;
  const empreendimentos = lead.empreendimento || [];
  const temEmp = Array.isArray(empreendimentos) && empreendimentos.length > 0;
  const empNome = temEmp ? empreendimentos[0].nome : '';

  // Baseado na situação
  if (situacao.includes('aguardando atendimento')) {
    if (dias <= 21) {
      return temEmp
        ? `Apresentar-se e retomar interesse no ${empNome.split('-')[0].trim()}`
        : 'Apresentar-se e descobrir interesse - lead ainda quente';
    } else {
      return temEmp
        ? `Resgatar interesse no ${empNome.split('-')[0].trim()} - perguntar se ainda busca imóvel`
        : 'Resgatar contato - perguntar se ainda está buscando';
    }
  }

  if (situacao.includes('visita agendada')) {
    return 'Perguntar como foi a busca - a visita aconteceu? O que achou?';
  }

  if (situacao.includes('visita realizada')) {
    return 'Retomar após visita - entender objeções e oferecer alternativas';
  }

  if (situacao.includes('em atendimento')) {
    if (dias <= 45) {
      return 'Retomar conversa - perguntar em que ponto parou a busca';
    } else {
      return 'Reativar lead frio - verificar se situação mudou';
    }
  }

  // Default
  return temEmp
    ? `Retomar interesse no ${empNome.split('-')[0].trim()}`
    : 'Fazer contato inicial e qualificar interesse';
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

scoreLeadsForContact().catch(console.error);
