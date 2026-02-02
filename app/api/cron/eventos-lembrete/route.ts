/**
 * Cron Endpoint for Event Reminders
 *
 * This endpoint is called automatically by Vercel Cron every 5 minutes
 * to send reminder messages to event guests.
 *
 * Logic:
 * - Finds active events where (data_hora - lembrete_horas) falls within +/- 5 minutes of now
 * - For each event, finds guests with status 'confirmado' or 'talvez' who haven't received reminder
 * - Generates unique reminder messages using AI (anti-spam)
 * - Sends via Evolution API with random 5-15s delay between messages
 * - Updates lembrete_enviado_at after successful send
 *
 * Security: Protected by CRON_SECRET environment variable.
 * Schedule: * /5 * * * * (every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getWorkspace, Tenant } from '@/lib/tenant-context';
import { sendTextMessage, formatPhoneNumber, isInstanceConnected } from '@/lib/evolution-api';
import { gerarMensagemLembrete, gerarDelayEnvio } from '@/lib/eventos/message-generator';
import type { Evento, EventoConvidado } from '@/lib/eventos/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

// ============================================================================
// TYPES
// ============================================================================

// Evento ja tem workspace_id no tipo base, usamos o tipo diretamente
type EventoComLembrete = Evento;

interface ConvidadoParaLembrete {
  id: string;
  evento_id: string;
  workspace_id: number;
  nome: string;
  celular: string;
  status: EventoConvidado['status'];
  lembrete_enviado_at: string | null;
}

interface TenantResult {
  workspaceId: number;
  tenantName: string;
  eventosProcessados: number;
  lembretesEnviados: number;
  erros: number;
  error?: string;
}

interface EventoResult {
  eventoId: string;
  eventoNome: string;
  convidadosProcessados: number;
  lembretesEnviados: number;
  erros: number;
  detalhes: Array<{
    convidadoId: string;
    nome: string;
    status: 'enviado' | 'falha';
    erro?: string;
  }>;
}

interface CronResponse {
  success: boolean;
  timestamp: string;
  duration: number;
  summary: {
    tenantsProcessados: number;
    eventosProcessados: number;
    lembretesEnviados: number;
    erros: number;
  };
  results: TenantResult[];
  error?: string;
}

// ============================================================================
// AUTH
// ============================================================================

/**
 * Validates the cron request authentication
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Sempre exigir CRON_SECRET, mesmo em dev.
  if (!cronSecret) {
    console.error('[Cron Auth] CRON_SECRET não configurado. Rejeitando request.');
    return false;
  }

  // Vercel Cron sends the secret in the Authorization header
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also check for x-cron-secret header (alternative method)
  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

// ============================================================================
// DATABASE QUERIES
// ============================================================================

/**
 * Busca eventos ativos com lembrete dentro da margem de tempo
 *
 * Query: eventos onde (data_hora - lembrete_horas) esta entre (agora - 5min) e (agora + 5min)
 * Isso significa que o momento de enviar o lembrete eh agora.
 */
async function getEventosParaLembrete(): Promise<EventoComLembrete[]> {
  const { rows } = await pool.query<EventoComLembrete>(`
    SELECT e.*
    FROM eventos e
    WHERE e.status = 'ativo'
      AND e.lembrete_horas IS NOT NULL
      AND e.lembrete_horas > 0
      AND e.data_hora > NOW()
      AND (e.data_hora - (e.lembrete_horas || ' hours')::INTERVAL)
          BETWEEN NOW() - INTERVAL '5 minutes'
              AND NOW() + INTERVAL '5 minutes'
    ORDER BY e.data_hora ASC
  `);

  return rows;
}

/**
 * Busca convidados elegíveis para receber lembrete
 *
 * Criterios:
 * - Status 'confirmado' ou 'talvez'
 * - Ainda não recebeu lembrete (lembrete_enviado_at IS NULL)
 */
async function getConvidadosParaLembrete(
  eventoId: string,
  workspaceId: number
): Promise<ConvidadoParaLembrete[]> {
  const { rows } = await pool.query<ConvidadoParaLembrete>(`
    SELECT id, evento_id, workspace_id, nome, celular, status, lembrete_enviado_at
    FROM evento_convidados
    WHERE evento_id = $1
      AND workspace_id = $2
      AND status IN ('confirmado', 'talvez')
      AND lembrete_enviado_at IS NULL
      AND convite_enviado_at IS NOT NULL
    ORDER BY nome ASC
  `, [eventoId, workspaceId]);

  return rows;
}

/**
 * Atualiza lembrete_enviado_at do convidado
 */
async function marcarLembreteEnviado(convidadoId: string): Promise<void> {
  await pool.query(`
    UPDATE evento_convidados
    SET lembrete_enviado_at = NOW()
    WHERE id = $1
  `, [convidadoId]);
}

/**
 * Busca tenants ativos com Evolution API configurada
 */
async function getWorkspacesAtivosComEvolution(): Promise<Array<{ id: number; name: string }>> {
  const { rows } = await pool.query<{ id: number; name: string }>(`
    SELECT t.id, t.name
    FROM tenants t
    WHERE t.status = 'active'
      AND t.evolution_instances IS NOT NULL
      AND jsonb_array_length(t.evolution_instances) > 0
  `);

  // Filtrar apenas os que tem instancia conectada
  const tenantsComConectada: Array<{ id: number; name: string }> = [];

  for (const tenant of rows) {
    const fullTenant = await getWorkspace(tenant.id);
    if (!fullTenant) continue;

    const hasConnected = (fullTenant.evolution_instances || []).some(
      (i) => i.status === 'connected' || i.status === 'open'
    );

    if (hasConnected) {
      tenantsComConectada.push({ id: tenant.id, name: tenant.name });
    }
  }

  return tenantsComConectada;
}

/**
 * Obtem instancia Evolution conectada do tenant
 */
async function getEvolutionInstanceName(tenant: Tenant): Promise<string | null> {
  const instances = tenant.evolution_instances || [];
  const activeInstance = instances.find(
    (i) => i.status === 'connected' || i.status === 'open'
  );

  return activeInstance?.instance_name || instances[0]?.instance_name || null;
}

// ============================================================================
// PROCESSING
// ============================================================================

/**
 * Sleep helper
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Processa lembretes para um evento especifico
 */
async function processarEventoLembretes(
  evento: EventoComLembrete,
  instanceName: string
): Promise<EventoResult> {
  const result: EventoResult = {
    eventoId: evento.id,
    eventoNome: evento.nome,
    convidadosProcessados: 0,
    lembretesEnviados: 0,
    erros: 0,
    detalhes: [],
  };

  // Buscar convidados elegiveis
  const convidados = await getConvidadosParaLembrete(evento.id, evento.workspace_id);
  result.convidadosProcessados = convidados.length;

  if (convidados.length === 0) {
    console.log(`[Eventos-Lembrete] Evento ${evento.id}: nenhum convidado para lembrete`);
    return result;
  }

  console.log(`[Eventos-Lembrete] Evento ${evento.id} "${evento.nome}": ${convidados.length} convidado(s) para lembrete`);

  // Processar cada convidado
  for (let i = 0; i < convidados.length; i++) {
    const convidado = convidados[i];

    try {
      // Gerar mensagem de lembrete unica (anti-spam)
      const mensagem = gerarMensagemLembrete({
        evento: evento as Evento,
        convidadoNome: convidado.nome,
      });

      // Enviar via Evolution API
      await sendTextMessage(instanceName, {
        number: formatPhoneNumber(convidado.celular),
        text: mensagem,
      });

      // Marcar lembrete como enviado
      await marcarLembreteEnviado(convidado.id);

      result.lembretesEnviados++;
      result.detalhes.push({
        convidadoId: convidado.id,
        nome: convidado.nome,
        status: 'enviado',
      });

      console.log(`[Eventos-Lembrete] Lembrete enviado para ${convidado.nome} (${convidado.celular})`);

      // Delay aleatorio entre envios (anti-spam) - exceto no ultimo
      if (i < convidados.length - 1) {
        const delay = gerarDelayEnvio();
        console.log(`[Eventos-Lembrete] Aguardando ${Math.round(delay / 1000)}s antes do proximo envio...`);
        await sleep(delay);
      }
    } catch (error) {
      result.erros++;
      result.detalhes.push({
        convidadoId: convidado.id,
        nome: convidado.nome,
        status: 'falha',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
      });

      console.error(`[Eventos-Lembrete] Erro ao enviar lembrete para ${convidado.nome}:`, error);
    }
  }

  return result;
}

/**
 * Processa lembretes para um tenant especifico
 */
async function processarTenantLembretes(
  workspaceId: number,
  tenantName: string
): Promise<TenantResult> {
  const result: TenantResult = {
    workspaceId,
    tenantName,
    eventosProcessados: 0,
    lembretesEnviados: 0,
    erros: 0,
  };

  try {
    // Obter tenant completo
    const tenant = await getWorkspace(workspaceId);
    if (!tenant) {
      result.error = 'Tenant nao encontrado';
      result.erros = 1;
      return result;
    }

    // Obter instancia Evolution conectada
    const instanceName = await getEvolutionInstanceName(tenant);
    if (!instanceName) {
      console.log(`[Eventos-Lembrete] Tenant ${workspaceId}: sem instancia Evolution configurada`);
      return result;
    }

    // Verificar conexao
    const connected = await isInstanceConnected(instanceName);
    if (!connected) {
      console.log(`[Eventos-Lembrete] Tenant ${workspaceId}: instancia ${instanceName} nao conectada`);
      return result;
    }

    // Buscar eventos do tenant que precisam de lembrete
    const eventos = await pool.query<EventoComLembrete>(`
      SELECT e.*
      FROM eventos e
      WHERE e.workspace_id = $1
        AND e.status = 'ativo'
        AND e.lembrete_horas IS NOT NULL
        AND e.lembrete_horas > 0
        AND e.data_hora > NOW()
        AND (e.data_hora - (e.lembrete_horas || ' hours')::INTERVAL)
            BETWEEN NOW() - INTERVAL '5 minutes'
                AND NOW() + INTERVAL '5 minutes'
      ORDER BY e.data_hora ASC
    `, [workspaceId]);

    if (eventos.rows.length === 0) {
      console.log(`[Eventos-Lembrete] Tenant ${workspaceId}: nenhum evento para lembrete`);
      return result;
    }

    console.log(`[Eventos-Lembrete] Tenant ${workspaceId} "${tenantName}": ${eventos.rows.length} evento(s) para processar`);

    // Processar cada evento
    for (const evento of eventos.rows) {
      const eventoResult = await processarEventoLembretes(evento, instanceName);

      result.eventosProcessados++;
      result.lembretesEnviados += eventoResult.lembretesEnviados;
      result.erros += eventoResult.erros;
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Erro desconhecido';
    result.erros++;
    console.error(`[Eventos-Lembrete] Erro processando tenant ${workspaceId}:`, error);
    return result;
  }
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * GET /api/cron/eventos-lembrete
 * Processa lembretes de eventos para todos os tenants ativos
 */
export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[Eventos-Lembrete Cron] Iniciando execucao em ${timestamp}`);

  // Validar autenticacao
  if (!validateCronAuth(request)) {
    console.error('[Eventos-Lembrete Cron] Request nao autorizado - CRON_SECRET invalido ou ausente');
    return NextResponse.json(
      {
        success: false,
        timestamp,
        duration: Date.now() - startTime,
        summary: {
          tenantsProcessados: 0,
          eventosProcessados: 0,
          lembretesEnviados: 0,
          erros: 1,
        },
        results: [],
        error: 'Unauthorized - Invalid or missing CRON_SECRET',
      },
      { status: 401 }
    );
  }

  const results: TenantResult[] = [];
  let totalErros = 0;

  try {
    // Buscar tenants ativos com Evolution API
    const tenants = await getWorkspacesAtivosComEvolution();
    console.log(`[Eventos-Lembrete Cron] Encontrados ${tenants.length} tenant(s) ativos com Evolution API`);

    if (tenants.length === 0) {
      console.log('[Eventos-Lembrete Cron] Nenhum tenant ativo encontrado - nada a processar');
      return NextResponse.json({
        success: true,
        timestamp,
        duration: Date.now() - startTime,
        summary: {
          tenantsProcessados: 0,
          eventosProcessados: 0,
          lembretesEnviados: 0,
          erros: 0,
        },
        results: [],
      });
    }

    // Processar cada tenant
    for (const tenant of tenants) {
      try {
        console.log(`[Eventos-Lembrete Cron] Processando tenant ${tenant.id} (${tenant.name})`);

        const tenantResult = await processarTenantLembretes(tenant.id, tenant.name);
        results.push(tenantResult);

        if (tenantResult.error) {
          totalErros++;
        }

        console.log(
          `[Eventos-Lembrete Cron] Tenant ${tenant.id} finalizado: ` +
          `${tenantResult.eventosProcessados} eventos, ${tenantResult.lembretesEnviados} lembretes enviados`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Eventos-Lembrete Cron] Erro fatal no tenant ${tenant.id}:`, error);

        results.push({
          workspaceId: tenant.id,
          tenantName: tenant.name,
          eventosProcessados: 0,
          lembretesEnviados: 0,
          erros: 1,
          error: errorMessage,
        });

        totalErros++;
      }
    }

    // Calcular totais
    const totalEventos = results.reduce((sum, r) => sum + r.eventosProcessados, 0);
    const totalLembretes = results.reduce((sum, r) => sum + r.lembretesEnviados, 0);
    const duration = Date.now() - startTime;

    console.log(
      `[Eventos-Lembrete Cron] Execucao concluida em ${duration}ms - ` +
      `${tenants.length} tenant(s), ${totalEventos} evento(s), ` +
      `${totalLembretes} lembrete(s) enviado(s), ${totalErros} erro(s)`
    );

    return NextResponse.json({
      success: totalErros === 0,
      timestamp,
      duration,
      summary: {
        tenantsProcessados: tenants.length,
        eventosProcessados: totalEventos,
        lembretesEnviados: totalLembretes,
        erros: totalErros,
      },
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const duration = Date.now() - startTime;

    console.error('[Eventos-Lembrete Cron] Erro fatal durante execucao:', error);

    return NextResponse.json(
      {
        success: false,
        timestamp,
        duration,
        summary: {
          tenantsProcessados: 0,
          eventosProcessados: 0,
          lembretesEnviados: 0,
          erros: 1,
        },
        results,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/eventos-lembrete
 * Suporta POST para testes manuais
 */
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  return GET(request);
}
