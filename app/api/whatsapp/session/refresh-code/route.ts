/**
 * API: Refresh Pairing Code / QR Code (sem criar instância nova)
 *
 * GET /api/whatsapp/session/refresh-code
 *
 * Anti-falha:
 * - Tenta até 3 vezes buscar o pairing code
 * - Se a instância existente não retorna pairing code após 3 tentativas,
 *   sinaliza needsRecreate para o frontend recriar via session/start
 * - Se a instância morreu (404), retorna needsRecreate imediatamente
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";
import { getQRCode, getConnectionStatus } from "@/lib/evolution-api";

export const runtime = "nodejs";

const MAX_CODE_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Tenta buscar QR + pairing code com retry
 * Retorna { qrCode, pairingCode } ou null se todos falharem
 */
async function fetchCodesWithRetry(
  instanceName: string
): Promise<{ qrCode: string | null; pairingCode: string | null }> {
  let qrCode: string | null = null;
  let pairingCode: string | null = null;

  for (let attempt = 1; attempt <= MAX_CODE_RETRIES; attempt++) {
    try {
      const qrData = await getQRCode(instanceName);
      qrCode = qrData?.base64 || qrData?.code || null;

      const pc = qrData?.pairingCode;
      if (pc && typeof pc === "string" && pc.length >= 6 && /^[A-Z0-9]+$/i.test(pc)) {
        pairingCode = pc;
        console.log(`[WhatsApp RefreshCode] Pairing code obtido na tentativa ${attempt}: ${pc.slice(0, 4)}****`);
        break; // Sucesso — sair do loop
      }

      console.log(`[WhatsApp RefreshCode] Tentativa ${attempt}/${MAX_CODE_RETRIES}: pairingCode ausente (qr=${!!qrCode})`);

      if (attempt < MAX_CODE_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    } catch (e: any) {
      console.error(`[WhatsApp RefreshCode] Tentativa ${attempt}/${MAX_CODE_RETRIES} erro:`, e.message);
      if (attempt < MAX_CODE_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  return { qrCode, pairingCode };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const userId = (user as any).id;

    // Buscar instância existente do usuário
    const userRow = await dbQuery(
      `SELECT evolution_instance_name FROM users WHERE id = $1`,
      [userId]
    );
    const instanceName = userRow.rows[0]?.evolution_instance_name;

    if (!instanceName) {
      return NextResponse.json(
        { error: "Nenhuma instância encontrada. Inicie uma nova sessão.", needsRecreate: true },
        { status: 404 }
      );
    }

    // Verificar se a instância está viva
    try {
      const status = await getConnectionStatus(instanceName);

      // Se já conectou, retornar ready
      if (status.state === "open") {
        return NextResponse.json({
          status: "ready",
          pairingCode: null,
          qr: null,
        });
      }
    } catch (e: any) {
      // Instância morta (404) — precisa recriar via session/start
      console.log(`[WhatsApp RefreshCode] Instância ${instanceName} não existe. Precisa recriar.`);
      return NextResponse.json(
        { error: "Instância não encontrada. Inicie uma nova sessão.", needsRecreate: true },
        { status: 404 }
      );
    }

    // Buscar códigos com retry
    const { qrCode, pairingCode } = await fetchCodesWithRetry(instanceName);

    // Se não conseguiu pairing code após todas as tentativas,
    // a instância provavelmente esgotou os QRs — sinalizar para recriar
    if (!pairingCode && !qrCode) {
      console.log(`[WhatsApp RefreshCode] Nenhum código após ${MAX_CODE_RETRIES} tentativas. Sinalizando recreação.`);
      return NextResponse.json(
        { error: "Código expirado. Recriando instância...", needsRecreate: true },
        { status: 410 } // Gone
      );
    }

    return NextResponse.json({
      status: pairingCode ? "pairing" : "connecting",
      pairingCode,
      qr: qrCode,
    });
  } catch (error: any) {
    console.error("WhatsApp refresh-code error:", error);
    return NextResponse.json(
      { error: "Erro ao gerar novo código: " + (error.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
