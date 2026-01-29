/**
 * API: Sofia Proactive Messages
 *
 * Endpoint para disparo de mensagens proativas da Sofia.
 * Suporta GET (cron jobs) e POST (disparo manual).
 *
 * Triggers verificados:
 * - leadEsfriando: Leads quentes sem contato > 24h
 * - metaProxima: Usuario a >= 90% da meta
 * - lembreteAtividade: Atividades nas proximas horas
 * - novoLancamento: Empreendimentos lancados hoje
 * - feedbackPosVenda: 7 dias apos venda realizada
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getWorkspace, listTenants, Tenant } from "@/lib/tenant-context";
import {
  sendTextMessage,
  formatPhoneNumber,
  isInstanceConnected,
} from "@/lib/evolution-api";
import {
  checkProactiveTriggers,
  getProactiveMessage,
  markTriggerShown,
  TriggerData,
  Lead,
  MetaInfo,
  Atividade,
  Venda,
  Empreendimento,
  ProactiveMessage,
  TriggerCheckResult,
} from "@/lib/sofia/proactive";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutos

// ============================================================================
// TYPES
// ============================================================================

interface ProactiveResult {
  userId: string;
  userName?: string;
  workspaceId: number;
  triggersFound: number;
  messagesSent: number;
  triggers: Array<{
    triggerId: string;
    sent: boolean;
    error?: string;
  }>;
}

interface RunSummary {
  success: boolean;
  duration: number;
  tenantsProcessed: number;
  usersProcessed: number;
  triggersFound: number;
  messagesSent: number;
  errors: number;
  results: ProactiveResult[];
}

// ============================================================================
// AUTH HELPER
// ============================================================================

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  // Check cron secret
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// ============================================================================
// DATA FETCHERS
// ============================================================================

/**
 * Busca leads quentes de um usuario
 */
async function fetchUserLeads(userId: string): Promise<Lead[]> {
  try {
    const { rows } = await dbQuery(
      `SELECT
        id,
        name as nome,
        CASE
          WHEN temperature >= 80 THEN 'quente'
          WHEN temperature >= 50 THEN 'morno'
          ELSE 'frio'
        END as status,
        COALESCE(last_contact_at, updated_at, created_at) as ultimo_contato,
        interest as interesse
      FROM leads
      WHERE user_id = $1
        AND is_active = true
        AND temperature >= 80
      ORDER BY last_contact_at ASC NULLS FIRST
      LIMIT 50`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome || "Lead",
      status: row.status as Lead["status"],
      ultimoContato: new Date(row.ultimo_contato),
      interesse: row.interesse,
    }));
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar leads:`, error);
    return [];
  }
}

/**
 * Busca informacoes de meta do usuario
 */
async function fetchUserMeta(userId: string): Promise<MetaInfo | undefined> {
  try {
    // Buscar meta do mes atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { rows } = await dbQuery(
      `SELECT
        COALESCE(g.target_value, 0) as valor,
        COALESCE(g.current_value, 0) as atingido,
        g.period
      FROM goals g
      WHERE g.user_id = $1
        AND g.period_start <= $2
        AND g.period_end >= $3
        AND g.status = 'active'
      ORDER BY g.created_at DESC
      LIMIT 1`,
      [userId, endOfMonth.toISOString(), startOfMonth.toISOString()]
    );

    if (rows.length === 0) return undefined;

    const meta = rows[0];
    const percentual = meta.valor > 0 ? (meta.atingido / meta.valor) * 100 : 0;

    return {
      valor: meta.valor,
      atingido: meta.atingido,
      percentual,
      periodo: meta.period || "do mes",
    };
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar meta:`, error);
    return undefined;
  }
}

/**
 * Busca atividades agendadas para as proximas horas
 */
async function fetchUserAtividades(userId: string): Promise<Atividade[]> {
  try {
    const { rows } = await dbQuery(
      `SELECT
        a.id,
        a.title as titulo,
        a.scheduled_at as data_hora,
        a.activity_type as tipo,
        l.id as lead_id,
        l.name as lead_nome
      FROM activities a
      LEFT JOIN leads l ON a.lead_id = l.id
      WHERE a.user_id = $1
        AND a.status = 'pending'
        AND a.scheduled_at > NOW()
        AND a.scheduled_at <= NOW() + INTERVAL '2 hours'
      ORDER BY a.scheduled_at ASC
      LIMIT 10`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      dataHora: new Date(row.data_hora),
      tipo: row.tipo,
      leadId: row.lead_id,
      leadNome: row.lead_nome,
    }));
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar atividades:`, error);
    return [];
  }
}

/**
 * Busca vendas recentes para follow-up
 */
async function fetchUserVendas(userId: string): Promise<Venda[]> {
  try {
    const { rows } = await dbQuery(
      `SELECT
        r.id,
        l.name as cliente_nome,
        e.name as empreendimento,
        r.created_at as data_venda,
        r.total_value as valor
      FROM reservations r
      LEFT JOIN leads l ON r.lead_id = l.id
      LEFT JOIN empreendimentos e ON r.empreendimento_id = e.id
      WHERE r.user_id = $1
        AND r.status = 'confirmed'
        AND r.created_at >= NOW() - INTERVAL '8 days'
        AND r.created_at <= NOW() - INTERVAL '6 days'
      ORDER BY r.created_at DESC
      LIMIT 10`,
      [userId]
    );

    return rows.map((row) => ({
      id: row.id,
      clienteNome: row.cliente_nome || "Cliente",
      empreendimento: row.empreendimento || "empreendimento",
      dataVenda: new Date(row.data_venda),
      valor: row.valor || 0,
    }));
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar vendas:`, error);
    return [];
  }
}

/**
 * Busca empreendimentos lancados hoje
 */
async function fetchLancamentosHoje(): Promise<Empreendimento[]> {
  try {
    const { rows } = await dbQuery(
      `SELECT
        id,
        name as nome,
        launch_date as data_lancamento,
        type as tipo,
        neighborhood as localizacao
      FROM empreendimentos
      WHERE DATE(launch_date) = CURRENT_DATE
        AND is_active = true
      ORDER BY launch_date DESC
      LIMIT 10`,
      []
    );

    return rows.map((row) => ({
      id: row.id,
      nome: row.nome,
      dataLancamento: new Date(row.data_lancamento),
      tipo: row.tipo,
      localizacao: row.localizacao,
    }));
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar lancamentos:`, error);
    return [];
  }
}

/**
 * Busca ultimo tempo de trigger para controle de cooldown
 */
async function fetchLastTriggerTimes(
  userId: string
): Promise<Record<string, Date>> {
  try {
    const { rows } = await dbQuery(
      `SELECT
        data->>'triggerId' as trigger_id,
        MAX(created_at) as last_time
      FROM tracking_events
      WHERE user_id = $1
        AND event_type = 'sofia_proactive_sent'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY data->>'triggerId'`,
      [userId]
    );

    const times: Record<string, Date> = {};
    for (const row of rows) {
      if (row.trigger_id) {
        times[row.trigger_id] = new Date(row.last_time);
      }
    }

    return times;
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar cooldowns:`, error);
    return {};
  }
}

// ============================================================================
// WHATSAPP SENDER
// ============================================================================

/**
 * Obtem instance name do Evolution API para um tenant
 */
async function getEvolutionInstanceForTenant(
  tenant: Tenant
): Promise<string | null> {
  const instances = tenant.evolution_instances || [];

  // Buscar instancia conectada
  const connected = instances.find(
    (i) => i.status === "connected" || i.status === "open"
  );

  return connected?.instance_name || instances[0]?.instance_name || null;
}

/**
 * Envia mensagem proativa via WhatsApp
 */
async function sendProactiveWhatsApp(
  instanceName: string,
  phone: string,
  message: ProactiveMessage
): Promise<void> {
  const formattedPhone = formatPhoneNumber(phone);

  // Formatar mensagem para WhatsApp
  let text = `${message.title}\n\n${message.message}`;

  if (message.action) {
    text += `\n\n${message.action.label}: ${process.env.NEXT_PUBLIC_APP_URL || ""}${message.action.route}`;
  }

  await sendTextMessage(instanceName, {
    number: formattedPhone,
    text,
  });
}

/**
 * Registra envio de mensagem proativa para tracking
 */
async function logProactiveSent(
  userId: string,
  triggerId: string,
  message: ProactiveMessage
): Promise<void> {
  try {
    await dbQuery(
      `INSERT INTO tracking_events (user_id, event_type, page, data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        userId,
        "sofia_proactive_sent",
        "sofia_proactive",
        JSON.stringify({
          triggerId,
          title: message.title,
          priority: message.priority,
          data: message.data,
        }),
      ]
    );
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao registrar envio:`, error);
  }
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * Processa mensagens proativas para um usuario
 */
async function processUserProactive(
  user: { id: string; nome: string; telefone: string },
  tenant: Tenant,
  instanceName: string,
  lancamentos: Empreendimento[],
  dryRun: boolean = false
): Promise<ProactiveResult> {
  const result: ProactiveResult = {
    userId: user.id,
    userName: user.nome,
    workspaceId: tenant.id,
    triggersFound: 0,
    messagesSent: 0,
    triggers: [],
  };

  try {
    // Buscar todos os dados necessarios em paralelo
    const [leads, meta, atividades, vendas, lastTriggerTime] = await Promise.all([
      fetchUserLeads(user.id),
      fetchUserMeta(user.id),
      fetchUserAtividades(user.id),
      fetchUserVendas(user.id),
      fetchLastTriggerTimes(user.id),
    ]);

    // Montar dados para verificacao
    const triggerData: Partial<TriggerData> = {
      leads,
      meta,
      empreendimentos: lancamentos,
      atividades,
      vendas,
      lastTriggerTime,
    };

    // Verificar triggers
    const triggers = await checkProactiveTriggers(user.id, triggerData);
    result.triggersFound = triggers.length;

    console.log(
      `[Sofia Proactive] Usuario ${user.id}: ${triggers.length} triggers ativados`
    );

    // Processar cada trigger
    for (const trigger of triggers) {
      const triggerResult: ProactiveResult["triggers"][0] = {
        triggerId: trigger.triggerId,
        sent: false,
      };

      try {
        const message = getProactiveMessage(trigger.triggerId, trigger.data || {});

        if (!message) {
          triggerResult.error = "Mensagem nao gerada";
          result.triggers.push(triggerResult);
          continue;
        }

        if (dryRun) {
          console.log(`[Sofia Proactive] [DRY RUN] Enviaria para ${user.telefone}: ${message.title}`);
          triggerResult.sent = true;
          result.messagesSent++;
        } else {
          // Enviar mensagem via WhatsApp
          await sendProactiveWhatsApp(instanceName, user.telefone, message);

          // Registrar envio
          await logProactiveSent(user.id, trigger.triggerId, message);

          // Marcar trigger como exibido (cooldown)
          await markTriggerShown(user.id, trigger.triggerId);

          triggerResult.sent = true;
          result.messagesSent++;

          console.log(`[Sofia Proactive] Mensagem enviada para ${user.id}: ${trigger.triggerId}`);
        }
      } catch (error: any) {
        triggerResult.error = error.message || "Erro desconhecido";
        console.error(
          `[Sofia Proactive] Erro ao enviar ${trigger.triggerId} para ${user.id}:`,
          error
        );
      }

      result.triggers.push(triggerResult);
    }
  } catch (error: any) {
    console.error(`[Sofia Proactive] Erro processando usuario ${user.id}:`, error);
  }

  return result;
}

/**
 * Busca usuarios ativos de um tenant para envio de proativas
 */
async function getActiveUsersForTenant(
  workspaceId: number
): Promise<Array<{ id: string; nome: string; telefone: string }>> {
  try {
    const { rows } = await dbQuery<{ id: string; nome: string; telefone: string }>(
      `SELECT u.id, u.nome, u.telefone
       FROM users u
       JOIN imobiliarias i ON u.imobiliaria_id = i.id
       WHERE i.workspace_id = $1
         AND u.role = 'corretor'
         AND u.is_active = true
         AND u.telefone IS NOT NULL
         AND u.telefone != ''
         AND u.onboarding_status = 'completed'
       ORDER BY u.nome ASC`,
      [workspaceId]
    );

    return rows;
  } catch (error) {
    console.error(`[Sofia Proactive] Erro ao buscar usuarios:`, error);
    return [];
  }
}

/**
 * Executa verificacao e envio de proativas para todos os tenants
 */
async function runProactiveCheck(
  options: { dryRun?: boolean; workspaceId?: number; userId?: string } = {}
): Promise<RunSummary> {
  const { dryRun = false, workspaceId, userId } = options;
  const startTime = Date.now();

  const summary: RunSummary = {
    success: true,
    duration: 0,
    tenantsProcessed: 0,
    usersProcessed: 0,
    triggersFound: 0,
    messagesSent: 0,
    errors: 0,
    results: [],
  };

  try {
    // Buscar lancamentos do dia (global)
    const lancamentos = await fetchLancamentosHoje();

    // Buscar tenants ativos
    let tenants: Tenant[];
    if (workspaceId) {
      const tenant = await getWorkspace(workspaceId);
      tenants = tenant ? [tenant] : [];
    } else {
      tenants = await listTenants("active");
    }

    console.log(`[Sofia Proactive] Processando ${tenants.length} tenants`);

    for (const tenant of tenants) {
      try {
        // Verificar se tenant tem Evolution configurado
        const instanceName = await getEvolutionInstanceForTenant(tenant);
        if (!instanceName) {
          console.log(`[Sofia Proactive] Tenant ${tenant.id} sem Evolution configurado`);
          continue;
        }

        // Verificar se instancia esta conectada
        const connected = await isInstanceConnected(instanceName);
        if (!connected) {
          console.log(`[Sofia Proactive] Instancia ${instanceName} nao conectada`);
          continue;
        }

        summary.tenantsProcessed++;

        // Buscar usuarios
        let users = await getActiveUsersForTenant(tenant.id);

        // Filtrar por usuario especifico se fornecido
        if (userId) {
          users = users.filter((u) => u.id === userId);
        }

        console.log(`[Sofia Proactive] Tenant ${tenant.id}: ${users.length} usuarios`);

        for (const user of users) {
          try {
            const result = await processUserProactive(
              user,
              tenant,
              instanceName,
              lancamentos,
              dryRun
            );

            summary.usersProcessed++;
            summary.triggersFound += result.triggersFound;
            summary.messagesSent += result.messagesSent;
            summary.errors += result.triggers.filter((t) => t.error).length;
            summary.results.push(result);
          } catch (error: any) {
            console.error(`[Sofia Proactive] Erro usuario ${user.id}:`, error);
            summary.errors++;
          }
        }
      } catch (error: any) {
        console.error(`[Sofia Proactive] Erro tenant ${tenant.id}:`, error);
      }
    }
  } catch (error: any) {
    console.error("[Sofia Proactive] Erro geral:", error);
    summary.success = false;
  }

  summary.duration = Date.now() - startTime;

  console.log(
    `[Sofia Proactive] Concluido em ${summary.duration}ms - ` +
      `${summary.triggersFound} triggers, ${summary.messagesSent} mensagens`
  );

  return summary;
}

// ============================================================================
// HTTP HANDLERS
// ============================================================================

/**
 * GET - Execucao via cron job
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    console.error("[Sofia Proactive] GET - Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Sofia Proactive] GET - Iniciando execucao agendada");

  const searchParams = request.nextUrl.searchParams;
  const dryRun = searchParams.get("dryRun") === "true";
  const workspaceId = searchParams.get("workspaceId");
  const userId = searchParams.get("userId");

  const summary = await runProactiveCheck({
    dryRun,
    workspaceId: workspaceId ? parseInt(workspaceId) : undefined,
    userId: userId || undefined,
  });

  return NextResponse.json({
    success: summary.success,
    dryRun,
    summary: {
      duration: summary.duration,
      tenantsProcessed: summary.tenantsProcessed,
      usersProcessed: summary.usersProcessed,
      triggersFound: summary.triggersFound,
      messagesSent: summary.messagesSent,
      errors: summary.errors,
    },
    results: summary.results,
    executedAt: new Date().toISOString(),
  });
}

/**
 * POST - Disparo manual
 */
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    console.error("[Sofia Proactive] POST - Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Sofia Proactive] POST - Disparo manual");

  try {
    const body = await request.json();
    const { dryRun = false, workspaceId, userId } = body;

    const summary = await runProactiveCheck({
      dryRun,
      workspaceId,
      userId,
    });

    return NextResponse.json({
      success: summary.success,
      dryRun,
      summary: {
        duration: summary.duration,
        tenantsProcessed: summary.tenantsProcessed,
        usersProcessed: summary.usersProcessed,
        triggersFound: summary.triggersFound,
        messagesSent: summary.messagesSent,
        errors: summary.errors,
      },
      results: summary.results,
      executedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Sofia Proactive] POST - Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao processar requisicao",
      },
      { status: 500 }
    );
  }
}
