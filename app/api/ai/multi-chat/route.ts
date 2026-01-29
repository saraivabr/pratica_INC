import { NextRequest, NextResponse } from "next/server";

// --- Types ---
type AIModel = "gpt-4o-mini" | "gpt-4o" | "gemini-2.0-flash" | "gemini-pro" | "claude-haiku" | "claude-sonnet";
type AIAction = "analyze" | "suggest_reply" | "summarize" | "identify_intent" | "custom";

// Map our model IDs to actual API model strings
const MODEL_MAP: Record<AIModel, { provider: "openai" | "google" | "anthropic"; apiModel: string }> = {
  "gpt-4o-mini":     { provider: "openai",    apiModel: "gpt-4o-mini" },
  "gpt-4o":          { provider: "openai",    apiModel: "gpt-4o" },
  "gemini-2.0-flash": { provider: "google",   apiModel: "gemini-2.0-flash" },
  "gemini-pro":      { provider: "google",    apiModel: "gemini-pro" },
  "claude-haiku":    { provider: "anthropic",  apiModel: "claude-3-haiku-20240307" },
  "claude-sonnet":   { provider: "anthropic",  apiModel: "claude-sonnet-4-20250514" },
};

interface MultiChatRequest {
  model: AIModel;
  messages: Array<{ role: string; content: string; timestamp?: string }>;
  action: AIAction;
  context?: {
    name?: string;
    phone?: string;
    tags?: string[];
    stage?: string;
  };
  customPrompt?: string;
}

// --- System prompts per action ---
function getSystemPrompt(action: AIAction, context?: MultiChatRequest["context"]): string {
  const contextInfo = context
    ? `\n\nContexto do Lead:\n- Nome: ${context.name || "Não informado"}\n- Telefone: ${context.phone || "Não informado"}\n- Tags: ${(context.tags || []).join(", ") || "Nenhuma"}\n- Etapa do funil: ${context.stage || "Não definida"}`
    : "";

  const prompts: Record<AIAction, string> = {
    analyze: `Você é um assistente especialista em vendas imobiliárias. Analise a conversa abaixo e forneça insights detalhados:
- Nível de interesse do lead (alto/médio/baixo)
- Objeções identificadas
- Oportunidades de venda
- Próximos passos recomendados
- Tom emocional da conversa
Seja conciso mas detalhado. Responda em português.${contextInfo}`,

    suggest_reply: `Você é um assistente de vendas imobiliárias. Com base na conversa abaixo, sugira 3 respostas diferentes:
1. **Profissional**: Tom formal e objetivo
2. **Pessoal**: Tom mais próximo e empático
3. **CTA (Call to Action)**: Foco em ação imediata (agendar visita, enviar simulação, etc.)

Para cada sugestão, escreva a mensagem completa pronta para enviar. Responda em português.${contextInfo}`,

    summarize: `Você é um assistente especialista em vendas imobiliárias. Faça um resumo conciso da conversa abaixo:
- Pontos principais discutidos
- Status atual do atendimento
- Decisões tomadas
- Pendências

Responda em formato de bullets em português.${contextInfo}`,

    identify_intent: `Você é um especialista em análise de intenção de leads imobiliários. Analise a conversa e identifique:
- **Intenção principal**: (compra, aluguel, investimento, pesquisa, reclamação, etc.)
- **Urgência**: (imediata, curto prazo, médio prazo, apenas pesquisando)
- **Perfil do imóvel desejado**: (tipo, região, faixa de preço se mencionado)
- **Objeções ou preocupações**: 
- **Temperatura do lead**: 🔥 Quente / 🟡 Morno / 🔵 Frio
- **Recomendação de ação**:

Responda em português de forma objetiva.${contextInfo}`,

    custom: `Você é um assistente especialista em vendas imobiliárias para uma plataforma chamada Prática. Responda de forma útil e em português.${contextInfo}`,
  };

  return prompts[action] || prompts.custom;
}

function formatMessagesForAI(messages: MultiChatRequest["messages"]): string {
  return messages
    .map((m) => {
      const role = m.role === "assistant" || m.role === "sent" ? "Atendente" : "Lead";
      return `[${role}]: ${m.content}`;
    })
    .join("\n");
}

// --- OpenAI via REST ---
async function callOpenAI(systemPrompt: string, conversationText: string, apiModel: string, customPrompt?: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: apiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Conversa:\n${conversationText}${customPrompt ? `\n\nPergunta adicional: ${customPrompt}` : ""}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Sem resposta do modelo.";
}

// --- Google Gemini via REST ---
async function callGemini(systemPrompt: string, conversationText: string, apiModel: string, customPrompt?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const prompt = `${systemPrompt}\n\nConversa:\n${conversationText}${customPrompt ? `\n\nPergunta adicional: ${customPrompt}` : ""}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta do modelo.";
}

// --- Anthropic Claude via REST ---
async function callClaude(systemPrompt: string, conversationText: string, apiModel: string, customPrompt?: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Conversa:\n${conversationText}${customPrompt ? `\n\nPergunta adicional: ${customPrompt}` : ""}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Claude error: ${res.status}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: any) => b.type === "text");
  return textBlock?.text || "Sem resposta do modelo.";
}

// --- Main Handler ---
export async function POST(request: NextRequest) {
  try {
    const body: MultiChatRequest = await request.json();
    const { model, messages, action, context, customPrompt } = body;

    if (!model || !messages || !action) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: model, messages, action" },
        { status: 400 }
      );
    }

    const systemPrompt = getSystemPrompt(action, context);
    const conversationText = formatMessagesForAI(messages);

    let result: string;

    const modelConfig = MODEL_MAP[model as AIModel];
    if (!modelConfig) {
      return NextResponse.json(
        { success: false, error: `Modelo não suportado: ${model}` },
        { status: 400 }
      );
    }

    const envKeys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      google: process.env.GOOGLE_AI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    };

    if (!envKeys[modelConfig.provider]) {
      const providerNames: Record<string, string> = { openai: "OpenAI", google: "Google AI", anthropic: "Anthropic" };
      return NextResponse.json(
        { success: false, error: `Chave ${providerNames[modelConfig.provider]} não configurada` },
        { status: 400 }
      );
    }

    switch (modelConfig.provider) {
      case "openai":
        result = await callOpenAI(systemPrompt, conversationText, modelConfig.apiModel, customPrompt);
        break;
      case "google":
        result = await callGemini(systemPrompt, conversationText, modelConfig.apiModel, customPrompt);
        break;
      case "anthropic":
        result = await callClaude(systemPrompt, conversationText, modelConfig.apiModel, customPrompt);
        break;
    }

    return NextResponse.json({
      success: true,
      model,
      action,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Multi-chat AI error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
