/**
 * API: Gerar PDF de Comissão
 * POST /api/comissao/pdf - Gera PDF analítico da comissão
 */

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ComissaoPDFTemplate } from "@/components/pdf-templates/comissao-template";
import { requireWorkspaceContext } from "@/lib/api-helpers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const data = await request.json();

    // Gerar PDF
    const pdfBuffer = await renderToBuffer(
      createElement(ComissaoPDFTemplate, { data }) as any
    );

    // Retornar como blob
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="comissao-${data.nomeProduto || "venda"}-${Date.now()}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF de comissão:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}
