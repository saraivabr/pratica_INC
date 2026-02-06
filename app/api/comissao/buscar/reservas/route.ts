/**
 * API: Buscar Reservas do CV CRM
 *
 * GET /api/comissao/buscar/reservas - Busca reservas para importar comissão
 * Busca em cvcrm_reservas com dados relacionados (cliente, empreendimento, corretor)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

/**
 * GET - Buscar reservas por diversos critérios
 * Query params:
 *   - busca: termo de busca
 *   - tipo: 'cliente' | 'codigo' | 'unidade' | 'cpf' (default: busca em todos)
 *   - limit: número máximo de resultados (default: 20, max: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { searchParams } = new URL(request.url);
    const busca = searchParams.get("busca");
    const tipo = searchParams.get("tipo"); // cliente, codigo, unidade, cpf
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    if (!busca || busca.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Digite pelo menos 2 caracteres para buscar",
      });
    }

    const buscaLike = `%${busca}%`;

    return await withTenant(ctx.workspaceId, async (client) => {
      const params: any[] = [];
      let paramIndex = 1;

      // Monta a condição WHERE baseada no tipo de busca
      let whereClause = "";

      if (tipo === "codigo") {
        whereClause = `r.numero_reserva ILIKE $${paramIndex}`;
        params.push(buscaLike);
        paramIndex++;
      } else if (tipo === "cliente") {
        whereClause = `r.cliente_principal_nome ILIKE $${paramIndex}`;
        params.push(buscaLike);
        paramIndex++;
      } else if (tipo === "cpf") {
        // Remove caracteres não numéricos para buscar CPF
        const cpfLimpo = busca.replace(/\D/g, "");
        whereClause = `p.cpf ILIKE $${paramIndex}`;
        params.push(`%${cpfLimpo}%`);
        paramIndex++;
      } else if (tipo === "unidade") {
        whereClause = `(r.unidade_nome ILIKE $${paramIndex} OR u.codigo ILIKE $${paramIndex})`;
        params.push(buscaLike);
        paramIndex++;
      } else {
        // Busca em todos os campos
        whereClause = `(
          r.numero_reserva ILIKE $${paramIndex}
          OR r.cliente_principal_nome ILIKE $${paramIndex}
          OR r.unidade_nome ILIKE $${paramIndex}
          OR r.empreendimento_nome ILIKE $${paramIndex}
          OR u.codigo ILIKE $${paramIndex}
          OR p.cpf ILIKE $${paramIndex}
        )`;
        params.push(buscaLike);
        paramIndex++;
      }

      // Query principal com JOINs para pegar dados relacionados
      const query = `
        SELECT
          r.cvcrm_id as reserva_id,
          COALESCE(r.numero_reserva, CAST(r.cvcrm_id AS VARCHAR)) as codigo,
          r.empreendimento_id,
          COALESCE(r.empreendimento_nome, e.nome, 'N/A') as empreendimento_nome,
          r.unidade_id,
          COALESCE(r.unidade_nome, u.codigo, 'N/A') as unidade_codigo,
          r.cliente_principal_id as cliente_id,
          COALESCE(r.cliente_principal_nome, p.nome, 'N/A') as cliente_nome,
          COALESCE(p.cpf, '') as cliente_cpf,
          COALESCE(r.valor_venda, r.valor_reserva, 0) as valor_total,
          COALESCE(r.data_venda, r.data_reserva)::text as data_reserva,
          r.corretor_id,
          COALESCE(r.corretor_nome, c.nome, 'N/A') as corretor_nome,
          COALESCE(r.status, 'N/A') as situacao
        FROM cvcrm_reservas r
        LEFT JOIN cvcrm_pessoas p ON p.cvcrm_id = r.cliente_principal_id
        LEFT JOIN cvcrm_empreendimentos e ON e.cvcrm_id = r.empreendimento_id
        LEFT JOIN cvcrm_unidades u ON u.cvcrm_id = r.unidade_id
        LEFT JOIN cvcrm_corretores c ON c.cvcrm_id = r.corretor_id
        WHERE ${whereClause}
        ORDER BY r.data_reserva DESC NULLS LAST, r.cvcrm_id DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit);

      const { rows } = await client.query(query, params);

      // Formata os dados de resposta
      const reservas = rows.map((row: any) => ({
        reserva_id: row.reserva_id,
        codigo: row.codigo,
        empreendimento_id: row.empreendimento_id,
        empreendimento_nome: row.empreendimento_nome,
        unidade_id: row.unidade_id,
        unidade_codigo: row.unidade_codigo,
        cliente_id: row.cliente_id,
        cliente_nome: row.cliente_nome,
        cliente_cpf: row.cliente_cpf,
        valor_total: parseFloat(row.valor_total) || 0,
        data_reserva: row.data_reserva,
        corretor_id: row.corretor_id,
        corretor_nome: row.corretor_nome,
        situacao: row.situacao,
      }));

      return NextResponse.json({
        success: true,
        data: reservas,
      });
    });
  } catch (error: any) {
    console.error("Erro ao buscar reservas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
