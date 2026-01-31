/**
 * API: Parcelamento de Comissao
 *
 * GET /api/intermediacao/vendas/:id/parcelar - Listar parcelas
 * POST /api/intermediacao/vendas/:id/parcelar - Criar parcelamento
 */

import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { validateRequest, VendaParcelarSchema } from "@/lib/validation-schemas";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET - Listar parcelas da venda
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Verificar se venda existe
    const { rows: vendaRows } = await dbQuery(
      `SELECT id, codigo, valor_comissao FROM im_vendas WHERE id = $1 AND workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    // Buscar parcelas agrupadas por beneficiario
    const { rows: parcelas } = await dbQuery(
      `SELECT
        p.id,
        p.numero,
        p.beneficiario_id,
        b.nome as beneficiario_nome,
        p.valor,
        p.data_vencimento,
        p.data_pagamento,
        p.status,
        p.created_at,
        (
          SELECT COALESCE(SUM(pg.valor), 0)
          FROM im_pagamentos pg
          WHERE pg.parcela_id = p.id
        ) as valor_pago
      FROM im_parcelas p
      LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
      WHERE p.venda_id = $1
      ORDER BY p.beneficiario_id, p.numero`,
      [id]
    );

    // Agrupar por beneficiario
    const parcelasPorBeneficiario: Record<string, any> = {};

    for (const parcela of parcelas) {
      const key = parcela.beneficiario_id;
      if (!parcelasPorBeneficiario[key]) {
        parcelasPorBeneficiario[key] = {
          beneficiario_id: parcela.beneficiario_id,
          beneficiario_nome: parcela.beneficiario_nome,
          parcelas: [],
          total_valor: 0,
          total_pago: 0,
        };
      }
      parcelasPorBeneficiario[key].parcelas.push(parcela);
      parcelasPorBeneficiario[key].total_valor += parseFloat(parcela.valor);
      parcelasPorBeneficiario[key].total_pago += parseFloat(parcela.valor_pago);
    }

    // Calcular resumo geral
    const totalParcelas = parcelas.length;
    const parcelasPagas = parcelas.filter(p => p.status === 'paga').length;
    const parcelasVencidas = parcelas.filter(p =>
      p.status === 'pendente' && new Date(p.data_vencimento) < new Date()
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        venda: vendaRows[0],
        por_beneficiario: Object.values(parcelasPorBeneficiario),
        parcelas,
        resumo: {
          total_parcelas: totalParcelas,
          parcelas_pagas: parcelasPagas,
          parcelas_pendentes: totalParcelas - parcelasPagas,
          parcelas_vencidas: parcelasVencidas,
          valor_total: parcelas.reduce((acc, p) => acc + parseFloat(p.valor), 0),
          valor_pago: parcelas.reduce((acc, p) => acc + parseFloat(p.valor_pago), 0),
        },
      },
    });
  } catch (error: any) {
    console.error("Erro ao listar parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Criar parcelamento
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda com distribuicoes
    const { rows: vendaRows } = await dbQuery(
      `SELECT v.*,
        (
          SELECT json_agg(json_build_object(
            'id', d.id,
            'beneficiario_id', d.beneficiario_id,
            'percentual', d.percentual,
            'valor', d.valor
          ))
          FROM im_distribuicao d
          WHERE d.venda_id = v.id
        ) as distribuicoes
      FROM im_vendas v
      WHERE v.id = $1 AND v.workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaRows[0];

    // Verificar se pode criar parcelas
    if (!['rascunho', 'em_processamento'].includes(venda.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Parcelamento nao pode ser criado. Status da venda: '${venda.status}'`
        },
        { status: 400 }
      );
    }

    // Verificar se tem distribuicoes
    if (!venda.distribuicoes || venda.distribuicoes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Venda precisa ter distribuicao de comissao antes de criar parcelas",
        },
        { status: 400 }
      );
    }

    // Verificar se ja existem parcelas
    const { rows: parcelasExistentes } = await dbQuery(
      `SELECT COUNT(*) as total FROM im_parcelas WHERE venda_id = $1`,
      [id]
    );

    if (parseInt(parcelasExistentes[0].total) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Venda ja possui parcelas. Exclua as parcelas existentes antes de criar novo parcelamento.",
        },
        { status: 400 }
      );
    }

    const validation = await validateRequest(request, VendaParcelarSchema);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Validar campos obrigatorios por tipo
    if (data.tipo === 'automatico' && !data.num_parcelas) {
      return NextResponse.json(
        {
          success: false,
          error: "Campo 'num_parcelas' e obrigatorio para parcelamento automatico",
        },
        { status: 400 }
      );
    }

    if (data.tipo === 'manual' && (!data.parcelas || data.parcelas.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: "Campo 'parcelas' e obrigatorio para parcelamento manual",
        },
        { status: 400 }
      );
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      const parcelasCriadas: any[] = [];

      if (data.tipo === 'automatico') {
        // Parcelamento automatico: dividir igualmente por beneficiario
        const numParcelas = data.num_parcelas!;
        const dataPrimeira = data.data_primeira_parcela
          ? new Date(data.data_primeira_parcela)
          : new Date();

        for (const dist of venda.distribuicoes) {
          const valorParcela = parseFloat(dist.valor) / numParcelas;

          for (let i = 0; i < numParcelas; i++) {
            const dataVencimento = new Date(dataPrimeira);
            dataVencimento.setMonth(dataVencimento.getMonth() + i);

            const { rows } = await dbQuery(
              `INSERT INTO im_parcelas (
                venda_id, beneficiario_id, numero, valor, data_vencimento, status
              ) VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING *`,
              [
                id,
                dist.beneficiario_id,
                i + 1,
                valorParcela,
                dataVencimento.toISOString().split('T')[0],
                'pendente',
              ]
            );

            parcelasCriadas.push(rows[0]);
          }
        }
      } else {
        // Parcelamento manual: usar valores e datas informados
        const parcelasPorBeneficiario: Record<string, number[]> = {};

        // Agrupar parcelas por beneficiario para validar somas
        for (const parcela of data.parcelas!) {
          if (!parcelasPorBeneficiario[parcela.beneficiario_id]) {
            parcelasPorBeneficiario[parcela.beneficiario_id] = [];
          }
          parcelasPorBeneficiario[parcela.beneficiario_id].push(parcela.valor);
        }

        // Validar soma das parcelas por beneficiario
        for (const dist of venda.distribuicoes) {
          const parcelasDobeneficiario = parcelasPorBeneficiario[dist.beneficiario_id] || [];
          const somaParcelas = parcelasDobeneficiario.reduce((acc, v) => acc + v, 0);
          const valorDistribuicao = parseFloat(dist.valor);

          if (Math.abs(somaParcelas - valorDistribuicao) > 0.01) {
            await dbQuery("ROLLBACK");
            return NextResponse.json(
              {
                success: false,
                error: `Soma das parcelas (${somaParcelas.toFixed(2)}) do beneficiario ${dist.beneficiario_id} nao corresponde ao valor da distribuicao (${valorDistribuicao.toFixed(2)})`,
              },
              { status: 400 }
            );
          }
        }

        // Criar parcelas manuais
        const numerosPorBeneficiario: Record<string, number> = {};

        for (const parcela of data.parcelas!) {
          if (!numerosPorBeneficiario[parcela.beneficiario_id]) {
            numerosPorBeneficiario[parcela.beneficiario_id] = 0;
          }
          numerosPorBeneficiario[parcela.beneficiario_id]++;

          const { rows } = await dbQuery(
            `INSERT INTO im_parcelas (
              venda_id, beneficiario_id, numero, valor, data_vencimento, status
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
              id,
              parcela.beneficiario_id,
              numerosPorBeneficiario[parcela.beneficiario_id],
              parcela.valor,
              parcela.data_vencimento,
              'pendente',
            ]
          );

          parcelasCriadas.push(rows[0]);
        }
      }

      // Registrar auditoria
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_novos, usuario_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'venda',
          id,
          'criacao_parcelamento',
          JSON.stringify({
            tipo: data.tipo,
            num_parcelas: parcelasCriadas.length,
            parcelas: parcelasCriadas.map(p => ({
              beneficiario_id: p.beneficiario_id,
              numero: p.numero,
              valor: p.valor,
              data_vencimento: p.data_vencimento,
            })),
          }),
          ctx.user.id,
        ]
      );

      await dbQuery("COMMIT");

      // Buscar parcelas com dados do beneficiario
      const { rows: parcelasCompletas } = await dbQuery(
        `SELECT
          p.*,
          b.nome as beneficiario_nome
        FROM im_parcelas p
        LEFT JOIN im_beneficiarios b ON b.id = p.beneficiario_id
        WHERE p.venda_id = $1
        ORDER BY p.beneficiario_id, p.numero`,
        [id]
      );

      return NextResponse.json({
        success: true,
        data: parcelasCompletas,
        message: `${parcelasCompletas.length} parcela(s) criada(s) com sucesso`,
      }, { status: 201 });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao criar parcelamento:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Excluir todas as parcelas da venda
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { id } = await params;

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    // Buscar venda
    const { rows: vendaRows } = await dbQuery(
      `SELECT * FROM im_vendas WHERE id = $1 AND workspace_id = $2`,
      [id, ctx.workspaceId]
    );

    if (vendaRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Venda nao encontrada" },
        { status: 404 }
      );
    }

    const venda = vendaRows[0];

    // Verificar se pode excluir parcelas
    if (!['rascunho', 'em_processamento'].includes(venda.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Parcelas nao podem ser excluidas. Status da venda: '${venda.status}'`
        },
        { status: 400 }
      );
    }

    // Verificar se existem pagamentos
    const { rows: pagamentos } = await dbQuery(
      `SELECT COUNT(*) as total
       FROM im_pagamentos pg
       JOIN im_parcelas p ON p.id = pg.parcela_id
       WHERE p.venda_id = $1`,
      [id]
    );

    if (parseInt(pagamentos[0].total) > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nao e possivel excluir parcelas que ja possuem pagamentos registrados",
        },
        { status: 400 }
      );
    }

    // Iniciar transacao
    await dbQuery("BEGIN");

    try {
      // Buscar parcelas para auditoria
      const { rows: parcelasAntigas } = await dbQuery(
        `SELECT * FROM im_parcelas WHERE venda_id = $1`,
        [id]
      );

      // Excluir parcelas
      await dbQuery(
        `DELETE FROM im_parcelas WHERE venda_id = $1`,
        [id]
      );

      // Registrar auditoria
      await dbQuery(
        `INSERT INTO im_auditoria (
          entidade, entidade_id, acao, dados_anteriores, usuario_id
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          'venda',
          id,
          'exclusao_parcelamento',
          JSON.stringify({
            parcelas: parcelasAntigas,
          }),
          ctx.user.id,
        ]
      );

      await dbQuery("COMMIT");

      return NextResponse.json({
        success: true,
        message: `${parcelasAntigas.length} parcela(s) excluida(s) com sucesso`,
      });

    } catch (error) {
      await dbQuery("ROLLBACK");
      throw error;
    }
  } catch (error: any) {
    console.error("Erro ao excluir parcelas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
