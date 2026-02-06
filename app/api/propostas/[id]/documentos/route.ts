/**
 * API: Documentos de Proposta
 *
 * GET /api/propostas/[id]/documentos - Listar documentos
 * POST /api/propostas/[id]/documentos - Upload de documento (FormData)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { writeFile, mkdir } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

const UPLOAD_DIR = "/var/www/pratica/uploads/propostas";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".docx"];

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar acesso à proposta
      const { rows: proposta } = await client.query(
        `SELECT id FROM propostas WHERE id = $1 AND workspace_id = $2`,
        [id, ctx.workspaceId]
      );

      if (proposta.length === 0) {
        return NextResponse.json(
          { success: false, error: "Proposta não encontrada" },
          { status: 404 }
        );
      }

      const { rows } = await client.query(
        `SELECT id, categoria, nome_original, mime_type, tamanho, created_at
         FROM proposta_documentos WHERE proposta_id = $1 ORDER BY created_at`,
        [id]
      );

      return NextResponse.json({ success: true, data: rows });
    });
  } catch (error: any) {
    console.error("Erro ao listar documentos:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar acesso à proposta
      const { rows: proposta } = await client.query(
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

      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const categoria = (formData.get("categoria") as string) || "outro";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "Arquivo é obrigatório" },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: "Arquivo excede o limite de 10MB" },
          { status: 400 }
        );
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { success: false, error: `Tipo de arquivo não permitido. Use: ${ALLOWED_EXTENSIONS.join(", ")}` },
          { status: 400 }
        );
      }

      // Criar diretório se não existir
      const dirPath = path.join(UPLOAD_DIR, id);
      await mkdir(dirPath, { recursive: true });

      // Salvar arquivo com nome UUID
      const nomeArquivo = `${randomUUID()}${ext}`;
      const filePath = path.join(dirPath, nomeArquivo);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const caminho = `propostas/${id}/${nomeArquivo}`;

      const { rows } = await client.query(
        `INSERT INTO proposta_documentos (
          proposta_id, categoria, nome_arquivo, nome_original, mime_type, tamanho, caminho, uploaded_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, categoria, nome_original, mime_type, tamanho, created_at`,
        [id, categoria, nomeArquivo, file.name, file.type, file.size, caminho, userId]
      );

      return NextResponse.json(
        { success: true, data: rows[0], message: "Documento enviado com sucesso" },
        { status: 201 }
      );
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
