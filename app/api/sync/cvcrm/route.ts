import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from '@/lib/rate-limit-helper';
import {
  getEmpreendimentosCVCRM,
  getUnidadesCVCRM,
  getUnidadesSituacaoCVCRM,
  getSeriesCVCRM,
  getCorretoresCVCRM,
  getLeadsCVCRM,
} from "@/lib/cvcrm-client";
import { saveSnapshot } from "./save";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimited = await applyRateLimit(request as NextRequest, 'SYNC');
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(request.url);
  const leadsLimit = Number(searchParams.get("leadsLimit") || 200);

  const result: Record<string, any> = {
    success: true,
    fetchedAt: new Date().toISOString(),
    summary: {},
    data: {},
    errors: {},
  };

  // Helper to wrap each fetch and capture errors sem quebrar a resposta total
  const safeFetch = async (key: string, fn: () => Promise<any>) => {
    try {
      const data = await fn();
      result.data[key] = data;
      const arr =
        Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.data)
          ? (data as any).data
          : Array.isArray((data as any)?.registros)
          ? (data as any).registros
          : Array.isArray((data as any)?.leads)
          ? (data as any).leads
          : Array.isArray((data as any)?.unidades)
          ? (data as any).unidades
          : [];
      result.summary[key] = Array.isArray(arr) ? arr.length : 0;
    } catch (error) {
      console.error(`[CVCRM Sync] erro em ${key}:`, error);
      result.errors[key] =
        error instanceof Error ? error.message : "Erro desconhecido";
      result.success = false;
    }
  };

  await Promise.all([
    safeFetch("empreendimentos", () => getEmpreendimentosCVCRM()),
    safeFetch("unidades", () => getUnidadesCVCRM()),
    safeFetch("unidadesSituacao", () => getUnidadesSituacaoCVCRM()),
    safeFetch("series", () => getSeriesCVCRM()),
    safeFetch("corretores", () => getCorretoresCVCRM()),
    safeFetch("leads", () => getLeadsCVCRM({ limit: leadsLimit, offset: 0 })),
  ]);

  // Persistir snapshot para uso offline
  await saveSnapshot(result);

  return NextResponse.json(result);
}
