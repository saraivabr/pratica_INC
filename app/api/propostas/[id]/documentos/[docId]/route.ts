/**
 * API: Documento individual de Proposta
 *
 * GET /api/propostas/[id]/documentos/[docId] - Download do documento
 * DELETE /api/propostas/[id]/documentos/[docId] - Remover documento
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { readFile, unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = "/var/www/pratica/uploads/propostas";

interface Params {
  params: Promise<{ id: string; docId: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id, docId } = await params;

    // Verificar acesso
    const { rows: proposta } = await dbQuery(
      `SELECT id FROM propostas WHERE id = $1 AND workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (proposta.length === 0) {
      return NextResponse.json(
        { success: false, error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    const { rows: docs } = await dbQuery(
      `SELECT * FROM proposta_documentos WHERE id = $1 AND proposta_id = $2`,
      [docId, id]
    );

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    const doc = docs[0];
    const filePath = path.join(UPLOAD_DIR, id, doc.nome_arquivo);

    try {
      const fileBuffer = await readFile(filePath);
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": doc.mime_type || "application/octet-stream",
          "Content-Disposition": `inline; filename="${doc.nome_original}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Arquivo não encontrado no disco" },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error("Erro ao baixar documento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id, docId } = await params;

    // Verificar proposta e permissão
    const { rows: proposta } = await dbQuery(
      `SELECT id, corretor_id, status FROM propostas WHERE id = $1 AND workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (proposta.length === 0) {
      return NextResponse.json(
        { success: false, error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    const userRole = (ctx.user as any).role || "";
    const userId = (ctx.user as any).id;
    if (userRole === "corretor" && proposta[0].corretor_id !== userId) {
      return NextResponse.json(
        { success: false, error: "Sem permissão" },
        { status: 403 }
      );
    }

    const { rows: docs } = await dbQuery(
      `SELECT * FROM proposta_documentos WHERE id = $1 AND proposta_id = $2`,
      [docId, id]
    );

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    // Deletar arquivo do disco
    const filePath = path.join(UPLOAD_DIR, id, docs[0].nome_arquivo);
    try {
      await unlink(filePath);
    } catch {
      // Arquivo pode já não existir
    }

    // Deletar registro
    await dbQuery(`DELETE FROM proposta_documentos WHERE id = $1`, [docId]);

    return NextResponse.json({
      success: true,
      message: "Documento removido com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao remover documento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
