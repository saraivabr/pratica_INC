/**
 * API: Sincronização WhatsApp
 *
 * POST /api/whatsapp/sync
 * Dispara sincronização completa de chats, contatos e análise de leads
 *
 * GET /api/whatsapp/sync?workspaceId=X
 * Retorna última sincronização e estatísticas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace, tenantQuery } from '@/lib/tenant-context';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { findUserWorkspace } from '@/lib/tenant-context';
import { syncChatsToDatabase, syncContactsToDatabase, syncMessagesToDatabase } from '@/lib/whatsapp-sync/fetch';
import { analyzeChats } from '@/lib/whatsapp-sync/analyze';
import { getConnectionStatus } from '@/lib/evolution-api';
import pool from '@/lib/db';

// Use nodejs runtime para acesso ao banco de dados PostgreSQL
export const runtime = 'nodejs';

interface SyncRunResult {
  id: number;
  workspace_id: number;
  status: 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  chats_synced: number;
  contacts_synced: number;
  leads_matched: number;
  opportunities_found: number;
  error_message?: string;
}

/**
 * POST /api/whatsapp/sync
 *
 * Body: { workspaceId?: number }
 *
 * Dispara sincronização completa:
 * 1. Cria registro em whatsapp_sync_runs
 * 2. Busca instância WhatsApp conectada do tenant
 * 3. Sincroniza chats (syncChatsToDatabase)
 * 4. Sincroniza contatos (syncContactsToDatabase)
 * 5. Analisa e cruza com leads (analyzeChats)
 * 6. Atualiza sync_run com resultados
 *
 * Retorna: {
 *   success: boolean,
 *   run_id: number,
 *   chats_synced: number,
 *   contacts_synced: number,
 *   leads_matched: number,
 *   opportunities_found: number
 * }
 */
export async function POST(request: NextRequest) {
  let runId: number | null = null;
  let workspaceId: number | null = null;

  try {
    // Autenticar usuário
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Obter workspaceId do body ou do usuário autenticado
    const body = await request.json().catch(() => ({}));

    if (body.workspaceId) {
      workspaceId = Number(body.workspaceId);
    } else {
      // Buscar tenant do usuário
      const tenant = await findUserWorkspace(user);
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Empresa não configurada. Configure sua empresa primeiro.' },
          { status: 400 }
        );
      }
      workspaceId = tenant.id;
    }

    // Validar tenant
    const tenant = await getWorkspace(workspaceId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: `Tenant ID ${workspaceId} não encontrado.` },
        { status: 404 }
      );
    }

    // Verificar se há instância WhatsApp configurada
    const instances = tenant.evolution_instances || [];
    const instance = instances[0];

    if (!instance?.instance_name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nenhuma instância WhatsApp configurada. Configure o WhatsApp primeiro.',
        },
        { status: 400 }
      );
    }

    const instanceName = instance.instance_name;

    // Verificar status diretamente na Evolution API (não usar status salvo no banco)
    try {
      const connectionStatus = await getConnectionStatus(instanceName);
      const state = (connectionStatus as any)?.state
        || (connectionStatus as any)?.instance?.state
        || (connectionStatus as any)?.status
        || (connectionStatus as any)?.connectionState;

      if (state !== 'open' && state !== 'connected') {
        return NextResponse.json(
          {
            success: false,
            error: `WhatsApp não está conectado (status: ${state || 'desconhecido'}). Conecte o WhatsApp primeiro.`,
          },
          { status: 400 }
        );
      }
    } catch (statusError: any) {
      console.error('[Sync] Erro ao verificar status Evolution:', statusError.message);
      return NextResponse.json(
        {
          success: false,
          error: 'Não foi possível verificar status do WhatsApp. Tente novamente.',
        },
        { status: 500 }
      );
    }

    // 1. Criar registro de sync_run
    const createRunResult = await pool.query<SyncRunResult>(
      `INSERT INTO whatsapp_sync_runs (workspace_id, status, started_at, chats_synced, contacts_synced, leads_matched, opportunities_found)
       VALUES ($1, 'running', NOW(), 0, 0, 0, 0)
       RETURNING *`,
      [workspaceId]
    );
    runId = createRunResult.rows[0].id;

    console.log(`[Sync] Iniciando sincronização run_id=${runId} workspace_id=${workspaceId} instance=${instanceName}`);

    // 2. Sincronizar chats
    let chatsSynced = 0;
    try {
      const chatsResult = await syncChatsToDatabase(workspaceId, instanceName);
      chatsSynced = chatsResult.synced || 0;
      console.log(`[Sync] Chats sincronizados: ${chatsSynced}`);
    } catch (chatError: any) {
      console.error(`[Sync] Erro ao sincronizar chats:`, chatError.message);
      // Continuar mesmo com erro nos chats
    }

    // 3. Sincronizar contatos
    let contactsSynced = 0;
    try {
      const contactsResult = await syncContactsToDatabase(workspaceId, instanceName);
      contactsSynced = contactsResult.synced || 0;
      console.log(`[Sync] Contatos sincronizados: ${contactsSynced}`);
    } catch (contactError: any) {
      console.error(`[Sync] Erro ao sincronizar contatos:`, contactError.message);
      // Continuar mesmo com erro nos contatos
    }

    // 3.5. Sincronizar mensagens históricas
    let messagesSynced = 0;
    try {
      const messagesResult = await syncMessagesToDatabase(workspaceId, instanceName, 50);
      messagesSynced = messagesResult.synced || 0;
      console.log(`[Sync] Mensagens sincronizadas: ${messagesSynced} de ${messagesResult.chatsProcessed} chats`);
    } catch (messagesError: any) {
      console.error(`[Sync] Erro ao sincronizar mensagens:`, messagesError.message);
      // Continuar mesmo com erro nas mensagens
    }

    // 4. Analisar chats e cruzar com leads
    let leadsMatched = 0;
    let opportunitiesFound = 0;
    try {
      const analysisResult = await analyzeChats(workspaceId);
      leadsMatched = analysisResult.leads_matched || 0;
      opportunitiesFound = analysisResult.opportunities?.length || 0;
      console.log(`[Sync] Análise: ${leadsMatched} leads, ${opportunitiesFound} oportunidades`);
    } catch (analysisError: any) {
      console.error(`[Sync] Erro ao analisar chats:`, analysisError.message);
      // Continuar mesmo com erro na análise
    }

    // 5. Atualizar sync_run com resultados
    await pool.query(
      `UPDATE whatsapp_sync_runs
       SET status = 'completed',
           completed_at = NOW(),
           chats_synced = $2,
           contacts_synced = $3,
           leads_matched = $4,
           opportunities_found = $5
       WHERE id = $1`,
      [runId, chatsSynced, contactsSynced, leadsMatched, opportunitiesFound]
    );

    console.log(`[Sync] Sincronização concluída run_id=${runId}`);

    return NextResponse.json({
      success: true,
      run_id: runId,
      chats_synced: chatsSynced,
      contacts_synced: contactsSynced,
      messages_synced: messagesSynced,
      leads_matched: leadsMatched,
      opportunities_found: opportunitiesFound,
    });
  } catch (error: any) {
    console.error('[Sync] Erro na sincronização:', error);

    // Atualizar sync_run com status de falha se foi criado
    if (runId && workspaceId) {
      try {
        await pool.query(
          `UPDATE whatsapp_sync_runs
           SET status = 'failed',
               completed_at = NOW(),
               error_message = $2
           WHERE id = $1`,
          [runId, error.message || 'Erro desconhecido']
        );
      } catch (updateError) {
        console.error('[Sync] Erro ao atualizar sync_run com falha:', updateError);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao executar sincronização',
        run_id: runId,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/whatsapp/sync?workspaceId=X
 *
 * Retorna última sincronização e estatísticas
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Obter workspaceId da query ou do usuário
    const searchParams = request.nextUrl.searchParams;
    let workspaceId: number;

    const queryTenantId = searchParams.get('workspaceId');
    if (queryTenantId) {
      workspaceId = Number(queryTenantId);
    } else {
      const tenant = await findUserWorkspace(user);
      if (!tenant) {
        return NextResponse.json(
          { success: false, error: 'Empresa não configurada.' },
          { status: 400 }
        );
      }
      workspaceId = tenant.id;
    }

    // Buscar última sincronização
    const lastRunResult = await pool.query<SyncRunResult>(
      `SELECT * FROM whatsapp_sync_runs
       WHERE workspace_id = $1
       ORDER BY started_at DESC
       LIMIT 1`,
      [workspaceId]
    );
    const lastRun = lastRunResult.rows[0] || null;

    // Buscar estatísticas gerais
    const query = tenantQuery(workspaceId);

    // Contar chats
    const chatsResult = await pool.query(
      `SELECT COUNT(*) as total FROM whatsapp_chats WHERE workspace_id = $1`,
      [workspaceId]
    );
    const totalChats = parseInt(chatsResult.rows[0]?.total || '0', 10);

    // Contar contatos
    const contactsResult = await pool.query(
      `SELECT COUNT(*) as total FROM whatsapp_contacts WHERE workspace_id = $1`,
      [workspaceId]
    );
    const totalContacts = parseInt(contactsResult.rows[0]?.total || '0', 10);

    // Contar mensagens
    const messagesResult = await pool.query(
      `SELECT COUNT(*) as total FROM whatsapp_messages WHERE workspace_id = $1`,
      [workspaceId]
    );
    const totalMessages = parseInt(messagesResult.rows[0]?.total || '0', 10);

    // Contar leads vinculados
    const linkedLeadsResult = await pool.query(
      `SELECT COUNT(DISTINCT lead_id) as total
       FROM whatsapp_contacts
       WHERE workspace_id = $1 AND lead_id IS NOT NULL`,
      [workspaceId]
    );
    const linkedLeads = parseInt(linkedLeadsResult.rows[0]?.total || '0', 10);

    // Buscar histórico de sincronizações (últimas 10)
    const historyResult = await pool.query<SyncRunResult>(
      `SELECT * FROM whatsapp_sync_runs
       WHERE workspace_id = $1
       ORDER BY started_at DESC
       LIMIT 10`,
      [workspaceId]
    );

    return NextResponse.json({
      success: true,
      last_sync: lastRun
        ? {
            run_id: lastRun.id,
            status: lastRun.status,
            started_at: lastRun.started_at,
            completed_at: lastRun.completed_at,
            chats_synced: lastRun.chats_synced,
            contacts_synced: lastRun.contacts_synced,
            leads_matched: lastRun.leads_matched,
            opportunities_found: lastRun.opportunities_found,
            error_message: lastRun.error_message,
          }
        : null,
      statistics: {
        total_chats: totalChats,
        total_contacts: totalContacts,
        total_messages: totalMessages,
        linked_leads: linkedLeads,
      },
      history: historyResult.rows.map((run) => ({
        run_id: run.id,
        status: run.status,
        started_at: run.started_at,
        completed_at: run.completed_at,
        chats_synced: run.chats_synced,
        contacts_synced: run.contacts_synced,
        leads_matched: run.leads_matched,
        opportunities_found: run.opportunities_found,
        error_message: run.error_message,
      })),
    });
  } catch (error: any) {
    console.error('[Sync] Erro ao buscar status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar status da sincronização' },
      { status: 500 }
    );
  }
}
