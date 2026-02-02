import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import rateLimiter, { RateLimitConfigs } from '@/lib/rate-limiter';

export interface Material {
  tipo: "tabela" | "ficha_tecnica" | "book" | "apresentacao" | "outro";
  tipoNome: string;
  nomeOriginal: string;
  arquivo: string;
  url: string;
  tamanho: number;
  dataAtualizacao: string;
}

export interface EmpreendimentoMateriais {
  id: number;
  nome: string;
  materiais: Material[];
}

let materiaisCache: Record<string, EmpreendimentoMateriais> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

function loadMateriais(): Record<string, EmpreendimentoMateriais> {
  const now = Date.now();
  if (materiaisCache && now - cacheTimestamp < CACHE_DURATION) {
    return materiaisCache;
  }

  try {
    const filePath = path.join(process.cwd(), "public/materiais/index.json");
    const data = fs.readFileSync(filePath, "utf-8");
    materiaisCache = JSON.parse(data);
    cacheTimestamp = now;
    return materiaisCache!;
  } catch (error) {
    console.error("Erro ao carregar materiais:", error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = await rateLimiter.check(`public:${clientIp}`, RateLimitConfigs.PUBLIC_API);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
      { status: 429 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const empreendimentoId = searchParams.get("empreendimentoId");

  const materiais = loadMateriais();

  if (empreendimentoId) {
    const empMateriais = materiais[empreendimentoId];
    if (!empMateriais) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Nenhum material encontrado para este empreendimento",
      });
    }
    return NextResponse.json({
      success: true,
      data: empMateriais,
    });
  }

  // Retornar todos os materiais
  return NextResponse.json({
    success: true,
    data: Object.values(materiais),
    total: Object.keys(materiais).length,
  });
}
