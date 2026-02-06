/**
 * API: Status da Sessão WhatsApp (via Evolution API)
 *
 * GET /api/whatsapp/session/status
 *
 * Retorna status atual da conexão WhatsApp usando Evolution API diretamente.
 * Inclui dados do perfil (foto, nome, número) quando conectado.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace, withTenant } from "@/lib/tenant-context";
import { getConnectionStatus, getQRCode, fetchInstances } from "@/lib/evolution-api";

export const runtime = "nodejs";

// Extrai número do JID do WhatsApp (5511999999999@s.whatsapp.net -> 5511999999999)
function extractPhoneFromJid(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const match = jid.match(/^(\d+)@/);
  return match ? match[1] : null;
}

// Formata número para exibição (5511999999999 -> +55 11 99999-9999)
function formatPhoneForDisplay(phone: string | null): string | null {
  if (!phone) return null;
  if (phone.length === 13 && phone.startsWith("55")) {
    const ddd = phone.slice(2, 4);
    const part1 = phone.slice(4, 9);
    const part2 = phone.slice(9);
    return `+55 ${ddd} ${part1}-${part2}`;
  }
  return `+${phone}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    // Buscar workspace
    const workspace = await findUserWorkspace(user);
    if (!workspace) {
      return NextResponse.json({
        status: "disconnected",
        pairedPhone: null,
        profileName: null,
        profilePicUrl: null,
        lastQr: null,
        pairingCode: null,
        error: "Workspace não configurado. Inicie a conexão para criar.",
      });
    }

    const workspaceId = (workspace as any).id;

    // Buscar instância do workspace
    const userId = (user as any).id;
    const instanceName = (workspace as any).evolution_instance_name;

    if (!instanceName) {
      return NextResponse.json({
        status: "disconnected",
        pairedPhone: null,
        profileName: null,
        profilePicUrl: null,
        lastQr: null,
        pairingCode: null,
        instanceName: null,
        error: null,
      });
    }

    return await withTenant(workspaceId, async (client) => {
      // SEMPRE consultar a Evolution API para obter status REAL
      // Não usar fallback de banco para evitar dessincronização
      try {
        // Buscar todas as instâncias para obter dados completos do perfil
        const allInstances = await fetchInstances();
        const instanceData = allInstances.find((i: any) => i.name === instanceName);

        if (!instanceData) {
          console.log(`[WhatsApp Status] Instance ${instanceName} not found in Evolution API`);

          // Instância não existe mais - atualizar banco
          await client.query(
            `UPDATE users SET evolution_connected = false, evolution_instance_name = NULL, updated_at = NOW() WHERE id = $1`,
            [userId]
          );

          return NextResponse.json({
            status: "disconnected",
            instanceName: null,
            pairedPhone: null,
            profileName: null,
            profilePicUrl: null,
            lastQr: null,
            pairingCode: null,
            error: null,
          });
        }

        // Verificar status real da conexão
        const connectionStatus = instanceData.connectionStatus;
        console.log(`[WhatsApp Status] Instance ${instanceName} connectionStatus: ${connectionStatus}`);

        if (connectionStatus === 'open') {
          // Conexão aberta - extrair dados do perfil
          const phoneNumber = extractPhoneFromJid(instanceData.ownerJid);
          const formattedPhone = formatPhoneForDisplay(phoneNumber);
          const profileName = instanceData.profileName || null;
          const profilePicUrl = instanceData.profilePicUrl || null;

          console.log(`[WhatsApp Status] Connection is OPEN for ${instanceName} - Phone: ${formattedPhone}, Name: ${profileName}`);

          // Atualizar banco com status correto e instance name
          await client.query(
            `UPDATE users SET evolution_connected = true, evolution_instance_name = $2, updated_at = NOW() WHERE id = $1`,
            [userId, instanceName]
          );

          return NextResponse.json({
            status: "ready",
            instanceName,
            pairedPhone: formattedPhone,
            profileName,
            profilePicUrl,
            lastQr: null,
            pairingCode: null,
            error: null,
          });
        }

        if (connectionStatus === 'connecting') {
          // Tentando conectar - buscar QR code
          let qrCode = null;
          let pairingCode = null;

          try {
            const qrData = await getQRCode(instanceName);
            qrCode = qrData?.code || qrData?.base64 || null;
            if (qrData?.pairingCode && qrData.pairingCode.length === 8 && /^\d+$/.test(qrData.pairingCode)) {
              pairingCode = qrData.pairingCode;
            }
          } catch {
            // QR pode não estar disponível ainda
          }

          return NextResponse.json({
            status: "connecting",
            instanceName,
            pairedPhone: null,
            profileName: null,
            profilePicUrl: null,
            lastQr: qrCode,
            pairingCode,
            error: null,
          });
        }

        // Estado 'close' ou outro - desconectado
        console.log(`[WhatsApp Status] Instance ${instanceName} is disconnected (status: ${connectionStatus})`);

        // Atualizar banco com status correto
        await client.query(
          `UPDATE users SET evolution_connected = false, updated_at = NOW() WHERE id = $1`,
          [userId]
        );

        // Verificar se há motivo de desconexão
        const disconnectionReason = instanceData.disconnectionReasonCode;
        let errorMessage = null;
        if (disconnectionReason === 401) {
          errorMessage = "Dispositivo foi removido do WhatsApp. Reconecte.";
        } else if (disconnectionReason === 403) {
          errorMessage = "Conexão perdida. Reconecte seu WhatsApp.";
        }

        return NextResponse.json({
          status: "disconnected",
          instanceName,
          pairedPhone: null,
          profileName: null,
          profilePicUrl: null,
          lastQr: null,
          pairingCode: null,
          error: errorMessage,
        });

      } catch (apiError: any) {
        console.error("[WhatsApp Status] Error checking Evolution API:", apiError.message);

        // Erro ao consultar API - marcar como desconectado para forçar reconexão
        // NÃO usar fallback de banco pois causa o problema de "conectado fantasma"
        await client.query(
          `UPDATE users SET evolution_connected = false, updated_at = NOW() WHERE id = $1`,
          [userId]
        );

        return NextResponse.json({
          status: "disconnected",
          instanceName,
          pairedPhone: null,
          profileName: null,
          profilePicUrl: null,
          lastQr: null,
          pairingCode: null,
          error: "Não foi possível verificar status. Tente reconectar.",
        });
      }
    });

  } catch (error: any) {
    console.error("WhatsApp status error:", error);
    return NextResponse.json(
      { error: "Erro ao consultar status" },
      { status: 500 }
    );
  }
}
