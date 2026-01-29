import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { conversationId } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ suggestions: [] });
    }

    // conversationId = phone_number
    const phone = conversationId;

    // Buscar últimas 10 mensagens da conversa
    const res = await dbQuery(`
      SELECT message_text, is_from_me, contact_name, timestamp
      FROM whatsapp_messages
      WHERE phone_number = $1
        AND message_text IS NOT NULL AND message_text != ''
      ORDER BY timestamp DESC
      LIMIT 10
    `, [phone]);

    if (res.rows.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    const messages = res.rows.reverse(); // Oldest first
    const lastUserMsg = [...messages].reverse().find(m => !m.is_from_me);
    const contactName = lastUserMsg?.contact_name || phone;

    // Usar Gemini Flash (gratuito) ou GPT-4o-mini como fallback
    const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const systemPrompt = `Você é assistente de vendas imobiliárias. Analise a conversa e gere 3 sugestões de resposta curtas e diretas para o corretor responder ao cliente "${contactName}".
1. Profissional e direta
2. Empática e pessoal  
3. Com Call to Action forte

Responda APENAS em JSON: {"suggestions":[{"type":"profissional","text":"..."},{"type":"pessoal","text":"..."},{"type":"cta","text":"..."}]}`;

    const chatHistory = messages.map(m => 
      `${m.is_from_me ? 'Corretor' : contactName}: ${m.message_text}`
    ).join('\n');

    let suggestions = [];

    // Try Gemini Flash first (free)
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: `${systemPrompt}\n\nHistórico:\n${chatHistory}` }]
              }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.7,
                maxOutputTokens: 500,
              }
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const parsed = JSON.parse(text);
          suggestions = parsed.suggestions || [];
        }
      } catch (e) {
        console.error("[AI Suggestions] Gemini error:", e);
      }
    }

    // Fallback to GPT-4o-mini
    if (suggestions.length === 0 && openaiKey) {
      try {
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: chatHistory },
            ],
            response_format: { type: "json_object" },
            max_tokens: 500,
          }),
        });

        if (openaiRes.ok) {
          const openaiData = await openaiRes.json();
          const content = openaiData.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(content);
          suggestions = parsed.suggestions || [];
        }
      } catch (e) {
        console.error("[AI Suggestions] OpenAI error:", e);
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("AI Suggestions Error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
