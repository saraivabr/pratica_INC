/**
 * API: Iniciar Sessão WhatsApp (via Evolution API)
 *
 * POST /api/whatsapp/session/start
 *
 * REGRA FUNDAMENTAL: 1 usuário = 1 instância. Nunca duplica.
 * 
 * Lógica:
 * 1. Busca instância do usuário no banco
 * 2. Se existe → verifica se está viva na Evolution API
 *    - Se viva e conectada → retorna ready
 *    - Se viva e connecting → busca QR/pairing code
 *    - Se morta (404) → deleta fantasma, cria nova
 * 3. Se não existe → cria nova
 * 4. Antes de criar nova → limpa TODAS as instâncias antigas desse usuário na Evolution
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { updateWorkspace, findUserWorkspace, createTenant } from "@/lib/tenant-context";
import { dbQuery } from "@/lib/db";
import {
  createInstance,
  getQRCode,
  getPairingCode,
  getConnectionStatus,
  deleteInstance,
  setWebhook,
  fetchInstances,
} from "@/lib/evolution-api";

export const runtime = "nodejs";

// Limpa TODAS as instâncias deste usuário na Evolution API
async function cleanupUserInstances(userId: string): Promise<void> {
  try {
    const allInstances = await fetchInstances();
    const userInstances = allInstances.filter((inst: any) => 
      inst.name?.includes(userId)
    );
    
    for (const inst of userInstances) {
      try {
        await deleteInstance(inst.name);
        console.log(`[WhatsApp] Instância antiga deletada: ${inst.name}`);
      } catch (e) {
        // Ignorar erro na deleção
      }
    }
  } catch (e) {
    // Se não conseguiu listar, seguir
  }
}

// Busca a instância ativa do usuário na Evolution API
async function findActiveInstance(userId: string): Promise<any | null> {
  try {
    const allInstances = await fetchInstances();
    const userInstances = allInstances.filter((inst: any) => 
      inst.name?.includes(userId) && inst.connectionStatus !== 'close'
    );
    return userInstances[0] || null;
  } catch {
    return null;
  }
}

// Gera a webhook URL
function getWebhookUrl(request: NextRequest, workspaceId: number): string {
  let baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
    const proto = request.headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
    baseUrl = host && !host.includes('localhost') ? `${proto}://${host}` : 'http://localhost:3000';
  }
  return `${baseUrl}/api/webhook/evolution/${workspaceId}`;
}

// Cria uma instância nova (garante que é a única)
async function createFreshInstance(
  userId: string, 
  userPhone: string | null, 
  workspaceId: number, 
  webhookUrl: string,
  tenantName: string
): Promise<{ instanceName: string; instance: any }> {
  // 1. Limpar TODAS as instâncias antigas deste usuário
  await cleanupUserInstances(userId);
  
  // 2. Criar nova
  const instanceName = `corretor-${userId}-${Date.now()}`;
  
  await createInstance({
    instanceName,
    number: userPhone || undefined,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    reject_call: false,
    groups_ignore: true,
    always_online: false,
    read_messages: false,
  });

  // 3. Configurar webhook
  try {
    await setWebhook(instanceName, {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    });
  } catch (e: any) {
    console.error(`[WhatsApp] Erro webhook:`, e.message);
  }

  // 4. Salvar no banco (único lugar)
  // Salvar no workspace
  await dbQuery(
    `UPDATE workspaces SET evolution_instance_name = $1, evolution_connected = false, updated_at = NOW() WHERE id = $2`,
    [instanceName, workspaceId]
  ).catch(() => {});
  
  // Salvar no user
  await dbQuery(
    `UPDATE users SET evolution_instance_name = $1, evolution_connected = false, updated_at = NOW() WHERE id = $2`,
    [instanceName, userId]
  );

  console.log(`[WhatsApp] Instância criada: ${instanceName}`);
  return { instanceName, instance: { instance_name: instanceName, status: 'connecting' } };
}

// Busca QR code e pairing code de uma instância com retry
const CODE_MAX_RETRIES = 3;
const CODE_RETRY_DELAY = 1500;
const sleepMs = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function getConnectionCodes(instanceName: string, userPhone: string | null): Promise<{ qrCode: string | null; pairingCode: string | null }> {
  let qrCode: string | null = null;
  let pairingCode: string | null = null;

  for (let attempt = 1; attempt <= CODE_MAX_RETRIES; attempt++) {
    try {
      const qrData = await getQRCode(instanceName);
      qrCode = qrData?.base64 || qrData?.code || null;
      
      // Pairing code pode vir junto com o QR
      const pc = qrData?.pairingCode;
      if (pc && typeof pc === "string" && pc.length >= 6 && /^[A-Z0-9]+$/i.test(pc)) {
        pairingCode = pc;
        console.log(`[WhatsApp] Pairing code obtido na tentativa ${attempt}: ${pc.slice(0, 4)}****`);
        break;
      }

      console.log(`[WhatsApp] Tentativa ${attempt}/${CODE_MAX_RETRIES}: pairingCode ausente (qr=${!!qrCode}, count=${qrData?.count || '?'})`);
    } catch (e: any) {
      console.error(`[WhatsApp] Tentativa ${attempt}/${CODE_MAX_RETRIES} erro QR:`, e.message);
    }

    // Se não veio pairing code no QR, tentar endpoint separado
    if (!pairingCode && userPhone) {
      try {
        const pairingData = await getPairingCode(instanceName, userPhone);
        const pc = pairingData?.pairingCode;
        if (pc && typeof pc === "string" && pc.length >= 6 && /^[A-Z0-9]+$/i.test(pc)) {
          pairingCode = pc;
          console.log(`[WhatsApp] Pairing code obtido via getPairingCode na tentativa ${attempt}`);
          break;
        }
      } catch (e: any) {
        console.error(`[WhatsApp] Tentativa ${attempt} erro pairing:`, e.message);
      }
    }

    // Esperar antes de tentar novamente (exceto na última tentativa)
    if (attempt < CODE_MAX_RETRIES) {
      await sleepMs(CODE_RETRY_DELAY);
    }
  }

  return { qrCode, pairingCode };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    const userId = (user as any).id;
    const userPhone = (user as any).telefone || (user as any).phone || null;

    // Verificar se quer forçar nova conexão
    let freshConnection = false;
    try {
      const body = await request.json();
      freshConnection = body?.freshConnection === true;
    } catch {}

    // Buscar workspace do usuário
    let workspace = await findUserWorkspace(user);
    
    if (!workspace) {
      const userName = (user as any).nome || 'Usuario';
      const userWorkspaceId = (user as any).workspace_id;
      
      // Se user já tem workspace_id, buscar direto
      if (userWorkspaceId) {
        const wsResult = await dbQuery('SELECT * FROM workspaces WHERE id = $1', [userWorkspaceId]);
        workspace = wsResult.rows[0];
      }
      
      // Se ainda não tem, criar
      if (!workspace) {
        const wsResult = await dbQuery(
          `INSERT INTO workspaces (owner_id, name, slug, type, plan, created_at, updated_at)
           VALUES ($1, $2, $3, 'personal', 'free', NOW(), NOW())
           RETURNING *`,
          [userId, userName, `user-${userId.substring(0, 8)}-${Date.now()}`]
        );
        workspace = wsResult.rows[0];
        
        if (!workspace) {
          return NextResponse.json({ error: "Erro ao criar workspace" }, { status: 500 });
        }

        await dbQuery(
          `UPDATE users SET workspace_id = $1, updated_at = NOW() WHERE id = $2`,
          [workspace.id, userId]
        );
      }
    }
    
    const tenant = workspace;

    const workspaceId = tenant.id;
    const webhookUrl = getWebhookUrl(request, workspaceId);
    const tenantName = tenant.name || tenant.slug || '';

    // === LÓGICA PRINCIPAL: 1 usuário = 1 instância ===

    let instanceName = (user as any).evolution_instance_name;
    let needsNewInstance = freshConnection || !instanceName;

    // Se tem instância no banco, verificar se está viva na Evolution
    if (instanceName && !freshConnection) {
      try {
        const status = await getConnectionStatus(instanceName);
        
        if (status.state === 'open') {
          // Já conectado!
          return NextResponse.json({
            status: "ready",
            pairedPhone: userPhone,
            instanceName,
          });
        }
        // Instância existe e está connecting — vamos buscar os códigos
        needsNewInstance = false;
      } catch {
        // Instância não existe na Evolution — precisa criar nova
        console.log(`[WhatsApp] Instância ${instanceName} não existe na Evolution. Recriando.`);
        needsNewInstance = true;
      }
    }

    // Criar nova se necessário
    if (needsNewInstance) {
      const result = await createFreshInstance(userId, userPhone, workspaceId, webhookUrl, tenantName);
      instanceName = result.instanceName;
      
      // Esperar um pouco pra Evolution gerar o QR
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Buscar códigos de conexão
    const { qrCode, pairingCode } = await getConnectionCodes(instanceName, userPhone);

    let status = "connecting";
    if (pairingCode) status = "pairing";
    else if (qrCode) status = "qr";

    return NextResponse.json({
      status,
      qr: qrCode,
      pairingCode,
      userPhone,
      instanceName,
      channelId: `poll-${workspaceId}-${Date.now()}`,
    });

  } catch (error: any) {
    console.error("WhatsApp start error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar sessão: " + (error.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
