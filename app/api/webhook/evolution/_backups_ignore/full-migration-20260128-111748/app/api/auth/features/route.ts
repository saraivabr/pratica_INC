import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getUserFeatures, canAccessFeature } from "@/lib/permissions";

// GET - Retorna as features do usuário logado
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const featureSlug = searchParams.get("feature");

    // Se passar uma feature específica, verifica acesso
    if (featureSlug) {
      const access = await canAccessFeature(user.id, featureSlug);
      return NextResponse.json({
        feature: featureSlug,
        ...access,
      });
    }

    // Caso contrário, retorna todas as features do usuário
    const features = await getUserFeatures(user.id);

    return NextResponse.json({
      user_id: user.id,
      hierarquia: user.hierarquia,
      features,
    });
  } catch (error) {
    console.error("Error fetching user features:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
