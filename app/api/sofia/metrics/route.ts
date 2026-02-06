import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ============================================
// GET - Retorna metricas de uso da Sofia
// ============================================

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    // Datas para filtros
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Domingo
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return await withTenant(ctx.workspaceId, async (client) => {
      // Construir filtro de tenant/user se fornecido
      let userFilter = "";
      const baseParams: any[] = [];

      if (userId) {
        userFilter = "AND c.user_id = $1";
        baseParams.push(userId);
      }

      // 1. Total de conversas (hoje, semana, mes)
      const conversationsRes = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE c.created_at >= $${baseParams.length + 1}) as today,
          COUNT(*) FILTER (WHERE c.created_at >= $${baseParams.length + 2}) as week,
          COUNT(*) FILTER (WHERE c.created_at >= $${baseParams.length + 3}) as month,
          COUNT(*) as total
        FROM conversations c
        WHERE 1=1 ${userFilter}
      `, [...baseParams, startOfToday.toISOString(), startOfWeek.toISOString(), startOfMonth.toISOString()]);

      const conversations = {
        today: parseInt(conversationsRes.rows[0]?.today || "0"),
        week: parseInt(conversationsRes.rows[0]?.week || "0"),
        month: parseInt(conversationsRes.rows[0]?.month || "0"),
        total: parseInt(conversationsRes.rows[0]?.total || "0"),
      };

      // 2. Intents mais comuns (top 10) - extrair do campo context->last_intent
      const topIntentsRes = await client.query(`
        SELECT
          context->>'last_intent' as intent,
          context->>'last_category' as category,
          COUNT(*) as count
        FROM conversations c
        WHERE context->>'last_intent' IS NOT NULL
          AND context->>'last_intent' != 'null'
          AND context->>'last_intent' != ''
          ${userFilter}
        GROUP BY context->>'last_intent', context->>'last_category'
        ORDER BY count DESC
        LIMIT 10
      `, baseParams);

      const topIntents = topIntentsRes.rows.map((row) => ({
        intent: row.intent,
        category: row.category,
        count: parseInt(row.count),
      }));

      // 3. Taxa de resolucao autonoma (conversas sem escalar)
      const resolutionRes = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE (context->>'escalated')::boolean = false OR context->>'escalated' IS NULL) as autonomous,
          COUNT(*) FILTER (WHERE (context->>'escalated')::boolean = true) as escalated
        FROM conversations c
        WHERE context IS NOT NULL
          ${userFilter}
      `, baseParams);

      const totalConvs = parseInt(resolutionRes.rows[0]?.total || "0");
      const autonomousConvs = parseInt(resolutionRes.rows[0]?.autonomous || "0");
      const escalatedConvs = parseInt(resolutionRes.rows[0]?.escalated || "0");

      const resolution = {
        total: totalConvs,
        autonomous: autonomousConvs,
        escalated: escalatedConvs,
        autonomousRate: totalConvs > 0 ? Math.round((autonomousConvs / totalConvs) * 100) : 0,
      };

      // 4. Tempo medio de resposta (baseado nas mensagens)
      // Calculamos a diferenca entre mensagens consecutivas user->assistant
      const avgResponseTimeRes = await client.query(`
        WITH message_pairs AS (
          SELECT
            c.id,
            (m->>'timestamp')::timestamp as msg_time,
            m->>'role' as role,
            LAG(m->>'role') OVER (PARTITION BY c.id ORDER BY (m->>'timestamp')::timestamp) as prev_role,
            LAG((m->>'timestamp')::timestamp) OVER (PARTITION BY c.id ORDER BY (m->>'timestamp')::timestamp) as prev_time
          FROM conversations c,
          jsonb_array_elements(c.messages) as m
          WHERE c.messages IS NOT NULL
            AND jsonb_array_length(c.messages) > 0
            ${userFilter}
        )
        SELECT
          AVG(EXTRACT(EPOCH FROM (msg_time - prev_time))) as avg_response_seconds
        FROM message_pairs
        WHERE role = 'assistant' AND prev_role = 'user'
          AND prev_time IS NOT NULL
          AND msg_time - prev_time < INTERVAL '5 minutes'
      `, baseParams);

      const avgResponseTime = parseFloat(avgResponseTimeRes.rows[0]?.avg_response_seconds || "0");

      // 5. Intents nao reconhecidos (UNKNOWN) - para treinar
      const unknownIntentsRes = await client.query(`
        WITH recent_messages AS (
          SELECT
            c.id,
            m->>'content' as content,
            m->>'intent' as intent,
            c.created_at
          FROM conversations c,
          jsonb_array_elements(c.messages) as m
          WHERE m->>'role' = 'user'
            AND (m->>'intent' = 'unknown' OR m->>'intent' IS NULL)
            AND c.created_at >= $${baseParams.length + 1}
            ${userFilter}
        )
        SELECT content, COUNT(*) as occurrences
        FROM recent_messages
        WHERE content IS NOT NULL AND content != ''
        GROUP BY content
        ORDER BY occurrences DESC
        LIMIT 20
      `, [...baseParams, startOfMonth.toISOString()]);

      const unknownIntents = unknownIntentsRes.rows.map((row) => ({
        message: row.content,
        occurrences: parseInt(row.occurrences),
      }));

      // 6. Satisfacao media (baseado em feedback positivo/negativo)
      const satisfactionRes = await client.query(`
        WITH feedback_messages AS (
          SELECT
            c.id,
            m->>'intent' as intent,
            CASE
              WHEN m->>'intent' = 'feedback_positive' THEN 1
              WHEN m->>'intent' = 'feedback_negative' THEN 0
              ELSE NULL
            END as satisfaction
          FROM conversations c,
          jsonb_array_elements(c.messages) as m
          WHERE m->>'role' = 'user'
            AND m->>'intent' IN ('feedback_positive', 'feedback_negative')
            ${userFilter}
        )
        SELECT
          COUNT(*) as total_feedback,
          COUNT(*) FILTER (WHERE satisfaction = 1) as positive,
          COUNT(*) FILTER (WHERE satisfaction = 0) as negative,
          AVG(satisfaction) * 100 as satisfaction_rate
        FROM feedback_messages
      `, baseParams);

      const satisfaction = {
        totalFeedback: parseInt(satisfactionRes.rows[0]?.total_feedback || "0"),
        positive: parseInt(satisfactionRes.rows[0]?.positive || "0"),
        negative: parseInt(satisfactionRes.rows[0]?.negative || "0"),
        rate: Math.round(parseFloat(satisfactionRes.rows[0]?.satisfaction_rate || "0")),
      };

      // 7. Distribuicao por categoria de intent
      const categoryDistributionRes = await client.query(`
        SELECT
          context->>'last_category' as category,
          COUNT(*) as count
        FROM conversations c
        WHERE context->>'last_category' IS NOT NULL
          AND context->>'last_category' != 'null'
          AND context->>'last_category' != ''
          ${userFilter}
        GROUP BY context->>'last_category'
        ORDER BY count DESC
      `, baseParams);

      const categoryDistribution = categoryDistributionRes.rows.map((row) => ({
        category: row.category,
        count: parseInt(row.count),
      }));

      // 8. Fluxos mais utilizados
      const topFlowsRes = await client.query(`
        SELECT
          context->>'current_flow' as flow,
          COUNT(*) as count
        FROM conversations c
        WHERE context->>'current_flow' IS NOT NULL
          AND context->>'current_flow' != 'null'
          AND context->>'current_flow' != ''
          ${userFilter}
        GROUP BY context->>'current_flow'
        ORDER BY count DESC
        LIMIT 5
      `, baseParams);

      const topFlows = topFlowsRes.rows.map((row) => ({
        flow: row.flow,
        count: parseInt(row.count),
      }));

      // 9. Nivel medio de frustracao
      const frustrationRes = await client.query(`
        SELECT
          AVG((context->>'frustration_level')::int) as avg_frustration,
          COUNT(*) FILTER (WHERE (context->>'frustration_level')::int > 5) as high_frustration_count
        FROM conversations c
        WHERE context->>'frustration_level' IS NOT NULL
          AND context->>'frustration_level' ~ '^[0-9]+$'
          ${userFilter}
      `, baseParams);

      const frustration = {
        average: Math.round(parseFloat(frustrationRes.rows[0]?.avg_frustration || "0") * 10) / 10,
        highFrustrationCount: parseInt(frustrationRes.rows[0]?.high_frustration_count || "0"),
      };

      // 10. Conversas por dia (ultimos 7 dias)
      const conversationsPerDayRes = await client.query(`
        SELECT
          DATE(c.created_at) as date,
          COUNT(*) as count
        FROM conversations c
        WHERE c.created_at >= NOW() - INTERVAL '7 days'
          ${userFilter}
        GROUP BY DATE(c.created_at)
        ORDER BY date ASC
      `, baseParams);

      const conversationsPerDay = conversationsPerDayRes.rows.map((row) => ({
        date: row.date,
        count: parseInt(row.count),
      }));

      // 11. Horarios de pico
      const peakHoursRes = await client.query(`
        SELECT
          EXTRACT(HOUR FROM c.created_at) as hour,
          COUNT(*) as count
        FROM conversations c
        WHERE c.created_at >= NOW() - INTERVAL '30 days'
          ${userFilter}
        GROUP BY EXTRACT(HOUR FROM c.created_at)
        ORDER BY count DESC
        LIMIT 5
      `, baseParams);

      const peakHours = peakHoursRes.rows.map((row) => ({
        hour: parseInt(row.hour),
        count: parseInt(row.count),
      }));

      return NextResponse.json({
        success: true,
        metrics: {
          conversations,
          topIntents,
          resolution,
          avgResponseTime: {
            seconds: Math.round(avgResponseTime * 10) / 10,
            formatted: avgResponseTime > 60
              ? `${Math.floor(avgResponseTime / 60)}m ${Math.round(avgResponseTime % 60)}s`
              : `${Math.round(avgResponseTime)}s`,
          },
          unknownIntents,
          satisfaction,
          categoryDistribution,
          topFlows,
          frustration,
          conversationsPerDay,
          peakHours,
        },
        generatedAt: new Date().toISOString(),
      });
    });
  } catch (error: any) {
    console.error("[Sofia Metrics] GET Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Registra nova metrica/evento
// ============================================

interface SofiaMetricEvent {
  eventType:
    | "conversation_start"
    | "conversation_end"
    | "intent_detected"
    | "intent_unknown"
    | "escalation"
    | "feedback"
    | "flow_start"
    | "flow_complete"
    | "error"
    | "custom";
  userId?: string;
  conversationId?: string;
  data: {
    intent?: string;
    category?: string;
    message?: string;
    flow?: string;
    escalatedTo?: string;
    feedbackType?: "positive" | "negative";
    errorMessage?: string;
    responseTime?: number;
    [key: string]: any;
  };
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body: SofiaMetricEvent = await request.json();
    const { eventType, userId, conversationId, data, timestamp } = body;

    // Validacao basica
    if (!eventType) {
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Construir dados do evento
      const eventData = {
        eventType,
        conversationId,
        ...data,
      };

      // Inserir na tabela tracking_events
      await client.query(
        `INSERT INTO tracking_events (user_id, event_type, page, data, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId || null,
          `sofia_${eventType}`,
          "sofia",
          JSON.stringify(eventData),
          timestamp || new Date().toISOString(),
        ]
      );

      // Se for evento de intent desconhecido, registrar separadamente para analise
      if (eventType === "intent_unknown" && data.message) {
        await client.query(
          `INSERT INTO tracking_events (user_id, event_type, page, data, created_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId || null,
            "sofia_unknown_intent",
            "sofia_training",
            JSON.stringify({
              message: data.message,
              timestamp: timestamp || new Date().toISOString(),
            }),
            timestamp || new Date().toISOString(),
          ]
        );
      }

      // Se for evento de feedback, atualizar metricas agregadas
      if (eventType === "feedback" && conversationId) {
        // Podemos adicionar logica adicional aqui para atualizar metricas em tempo real
        // Por exemplo, atualizar um contador em cache ou tabela de metricas agregadas
      }

      return NextResponse.json({
        success: true,
        message: "Metric event recorded successfully",
        eventType,
      });
    });
  } catch (error: any) {
    console.error("[Sofia Metrics] POST Error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
