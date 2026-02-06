/**
 * Endpoint para sincronizar histórico de WhatsApp da Evolution API
 *
 * POST /api/admin/whatsapp-sync
 * Authorization: Bearer {CRON_SECRET}
 *
 * Body (opcional):
 * {
 *   "workspaceId": 1,           // Filtrar por tenant específico
 *   "instanceName": "xxx",   // Filtrar por instância específica
 *   "limit": 100             // Limite de mensagens por chat
 * }
 *
 * Funcionalidades:
 * - Sincroniza chats de todas as instâncias conectadas
 * - Sincroniza contatos
 * - Sincroniza histórico de mensagens
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchInstances,
  getConnectionStatus,
} from '@/lib/evolution-api';
import {
  fetchAllChats,
  fetchAllContacts,
  syncChatsToDatabase,
  syncContactsToDatabase,
  syncMessagesToDatabase,
} from '@/lib/whatsapp-sync/fetch';
import pool from '@/lib/db';
import { withTenant } from '@/lib/tenant-context';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos para operações longas


interface SyncRequest {
  workspaceId?: number;
  instanceName?: string;
  limit?: number;
}

interface SyncResult {
  instanceName: string;
  workspaceId: number;
  status: 'success' | 'error' | 'skipped';
  chats?: number;
  contacts?: number;
  messages?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Validar autenticação via Authorization header
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SyncRequest = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch {
    // Body vazio ou inválido, usar defaults
  }

  const filterTenantId = body.workspaceId;
  const filterInstanceName = body.instanceName;
  const messagesLimit = body.limit || 100;

  console.log('[WhatsApp Sync] Iniciando sincronização...', {
    filterTenantId,
    filterInstanceName,
    messagesLimit,
  });

  const results: SyncResult[] = [];
  const errors: string[] = [];

  try {
    // 1. Buscar todas as instâncias
    console.log('[WhatsApp Sync] Buscando instâncias...');
    const instances = await fetchInstances();
    console.log(`[WhatsApp Sync] Encontradas ${instances.length} instâncias`);

    // 2. Buscar mapeamento instância -> tenant do banco
    const { rows: users } = await pool.query(`
      SELECT id, evolution_instance_name, workspace_id, nome
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

    // 3. Processar cada instância
    for (const instance of instances) {
      const instanceName = (instance as any).name || instance.instance?.instanceName;
      if (!instanceName) {
        errors.push('Instância sem nome encontrada');
        continue;
      }

      // Aplicar filtro de instância
      if (filterInstanceName && instanceName !== filterInstanceName) {
        continue;
      }

      // Identificar tenant
      let workspaceId = instanceToTenant.get(instanceName);

      if (!workspaceId) {
        const match = instanceName.match(/^corretor-(\d+)-/);
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
        results.push({
          instanceName,
          workspaceId: 0,
          status: 'skipped',
          error: 'workspace_id não encontrado',
        });
        continue;
      }

      // Aplicar filtro de tenant
      if (filterTenantId && workspaceId !== filterTenantId) {
        continue;
      }

      // Verificar status de conexão
      let isConnected = false;
      try {
        const status = await getConnectionStatus(instanceName);
        isConnected = status.state === 'open';
      } catch {
        isConnected = false;
      }

      console.log(`[WhatsApp Sync] Processando ${instanceName} (tenant: ${workspaceId}, conectado: ${isConnected})`);

      try {
        // Sincronizar chats
        const chatsResult = await syncChatsToDatabase(workspaceId, instanceName);

        // Sincronizar contatos
        const contactsResult = await syncContactsToDatabase(workspaceId, instanceName);

        // Sincronizar mensagens
        const messagesResult = await syncMessagesToDatabase(workspaceId, instanceName, messagesLimit);

        results.push({
          instanceName,
          workspaceId,
          status: 'success',
          chats: chatsResult.synced,
          contacts: contactsResult.synced,
          messages: messagesResult.synced,
        });

        // Registrar execução no histórico
        await withTenant(workspaceId, async (client) => {
          await client.query(`
            INSERT INTO whatsapp_sync_runs (
              workspace_id,
              status,
              chats_synced,
              contacts_synced,
              started_at,
              completed_at
            ) VALUES ($1, 'completed', $2, $3, NOW(), NOW())
          `, [workspaceId, chatsResult.synced, contactsResult.synced]);
        });

        // Combinar erros
        if (chatsResult.errors.length > 0) {
          errors.push(...chatsResult.errors.map(e => `[${instanceName}] ${e}`));
        }
        if (contactsResult.errors.length > 0) {
          errors.push(...contactsResult.errors.map(e => `[${instanceName}] ${e}`));
        }
        if (messagesResult.errors.length > 0) {
          errors.push(...messagesResult.errors.map(e => `[${instanceName}] ${e}`));
        }

      } catch (error: any) {
        console.error(`[WhatsApp Sync] Erro em ${instanceName}:`, error.message);
        results.push({
          instanceName,
          workspaceId,
          status: 'error',
          error: error.message,
        });
      }
    }

    // 4. Calcular estatísticas
    const summary = {
      totalInstances: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      totalChats: results.reduce((sum, r) => sum + (r.chats || 0), 0),
      totalContacts: results.reduce((sum, r) => sum + (r.contacts || 0), 0),
      totalMessages: results.reduce((sum, r) => sum + (r.messages || 0), 0),
    };

    console.log('[WhatsApp Sync] Sincronização concluída:', summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[WhatsApp Sync] Erro fatal:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

// GET retorna instruções de uso
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    endpoint: '/api/admin/whatsapp-sync',
    method: 'POST',
    authentication: 'Header: Authorization: Bearer {CRON_SECRET}',
    body: {
      workspaceId: 'number (opcional) - Filtrar por tenant específico',
      instanceName: 'string (opcional) - Filtrar por instância específica',
      limit: 'number (opcional, default: 100) - Limite de mensagens por chat',
    },
    example: {
      headers: { Authorization: 'Bearer {CRON_SECRET}' },
      body: { workspaceId: 1, limit: 50 },
    },
  });
}
