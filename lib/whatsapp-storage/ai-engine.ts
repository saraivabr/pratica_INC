/**
 * AI Engine for WhatsApp conversation analysis.
 *
 * Uses OpenAI to:
 * - Summarize conversations
 * - Extract structured data (budget, preferences, objections)
 * - Classify sentiment, intent, temperature
 * - Suggest next actions and replies
 */

import OpenAI from "openai";
import { getMongoDb } from "@/lib/mongodb";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
    });
  }
  return _openai;
}

// ── Types ───────────────────────────────────────────────────────────

export interface AIAnalysis {
  summary: string;
  topics: string[];
  sentiment: "positivo" | "neutro" | "negativo" | "irritado";
  intent: "compra" | "informacao" | "reclamacao" | "suporte" | "social";
  urgency: "alta" | "media" | "baixa";
  temperature: "quente" | "morno" | "frio";
  extracted: {
    budget: string | null;
    bedrooms: number | null;
    preferred_region: string | null;
    visited_properties: string[];
    family_size: string | null;
    timeline: string | null;
    financing: boolean | null;
    objections: string[];
  };
  next_action: string | null;
  suggested_message: string | null;
  analyzed_at: Date;
  message_count: number;
}

// ── Analyze Conversation ────────────────────────────────────────────

/**
 * Analyze a full conversation and store results in MongoDB.
 */
export async function analyzeConversation(
  workspaceId: number,
  phoneNumber: string
): Promise<AIAnalysis | null> {
  const db = getMongoDb();

  // Fetch last 50 messages for analysis
  const messages = await db
    .collection("messages")
    .find({ workspace_id: workspaceId, phone_number: phoneNumber })
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();

  if (messages.length < 3) {
    return null; // Not enough messages to analyze
  }

  // Build conversation transcript
  const transcript = messages
    .reverse()
    .map((m) => {
      const sender = m.is_from_me ? "Corretor" : "Cliente";
      const text = m.message_text || `[${m.message_type}]`;
      return `${sender}: ${text}`;
    })
    .join("\n");

  const contactName =
    messages.find((m) => !m.is_from_me)?.contact_name || phoneNumber;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um analista de conversas de WhatsApp para uma empresa imobiliaria.
Analise a conversa abaixo e retorne um JSON com a seguinte estrutura:

{
  "summary": "resumo em 1-2 frases da conversa",
  "topics": ["topico1", "topico2"],
  "sentiment": "positivo|neutro|negativo|irritado",
  "intent": "compra|informacao|reclamacao|suporte|social",
  "urgency": "alta|media|baixa",
  "temperature": "quente|morno|frio",
  "extracted": {
    "budget": "orcamento mencionado ou null",
    "bedrooms": numero_quartos_ou_null,
    "preferred_region": "regiao mencionada ou null",
    "visited_properties": ["propriedades visitadas"],
    "family_size": "composicao familiar ou null",
    "timeline": "prazo mencionado ou null",
    "financing": true_false_ou_null,
    "objections": ["objecoes mencionadas"]
  },
  "next_action": "sugestao de proxima acao para o corretor",
  "suggested_message": "mensagem sugerida para enviar"
}

Regras:
- Responda APENAS em portugues brasileiro
- Seja conciso e direto
- Se nao houver informacao suficiente para um campo, use null ou []
- Foque em dados relevantes para venda imobiliaria`,
        },
        {
          role: "user",
          content: `Contato: ${contactName}\nTelefone: ${phoneNumber}\n\n${transcript}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);

    const analysis: AIAnalysis = {
      summary: parsed.summary || "",
      topics: parsed.topics || [],
      sentiment: parsed.sentiment || "neutro",
      intent: parsed.intent || "informacao",
      urgency: parsed.urgency || "media",
      temperature: parsed.temperature || "morno",
      extracted: {
        budget: parsed.extracted?.budget || null,
        bedrooms: parsed.extracted?.bedrooms || null,
        preferred_region: parsed.extracted?.preferred_region || null,
        visited_properties: parsed.extracted?.visited_properties || [],
        family_size: parsed.extracted?.family_size || null,
        timeline: parsed.extracted?.timeline || null,
        financing: parsed.extracted?.financing ?? null,
        objections: parsed.extracted?.objections || [],
      },
      next_action: parsed.next_action || null,
      suggested_message: parsed.suggested_message || null,
      analyzed_at: new Date(),
      message_count: messages.length,
    };

    // Store in MongoDB conversations collection
    const remoteJid = `${phoneNumber}@s.whatsapp.net`;
    await db.collection("conversations").updateOne(
      { workspace_id: workspaceId, remote_jid: remoteJid },
      {
        $set: {
          ai_analysis: analysis,
          updated_at: new Date(),
        },
      }
    );

    return analysis;
  } catch (err: any) {
    console.error("[AI Engine] Analysis error:", err.message);
    return null;
  }
}

// ── Suggest Reply ───────────────────────────────────────────────────

/**
 * Generate reply suggestions based on recent messages.
 */
export async function suggestReply(
  workspaceId: number,
  phoneNumber: string,
  contextMessages: number = 10
): Promise<string[]> {
  const db = getMongoDb();

  // Fetch recent messages
  const messages = await db
    .collection("messages")
    .find({ workspace_id: workspaceId, phone_number: phoneNumber })
    .sort({ timestamp: -1 })
    .limit(contextMessages)
    .toArray();

  if (messages.length === 0) {
    return ["Ola! Como posso ajudar?"];
  }

  // Get conversation analysis if available
  const conv = await db.collection("conversations").findOne({
    workspace_id: workspaceId,
    phone_number: phoneNumber,
  });
  const analysis = conv?.ai_analysis;

  const transcript = messages
    .reverse()
    .map((m) => {
      const sender = m.is_from_me ? "Corretor" : "Cliente";
      return `${sender}: ${m.message_text || `[${m.message_type}]`}`;
    })
    .join("\n");

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Voce e um assistente de vendas imobiliarias. Sugira 3 respostas para o corretor enviar ao cliente.

${analysis ? `Contexto da conversa: ${analysis.summary}\nSentimento: ${analysis.sentiment}\nTemperatura: ${analysis.temperature}` : ""}

Retorne JSON: { "suggestions": ["resposta1", "resposta2", "resposta3"] }

Regras:
- Respostas em portugues brasileiro informal/profissional
- Curta (1 linha), media (2-3 linhas), detalhada (3-5 linhas)
- Tom adequado ao sentimento da conversa
- Inclua dados concretos quando possivel (empreendimento, preco, etc)
- Use WhatsApp formatting (*negrito*, _italico_) quando adequado`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.suggestions || [];
  } catch (err: any) {
    console.error("[AI Engine] Suggest reply error:", err.message);
    return [];
  }
}

// ── Should Re-analyze ───────────────────────────────────────────────

/**
 * Check if a conversation should be re-analyzed.
 * Re-analyze after 5+ new messages or 1+ hour since last analysis.
 */
export async function shouldReanalyze(
  workspaceId: number,
  phoneNumber: string
): Promise<boolean> {
  const db = getMongoDb();
  const conv = await db.collection("conversations").findOne({
    workspace_id: workspaceId,
    phone_number: phoneNumber,
  });

  if (!conv?.ai_analysis) return true; // Never analyzed

  const lastAnalysis = conv.ai_analysis.analyzed_at;
  const messagesSinceAnalysis = conv.ai_analysis.message_count || 0;
  const currentMessages = conv.total_messages || 0;

  // Re-analyze if 5+ new messages since last analysis
  if (currentMessages - messagesSinceAnalysis >= 5) return true;

  // Re-analyze if 1+ hour since last analysis
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (new Date(lastAnalysis) < hourAgo) return true;

  return false;
}
