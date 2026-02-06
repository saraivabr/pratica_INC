/**
 * Admin WhatsApp Instances
 *
 * GET /api/admin/whatsapp/instances
 *   - Lista instancias WhatsApp por usuario no workspace atual
 * POST /api/admin/whatsapp/instances
 *   - Acoes administrativas: reconnect | logout | status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import { withTenant } from '@/lib/tenant-context';
import { fetchInstances, getQRCode, getConnectionStatus, logoutInstance, deleteInstance } from '@/lib/evolution-api';

export const runtime = 'nodejs';

function isAdminRole(role?: string | null) {
  return role === 'admin' || role === 'gerente';
}

function extractPhoneFromJid(jid?: string | null): string | null {
  if (!jid) return null;
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : null;
}

function formatPhoneForDisplay(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length === 13 && phone.startsWith('55')) {
    const ddd = phone.slice(2, 4);
    const part1 = phone.slice(4, 9);
    const part2 = phone.slice(9);
    return `+55 ${ddd} ${part1}-${part2}`;
  }
  return `+${phone}`;
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (!isAdminRole(ctx.user.role)) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const workspaceId = ctx.workspaceId;

    // Carregar usuarios do workspace
    const users = await withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, nome, telefone, role, evolution_instance_name, evolution_connected
         FROM users
         WHERE workspace_id = $1
         ORDER BY nome ASC`,
        [workspaceId]
      );
      return rows;
    });

    // Carregar instancias do Evolution
    let instances: any[] = [];
    try {
      instances = await fetchInstances();
    } catch {
      instances = [];
    }

    const instanceMap = new Map<string, any>();
    for (const inst of instances) {
      const name = inst?.name || inst?.instance?.instanceName;
      if (name) instanceMap.set(name, inst);
    }

    const data = users.map((u: any) => {
      const instanceName = u.evolution_instance_name || null;
      const inst = instanceName ? instanceMap.get(instanceName) : null;

      let connectionState: string | null = null;
      if (inst) {
        connectionState = inst.connectionStatus || inst?.instance?.connectionStatus || null;
      } else if (instanceName) {
        connectionState = 'missing';
      } else {
        connectionState = 'not_configured';
      }

      const ownerJid = inst?.ownerJid || inst?.instance?.ownerJid || null;
      const phone = formatPhoneForDisplay(extractPhoneFromJid(ownerJid));

      return {
        user_id: u.id,
        user_name: u.nome,
        user_phone: u.telefone,
        user_role: u.role,
        instance_name: instanceName,
        evolution_connected: u.evolution_connected === true,
        connection_state: connectionState,
        profile_name: inst?.profileName || inst?.instance?.profileName || null,
        profile_phone: phone,
        profile_pic_url: inst?.profilePicUrl || inst?.instance?.profilePicUrl || null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error listing admin WhatsApp instances:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    if (!isAdminRole(ctx.user.role)) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const workspaceId = ctx.workspaceId;
    const body = await request.json();
    const { userId, action } = body || {};

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: 'userId e action sao obrigatorios' }, { status: 400 });
    }

    const user = await withTenant(workspaceId, async (client) => {
      const { rows } = await client.query(
        `SELECT id, nome, evolution_instance_name
         FROM users
         WHERE workspace_id = $1 AND id = $2
         LIMIT 1`,
        [workspaceId, userId]
      );
      return rows[0] || null;
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const instanceName = user.evolution_instance_name;
    if (!instanceName) {
      return NextResponse.json({ success: false, error: 'Usuario nao possui instancia configurada' }, { status: 400 });
    }

    if (action === 'reconnect') {
      const qrData = await getQRCode(instanceName);
      if (!qrData?.base64) {
        return NextResponse.json({ success: false, error: 'Falha ao gerar QR Code' }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        qrCode: qrData.base64,
        pairingCode: qrData.pairingCode || null,
        instanceName,
      });
    }

    if (action === 'logout') {
      try {
        await logoutInstance(instanceName);
      } catch (err: any) {
        console.warn('[Admin WhatsApp] Falha ao desconectar instancia:', err?.message || err);
      }

      try {
        await deleteInstance(instanceName);
      } catch (err: any) {
        console.warn('[Admin WhatsApp] Falha ao deletar instancia:', err?.message || err);
      }

      await withTenant(workspaceId, async (client) => {
        await client.query(
          `UPDATE users SET evolution_connected = false, evolution_instance_name = NULL, updated_at = NOW() WHERE id = $1`,
          [userId]
        );
      });

      return NextResponse.json({ success: true, instanceName });
    }

    if (action === 'status') {
      const status = await getConnectionStatus(instanceName);
      return NextResponse.json({ success: true, instanceName, status: status?.state || 'unknown' });
    }

    return NextResponse.json({ success: false, error: 'Action invalida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling admin WhatsApp action:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
