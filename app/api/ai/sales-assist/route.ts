import { NextRequest, NextResponse } from "next/server";

/**
 * Sales Assist API — IA invisível pro corretor
 * 
 * Recebe mensagens da conversa e retorna:
 * - summary: resumo curto do lead (1-2 linhas)
 * - quickReplies: 2-3 sugestões de resposta focadas em venda
 * 
 * Usa o modelo mais barato disponível automaticamente.
 */

interface SalesAssistRequest {
  messages: Array<{ role: string; content: string; timestamp?: string }>;
  contactName?: string;
  contactPhone?: string;
}

const SYSTEM_PROMPT = `Você é um assistente de vendas imobiliárias INVISÍVEL. Seu trabalho é ajudar o corretor a fechar negócios.

REGRAS RÍGIDAS:
1. Responda APENAS em JSON válido, sem markdown, sem code blocks
2. O formato DEVE ser: {"summary":"...","quickReplies":["...","...","..."]}
3. O summary deve ter NO MÁXIMO 2 linhas — seja direto e útil
4. Gere 2 a 3 quickReplies prontas pra enviar (mensagens completas, não tópicos)
5. As respostas devem ser FOCADAS EM VENDA: agendar visita, enviar tabela, tirar dúvida, criar urgência
6. Tom: profissional mas humano, como um corretor experiente falaria no WhatsApp
7. Use emojis com moderação (1-2 por mensagem no máximo)
8. Se o lead demonstrou interesse em algo específico, as sugestões devem ser sobre aquilo
9. Se o lead está frio ou sumiu, sugira mensagens de reengajamento
10. NUNCA mencione que é uma IA ou que está gerando sugestões`;

function formatConversation(messages: SalesAssistRequest["messages"]): string {
  // Pegar últimas 20 mensagens pra não estourar contexto
  const recent = messages.slice(-20);
  return recent
    .map((m) => {
      const role = m.role === "assistant" || m.role === "sent" || m.role === "me" ? "Corretor" : "Lead";
      return `[${role}]: ${m.content}`;
    })
    .join("\n");
}

// Tenta Gemini Flash (grátis) → GPT-4o Mini (barato) → fallback local
async function getAIResponse(prompt: string): Promise<{ summary: string; quickReplies: string[] }> {
  // 1. Tentar Gemini 2.0 Flash (grátis até 15 req/min)
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return parseAIResponse(text);
      }
    } catch (e) {
      console.error("[SalesAssist] Gemini failed, trying GPT:", e);
    }
  }

  // 2. Tentar GPT-4o Mini ($0.15/1M tokens)
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return parseAIResponse(text);
      }
    } catch (e) {
      console.error("[SalesAssist] GPT failed, trying Claude:", e);
    }
  }

  // 3. Tentar Claude Haiku
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.content?.find((b: any) => b.type === "text")?.text;
        if (text) return parseAIResponse(text);
      }
    } catch (e) {
      console.error("[SalesAssist] Claude failed:", e);
    }
  }

  // 4. Fallback: respostas genéricas (sem IA)
  return {
    summary: "Conversa em andamento",
    quickReplies: [
      "Olá! Tudo bem? Como posso te ajudar hoje? 😊",
      "Gostaria de agendar uma visita? Tenho horários disponíveis essa semana!",
      "Posso enviar mais informações sobre o empreendimento?",
    ],
  };
}

function parseAIResponse(text: string): { summary: string; quickReplies: string[] } {
  try {
    // Limpar markdown code blocks se existirem
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || "Conversa em andamento",
      quickReplies: Array.isArray(parsed.quickReplies)
        ? parsed.quickReplies.slice(0, 3)
        : ["Olá! Como posso ajudar?"],
    };
  } catch {
    // Se não conseguiu parsear JSON, tenta extrair algo útil
    return {
      summary: "Conversa em andamento",
      quickReplies: [
        "Olá! Tudo bem? Como posso te ajudar? 😊",
        "Posso agendar uma visita pra você conhecer o empreendimento!",
      ],
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SalesAssistRequest = await request.json();
    const { messages, contactName, contactPhone } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        success: true,
        summary: "Nova conversa",
        quickReplies: [
          `Olá${contactName ? ` ${contactName.split(" ")[0]}` : ""}! Tudo bem? Sou corretor da Prática e estou à disposição! 😊`,
          "Vi que você se interessou por um dos nossos empreendimentos. Posso te contar mais?",
        ],
      });
    }

    const conversationText = formatConversation(messages);
    const contactInfo = contactName ? `Nome do lead: ${contactName}` : "";

    const fullPrompt = `${SYSTEM_PROMPT}

${contactInfo}

Conversa recente:
${conversationText}

Gere o JSON com summary e quickReplies:`;

    const result = await getAIResponse(fullPrompt);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("[SalesAssist] Error:", error);
    return NextResponse.json({
      success: true,
      summary: "Conversa em andamento",
      quickReplies: [
        "Olá! Como posso te ajudar hoje? 😊",
        "Gostaria de saber mais sobre nossos empreendimentos?",
      ],
    });
  }
}
