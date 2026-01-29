import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import {
  getHierarquias,
  getFeatures,
  getHierarquiaFeatures,
  isDiretorOrAbove,
} from "@/lib/permissions";

// GET - Listar hierarquias e features
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Apenas diretor ou superior pode ver hierarquias
    const canView = await isDiretorOrAbove(user.id);
    if (!canView) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hierarquiaId = searchParams.get("hierarquia_id");

    // Se passar hierarquia_id, retorna as features dessa hierarquia
    if (hierarquiaId) {
      const features = await getHierarquiaFeatures(parseInt(hierarquiaId));
      return NextResponse.json({ features });
    }

    // Caso contrário, retorna todas as hierarquias e features
    const [hierarquias, features] = await Promise.all([
      getHierarquias(),
      getFeatures(),
    ]);

    // Buscar permissões padrão de cada hierarquia
    const hierarquiasComFeatures = await Promise.all(
      hierarquias.map(async (h) => {
        const hFeatures = await getHierarquiaFeatures(h.id);
        return {
          ...h,
          features: hFeatures,
        };
      })
    );

    return NextResponse.json({
      hierarquias: hierarquiasComFeatures,
      features,
    });
  } catch (error) {
    console.error("Error fetching hierarquias:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
