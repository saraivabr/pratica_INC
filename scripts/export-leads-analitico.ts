/**
 * Exportação Analítica de Leads para Reativação
 * Gera CSV + Relatório detalhado
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function exportLeadsAnalitico() {
  console.log('Gerando lista analítica de leads...\n');

  const client = await pool.connect();

  try {
    // Buscar todos os leads candidatos
    const leadsQuery = await client.query(`
      SELECT
        id,
        idlead,
        nome,
        telefone,
        email,
        documento,
        profissao,
        cep,
        endereco,
        numero,
        bairro,
        cidade,
        estado,
        renda_familiar,
        score as cv_score,
        origem,
        midia_principal,
        midias,
        corretor,
        imobiliaria,
        situacao,
        empreendimento,
        tags,
        campos_adicionais,
        data_cad,
        EXTRACT(DAY FROM NOW() - data_cad)::int as dias_cadastro,
        qtde_simulacoes_associadas,
        qtde_reservas_associadas,
        valor_negocio,
        link_interacoes,
        link_simulacoes,
        link_reservas,
        link_interesses
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
    `);

    console.log(`Total de leads encontrados: ${leadsQuery.rows.length}\n`);

    // Processar e analisar cada lead
    const leadsAnalisados = leadsQuery.rows.map(lead => analisarLead(lead));

    // Ordenar por score
    leadsAnalisados.sort((a, b) => b.score_total - a.score_total);

    // ============================================
    // GERAR CSV
    // ============================================
    const csvHeaders = [
      'Ranking',
      'Score Total',
      'Temperatura',
      'Prioridade',
      'Nome',
      'Telefone',
      'Telefone Limpo',
      'Email',
      'Situacao',
      'Dias Cadastro',
      'Empreendimento',
      'Origem',
      'Midia',
      'Corretor',
      'Corretor Email',
      'Imobiliaria',
      'Cidade',
      'Estado',
      'Profissao',
      'Renda Familiar',
      'Score CV',
      'Simulacoes',
      'Score Completude',
      'Score Recencia',
      'Score Engajamento',
      'Score Situacao',
      'Score Intencao',
      'Pontos Fortes',
      'Pontos Fracos',
      'Abordagem Sugerida',
      'Categoria',
      'Link CV CRM',
      'ID Lead',
      'Data Cadastro'
    ].join(';');

    const csvRows = leadsAnalisados.map((lead, index) => {
      return [
        index + 1,
        lead.score_total.toFixed(1),
        lead.temperatura,
        lead.prioridade,
        escapeCsv(lead.nome),
        escapeCsv(lead.telefone),
        lead.telefone_limpo,
        escapeCsv(lead.email),
        escapeCsv(lead.situacao),
        lead.dias_cadastro,
        escapeCsv(lead.empreendimento),
        escapeCsv(lead.origem),
        escapeCsv(lead.midia),
        escapeCsv(lead.corretor_nome),
        escapeCsv(lead.corretor_email),
        escapeCsv(lead.imobiliaria),
        escapeCsv(lead.cidade),
        escapeCsv(lead.estado),
        escapeCsv(lead.profissao),
        lead.renda_familiar || '',
        lead.cv_score,
        lead.simulacoes,
        lead.score_completude.toFixed(0),
        lead.score_recencia.toFixed(0),
        lead.score_engajamento.toFixed(0),
        lead.score_situacao.toFixed(0),
        lead.score_intencao.toFixed(0),
        escapeCsv(lead.pontos_fortes.join(', ')),
        escapeCsv(lead.pontos_fracos.join(', ')),
        escapeCsv(lead.abordagem),
        lead.categoria,
        lead.link_cvcrm,
        lead.idlead,
        lead.data_cadastro
      ].join(';');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const csvPath = path.join(process.cwd(), 'reports', 'leads-analitico.csv');

    // Criar diretório reports se não existir
    if (!fs.existsSync(path.dirname(csvPath))) {
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    }

    fs.writeFileSync(csvPath, '\ufeff' + csvContent, 'utf8'); // BOM para Excel
    console.log(`✅ CSV exportado: ${csvPath}\n`);

    // ============================================
    // GERAR RELATÓRIO MARKDOWN
    // ============================================
    let report = `# Lista Analítica de Leads para Reativação

**Data de geração:** ${new Date().toLocaleString('pt-BR')}
**Total de leads:** ${leadsAnalisados.length}

---

## Resumo Executivo

### Por Temperatura
| Temperatura | Quantidade | % |
|-------------|------------|---|
| 🔥 Quente | ${leadsAnalisados.filter(l => l.temperatura === 'Quente').length} | ${(leadsAnalisados.filter(l => l.temperatura === 'Quente').length / leadsAnalisados.length * 100).toFixed(1)}% |
| 🌡️ Morno | ${leadsAnalisados.filter(l => l.temperatura === 'Morno').length} | ${(leadsAnalisados.filter(l => l.temperatura === 'Morno').length / leadsAnalisados.length * 100).toFixed(1)}% |
| ❄️ Frio | ${leadsAnalisados.filter(l => l.temperatura === 'Frio').length} | ${(leadsAnalisados.filter(l => l.temperatura === 'Frio').length / leadsAnalisados.length * 100).toFixed(1)}% |

### Por Prioridade
| Prioridade | Quantidade |
|------------|------------|
| 🔴 Alta | ${leadsAnalisados.filter(l => l.prioridade === 'Alta').length} |
| 🟡 Média | ${leadsAnalisados.filter(l => l.prioridade === 'Media').length} |
| 🟢 Baixa | ${leadsAnalisados.filter(l => l.prioridade === 'Baixa').length} |

### Por Categoria
| Categoria | Quantidade |
|-----------|------------|
| Com Visita | ${leadsAnalisados.filter(l => l.categoria === 'Com Visita').length} |
| Quente com Interesse | ${leadsAnalisados.filter(l => l.categoria === 'Quente com Interesse').length} |
| Morno com Interesse | ${leadsAnalisados.filter(l => l.categoria === 'Morno com Interesse').length} |
| Sem Corretor | ${leadsAnalisados.filter(l => l.categoria === 'Sem Corretor').length} |
| Outros | ${leadsAnalisados.filter(l => l.categoria === 'Outros').length} |

### Por Empreendimento
| Empreendimento | Leads | Score Médio |
|----------------|-------|-------------|
${getEmpreendimentoStats(leadsAnalisados)}

### Por Origem
| Origem | Leads | Score Médio |
|--------|-------|-------------|
${getOrigemStats(leadsAnalisados)}

---

## Top 50 Leads Detalhados

${leadsAnalisados.slice(0, 50).map((lead, i) => `
### ${i + 1}. ${lead.nome}

| Campo | Valor |
|-------|-------|
| **Score** | ${lead.score_total.toFixed(1)}/100 |
| **Temperatura** | ${lead.temperatura === 'Quente' ? '🔥' : lead.temperatura === 'Morno' ? '🌡️' : '❄️'} ${lead.temperatura} |
| **Prioridade** | ${lead.prioridade} |
| **Categoria** | ${lead.categoria} |
| **Telefone** | ${lead.telefone} |
| **Email** | ${lead.email || 'Não informado'} |
| **Situação** | ${lead.situacao} |
| **Dias desde cadastro** | ${lead.dias_cadastro} dias |
| **Empreendimento** | ${lead.empreendimento || 'Não definido'} |
| **Origem** | ${lead.origem || 'Não informada'} |
| **Mídia** | ${lead.midia || 'Não informada'} |
| **Corretor** | ${lead.corretor_nome || 'Não atribuído'} |
| **Imobiliária** | ${lead.imobiliaria || 'N/A'} |
| **Cidade/Estado** | ${lead.cidade ? `${lead.cidade}/${lead.estado}` : 'Não informado'} |
| **Profissão** | ${lead.profissao || 'Não informada'} |
| **Renda Familiar** | ${lead.renda_familiar ? `R$ ${lead.renda_familiar.toLocaleString('pt-BR')}` : 'Não informada'} |
| **Score CV** | ${lead.cv_score} |
| **Simulações** | ${lead.simulacoes} |

**Scores Detalhados:**
- Completude: ${lead.score_completude.toFixed(0)}/100
- Recência: ${lead.score_recencia.toFixed(0)}/100
- Engajamento: ${lead.score_engajamento.toFixed(0)}/100
- Situação: ${lead.score_situacao.toFixed(0)}/100
- Intenção: ${lead.score_intencao.toFixed(0)}/100

**Pontos Fortes:** ${lead.pontos_fortes.length > 0 ? lead.pontos_fortes.join(', ') : 'Nenhum identificado'}

**Pontos Fracos:** ${lead.pontos_fracos.length > 0 ? lead.pontos_fracos.join(', ') : 'Nenhum identificado'}

**💬 Abordagem Sugerida:** ${lead.abordagem}

**🔗 Link CV CRM:** [Acessar](${lead.link_cvcrm})

---
`).join('\n')}

## Lista Completa para Ação

| # | Nome | Telefone | Score | Temp | Situação | Empreend. | Abordagem |
|---|------|----------|-------|------|----------|-----------|-----------|
${leadsAnalisados.slice(0, 100).map((l, i) =>
  `| ${i+1} | ${l.nome.substring(0,25)} | ${l.telefone} | ${l.score_total.toFixed(0)} | ${l.temperatura.charAt(0)} | ${l.situacao.substring(0,20)} | ${(l.empreendimento || '-').substring(0,15)} | ${l.abordagem.substring(0,30)}... |`
).join('\n')}

---

*Relatório gerado automaticamente pelo sistema Luna*
`;

    const reportPath = path.join(process.cwd(), 'reports', 'leads-analitico.md');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`✅ Relatório MD exportado: ${reportPath}\n`);

    // ============================================
    // RESUMO NO CONSOLE
    // ============================================
    console.log('='.repeat(80));
    console.log('RESUMO DA EXPORTAÇÃO');
    console.log('='.repeat(80));
    console.log(`
📊 Total de leads analisados: ${leadsAnalisados.length}

🌡️ Por Temperatura:
   🔥 Quentes: ${leadsAnalisados.filter(l => l.temperatura === 'Quente').length}
   🌡️ Mornos: ${leadsAnalisados.filter(l => l.temperatura === 'Morno').length}
   ❄️ Frios: ${leadsAnalisados.filter(l => l.temperatura === 'Frio').length}

🎯 Por Prioridade:
   🔴 Alta: ${leadsAnalisados.filter(l => l.prioridade === 'Alta').length}
   🟡 Média: ${leadsAnalisados.filter(l => l.prioridade === 'Media').length}
   🟢 Baixa: ${leadsAnalisados.filter(l => l.prioridade === 'Baixa').length}

📁 Arquivos gerados:
   • ${csvPath}
   • ${reportPath}

📋 TOP 10 PARA CONTATO IMEDIATO:
`);

    for (let i = 0; i < Math.min(10, leadsAnalisados.length); i++) {
      const l = leadsAnalisados[i];
      const temp = l.temperatura === 'Quente' ? '🔥' : l.temperatura === 'Morno' ? '🌡️' : '❄️';
      console.log(`${temp} ${(i+1).toString().padStart(2)}. ${l.nome.padEnd(30)} | ${l.telefone.padEnd(18)} | Score: ${l.score_total.toFixed(0)}`);
      console.log(`     ${l.situacao} | ${l.empreendimento || 'Sem empreendimento'}`);
      console.log(`     💬 ${l.abordagem}`);
      console.log('');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

function analisarLead(lead: any) {
  const dias = lead.dias_cadastro || 180;
  const empreendimentos = lead.empreendimento || [];
  const situacaoNome = lead.situacao?.nome || '';
  const situacaoLower = situacaoNome.toLowerCase();

  // Extrair dados
  const empNome = Array.isArray(empreendimentos) && empreendimentos.length > 0
    ? empreendimentos.map((e: any) => e.nome).join(', ')
    : '';

  const midias = lead.midias || [];
  const midiaStr = Array.isArray(midias) && midias.length > 0
    ? midias.join(', ')
    : lead.midia_principal || '';

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
  if (situacaoLower.includes('visita agendada')) situacao = 95;
  else if (situacaoLower.includes('visita realizada')) situacao = 90;
  else if (situacaoLower.includes('aguardando atendimento')) situacao = 85;
  else if (situacaoLower.includes('simulação')) situacao = 80;
  else if (situacaoLower.includes('em atendimento')) situacao = 70;

  // Intenção
  let intencao = 25;
  if (empNome) intencao += 40;

  const origem = (lead.origem || '').toLowerCase();
  if (origem.includes('visita') || origem.includes('plantão')) intencao += 25;
  else if (origem.includes('ligação') || origem.includes('ligacao')) intencao += 20;
  else if (origem.includes('indicação')) intencao += 20;
  else if (origem.includes('facebook')) intencao += 15;
  else if (origem.includes('site') || origem.includes('portal')) intencao += 10;

  if (midiaStr.toLowerCase().includes('ação de rua')) intencao += 10;
  if (midiaStr.toLowerCase().includes('indicação')) intencao += 10;
  intencao = Math.min(100, intencao);

  // Score total
  const total = (
    completude * 0.15 +
    recencia * 0.25 +
    engajamento * 0.20 +
    situacao * 0.20 +
    intencao * 0.20
  );

  // Temperatura
  let temperatura: string;
  if (total >= 65 || (situacaoLower.includes('visita') && dias <= 60)) {
    temperatura = 'Quente';
  } else if (total >= 45 || dias <= 30) {
    temperatura = 'Morno';
  } else {
    temperatura = 'Frio';
  }

  // Prioridade
  let prioridade: string;
  if (total >= 65) prioridade = 'Alta';
  else if (total >= 50) prioridade = 'Media';
  else prioridade = 'Baixa';

  // Categoria
  let categoria: string;
  if (situacaoLower.includes('visita')) {
    categoria = 'Com Visita';
  } else if (temperatura === 'Quente' && empNome) {
    categoria = 'Quente com Interesse';
  } else if (temperatura === 'Morno' && empNome) {
    categoria = 'Morno com Interesse';
  } else if (!lead.corretor?.id) {
    categoria = 'Sem Corretor';
  } else {
    categoria = 'Outros';
  }

  // Pontos fortes e fracos
  const pontos_fortes: string[] = [];
  const pontos_fracos: string[] = [];

  if (lead.email?.trim()) pontos_fortes.push('Tem email');
  if (empNome) pontos_fortes.push('Interesse definido');
  if (dias <= 21) pontos_fortes.push('Lead recente');
  if (simulacoes > 0) pontos_fortes.push(`${simulacoes} simulação(ões)`);
  if (situacaoLower.includes('visita')) pontos_fortes.push('Teve/agendou visita');
  if (origem.includes('ligação')) pontos_fortes.push('Ligou (alto interesse)');
  if (origem.includes('indicação')) pontos_fortes.push('Veio por indicação');
  if (lead.profissao?.trim()) pontos_fortes.push('Profissão informada');
  if (lead.cidade?.trim()) pontos_fortes.push('Localização conhecida');

  if (!lead.email?.trim()) pontos_fracos.push('Sem email');
  if (!empNome) pontos_fracos.push('Sem interesse definido');
  if (dias > 60) pontos_fracos.push('Lead antigo');
  if (!lead.corretor?.id) pontos_fracos.push('Sem corretor');
  if (!lead.profissao?.trim()) pontos_fracos.push('Profissão desconhecida');

  // Abordagem
  let abordagem = '';
  if (situacaoLower.includes('visita agendada')) {
    abordagem = 'Confirmar se visita aconteceu e como foi a experiência';
  } else if (situacaoLower.includes('visita realizada')) {
    abordagem = 'Entender impressões da visita e resolver objeções';
  } else if (situacaoLower.includes('aguardando atendimento') && dias <= 21) {
    abordagem = empNome
      ? `Apresentar-se e explorar interesse no ${empNome.split(',')[0]}`
      : 'Apresentar-se, descobrir interesse e qualificar';
  } else if (situacaoLower.includes('aguardando atendimento') && dias > 21) {
    abordagem = 'Resgatar contato - perguntar se ainda busca imóvel';
  } else if (situacaoLower.includes('em atendimento') && dias <= 45) {
    abordagem = 'Retomar conversa - entender em que ponto parou';
  } else if (situacaoLower.includes('em atendimento')) {
    abordagem = 'Reativar lead - verificar se situação mudou';
  } else {
    abordagem = empNome
      ? `Retomar interesse no ${empNome.split(',')[0]}`
      : 'Fazer contato inicial e qualificar interesse';
  }

  // Telefone limpo
  const telefone_limpo = lead.telefone.replace(/\D/g, '');

  return {
    id: lead.id,
    idlead: lead.idlead,
    nome: lead.nome || 'Sem nome',
    telefone: formatPhone(lead.telefone),
    telefone_limpo,
    email: lead.email || '',
    situacao: situacaoNome,
    dias_cadastro: dias,
    empreendimento: empNome,
    origem: lead.origem || '',
    midia: midiaStr,
    corretor_nome: lead.corretor?.nome || '',
    corretor_email: lead.corretor?.email || '',
    imobiliaria: lead.imobiliaria?.nome || '',
    cidade: lead.cidade || '',
    estado: lead.estado || '',
    profissao: lead.profissao || '',
    renda_familiar: parseFloat(lead.renda_familiar) || 0,
    cv_score: lead.cv_score || 0,
    simulacoes,

    score_total: total,
    score_completude: completude,
    score_recencia: recencia,
    score_engajamento: engajamento,
    score_situacao: situacao,
    score_intencao: intencao,

    temperatura,
    prioridade,
    categoria,
    pontos_fortes,
    pontos_fracos,
    abordagem,

    link_cvcrm: lead.link_interesses || '',
    data_cadastro: lead.data_cad ? new Date(lead.data_cad).toLocaleDateString('pt-BR') : '',
  };
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

function escapeCsv(value: string): string {
  if (!value) return '';
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function getEmpreendimentoStats(leads: any[]): string {
  const stats = new Map<string, { count: number; totalScore: number }>();

  for (const lead of leads) {
    const emp = lead.empreendimento || 'Não definido';
    if (!stats.has(emp)) {
      stats.set(emp, { count: 0, totalScore: 0 });
    }
    const s = stats.get(emp)!;
    s.count++;
    s.totalScore += lead.score_total;
  }

  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([nome, data]) => `| ${nome.substring(0, 30)} | ${data.count} | ${(data.totalScore / data.count).toFixed(1)} |`)
    .join('\n');
}

function getOrigemStats(leads: any[]): string {
  const stats = new Map<string, { count: number; totalScore: number }>();

  for (const lead of leads) {
    const orig = lead.origem || 'Não informada';
    if (!stats.has(orig)) {
      stats.set(orig, { count: 0, totalScore: 0 });
    }
    const s = stats.get(orig)!;
    s.count++;
    s.totalScore += lead.score_total;
  }

  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([nome, data]) => `| ${nome.substring(0, 25)} | ${data.count} | ${(data.totalScore / data.count).toFixed(1)} |`)
    .join('\n');
}

exportLeadsAnalitico().catch(console.error);
