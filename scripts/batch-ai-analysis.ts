/**
 * Batch AI Analysis — Analyze all conversations with OpenAI GPT-4o-mini.
 *
 * Run: npx tsx scripts/batch-ai-analysis.ts
 *
 * Options:
 *   --force     Re-analyze all conversations (even already analyzed ones)
 *   --limit N   Process at most N conversations (default: all)
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";
import OpenAI from "openai";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://pratica:pratica_mongo_2026!@localhost:27017/pratica?authSource=pratica";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Parse CLI args
const args = process.argv.slice(2);
const forceAll = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : 0;

async function main() {
  console.log("=== Batch AI Analysis ===\n");
  console.log(`  Force re-analyze: ${forceAll}`);
  if (limit > 0) console.log(`  Limit: ${limit} conversations`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000,
  });

  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db();

  const messagesCol = db.collection("messages");
  const conversationsCol = db.collection("conversations");

  // Find conversations to analyze
  const filter: any = {};
  if (!forceAll) {
    filter.$or = [
      { ai_analysis: null },
      { ai_analysis: { $exists: false } },
    ];
  }

  let query = conversationsCol.find(filter).sort({ last_message_at: -1 });
  if (limit > 0) query = query.limit(limit);

  const conversations = await query.toArray();
  console.log(`  Found ${conversations.length} conversations to analyze\n`);

  let analyzed = 0;
  let skipped = 0;
  let errors = 0;
  let totalTokens = 0;

  for (const conv of conversations) {
    const phoneNumber = conv.phone_number;
    const workspaceId = conv.workspace_id;

    // Fetch last 50 messages for analysis
    const messages = await messagesCol
      .find({ workspace_id: workspaceId, phone_number: phoneNumber })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    if (messages.length < 3) {
      skipped++;
      process.stdout.write(
        `  [${analyzed + skipped + errors}/${conversations.length}] ${phoneNumber} — skipped (${messages.length} msgs)\r`
      );
      continue;
    }

    // Build transcript
    const transcript = messages
      .reverse()
      .map((m) => {
        const sender = m.is_from_me ? "Corretor" : "Cliente";
        const text = m.message_text || `[${m.message_type}]`;
        return `${sender}: ${text}`;
      })
      .join("\n");

    const contactName =
      conv.contact_name ||
      messages.find((m) => !m.is_from_me)?.contact_name ||
      phoneNumber;

    try {
      const response = await openai.chat.completions.create({
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
      if (!content) {
        errors++;
        continue;
      }

      const parsed = JSON.parse(content);
      const usage = response.usage;
      if (usage) totalTokens += usage.total_tokens;

      const analysis = {
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

      // Store in conversations
      await conversationsCol.updateOne(
        { _id: conv._id },
        { $set: { ai_analysis: analysis, updated_at: new Date() } }
      );

      analyzed++;
      process.stdout.write(
        `  [${analyzed + skipped + errors}/${conversations.length}] ${contactName} — ${parsed.temperature} / ${parsed.sentiment}    \r`
      );

      // Rate limit: ~200ms between API calls to stay under rate limits
      await sleep(200);
    } catch (err: any) {
      errors++;
      console.error(`\n  Error analyzing ${phoneNumber}: ${err.message}`);
      // Back off on rate limit errors
      if (err.status === 429) {
        console.log("  Rate limited, waiting 10s...");
        await sleep(10000);
      }
    }
  }

  console.log(`\n\n=== Analysis Complete ===`);
  console.log(`  Analyzed:    ${analyzed}`);
  console.log(`  Skipped:     ${skipped} (< 3 messages)`);
  console.log(`  Errors:      ${errors}`);
  console.log(`  Total tokens: ${totalTokens.toLocaleString()}`);

  // Stats
  const withAnalysis = await conversationsCol.countDocuments({
    ai_analysis: { $ne: null, $exists: true },
  });
  const totalConvs = await conversationsCol.countDocuments();
  console.log(`  Coverage:    ${withAnalysis}/${totalConvs} conversations`);

  await mongo.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
