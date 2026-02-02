import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { dbQuery } from '@/lib/db';
import { requireWorkspaceContext, hasWorkspace } from '@/lib/api-guards';
import { applyRateLimit } from '@/lib/rate-limit-helper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');
    _openai = new OpenAI({ apiKey, timeout: 60000 });
  }
  return _openai;
}

// ============================================================================
// Tool definitions for OpenAI function calling
// ============================================================================

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_leads',
      description: 'Consulta leads do CRM. Pode filtrar por situação, nome, empreendimento, corretor, período. Use para responder perguntas sobre carteira de leads, pipeline, funil, estatísticas.',
      parameters: {
        type: 'object',
        properties: {
          situacao: { type: 'string', description: 'Filtro por situação: "Em Atendimento", "Aguardando Atendimento", "Visita Agendada", "Visita Realizada", "Simulação", "Com Reserva", "Em Análise de Crédito", "Montagem Pasta", "Venda Realizada", "Perdido", "Aguardando Atendimento Corretor"' },
          nome: { type: 'string', description: 'Filtro por nome do lead (busca parcial)' },
          empreendimento: { type: 'string', description: 'Filtro por nome do empreendimento de interesse' },
          corretor_nome: { type: 'string', description: 'Filtro por nome do corretor responsável' },
          limite: { type: 'number', description: 'Quantidade máxima de resultados (padrão 20)' },
          apenas_contagem: { type: 'boolean', description: 'Se true, retorna apenas a contagem por situação' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_empreendimentos',
      description: 'Consulta empreendimentos da incorporadora. Retorna nome, descrição comercial, cidade, status, total de unidades, unidades disponíveis, tipos de unidade e faixas de metragem. USE SEMPRE que perguntarem sobre imóveis, empreendimentos, lançamentos ou produtos.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string', description: 'Filtro por nome (busca parcial)' },
          cidade: { type: 'string', description: 'Filtro por cidade' },
          status: { type: 'string', description: 'Filtro por status (ativo, inativo)' },
          apenas_disponiveis: { type: 'boolean', description: 'Se true, retorna apenas empreendimentos com unidades disponíveis' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_unidades',
      description: 'Consulta unidades/apartamentos de um empreendimento. Retorna nome da unidade, tipo, metragem, andar, bloco, situação (Disponível, Vendida, Reservada, Bloqueada), valor de venda (quando disponível), dormitórios e vagas. USE para responder sobre disponibilidade, preços, plantas, metragens.',
      parameters: {
        type: 'object',
        properties: {
          empreendimento: { type: 'string', description: 'Nome do empreendimento (busca parcial). OBRIGATÓRIO para resultados úteis.' },
          situacao: { type: 'string', description: 'Filtro por situação: Disponível, Reservada, Vendida, Bloqueada, Em Análise' },
          tipo: { type: 'string', description: 'Filtro por tipo: APARTAMENTO HMP, APARTAMENTO HIS, APARTAMENTO NR, APARTAMENTO R2V, Studio, VAGA' },
          area_min: { type: 'number', description: 'Área privativa mínima em m²' },
          area_max: { type: 'number', description: 'Área privativa máxima em m²' },
          dormitorios: { type: 'number', description: 'Filtro por número de dormitórios (1, 2 ou 3)' },
          valor_max: { type: 'number', description: 'Valor máximo de venda em R$' },
          limite: { type: 'number', description: 'Quantidade máxima (padrão 20)' },
          resumo: { type: 'boolean', description: 'Se true, retorna resumo agrupado por tipo e situação em vez de listar unidades individuais' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_reservas',
      description: 'Consulta reservas e vendas. Retorna status, valores, empreendimento, unidade, cliente, corretor.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filtro por status da reserva' },
          empreendimento: { type: 'string', description: 'Filtro por empreendimento' },
          corretor_nome: { type: 'string', description: 'Filtro por corretor' },
          cliente: { type: 'string', description: 'Filtro por nome do cliente' },
          limite: { type: 'number', description: 'Quantidade máxima (padrão 20)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'estatisticas_gerais',
      description: 'Retorna estatísticas gerais do CRM: total de leads por situação, total de reservas, total de empreendimentos, leads recentes.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

// ============================================================================
// Tool execution
// ============================================================================

async function executeTool(name: string, args: any, workspaceId: number): Promise<string> {
  try {
    switch (name) {
      case 'consultar_leads': {
        if (args.apenas_contagem) {
          const { rows } = await dbQuery(
            `SELECT situacao_nome, COUNT(*) as total FROM cvcrm_leads
             WHERE workspace_id = $1 AND situacao_nome IS NOT NULL
             GROUP BY situacao_nome ORDER BY total DESC`,
            [workspaceId]
          );
          return JSON.stringify({ tipo: 'contagem_leads', dados: rows });
        }

        const conditions = ['workspace_id = $1'];
        const params: any[] = [workspaceId];
        let idx = 2;

        if (args.situacao) {
          conditions.push(`situacao_nome ILIKE $${idx}`);
          params.push(`%${args.situacao}%`);
          idx++;
        }
        if (args.nome) {
          conditions.push(`nome ILIKE $${idx}`);
          params.push(`%${args.nome}%`);
          idx++;
        }
        if (args.empreendimento) {
          conditions.push(`(empreendimentos::text ILIKE $${idx} OR empreendimentos_id::text ILIKE $${idx})`);
          params.push(`%${args.empreendimento}%`);
          idx++;
        }
        if (args.corretor_nome) {
          conditions.push(`corretor_nome ILIKE $${idx}`);
          params.push(`%${args.corretor_nome}%`);
          idx++;
        }

        const limit = Math.min(args.limite || 20, 50);
        const { rows } = await dbQuery(
          `SELECT nome, email, telefone, celular, situacao_nome, corretor_nome,
                  empreendimentos, score, origem, cidade, estado,
                  data_cadastro_cvcrm, valor_negocio, possibilidade_venda
           FROM cvcrm_leads
           WHERE ${conditions.join(' AND ')}
           ORDER BY data_cadastro_cvcrm DESC NULLS LAST
           LIMIT ${limit}`,
          params
        );

        const total = await dbQuery(
          `SELECT COUNT(*) as total FROM cvcrm_leads WHERE ${conditions.join(' AND ')}`,
          params
        );

        return JSON.stringify({
          tipo: 'leads',
          total: total.rows[0]?.total,
          mostrando: rows.length,
          dados: rows.map((r: any) => ({
            nome: r.nome,
            telefone: r.telefone || r.celular,
            email: r.email,
            situacao: r.situacao_nome,
            corretor: r.corretor_nome,
            empreendimentos: r.empreendimentos,
            score: r.score,
            origem: r.origem,
            cidade: r.cidade,
            estado: r.estado,
            valor_negocio: r.valor_negocio,
            data_cadastro: r.data_cadastro_cvcrm,
          })),
        });
      }

      case 'consultar_empreendimentos': {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (args.nome) {
          conditions.push(`e.nome ILIKE $${idx}`);
          params.push(`%${args.nome}%`);
          idx++;
        }
        if (args.cidade) {
          conditions.push(`e.cidade ILIKE $${idx}`);
          params.push(`%${args.cidade}%`);
          idx++;
        }
        if (args.status) {
          conditions.push(`e.status ILIKE $${idx}`);
          params.push(`%${args.status}%`);
          idx++;
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get empreendimentos with unit summary
        const { rows } = await dbQuery(
          `SELECT e.nome, e.descricao, e.tipo, e.status, e.cidade, e.uf, e.total_unidades,
                  e.endereco_completo, e.data_lancamento, e.data_entrega_prevista,
                  COALESCE(us.disponiveis, 0) as unidades_disponiveis,
                  COALESCE(us.total, 0) as unidades_cadastradas,
                  us.tipos_unidade,
                  us.area_min, us.area_max
           FROM cvcrm_empreendimentos e
           LEFT JOIN (
             SELECT empreendimento_nome,
               COUNT(*) as total,
               COUNT(CASE WHEN situacao = 'Disponível' THEN 1 END) as disponiveis,
               STRING_AGG(DISTINCT CASE WHEN cvcrm_data->>'tipo' NOT LIKE 'VAGA%' AND cvcrm_data->>'tipo' NOT LIKE 'Vaga%' THEN cvcrm_data->>'tipo' END, ', ') as tipos_unidade,
               MIN(CASE WHEN area_privativa > 10 AND cvcrm_data->>'tipo' NOT LIKE 'VAGA%' THEN area_privativa END) as area_min,
               MAX(CASE WHEN cvcrm_data->>'tipo' NOT LIKE 'VAGA%' THEN area_privativa END) as area_max,
               MIN(CASE WHEN valor_venda > 0 AND cvcrm_data->>'tipo' NOT LIKE 'VAGA%' THEN valor_venda END) as valor_min,
               MAX(CASE WHEN valor_venda > 0 AND cvcrm_data->>'tipo' NOT LIKE 'VAGA%' THEN valor_venda END) as valor_max,
               MIN(CASE WHEN dormitorios > 0 THEN dormitorios END) as dorm_min,
               MAX(dormitorios) as dorm_max
             FROM cvcrm_unidades
             GROUP BY empreendimento_nome
           ) us ON UPPER(us.empreendimento_nome) LIKE UPPER(e.nome) || '%'
           ${where}
           ${args.apenas_disponiveis ? 'AND COALESCE(us.disponiveis, 0) > 0' : ''}
           ORDER BY e.nome LIMIT 30`,
          params
        );

        return JSON.stringify({
          tipo: 'empreendimentos',
          total: rows.length,
          dados: rows.map((r: any) => ({
            nome: r.nome,
            descricao: r.descricao || null,
            status: r.status,
            cidade: r.cidade,
            uf: r.uf,
            endereco: r.endereco_completo || null,
            total_unidades: r.total_unidades || r.unidades_cadastradas,
            unidades_disponiveis: r.unidades_disponiveis,
            tipos_unidade: r.tipos_unidade || null,
            metragem: r.area_min && r.area_max ? `${r.area_min}m² a ${r.area_max}m²` : null,
            faixa_preco: r.valor_min && r.valor_max ? `R$ ${Number(r.valor_min).toLocaleString('pt-BR')} a R$ ${Number(r.valor_max).toLocaleString('pt-BR')}` : null,
            dormitorios: r.dorm_min && r.dorm_max ? (r.dorm_min === r.dorm_max ? `${r.dorm_min}` : `${r.dorm_min} a ${r.dorm_max}`) : null,
            lancamento: r.data_lancamento || null,
            entrega_prevista: r.data_entrega_prevista || null,
          })),
        });
      }

      case 'consultar_unidades': {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (args.empreendimento) {
          conditions.push(`empreendimento_nome ILIKE $${idx}`);
          params.push(`%${args.empreendimento}%`);
          idx++;
        }
        if (args.situacao) {
          conditions.push(`situacao ILIKE $${idx}`);
          params.push(`%${args.situacao}%`);
          idx++;
        }
        if (args.tipo) {
          conditions.push(`(cvcrm_data->>'tipo' ILIKE $${idx} OR tipo ILIKE $${idx})`);
          params.push(`%${args.tipo}%`);
          idx++;
        }
        if (args.area_min) {
          conditions.push(`area_privativa >= $${idx}`);
          params.push(args.area_min);
          idx++;
        }
        if (args.area_max) {
          conditions.push(`area_privativa <= $${idx}`);
          params.push(args.area_max);
          idx++;
        }
        if (args.dormitorios) {
          conditions.push(`dormitorios = $${idx}`);
          params.push(args.dormitorios);
          idx++;
        }
        if (args.valor_max) {
          conditions.push(`valor_venda > 0 AND valor_venda <= $${idx}`);
          params.push(args.valor_max);
          idx++;
        }

        // Exclude parking spots from results unless explicitly searching for them
        if (!args.tipo || !args.tipo.toLowerCase().includes('vaga')) {
          conditions.push(`cvcrm_data->>'tipo' NOT LIKE 'VAGA%'`);
          conditions.push(`cvcrm_data->>'tipo' NOT LIKE 'Vaga%'`);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Summary mode: group by type and situação
        if (args.resumo) {
          const { rows } = await dbQuery(
            `SELECT empreendimento_nome,
                    cvcrm_data->>'tipo' as tipo_unidade,
                    situacao,
                    COUNT(*) as quantidade,
                    MIN(area_privativa) as area_min,
                    MAX(area_privativa) as area_max,
                    MIN(NULLIF(valor_venda, 0)) as valor_min,
                    MAX(NULLIF(valor_venda, 0)) as valor_max
             FROM cvcrm_unidades ${where}
             GROUP BY empreendimento_nome, cvcrm_data->>'tipo', situacao
             ORDER BY empreendimento_nome, quantidade DESC`,
            params
          );
          return JSON.stringify({ tipo: 'resumo_unidades', dados: rows });
        }

        // Detail mode
        const limit = Math.min(args.limite || 20, 50);
        const { rows } = await dbQuery(
          `SELECT nome, cvcrm_data->>'tipo' as tipo_unidade, empreendimento_nome, bloco, andar,
                  area_privativa, dormitorios, vagas, situacao,
                  NULLIF(valor_venda, 0) as valor_venda,
                  cvcrm_data->>'tipologia' as tipologia
           FROM cvcrm_unidades ${where}
           ORDER BY empreendimento_nome, andar, nome LIMIT ${limit}`,
          params
        );

        const total = await dbQuery(
          `SELECT COUNT(*) as total FROM cvcrm_unidades ${where}`,
          params
        );

        return JSON.stringify({
          tipo: 'unidades',
          total: total.rows[0]?.total,
          mostrando: rows.length,
          dados: rows.map((r: any) => ({
            unidade: r.nome,
            tipo: r.tipo_unidade || r.tipologia,
            empreendimento: r.empreendimento_nome,
            bloco: r.bloco,
            andar: r.andar,
            area_privativa_m2: r.area_privativa,
            dormitorios: r.dormitorios,
            vagas: r.vagas,
            situacao: r.situacao,
            valor: r.valor_venda || 'Consultar tabela',
          })),
        });
      }

      case 'consultar_reservas': {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (args.status) {
          conditions.push(`status ILIKE $${idx}`);
          params.push(`%${args.status}%`);
          idx++;
        }
        if (args.empreendimento) {
          conditions.push(`empreendimento_nome ILIKE $${idx}`);
          params.push(`%${args.empreendimento}%`);
          idx++;
        }
        if (args.corretor_nome) {
          conditions.push(`corretor_nome ILIKE $${idx}`);
          params.push(`%${args.corretor_nome}%`);
          idx++;
        }
        if (args.cliente) {
          conditions.push(`cliente_principal_nome ILIKE $${idx}`);
          params.push(`%${args.cliente}%`);
          idx++;
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = Math.min(args.limite || 20, 50);
        const { rows } = await dbQuery(
          `SELECT numero_reserva, status, valor_reserva, valor_venda, data_reserva, data_venda,
                  empreendimento_nome, unidade_nome, cliente_principal_nome, corretor_nome, imobiliaria_nome
           FROM cvcrm_reservas ${where}
           ORDER BY data_reserva DESC NULLS LAST LIMIT ${limit}`,
          params
        );

        return JSON.stringify({ tipo: 'reservas', total: rows.length, dados: rows });
      }

      case 'estatisticas_gerais': {
        const [leads, empreendimentos, reservas, leadsSituacao, unidadesDisp] = await Promise.all([
          dbQuery(`SELECT COUNT(*) as total FROM cvcrm_leads WHERE workspace_id = $1`, [workspaceId]),
          dbQuery(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'ativo' THEN 1 END) as ativos FROM cvcrm_empreendimentos`),
          dbQuery(`SELECT COUNT(*) as total, COUNT(CASE WHEN status ILIKE '%ativ%' OR data_venda IS NOT NULL THEN 1 END) as vendas FROM cvcrm_reservas`),
          dbQuery(
            `SELECT situacao_nome, COUNT(*) as total FROM cvcrm_leads
             WHERE workspace_id = $1 AND situacao_nome IS NOT NULL
             GROUP BY situacao_nome ORDER BY total DESC`,
            [workspaceId]
          ),
          dbQuery(
            `SELECT empreendimento_nome,
                    COUNT(CASE WHEN situacao = 'Disponível' THEN 1 END) as disponiveis,
                    COUNT(CASE WHEN situacao = 'Vendida' THEN 1 END) as vendidas,
                    COUNT(*) as total
             FROM cvcrm_unidades
             WHERE cvcrm_data->>'tipo' NOT LIKE 'VAGA%' AND cvcrm_data->>'tipo' NOT LIKE 'Vaga%'
             GROUP BY empreendimento_nome
             ORDER BY disponiveis DESC`
          ),
        ]);

        return JSON.stringify({
          tipo: 'estatisticas',
          total_leads: leads.rows[0]?.total,
          total_empreendimentos: empreendimentos.rows[0]?.total,
          empreendimentos_ativos: empreendimentos.rows[0]?.ativos,
          total_reservas: reservas.rows[0]?.total,
          vendas_realizadas: reservas.rows[0]?.vendas,
          leads_por_situacao: leadsSituacao.rows,
          unidades_por_empreendimento: unidadesDisp.rows,
        });
      }

      default:
        return JSON.stringify({ error: 'Ferramenta não encontrada' });
    }
  } catch (err: any) {
    console.error(`[Assistente] Tool ${name} error:`, err);
    return JSON.stringify({ error: `Erro ao consultar: ${err.message}` });
  }
}

// ============================================================================
// System prompt
// ============================================================================

const SYSTEM_PROMPT = `Você é um assistente especializado em vendas de imóveis, focado em ajudar corretores de imóveis no Brasil.

Você tem acesso ao CRM da empresa e pode consultar dados reais de leads, empreendimentos, unidades e reservas.

## Dados de Imóveis Disponíveis
Você tem acesso a informações detalhadas dos empreendimentos da incorporadora:
- **Empreendimentos**: nome, descrição comercial, localização, status, total de unidades, unidades disponíveis
- **Unidades**: nome/código, tipo (Apartamento HMP, HIS, NR, R2V, Studio), metragem (área privativa), andar, bloco, situação (Disponível, Vendida, Reservada, Bloqueada)
- **Tipos de unidade**: HMP = Habitação de Mercado Popular, HIS = Habitação de Interesse Social, NR = Não Residencial, R2V = Residencial 2 vagas, Studio = Estúdio compacto

IMPORTANTE sobre preços e dados:
- Muitas unidades disponíveis já possuem valor de venda, dormitórios e vagas cadastrados (fonte: tabela Órulo).
- Quando o valor estiver disponível, mostre formatado em R$ (ex: R$ 495.281,04).
- Quando o valor NÃO estiver disponível (mostrar "Consultar tabela"), informe que o corretor deve consultar a tabela de preços vigente com o gestor comercial.
- NUNCA invente valores. Mostre apenas dados reais do sistema.
- Use dormitórios e vagas para ajudar o corretor a qualificar o cliente (ex: "família com 2 filhos → 3 dormitórios").

## Quando usar as ferramentas
- Perguntas sobre imóveis, empreendimentos, apartamentos, metragem, disponibilidade → USE consultar_empreendimentos e consultar_unidades
- Para visão geral de um empreendimento → USE consultar_empreendimentos com o nome
- Para detalhes de unidades específicas → USE consultar_unidades com resumo=true primeiro, depois detalhe se necessário
- Perguntas sobre leads, pipeline, funil → USE consultar_leads
- Perguntas sobre reservas, vendas → USE consultar_reservas
- Perguntas gerais sobre números → USE estatisticas_gerais

## Suas áreas de especialidade
- Técnicas de vendas e negociação imobiliária
- Abordagem e qualificação de leads
- Scripts e mensagens para WhatsApp profissional
- Tratamento de objeções comuns (preço, localização, timing)
- Técnicas de fechamento de vendas
- Follow-up estratégico
- Mercado imobiliário brasileiro (tendências, financiamento, legislação)
- Análise de carteira e pipeline de vendas
- Conhecimento detalhado dos empreendimentos da incorporadora

## Diretrizes
- Seja prático e direto, com exemplos aplicáveis
- Quando mostrar dados do CRM, organize em tabelas markdown ou listas claras
- Quando sugerir scripts ou mensagens, use linguagem natural brasileira
- Adapte o tom: consultivo e parceiro, nunca pedante
- Use formatação markdown para organizar respostas
- Ao mostrar telefones, formate como (XX) XXXXX-XXXX
- Personalize usando o nome do corretor quando disponível
- Quando mostrar valores monetários, formate em R$ com separador de milhar
- Ao falar de empreendimentos, use a descrição comercial para destacar diferenciais
- Sugira argumentos de venda baseados nas características reais dos imóveis (localização, metragem, proximidade do metrô, etc.)`;

// ============================================================================
// Main handler
// ============================================================================

export async function POST(request: NextRequest) {
  const rateLimited = await applyRateLimit(request, 'AI_ENDPOINT');
  if (rateLimited) return rateLimited;

  const ctx = await requireWorkspaceContext(request);
  if (!hasWorkspace(ctx)) return ctx;

  try {
    const body = await request.json();
    const { conversaId, message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ error: 'Mensagem muito longa (máx 5000 caracteres)' }, { status: 400 });
    }

    let activeConversaId = conversaId;

    // Create conversation if not provided
    if (!activeConversaId) {
      const titulo = message.slice(0, 80) + (message.length > 80 ? '...' : '');
      const { rows } = await dbQuery(
        `INSERT INTO assistente_conversas (user_id, titulo) VALUES ($1, $2) RETURNING id`,
        [ctx.user.id, titulo]
      );
      activeConversaId = rows[0].id;
    } else {
      const { rows } = await dbQuery(
        `SELECT id FROM assistente_conversas WHERE id = $1 AND user_id = $2`,
        [activeConversaId, ctx.user.id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
      }
    }

    // Save user message
    await dbQuery(
      `INSERT INTO assistente_mensagens (conversa_id, role, content) VALUES ($1, 'user', $2)`,
      [activeConversaId, message.trim()]
    );

    // Load conversation history
    const { rows: history } = await dbQuery(
      `SELECT role, content FROM assistente_mensagens
       WHERE conversa_id = $1 ORDER BY created_at ASC LIMIT 20`,
      [activeConversaId]
    );

    const corretorNome = ctx.user.nome || 'Corretor';
    const personalizedSystem = `${SYSTEM_PROMPT}\n\nVocê está conversando com ${corretorNome}. O workspace_id deste corretor é ${ctx.workspaceId}.`;

    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: personalizedSystem },
      ...history.map((m) => ({
        role: (m as any).role as 'user' | 'assistant',
        content: (m as any).content as string,
      })),
    ];

    const openai = getOpenAI();

    // Single streaming call with tool handling
    return streamWithTools(openai, openaiMessages, activeConversaId, ctx.workspaceId);

  } catch (error: any) {
    console.error('[Assistente] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// ============================================================================
// Stream helper with inline tool handling (single-call approach)
// ============================================================================

const TOOL_LABELS: Record<string, string> = {
  consultar_leads: 'Consultando leads do CRM...',
  consultar_empreendimentos: 'Consultando empreendimentos...',
  consultar_unidades: 'Consultando unidades...',
  consultar_reservas: 'Consultando reservas...',
  estatisticas_gerais: 'Carregando estatísticas...',
};

function streamWithTools(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  conversaId: number,
  workspaceId: number
): Response {
  let fullResponse = '';
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let closed = false;

      function safeEnqueue(data: string) {
        if (closed) return;
        try { controller.enqueue(encoder.encode(data)); } catch { closed = true; }
      }
      function safeClose() {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* */ }
      }

      try {
        // Send meta immediately to keep connection alive
        safeEnqueue(`data: ${JSON.stringify({ type: 'meta', conversaId })}\n\n`);

        // First streaming call WITH tools
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages,
          tools: TOOLS,
          tool_choice: 'auto',
          stream: true,
          max_tokens: 2000,
          temperature: 0.7,
        });

        // Accumulate tool calls from stream
        const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};
        let hasToolCalls = false;
        let sentStatusEvent = false;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Text content — stream directly to client
          if (delta.content) {
            fullResponse += delta.content;
            safeEnqueue(`data: ${JSON.stringify({ type: 'text', content: delta.content })}\n\n`);
          }

          // Tool calls — accumulate
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              if (!toolCallsMap[idx]) {
                toolCallsMap[idx] = { id: '', name: '', arguments: '' };
              }
              if (tc.id) toolCallsMap[idx].id = tc.id;
              if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
              if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;

              // Send status event on first tool detection
              if (!sentStatusEvent && toolCallsMap[idx].name) {
                hasToolCalls = true;
                sentStatusEvent = true;
                const label = TOOL_LABELS[toolCallsMap[idx].name] || 'Consultando dados...';
                safeEnqueue(`data: ${JSON.stringify({ type: 'status', message: label })}\n\n`);
              }
            }
          }
        }

        // If tool calls were made, execute and do a second streaming call
        if (hasToolCalls) {
          const toolCalls = Object.values(toolCallsMap);

          // Build assistant message with tool_calls for context
          const assistantMessage: any = {
            role: 'assistant',
            content: fullResponse || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          };

          // Execute tools
          const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
          for (const tc of toolCalls) {
            let args: any = {};
            try { args = JSON.parse(tc.arguments || '{}'); } catch { /* */ }
            const result = await executeTool(tc.name, args, workspaceId);
            toolResults.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: result,
            });
          }

          // Second streaming call with tool results
          fullResponse = ''; // reset — only save the final answer
          const stream2 = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [...messages, assistantMessage, ...toolResults],
            stream: true,
            max_tokens: 2000,
            temperature: 0.7,
          });

          for await (const chunk of stream2) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              safeEnqueue(`data: ${JSON.stringify({ type: 'text', content })}\n\n`);
            }
          }
        }

        // Save response to DB
        const responseToSave = fullResponse.trim();
        if (responseToSave) {
          dbQuery(
            `INSERT INTO assistente_mensagens (conversa_id, role, content) VALUES ($1, 'assistant', $2)`,
            [conversaId, responseToSave]
          ).catch((e) => console.error('[Assistente] DB save error:', e));

          dbQuery(
            `UPDATE assistente_conversas SET updated_at = NOW() WHERE id = $1`,
            [conversaId]
          ).catch((e) => console.error('[Assistente] DB update error:', e));
        }

        safeEnqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (err) {
        console.error('[Assistente] Stream error:', err);
        safeEnqueue(`data: ${JSON.stringify({ type: 'error', message: 'Erro ao gerar resposta' })}\n\n`);
      } finally {
        safeClose();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
