import { NextRequest, NextResponse } from "next/server";
import { empreendimentos } from "@/lib/empreendimentos-data";
import type { Empreendimento } from "@/lib/data";
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

function transformEmpreendimento(emp: typeof empreendimentos[0]): Empreendimento & { unidadesDisponiveis: number; latitude?: number; longitude?: number } {
  return {
    id: String(emp.id),
    nome: emp.nome,
    cidade: emp.cidade,
    bairro: emp.bairro,
    tipo: "apartamento", // Todos os empreendimentos da Pratica sao apartamentos
    construtora: "Pratica Incorporadora",
    previsaoEntrega: emp.entrega,
    descricao: emp.descricao,
    diferenciais: emp.diferenciais,
    imagemPrincipal: emp.imagem,
    imagens: emp.imagens,
    precoMinimo: emp.valorMin,
    precoMaximo: emp.valorMax,
    // Mapear unidades para o formato esperado pelo frontend
    unidades: emp.unidades.map(u => ({
      id: u.id,
      tipo: u.tipologia,
      status: u.status === 'disponivel' ? 'disponivel' as const :
              u.status === 'reservada' ? 'reservado' as const : 'vendido' as const,
      metragem: u.area,
      quartos: u.quartos,
      valor: u.valor,
      vagas: u.vagas || 1,
      andar: u.andar,
      final: u.numero,
    })),
    unidadesDisponiveis: emp.unidadesDisponiveis,
    // Campos extras para o card
    areaMin: emp.areaMin,
    areaMax: emp.areaMax,
    quartosMin: emp.dormitoriosMin,
    quartosMax: emp.dormitoriosMax,
  } as Empreendimento & { unidadesDisponiveis: number; latitude?: number; longitude?: number };
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await rateLimiter.check(`public:${clientIp}`, RateLimitConfigs.PUBLIC_API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const transformedEmpreendimentos = empreendimentos.map(transformEmpreendimento);

    return NextResponse.json({
      success: true,
      data: transformedEmpreendimentos,
      total: transformedEmpreendimentos.length,
      source: "static", // Indicar que os dados sao estaticos
    });
  } catch (error) {
    console.error("Erro ao buscar empreendimentos:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar dados dos empreendimentos" },
      { status: 500 }
    );
  }
}
