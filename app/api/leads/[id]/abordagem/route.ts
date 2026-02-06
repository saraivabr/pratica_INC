import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import pool from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/rate-limit-helper";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000,
    });
  }
  return _openai;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await applyRateLimit(request, "AI_ENDPOINT");
    if (rateLimited) return rateLimited;

    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;
    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "ID invalido" }, { status: 400 });
    }

    // Fetch lead data
    const leadRes = await pool.query(
      `SELECT id_lead, nome, email, telefone, origem, midia_principal,
              corretor, situacao_nome, empreendimento, score,
              valor_negocio, renda_familiar, cidade, estado, tags,
              data_cad, ultima_data_conversao,
              qtde_simulacoes_associadas, qtde_reservas_associadas,
              possibilidade_venda
       FROM cvcrm_leads
       WHERE workspace_id = $1 AND id_lead = $2`,
      [workspaceId, leadId]
    );

    if (leadRes.rows.length === 0) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    const lead = leadRes.rows[0];

    // Fetch last interactions
    const interacoesRes = await pool.query(
      `SELECT tipo, descricao, data_cadastro, usuario_nome
       FROM cvcrm_lead_interacoes
       WHERE cvcrm_lead_id = $1 AND workspace_id = $2
       ORDER BY data_cadastro DESC
       LIMIT 5`,
      [leadId, workspaceId]
    );

    // Parse JSON fields safely
    const parseJSON = (val: any) => {
      if (!val) return null;
      if (typeof val === "object") return val;
      try { return JSON.parse(val); } catch { return null; }
    };

    const corretor = parseJSON(lead.corretor);
    const empreendimento = parseJSON(lead.empreendimento);
    const tags = parseJSON(lead.tags) || [];

    const empNome = Array.isArray(empreendimento)
      ? empreendimento[0]?.nome
      : empreendimento?.nome;

    const sitNome = lead.situacao_nome || "Desconhecida";

    // Calculate days since last interaction
    const lastInteraction = interacoesRes.rows[0];
    const daysSince = lastInteraction?.data_cadastro
      ? Math.floor((Date.now() - new Date(lastInteraction.data_cadastro).getTime()) / 86400000)
      : null;

    // Calculate temperature
    const temperature = daysSince === null
      ? "sem interacao"
      : daysSince <= 3 ? "quente" : daysSince <= 7 ? "morno" : "frio";

    // Build context for AI
    const leadContext = {
      nome: lead.nome || "Sem nome",
      telefone: lead.telefone ? "Sim" : "Nao",
      email: lead.email ? "Sim" : "Nao",
      origem: lead.origem || lead.midia_principal || "Nao informada",
      situacao: sitNome,
      empreendimento: empNome || "Nao especificado",
      score: lead.score || 0,
      valor_imovel: lead.valor_negocio ? `R$ ${Number(lead.valor_negocio).toLocaleString("pt-BR")}` : "Nao informado",
      renda_familiar: lead.renda_familiar ? `R$ ${Number(lead.renda_familiar).toLocaleString("pt-BR")}` : "Nao informada",
      cidade: lead.cidade ? `${lead.cidade}${lead.estado ? `/${lead.estado}` : ""}` : "Nao informada",
      tags: tags.length > 0 ? tags.join(", ") : "Nenhuma",
      data_cadastro: lead.data_cad || "Desconhecida",
      temperatura: temperature,
      dias_sem_contato: daysSince !== null ? `${daysSince} dias` : "Nunca contatado",
      simulacoes: lead.qtde_simulacoes_associadas || 0,
      reservas: lead.qtde_reservas_associadas || 0,
      possibilidade_venda: lead.possibilidade_venda || 0,
      historico_interacoes: interacoesRes.rows.map((i: any) => ({
        tipo: i.tipo,
        descricao: i.descricao?.substring(0, 200),
        data: i.data_cadastro,
        por: i.usuario_nome,
      })),
    };

    const systemPrompt = `Voce e um consultor especialista em vendas de imoveis no Brasil, com 20 anos de experiencia em incorporadoras.
Sua funcao e analisar o perfil de um lead e gerar um guia de abordagem personalizado para o corretor de imoveis.

REGRAS IMPORTANTES:
- Seja pratico e direto, com dicas acionaveis
- Use linguagem natural do mercado imobiliario brasileiro
- Considere a temperatura do lead (quente/morno/frio) para ajustar a urgencia
- Considere o estagio na jornada de compra para ajustar o tom
- Se o lead tem simulacoes ou reservas, ele esta mais avancado
- Se o lead esta frio (muitos dias sem contato), sugira abordagem de reativacao
- Sempre sugira frases prontas que o corretor pode copiar e usar no WhatsApp

Responda EXCLUSIVAMENTE em JSON valido com esta estrutura:
{
  "perfil": {
    "titulo": "Uma frase resumindo quem e esse lead (ex: 'Investidor interessado em alto padrao')",
    "nivel_interesse": "alto|medio|baixo",
    "probabilidade_fechamento": "alta|media|baixa",
    "pontos_fortes": ["2-3 pontos positivos sobre esse lead"],
    "pontos_atencao": ["1-2 pontos de atencao ou risco"]
  },
  "estrategia": {
    "melhor_canal": "WhatsApp|Ligacao|Email",
    "melhor_horario": "Sugestao de horario ideal",
    "tom_recomendado": "Descricao do tom (ex: consultivo e empático)",
    "abordagem": "Estrategia geral em 2-3 frases"
  },
  "scripts": [
    {
      "titulo": "Nome do script (ex: 'Primeira abordagem')",
      "contexto": "Quando usar este script",
      "mensagem": "Mensagem pronta para WhatsApp (use {nome} para o nome do lead e {empreendimento} para o empreendimento)"
    },
    {
      "titulo": "Segundo script",
      "contexto": "Quando usar",
      "mensagem": "Mensagem pronta"
    },
    {
      "titulo": "Terceiro script",
      "contexto": "Quando usar",
      "mensagem": "Mensagem pronta"
    }
  ],
  "objecoes": [
    {
      "objecao": "Objecao comum (ex: 'Esta caro')",
      "resposta": "Como responder"
    },
    {
      "objecao": "Segunda objecao",
      "resposta": "Como responder"
    }
  ],
  "proximos_passos": [
    "Passo 1 concreto",
    "Passo 2 concreto",
    "Passo 3 concreto"
  ]
}`;

    const userPrompt = `Analise este lead e gere o guia de abordagem:\n\n${JSON.stringify(leadContext, null, 2)}`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const abordagem = JSON.parse(content);

    return NextResponse.json({ data: abordagem, lead: { nome: lead.nome, situacao: sitNome } });
  } catch (error) {
    console.error("Abordagem AI Error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar abordagem", details: String(error) },
      { status: 500 }
    );
  }
}
