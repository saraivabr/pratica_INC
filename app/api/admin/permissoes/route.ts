import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  getUsersWithPermissions,
  setUserFeatureOverride,
  removeUserFeatureOverride,
  updateUserHierarquia,
  updateHierarquiaFeature,
  isMaster,
  isDiretorOrAbove,
} from "@/lib/permissions";
import { dbQuery } from "@/lib/db";

// GET - Listar usuários com suas permissões
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas master e diretor podem ver permissões
    const canView = await isDiretorOrAbove(user.id);
    if (!canView) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hierarquiaId = searchParams.get("hierarquia_id");
    const imobiliariaId = searchParams.get("imobiliaria_id");
    const search = searchParams.get("search");

    const users = await getUsersWithPermissions({
      hierarquiaId: hierarquiaId ? parseInt(hierarquiaId) : undefined,
      imobiliariaId: imobiliariaId || undefined,
      search: search || undefined,
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT - Atualizar permissão de um usuário
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas master pode modificar permissões
    const canModify = await isMaster(user.id);
    if (!canModify) {
      return NextResponse.json(
        { error: "Apenas o master pode modificar permissões" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, targetUserId, featureId, hierarquiaId, enabled } = body;

    switch (action) {
      case "set_user_feature": {
        // Define override de feature para um usuário
        if (!targetUserId || !featureId || enabled === undefined) {
          return NextResponse.json(
            { error: "targetUserId, featureId e enabled são obrigatórios" },
            { status: 400 }
          );
        }
        await setUserFeatureOverride(targetUserId, featureId, enabled, user.id);
        return NextResponse.json({ success: true, message: "Permissão atualizada" });
      }

      case "remove_user_feature": {
        // Remove override (volta ao padrão do nível)
        if (!targetUserId || !featureId) {
          return NextResponse.json(
            { error: "targetUserId e featureId são obrigatórios" },
            { status: 400 }
          );
        }
        await removeUserFeatureOverride(targetUserId, featureId);
        return NextResponse.json({ success: true, message: "Override removido" });
      }

      case "set_user_hierarquia": {
        // Muda a hierarquia de um usuário
        if (!targetUserId || !hierarquiaId) {
          return NextResponse.json(
            { error: "targetUserId e hierarquiaId são obrigatórios" },
            { status: 400 }
          );
        }

        // Não permite mudar a própria hierarquia
        if (targetUserId === user.id) {
          return NextResponse.json(
            { error: "Você não pode alterar sua própria hierarquia" },
            { status: 400 }
          );
        }

        // Verifica se a hierarquia existe
        const { rows: hierarquias } = await dbQuery(
          `SELECT id FROM hierarquias WHERE id = $1`,
          [hierarquiaId]
        );
        if (hierarquias.length === 0) {
          return NextResponse.json(
            { error: "Hierarquia não encontrada" },
            { status: 404 }
          );
        }

        await updateUserHierarquia(targetUserId, hierarquiaId);
        return NextResponse.json({ success: true, message: "Hierarquia atualizada" });
      }

      case "set_hierarquia_feature": {
        // Atualiza permissão padrão de uma hierarquia
        if (!hierarquiaId || !featureId || enabled === undefined) {
          return NextResponse.json(
            { error: "hierarquiaId, featureId e enabled são obrigatórios" },
            { status: 400 }
          );
        }

        // Não permite alterar permissões do master
        const { rows: hierarquia } = await dbQuery(
          `SELECT slug FROM hierarquias WHERE id = $1`,
          [hierarquiaId]
        );
        if (hierarquia[0]?.slug === "master") {
          return NextResponse.json(
            { error: "Não é possível alterar permissões do nível master" },
            { status: 400 }
          );
        }

        await updateHierarquiaFeature(hierarquiaId, featureId, enabled);
        return NextResponse.json({ success: true, message: "Permissão da hierarquia atualizada" });
      }

      default:
        return NextResponse.json(
          { error: "Ação inválida. Use: set_user_feature, remove_user_feature, set_user_hierarquia ou set_hierarquia_feature" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error updating permissions:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
