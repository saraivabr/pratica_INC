import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { applyRateLimit } from '@/lib/rate-limit-helper';

// Lazy initialization to avoid build-time errors
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

export async function POST(req: NextRequest) {
  try {
    const rateLimited = await applyRateLimit(req, 'AI_ENDPOINT');
    if (rateLimited) return rateLimited;

    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId } = ctx;

    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    return await withTenant(workspaceId, async (client) => {
      // 1. Get Conversation Data (with tenant isolation)
      const convRes = await client.query(
        `SELECT c.*, u.nome, u.role
         FROM conversations c
         JOIN users u ON c.user_id = u.id
         WHERE c.id = $1 AND c.workspace_id = $2`,
        [conversationId, workspaceId]
      );
      const conv = convRes.rows[0];

      if (!conv) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }

      // 2. Prepare AI Prompt for 3 suggestions
      const messages = conv.messages || [];
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || "";

      const systemPrompt = `Você é Sofia, a IA da Pratica Incorporadora.
Analise o histórico da conversa e a última mensagem do usuário.
Gere 3 sugestões de resposta diferentes:
1. Uma resposta direta e profissional.
2. Uma resposta mais empática e pessoal.
3. Uma resposta com um forte Call to Action (CTA).

Responda APENAS em formato JSON:
{
  "suggestions": [
    { "type": "profissional", "text": "..." },
    { "type": "pessoal", "text": "..." },
    { "type": "cta", "text": "..." }
  ]
}`;

      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
        ],
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0]?.message?.content || "{}";
      return NextResponse.json(JSON.parse(content));
    });
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
