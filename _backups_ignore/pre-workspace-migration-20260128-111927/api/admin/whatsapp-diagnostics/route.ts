/**
 * Endpoint de diagnóstico das instâncias WhatsApp/Evolution
 *
 * GET /api/admin/whatsapp-diagnostics?secret=xxx
 *
 * Retorna:
 * - Lista de todas as instâncias
 * - Status de conexão de cada uma
 * - Configuração de webhook
 * - Tenant associado
 * - Estatísticas de mensagens
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchInstances, getConnectionStatus, getWebhook } from '@/lib/evolution-api';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ADMIN_SECRET = process.env.CRON_SECRET;

interface InstanceDiagnostic {
  instanceName: string;
  connectionStatus: string;
  tenantId: number | null;
  userName: string | null;
  userId: string | null;
  webhook: {
    url: string | null;
    enabled: boolean;
    events: string[];
    isCorrect: boolean;
    expectedUrl: string;
  };
  stats: {
    totalMessages: number;
    lastMessageAt: string | null;
    uniqueContacts: number;
  };
}

export async function GET(request: NextRequest) {
  // Validar autenticação
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

  const diagnostics: InstanceDiagnostic[] = [];
  const errors: string[] = [];

  try {
    console.log('[WhatsApp Diagnostics] Buscando instâncias...');
    const instances = await fetchInstances();
    console.log(`[WhatsApp Diagnostics] Encontradas ${instances.length} instâncias`);

    // Buscar mapeamento instância -> usuário/tenant do banco
    const { rows: users } = await pool.query(`
      SELECT id, evolution_instance_name, tenant_id, nome
      FROM users
      WHERE evolution_instance_name IS NOT NULL
    `);

    const instanceToUser = new Map<string, { id: string; nome: string; tenant_id: number }>();
    const userIdToInfo = new Map<string, { nome: string; tenant_id: number }>();

    for (const user of users) {
      if (user.evolution_instance_name) {
        instanceToUser.set(user.evolution_instance_name, {
          id: user.id,
          nome: user.nome,
          tenant_id: user.tenant_id,
        });
      }
      userIdToInfo.set(String(user.id), {
        nome: user.nome,
        tenant_id: user.tenant_id,
      });
    }

    // Processar cada instância
    for (const instance of instances) {
      const instanceName = (instance as any).name || instance.instance?.instanceName;
      if (!instanceName) {
        errors.push('Instância sem nome encontrada');
        continue;
      }

      try {
        // Buscar status de conexão
        let connectionStatus = 'unknown';
        try {
          const status = await getConnectionStatus(instanceName);
          connectionStatus = status.state || 'unknown';
        } catch {
          connectionStatus = 'error';
        }

        // Buscar configuração de webhook
        let webhookConfig: any = null;
        try {
          webhookConfig = await getWebhook(instanceName);
        } catch {
          webhookConfig = null;
        }

        // Identificar tenant/usuário
        let tenantId: number | null = null;
        let userName: string | null = null;
        let userId: string | null = null;

        const userInfo = instanceToUser.get(instanceName);
        if (userInfo) {
          tenantId = userInfo.tenant_id;
          userName = userInfo.nome;
          userId = userInfo.id;
        } else {
          // Tentar extrair do nome (formato: corretor-{userId}-{timestamp})
          const match = instanceName.match(/^corretor-(\d+)-/);
          if (match && match[1]) {
            userId = match[1];
            const info = userIdToInfo.get(match[1]);
            if (info) {
              tenantId = info.tenant_id;
              userName = info.nome;
            }
          }
        }

        // Buscar estatísticas de mensagens
        let stats = {
          totalMessages: 0,
          lastMessageAt: null as string | null,
          uniqueContacts: 0,
        };

        if (tenantId) {
          try {
            const { rows: statsRows } = await pool.query(`
              SELECT
                COUNT(*) as total_messages,
                MAX(timestamp) as last_message_at,
                COUNT(DISTINCT phone_number) as unique_contacts
              FROM whatsapp_messages
              WHERE tenant_id = $1 AND instance_name = $2
            `, [tenantId, instanceName]);

            if (statsRows[0]) {
              stats.totalMessages = parseInt(statsRows[0].total_messages) || 0;
              stats.lastMessageAt = statsRows[0].last_message_at?.toISOString() || null;
              stats.uniqueContacts = parseInt(statsRows[0].unique_contacts) || 0;
            }
          } catch {
            // Ignorar erros de estatísticas
          }
        }

        // Verificar se webhook está correto
        const expectedWebhookUrl = tenantId
          ? `${WEBHOOK_BASE_URL}/api/webhook/evolution/${tenantId}`
          : null;

        const currentWebhookUrl = webhookConfig?.url || webhookConfig?.webhook?.url || null;
        const webhookEnabled = webhookConfig?.enabled ?? webhookConfig?.webhook?.enabled ?? false;
        const webhookEvents = webhookConfig?.events || webhookConfig?.webhook?.events || [];

        const isWebhookCorrect = expectedWebhookUrl
          ? currentWebhookUrl === expectedWebhookUrl && webhookEnabled
          : false;

        diagnostics.push({
          instanceName,
          connectionStatus,
          tenantId,
          userName,
          userId,
          webhook: {
            url: currentWebhookUrl,
            enabled: webhookEnabled,
            events: webhookEvents,
            isCorrect: isWebhookCorrect,
            expectedUrl: expectedWebhookUrl || 'N/A (tenant não identificado)',
          },
          stats,
        });

      } catch (error: any) {
        errors.push(`Erro ao processar ${instanceName}: ${error.message}`);
      }
    }

    // Calcular estatísticas gerais
    const summary = {
      totalInstances: instances.length,
      connected: diagnostics.filter(d => d.connectionStatus === 'open').length,
      disconnected: diagnostics.filter(d => d.connectionStatus === 'close').length,
      unknown: diagnostics.filter(d => !['open', 'close'].includes(d.connectionStatus)).length,
      webhooksCorrect: diagnostics.filter(d => d.webhook.isCorrect).length,
      webhooksIncorrect: diagnostics.filter(d => !d.webhook.isCorrect).length,
      totalMessages: diagnostics.reduce((sum, d) => sum + d.stats.totalMessages, 0),
      errors: errors.length,
    };

    console.log(`[WhatsApp Diagnostics] Diagnóstico concluído:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      instances: diagnostics,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[WhatsApp Diagnostics] Erro fatal:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
