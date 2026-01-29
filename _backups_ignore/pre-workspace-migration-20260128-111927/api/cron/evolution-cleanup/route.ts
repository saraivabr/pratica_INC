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
import { getTenant, updateTenant } from '@/lib/tenant-context';

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

  if (process.env.NODE_ENV === 'development') {
    return true;
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
  tenantId: number
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
 * Processa cleanup para um tenant
 */
async function cleanupTenantInstances(tenantId: number): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];

  const tenant = await getTenant(tenantId);
  if (!tenant) {
    return results;
  }

  const instances = tenant.evolution_instances || [];
  if (instances.length === 0) {
    return results;
  }

  const activeInstances: any[] = [];

  for (const instance of instances) {
    const { shouldDelete, reason } = await shouldCleanupInstance(instance, tenantId);

    if (shouldDelete) {
      try {
        await deleteInstance(instance.instance_name);
        results.push({
          instance_name: instance.instance_name,
          reason,
          deleted: true,
        });
        console.log(`[Evolution Cleanup] Instância ${instance.instance_name} deletada: ${reason}`);
      } catch (error: any) {
        // Se falhar na Evolution API, ainda remover do tenant
        // (pode já ter sido deletada ou não existir)
        results.push({
          instance_name: instance.instance_name,
          reason,
          deleted: true,
          error: error.message,
        });
        console.warn(`[Evolution Cleanup] Erro ao deletar ${instance.instance_name} na Evolution API:`, error.message);
      }
    } else {
      activeInstances.push(instance);
    }
  }

  // Atualizar lista de instâncias no tenant
  if (results.length > 0) {
    await updateTenant(tenantId, { evolution_instances: activeInstances as any[] });
    console.log(`[Evolution Cleanup] Tenant ${tenantId}: ${results.length} instâncias removidas, ${activeInstances.length} mantidas`);
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
    // Buscar todos os tenants com instâncias Evolution
    const tenantsResult = await pool.query<{ id: number; name: string }>(
      `SELECT id, name FROM tenants
       WHERE evolution_instances IS NOT NULL
         AND jsonb_array_length(evolution_instances) > 0`
    );

    const tenants = tenantsResult.rows;
    console.log(`[Evolution Cleanup] Verificando ${tenants.length} tenants com instâncias`);

    const allResults: { tenant_id: number; tenant_name: string; cleaned: CleanupResult[] }[] = [];
    let totalCleaned = 0;

    for (const tenant of tenants) {
      try {
        const results = await cleanupTenantInstances(tenant.id);
        if (results.length > 0) {
          allResults.push({
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            cleaned: results,
          });
          totalCleaned += results.length;
        }
      } catch (error: any) {
        console.error(`[Evolution Cleanup] Erro no tenant ${tenant.id}:`, error);
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
        tenants_checked: tenants.length,
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
