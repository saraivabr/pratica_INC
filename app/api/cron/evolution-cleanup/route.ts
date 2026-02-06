/**
 * Cron: Cleanup de Instâncias Evolution API
 *
 * GET/POST /api/cron/evolution-cleanup
 *
 * Remove instâncias antigas/órfãs do Evolution API para liberar recursos.
 * Deve ser executado diariamente.
 *
 * Critérios de limpeza:
 * 1. Instâncias desconectadas há mais de 30 dias
 * 2. Instâncias cujo usuário não existe mais no banco
 * 3. Instâncias com last_connection_update > 90 dias
 */

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { deleteInstance } from '@/lib/evolution-api';
import { getWorkspace, updateWorkspace } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutos max

// Configurações
const DISCONNECTED_DAYS_THRESHOLD = 30; // Dias desconectado antes de cleanup
const INACTIVE_DAYS_THRESHOLD = 90; // Dias sem atividade antes de cleanup

interface CleanupResult {
  instance_name: string;
  reason: string;
  deleted: boolean;
  error?: string;
}

/**
 * Valida autenticação do cron
 */
function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Sempre exigir CRON_SECRET, mesmo em dev.
  if (!cronSecret) {
    console.error('[Cron Auth] CRON_SECRET não configurado. Rejeitando request.');
    return false;
  }

  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const xCronSecret = request.headers.get('x-cron-secret');
  if (xCronSecret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Verifica se uma instância deve ser limpa
 */
async function shouldCleanupInstance(
  instance: any,
  workspaceId: number
): Promise<{ shouldDelete: boolean; reason: string }> {
  const instanceName = instance.instance_name;

  // 1. Verificar se usuário ainda existe
  // Formato do nome: corretor-{userId}-{timestamp}
  const userIdMatch = instanceName?.match(/^corretor-(\d+)-/);
  if (userIdMatch) {
    const userId = userIdMatch[1];
    const userResult = await pool.query(
      `SELECT id, evolution_connected FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { shouldDelete: true, reason: 'usuario_nao_existe' };
    }
  }

  // 2. Verificar tempo desconectado
  if (instance.status === 'disconnected' && instance.last_connection_update) {
    const lastUpdate = new Date(instance.last_connection_update);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > DISCONNECTED_DAYS_THRESHOLD) {
      return {
        shouldDelete: true,
        reason: `desconectado_ha_${Math.round(daysSinceUpdate)}_dias`,
      };
    }
  }

  // 3. Verificar inatividade geral
  if (instance.last_connection_update) {
    const lastUpdate = new Date(instance.last_connection_update);
    const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > INACTIVE_DAYS_THRESHOLD) {
      return {
        shouldDelete: true,
        reason: `inativo_ha_${Math.round(daysSinceUpdate)}_dias`,
      };
    }
  }

  return { shouldDelete: false, reason: 'ativo' };
}

/**
 * Processa cleanup para um workspace (single instance model)
 */
async function cleanupWorkspaceInstance(workspaceId: number): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];

  const tenant = await getWorkspace(workspaceId);
  if (!tenant) {
    return results;
  }

  const instanceName = (tenant as any).evolution_instance_name;
  if (!instanceName) {
    return results;
  }

  // Build a mock instance object for the check
  const instance = {
    instance_name: instanceName,
    status: (tenant as any).evolution_connected ? 'connected' : 'disconnected',
    last_connection_update: (tenant as any).updated_at,
  };

  const { shouldDelete, reason } = await shouldCleanupInstance(instance, workspaceId);

  if (shouldDelete) {
    try {
      await deleteInstance(instanceName);
      results.push({ instance_name: instanceName, reason, deleted: true });
      console.log(`[Evolution Cleanup] Instância ${instanceName} deletada: ${reason}`);
    } catch (error: any) {
      results.push({ instance_name: instanceName, reason, deleted: true, error: error.message });
      console.warn(`[Evolution Cleanup] Erro ao deletar ${instanceName} na Evolution API:`, error.message);
    }

    // Clear instance from workspace
    await updateWorkspace(workspaceId, { evolution_instance_name: null as any, evolution_connected: false });
    console.log(`[Evolution Cleanup] Workspace ${workspaceId}: instância removida`);
  }

  return results;
}

/**
 * GET /api/cron/evolution-cleanup
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Validar autenticação
  if (!validateCronAuth(request)) {
    console.error('[Evolution Cleanup] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar todos os workspaces com instâncias Evolution
    const workspacesResult = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM workspaces
       WHERE evolution_instance_name IS NOT NULL
         AND is_active = true`
    );

    const workspaces = workspacesResult.rows;
    console.log(`[Evolution Cleanup] Verificando ${workspaces.length} workspaces com instâncias`);

    const allResults: { workspace_id: number; tenant_name: string; cleaned: CleanupResult[] }[] = [];
    let totalCleaned = 0;

    for (const ws of workspaces) {
      try {
        const results = await cleanupWorkspaceInstance(ws.id);
        if (results.length > 0) {
          allResults.push({
            workspace_id: ws.id,
            tenant_name: ws.name,
            cleaned: results,
          });
          totalCleaned += results.length;
        }
      } catch (error: any) {
        console.error(`[Evolution Cleanup] Erro no workspace ${ws.id}:`, error);
      }
    }

    // Cleanup adicional: verificar usuários com evolution_instance_name que não existe mais
    const orphanUsersResult = await pool.query(
      `SELECT id, evolution_instance_name FROM users
       WHERE evolution_instance_name IS NOT NULL
         AND evolution_connected = FALSE
         AND updated_at < NOW() - INTERVAL '${DISCONNECTED_DAYS_THRESHOLD} days'`
    );

    let orphansCleaned = 0;
    for (const user of orphanUsersResult.rows) {
      try {
        // Tentar deletar instância (pode já não existir)
        try {
          await deleteInstance(user.evolution_instance_name);
        } catch {
          // Ignorar erro se já não existe
        }

        // Limpar referência no usuário
        await pool.query(
          `UPDATE users SET evolution_instance_name = NULL WHERE id = $1`,
          [user.id]
        );
        orphansCleaned++;
      } catch (error: any) {
        console.warn(`[Evolution Cleanup] Erro ao limpar usuário órfão ${user.id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;

    console.log(
      `[Evolution Cleanup] Concluído em ${duration}ms - ` +
      `${totalCleaned} instâncias de tenants, ${orphansCleaned} usuários órfãos`
    );

    return NextResponse.json({
      success: true,
      duration,
      summary: {
        tenants_checked: workspaces.length,
        instances_cleaned: totalCleaned,
        orphan_users_cleaned: orphansCleaned,
      },
      results: allResults,
    });

  } catch (error: any) {
    console.error('[Evolution Cleanup] Erro geral:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Suporte a POST para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
