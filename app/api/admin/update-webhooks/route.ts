/**
 * Endpoint temporário para atualizar webhooks das instâncias Evolution
 *
 * GET /api/admin/update-webhooks
 * Authorization: Bearer {CRON_SECRET}
 *
 * IMPORTANTE: Remover após uso ou proteger adequadamente
 */

import { NextRequest, NextResponse } from 'next/server';
import { setWebhook, fetchInstances } from '@/lib/evolution-api';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;


export async function GET(request: NextRequest) {
  // Validar autenticação via Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

  if (!WEBHOOK_BASE_URL) {
    return NextResponse.json({ error: 'WEBHOOK_BASE_URL not configured' }, { status: 500 });
  }

  const results: any[] = [];

  try {
    console.log('[Update Webhooks] Buscando instâncias...');
    const instances = await fetchInstances();
    console.log(`[Update Webhooks] Encontradas ${instances.length} instâncias`);

    // Buscar mapeamento instância -> tenant
    const { rows: users } = await pool.query(`
      SELECT id, evolution_instance_name, workspace_id
      FROM users
      WHERE evolution_instance_name IS NOT NULL
    `);

    const instanceToTenant = new Map<string, number>();
    const userIdToTenant = new Map<string, number>();

    for (const user of users) {
      if (user.evolution_instance_name) {
        instanceToTenant.set(user.evolution_instance_name, user.workspace_id);
      }
      userIdToTenant.set(String(user.id), user.workspace_id);
    }

    for (const instance of instances) {
      // Evolution API pode retornar em diferentes formatos
      const instanceName = (instance as any).name || instance.instance?.instanceName;
      if (!instanceName) {
        console.log(`[Update Webhooks] Instância sem nome:`, JSON.stringify(instance));
        results.push({
          instance: 'sem-nome',
          status: 'skipped',
          reason: 'instanceName não encontrado',
        });
        continue;
      }

      try {
        // Buscar workspace_id
        let workspaceId = instanceToTenant.get(instanceName);

        if (!workspaceId) {
          // Tentar extrair do nome (formato: imob-{userId}-{timestamp} ou corretor-{userId}-{timestamp})
          const match = instanceName.match(/^(?:imob|corretor)-([a-f0-9-]+)-/);
          if (match) {
            const userId = match[1];
            workspaceId = userIdToTenant.get(userId);

            if (!workspaceId) {
              const { rows } = await pool.query(
                'SELECT workspace_id FROM users WHERE id = $1',
                [userId]
              );
              if (rows[0]?.workspace_id) {
                workspaceId = rows[0].workspace_id;
              }
            }
          }
        }

        if (!workspaceId) {
          // Usar workspace_id = 1 como fallback para instâncias antigas
          console.log(`[Update Webhooks] ${instanceName}: usando workspace_id=1 como fallback`);
          workspaceId = 1;
        }

        const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
        const webhookUrl = webhookSecret
          ? `${WEBHOOK_BASE_URL}/api/webhook/evolution/${workspaceId}?secret=${webhookSecret}`
          : `${WEBHOOK_BASE_URL}/api/webhook/evolution/${workspaceId}`;

        console.log(`[Update Webhooks] ${instanceName}: atualizando webhook para ${WEBHOOK_BASE_URL}/api/webhook/evolution/${workspaceId}`);

        // Evolution API v2 não suporta headers customizados em webhooks
        // A autenticação é feita via secret no query parameter da URL
        await setWebhook(instanceName, {
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            'CONNECTION_UPDATE',
            'QRCODE_UPDATED',
          ],
        });

        results.push({
          instance: instanceName,
          status: 'updated',
          webhookUrl,
          workspaceId,
        });

      } catch (error: any) {
        console.error(`[Update Webhooks] Erro em ${instanceName}:`, error.message);
        results.push({
          instance: instanceName,
          status: 'error',
          error: error.message,
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log(`[Update Webhooks] Concluído: ${updated} atualizados, ${errors} erros`);

    return NextResponse.json({
      success: true,
      summary: {
        total: instances.length,
        updated,
        errors,
      },
      results,
    });

  } catch (error: any) {
    console.error('[Update Webhooks] Erro fatal:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
