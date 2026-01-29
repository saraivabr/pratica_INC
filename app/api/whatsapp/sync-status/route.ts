/**
 * API: Sync Status WhatsApp com Evolution API
 * 
 * POST /api/whatsapp/sync-status
 * 
 * Verifica status real de TODAS as instâncias na Evolution API
 * e atualiza users.evolution_connected no banco.
 * 
 * Uso: cron job ou chamada manual do admin.
 * Pode também ser chamado via cron com header x-api-key.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";
import { fetchInstances } from "@/lib/evolution-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Verificar auth: ou usuário admin ou API key interna
    const apiKey = request.headers.get("x-api-key");
    const internalKey = process.env.ADMIN_SECRET_KEY;
    
    if (apiKey && internalKey && apiKey === internalKey) {
      // Autenticado via API key interna (cron)
    } else {
      const user = await getAuthenticatedUser(request);
      if (!user || (user as any).role !== "admin") {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
      }
    }

    console.log("[WhatsApp Sync] Starting full status sync...");
    
    // Buscar todas as instâncias da Evolution API
    let instances: any[] = [];
    try {
      instances = await fetchInstances();
    } catch (fetchError: any) {
      console.error("[WhatsApp Sync] Error fetching instances:", fetchError);
      return NextResponse.json({
        success: false,
        error: "Erro ao consultar Evolution API: " + fetchError.message,
      }, { status: 502 });
    }
    
    // Mapear instance name -> dados completos
    const instanceMap = new Map<string, any>();
    for (const inst of instances) {
      const name = inst.name || inst.instance?.instanceName;
      if (name) {
        instanceMap.set(name, {
          connected: inst.connectionStatus === 'open',
          ownerJid: inst.ownerJid,
          profileName: inst.profileName,
          disconnectionReason: inst.disconnectionReasonCode,
        });
      }
    }

    // Buscar todos os users com instância configurada
    const { rows: users } = await dbQuery<{
      id: string;
      nome: string;
      evolution_instance_name: string;
      evolution_connected: boolean;
    }>(
      `SELECT id, nome, evolution_instance_name, evolution_connected 
       FROM users 
       WHERE evolution_instance_name IS NOT NULL AND is_active = true`
    );

    let updated = 0;
    let nowConnected = 0;
    let nowDisconnected = 0;
    const changes: Array<{ user: string; from: boolean; to: boolean }> = [];

    for (const u of users) {
      const instanceData = instanceMap.get(u.evolution_instance_name);
      const isConnected = instanceData?.connected === true;
      
      if (isConnected) nowConnected++;
      else nowDisconnected++;

      // Só atualizar se status mudou
      if (u.evolution_connected !== isConnected) {
        await dbQuery(
          `UPDATE users SET evolution_connected = $1, updated_at = NOW() WHERE id = $2`,
          [isConnected, u.id]
        );
        updated++;
        changes.push({
          user: u.nome || u.id,
          from: u.evolution_connected,
          to: isConnected,
        });
      }
    }

    // Também marcar como desconectados os users cujas instâncias não existem mais
    const { rows: orphaned } = await dbQuery<{ id: string; nome: string }>(
      `SELECT id, nome FROM users 
       WHERE evolution_connected = true 
       AND (evolution_instance_name IS NULL OR evolution_instance_name = '')
       AND is_active = true`
    );
    
    if (orphaned.length > 0) {
      await dbQuery(
        `UPDATE users SET evolution_connected = false, updated_at = NOW()
         WHERE evolution_connected = true 
         AND (evolution_instance_name IS NULL OR evolution_instance_name = '')`
      );
      updated += orphaned.length;
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      evolutionInstances: instances.length,
      usersWithInstance: users.length,
      connected: nowConnected,
      disconnected: nowDisconnected,
      updated,
      orphanedCleaned: orphaned.length,
      changes: changes.slice(0, 50), // Limitar a 50 para não ficar enorme
    };

    console.log(`[WhatsApp Sync] Done: ${nowConnected} connected, ${nowDisconnected} disconnected, ${updated} updated`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[WhatsApp Sync] Error:", error);
    return NextResponse.json(
      { error: "Erro no sync: " + error.message },
      { status: 500 }
    );
  }
}
