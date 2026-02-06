/**
 * API: Proposta individual
 *
 * GET /api/propostas/[id] - Detalhe com parcelas e documentos
 * PATCH /api/propostas/[id] - Editar proposta (só rascunho)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    return await withTenant(ctx.workspaceId, async (client) => {
      const conditions: string[] = [`p.id = $1`, `p.workspace_id = $2`];
      const queryParams: any[] = [id, ctx.workspaceId];

      // Corretor só vê as próprias
      const userRole = (ctx.user as any).role || "";
      if (userRole === "corretor") {
        conditions.push(`p.corretor_id = $3`);
        queryParams.push((ctx.user as any).id);
      }

      const { rows } = await client.query(
        `SELECT p.*, u.nome as corretor_nome, ua.nome as aprovador_nome
         FROM propostas p
         LEFT JOIN users u ON u.id = p.corretor_id
         LEFT JOIN users ua ON ua.id = p.aprovado_por
         WHERE ${conditions.join(" AND ")}`,
        queryParams
      );

      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Proposta não encontrada" },
          { status: 404 }
        );
      }

      const proposta = rows[0];

      const [{ rows: parcelas }, { rows: documentos }] = await Promise.all([
        client.query(
          `SELECT * FROM proposta_parcelas WHERE proposta_id = $1 ORDER BY ordem, created_at`,
          [id]
        ),
        client.query(
          `SELECT id, proposta_id, categoria, nome_original, mime_type, tamanho, created_at
           FROM proposta_documentos WHERE proposta_id = $1 ORDER BY created_at`,
          [id]
        ),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          ...proposta,
          valor_total: proposta.valor_total ? parseFloat(proposta.valor_total) : 0,
          valor_ato: proposta.valor_ato ? parseFloat(proposta.valor_ato) : 0,
          valor_tabela: proposta.valor_tabela ? parseFloat(proposta.valor_tabela) : null,
          parcelas: parcelas.map((p: any) => ({
            ...p,
            valor: p.valor ? parseFloat(p.valor) : 0,
            valor_parcela: p.valor_parcela ? parseFloat(p.valor_parcela) : null,
          })),
          documentos,
        },
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se proposta existe e está em rascunho
      const { rows: existing } = await client.query(
        `SELECT * FROM propostas WHERE id = $1 AND workspace_id = $2`,
        [id, ctx.workspaceId]
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { success: false, error: "Proposta não encontrada" },
          { status: 404 }
        );
      }

      const proposta = existing[0];

      // Só corretor dono ou admin/gerente pode editar
      const userRole = (ctx.user as any).role || "";
      const userId = (ctx.user as any).id;
      if (userRole === "corretor" && proposta.corretor_id !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para editar esta proposta" },
          { status: 403 }
        );
      }

      if (proposta.status !== "rascunho") {
        return NextResponse.json(
          { success: false, error: "Apenas propostas em rascunho podem ser editadas" },
          { status: 400 }
        );
      }

      const body = await request.json();
      const {
        empreendimento_id, empreendimento_nome,
        unidade_id, unidade_codigo, unidade_bloco, unidade_andar, valor_tabela,
        cliente_nome, cliente_cpf, cliente_telefone, cliente_email,
        valor_total, valor_ato, observacoes,
        parcelas,
      } = body;

      await client.query("BEGIN");

      try {
        const { rows: updated } = await client.query(
          `UPDATE propostas SET
            empreendimento_id = COALESCE($1, empreendimento_id),
            empreendimento_nome = COALESCE($2, empreendimento_nome),
            unidade_id = COALESCE($3, unidade_id),
            unidade_codigo = $4,
            unidade_bloco = $5,
            unidade_andar = $6,
            valor_tabela = $7,
            cliente_nome = COALESCE($8, cliente_nome),
            cliente_cpf = $9,
            cliente_telefone = $10,
            cliente_email = $11,
            valor_total = COALESCE($12, valor_total),
            valor_ato = $13,
            observacoes = $14,
            updated_at = NOW()
          WHERE id = $15
          RETURNING *`,
          [
            empreendimento_id, empreendimento_nome,
            unidade_id, unidade_codigo ?? proposta.unidade_codigo,
            unidade_bloco ?? proposta.unidade_bloco,
            unidade_andar ?? proposta.unidade_andar,
            valor_tabela ?? proposta.valor_tabela,
            cliente_nome, cliente_cpf ?? proposta.cliente_cpf,
            cliente_telefone ?? proposta.cliente_telefone,
            cliente_email ?? proposta.cliente_email,
            valor_total, valor_ato ?? proposta.valor_ato,
            observacoes ?? proposta.observacoes,
            id,
          ]
        );

        // Se parcelas foram enviadas, substituir todas
        if (parcelas && Array.isArray(parcelas)) {
          await client.query(`DELETE FROM proposta_parcelas WHERE proposta_id = $1`, [id]);

          for (let i = 0; i < parcelas.length; i++) {
            const p = parcelas[i];
            await client.query(
              `INSERT INTO proposta_parcelas (
                proposta_id, tipo, descricao, valor, data_vencimento,
                quantidade, valor_parcela, ordem
              ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
              [
                id, p.tipo, p.descricao || null, p.valor,
                p.data_vencimento || null, p.quantidade || 1,
                p.valor_parcela || null, p.ordem ?? i,
              ]
            );
          }
        }

        await client.query("COMMIT");

        return NextResponse.json({
          success: true,
          data: updated[0],
          message: "Proposta atualizada com sucesso",
        });
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  } catch (error: any) {
    console.error("Erro ao editar proposta:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno" },
      { status: 500 }
    );
  }
}
