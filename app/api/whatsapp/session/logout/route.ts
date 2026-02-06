/**
 * API: Desconectar Sessão WhatsApp (via Evolution API)
 *
 * POST /api/whatsapp/session/logout
 *
 * Desconecta a instância WhatsApp do corretor e limpa o status no banco.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace, withTenant } from "@/lib/tenant-context";
import { dbQuery } from "@/lib/db";
import { logoutInstance, deleteInstance } from "@/lib/evolution-api";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (user as any).id;

    // Buscar workspace do usuário
    const workspace = await findUserWorkspace(user);

    // Buscar instância do usuário (query sem workspace_id - users table)
    const { rows } = await dbQuery<{ evolution_instance_name: string | null }>(
      `SELECT evolution_instance_name FROM users WHERE id = $1`,
      [userId]
    );

    const instanceName = rows[0]?.evolution_instance_name;

    if (!instanceName) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma instância WhatsApp configurada"
      });
    }

    // Tentar desconectar a instância na Evolution API
    try {
      await logoutInstance(instanceName);
      console.log(`[WhatsApp Logout] Instância ${instanceName} desconectada`);
    } catch (error: any) {
      console.error(`[WhatsApp Logout] Erro ao desconectar ${instanceName}:`, error);
      // Continuar mesmo se falhar (pode já estar desconectada)
    }

    // Deletar a instância do Evolution API para liberar recursos
    try {
      await deleteInstance(instanceName);
      console.log(`[WhatsApp Logout] Instância ${instanceName} deletada do Evolution API`);
    } catch (deleteError: any) {
      // Log warning mas não bloqueia logout do usuário
      console.warn(`[WhatsApp Logout] Falha ao deletar instância ${instanceName}:`, deleteError.message);
    }

    if (workspace) {
      return await withTenant(workspace.id, async (client) => {
        // Atualizar status do usuário
        await client.query(
          `UPDATE users SET evolution_connected = false, updated_at = NOW() WHERE id = $1`,
          [userId]
        );

        // Atualizar workspace
        await client.query(
          `UPDATE workspaces SET evolution_connected = false, updated_at = NOW() WHERE id = $1`,
          [workspace.id]
        );

        return NextResponse.json({
          success: true,
          message: "WhatsApp desconectado com sucesso"
        });
      });
    }

    // Fallback: workspace não encontrado, atualizar apenas o usuário
    await dbQuery(
      `UPDATE users SET evolution_connected = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      message: "WhatsApp desconectado com sucesso"
    });

  } catch (error: any) {
    console.error("WhatsApp logout error:", error);
    return NextResponse.json(
      { error: "Erro ao desconectar: " + (error.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
