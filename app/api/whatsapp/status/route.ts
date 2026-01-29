/**
 * API: Status WhatsApp em Lote
 * 
 * GET /api/whatsapp/status
 * 
 * Retorna status de conexão WhatsApp baseado no role:
 * - Corretor: só o seu status
 * - Gerente: status da equipe (users com gerente_id = user.id)
 * - Admin: todos os corretores
 * 
 * Query params:
 * - ?sync=true — força sync com Evolution API (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { dbQuery } from "@/lib/db";
import { fetchInstances } from "@/lib/evolution-api";

export const runtime = "nodejs";

interface UserStatus {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  role: string;
  evolution_instance_name: string | null;
  evolution_connected: boolean;
  gerente_id: string | null;
  gerente_nome: string | null;
  imobiliaria_id: number | null;
  last_login: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (user as any).id;
    const userRole = (user as any).role;
    const syncParam = request.nextUrl.searchParams.get("sync");

    // Se admin pediu sync, atualizar status real da Evolution API
    if (syncParam === "true" && userRole === "admin") {
      await syncEvolutionStatus();
    }

    let query: string;
    let params: any[];

    if (userRole === "admin") {
      // Admin vê todos
      query = `
        SELECT 
          u.id, u.nome, u.email, u.telefone, u.role,
          u.evolution_instance_name, u.evolution_connected,
          u.gerente_id, u.imobiliaria_id, u.last_login,
          g.nome as gerente_nome
        FROM users u
        LEFT JOIN users g ON u.gerente_id = g.id
        WHERE u.is_active = true AND u.role IN ('corretor', 'gerente')
        ORDER BY u.evolution_connected DESC, u.nome ASC
      `;
      params = [];
    } else if (userRole === "gerente") {
      // Gerente vê só sua equipe
      query = `
        SELECT 
          u.id, u.nome, u.email, u.telefone, u.role,
          u.evolution_instance_name, u.evolution_connected,
          u.gerente_id, u.imobiliaria_id, u.last_login,
          NULL as gerente_nome
        FROM users u
        WHERE u.is_active = true AND u.gerente_id = $1
        ORDER BY u.evolution_connected DESC, u.nome ASC
      `;
      params = [userId];
    } else {
      // Corretor vê só o seu
      query = `
        SELECT 
          u.id, u.nome, u.email, u.telefone, u.role,
          u.evolution_instance_name, u.evolution_connected,
          u.gerente_id, u.imobiliaria_id, u.last_login,
          g.nome as gerente_nome
        FROM users u
        LEFT JOIN users g ON u.gerente_id = g.id
        WHERE u.id = $1
      `;
      params = [userId];
    }

    const { rows } = await dbQuery<UserStatus>(query, params);

    // Calcular estatísticas
    const total = rows.length;
    const connected = rows.filter(r => r.evolution_connected).length;
    const disconnected = total - connected;
    const withInstance = rows.filter(r => r.evolution_instance_name).length;

    return NextResponse.json({
      success: true,
      role: userRole,
      stats: {
        total,
        connected,
        disconnected,
        withInstance,
        percentConnected: total > 0 ? Math.round((connected / total) * 100) : 0,
      },
      users: rows.map(r => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        telefone: r.telefone,
        role: r.role,
        instanceName: r.evolution_instance_name,
        connected: r.evolution_connected,
        gerenteId: r.gerente_id,
        gerenteNome: r.gerente_nome,
        imobiliariaId: r.imobiliaria_id,
        lastLogin: r.last_login,
      })),
    });
  } catch (error: any) {
    console.error("[WhatsApp Status API] Error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar status: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * Sincroniza status real das instâncias da Evolution API com o banco
 */
async function syncEvolutionStatus() {
  try {
    console.log("[WhatsApp Sync] Starting status sync...");
    
    // Buscar todas as instâncias da Evolution API
    const instances = await fetchInstances();
    
    // Mapear instance name -> connection status
    const instanceStatusMap = new Map<string, boolean>();
    for (const inst of instances) {
      const name = inst.name || inst.instance?.instanceName;
      if (name) {
        instanceStatusMap.set(name, inst.connectionStatus === 'open');
      }
    }

    // Buscar todos os users com instância configurada
    const { rows: users } = await dbQuery<{ id: string; evolution_instance_name: string; evolution_connected: boolean }>(
      `SELECT id, evolution_instance_name, evolution_connected FROM users WHERE evolution_instance_name IS NOT NULL`
    );

    let updated = 0;
    for (const u of users) {
      const realStatus = instanceStatusMap.get(u.evolution_instance_name);
      const isConnected = realStatus === true;
      
      // Só atualizar se mudou
      if (u.evolution_connected !== isConnected) {
        await dbQuery(
          `UPDATE users SET evolution_connected = $1, updated_at = NOW() WHERE id = $2`,
          [isConnected, u.id]
        );
        updated++;
      }
    }

    console.log(`[WhatsApp Sync] Synced ${users.length} users, ${updated} updated`);
    return { synced: users.length, updated };
  } catch (error: any) {
    console.error("[WhatsApp Sync] Error:", error);
    throw error;
  }
}
