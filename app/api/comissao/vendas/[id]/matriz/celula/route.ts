/**
 * API: Editar Celula da Matriz de Comissoes
 *
 * PATCH /api/comissao/vendas/[id]/matriz/celula - Editar valor de uma celula especifica
 * POST /api/comissao/vendas/[id]/matriz/celula - Redistribuir valores mantendo total do beneficiario
 */

import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";
import { arredondarValor } from "@/lib/comissao/calculations";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PATCH - Editar valor de uma celula especifica da matriz
 * Recebe: { corretor_id, parcela_id, valor } ou { corretor_id, parcela_id, valor: null } para resetar
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // Verificar permissao
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { corretor_id, parcela_id, valor } = body;

    // Validar parametros obrigatorios
    if (!corretor_id || !parcela_id) {
      return NextResponse.json(
        { success: false, error: "corretor_id e parcela_id sao obrigatorios" },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe e pertence ao workspace
      const { rows: vendaRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (vendaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      const venda = vendaRows[0];

      // Verificar se venda pode ser editada
      if (venda.status === "cancelada" || venda.status === "enviada") {
        return NextResponse.json(
          { success: false, error: "Venda nao pode ser editada" },
          { status: 400 }
        );
      }

      // Validar se corretor existe na venda
      const { rows: corretorRows } = await client.query(
        `SELECT id FROM comissao_corretores
         WHERE id = $1 AND venda_id = $2`,
        [corretor_id, vendaId]
      );

      if (corretorRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Corretor nao encontrado nesta venda" },
          { status: 404 }
        );
      }

      // Validar se parcela existe na venda
      const { rows: parcelaRows } = await client.query(
        `SELECT id FROM comissao_parcelas
         WHERE id = $1 AND venda_id = $2`,
        [parcela_id, vendaId]
      );

      if (parcelaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Parcela nao encontrada nesta venda" },
          { status: 404 }
        );
      }

      // Verificar se celula existe na matriz
      const { rows: celulaRows } = await client.query(
        `SELECT * FROM comissao_matriz
         WHERE corretor_id = $1 AND parcela_id = $2 AND venda_id = $3`,
        [corretor_id, parcela_id, vendaId]
      );

      if (celulaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Celula nao encontrada na matriz. Calcule a matriz primeiro." },
          { status: 404 }
        );
      }

      let updatedCelula;

      if (valor === null || valor === undefined) {
        // Resetar valor manual
        const { rows } = await client.query(
          `UPDATE comissao_matriz
           SET valor_manual = NULL, editado_manualmente = FALSE
           WHERE corretor_id = $1 AND parcela_id = $2 AND venda_id = $3
           RETURNING *`,
          [corretor_id, parcela_id, vendaId]
        );
        updatedCelula = rows[0];
      } else {
        // Validar que valor e um numero valido
        const valorNumerico = parseFloat(valor);
        if (isNaN(valorNumerico) || valorNumerico < 0) {
          return NextResponse.json(
            { success: false, error: "Valor deve ser um numero valido e nao negativo" },
            { status: 400 }
          );
        }

        // Atualizar valor manual
        const { rows } = await client.query(
          `UPDATE comissao_matriz
           SET valor_manual = $1, editado_manualmente = TRUE
           WHERE corretor_id = $2 AND parcela_id = $3 AND venda_id = $4
           RETURNING *`,
          [arredondarValor(valorNumerico), corretor_id, parcela_id, vendaId]
        );
        updatedCelula = rows[0];
      }

      // Formatar resposta
      const celula = {
        ...updatedCelula,
        valor_calculado: parseFloat(updatedCelula.valor_calculado),
        valor_manual: updatedCelula.valor_manual ? parseFloat(updatedCelula.valor_manual) : null,
        valor_final: updatedCelula.valor_manual
          ? parseFloat(updatedCelula.valor_manual)
          : parseFloat(updatedCelula.valor_calculado),
      };

      return NextResponse.json({
        success: true,
        data: celula,
        message: valor === null ? "Valor resetado para o calculado automaticamente" : "Valor atualizado com sucesso",
      });
    });
  } catch (error: any) {
    console.error("Erro ao editar celula:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST - Redistribuir valores mantendo total do beneficiario
 * Recebe: { corretor_id, parcela_id, novo_valor }
 * Calcula diferenca e redistribui nas outras parcelas proporcionalmente
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    // Verificar permissao
    const allowedRoles = ["admin", "gerente"];
    if (!allowedRoles.includes((ctx.user as any).role || "")) {
      return NextResponse.json(
        { success: false, error: "Acesso negado." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const vendaId = parseInt(id);

    if (isNaN(vendaId)) {
      return NextResponse.json(
        { success: false, error: "ID invalido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { corretor_id, parcela_id, novo_valor } = body;

    // Validar parametros obrigatorios
    if (!corretor_id || !parcela_id || novo_valor === undefined || novo_valor === null) {
      return NextResponse.json(
        { success: false, error: "corretor_id, parcela_id e novo_valor sao obrigatorios" },
        { status: 400 }
      );
    }

    const novoValorNumerico = parseFloat(novo_valor);
    if (isNaN(novoValorNumerico) || novoValorNumerico < 0) {
      return NextResponse.json(
        { success: false, error: "novo_valor deve ser um numero valido e nao negativo" },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      // Verificar se venda existe e pertence ao workspace
      const { rows: vendaRows } = await client.query(
        `SELECT * FROM comissao_vendas
         WHERE id = $1 AND workspace_id = $2`,
        [vendaId, ctx.workspaceId]
      );

      if (vendaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Venda nao encontrada" },
          { status: 404 }
        );
      }

      const venda = vendaRows[0];

      // Verificar se venda pode ser editada
      if (venda.status === "cancelada" || venda.status === "enviada") {
        return NextResponse.json(
          { success: false, error: "Venda nao pode ser editada" },
          { status: 400 }
        );
      }

      // Validar se corretor existe na venda e buscar seus dados
      const { rows: corretorRows } = await client.query(
        `SELECT id, nome, valor_comissao FROM comissao_corretores
         WHERE id = $1 AND venda_id = $2`,
        [corretor_id, vendaId]
      );

      if (corretorRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Corretor nao encontrado nesta venda" },
          { status: 404 }
        );
      }

      const corretor = corretorRows[0];
      const totalComissaoCorretor = parseFloat(corretor.valor_comissao);

      // Validar se parcela existe na venda
      const { rows: parcelaRows } = await client.query(
        `SELECT id FROM comissao_parcelas
         WHERE id = $1 AND venda_id = $2`,
        [parcela_id, vendaId]
      );

      if (parcelaRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Parcela nao encontrada nesta venda" },
          { status: 404 }
        );
      }

      // Buscar todas as celulas do corretor na matriz
      const { rows: celulasCorretor } = await client.query(
        `SELECT m.*, p.numero as parcela_numero
         FROM comissao_matriz m
         JOIN comissao_parcelas p ON p.id = m.parcela_id
         WHERE m.corretor_id = $1 AND m.venda_id = $2
         ORDER BY p.numero`,
        [corretor_id, vendaId]
      );

      if (celulasCorretor.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nenhuma celula encontrada para este corretor. Calcule a matriz primeiro." },
          { status: 404 }
        );
      }

      // Calcular valor atual total (usando valor_final = valor_manual ou valor_calculado)
      const valorAtualTotal = celulasCorretor.reduce((acc: number, cel: any) => {
        const valorFinal = cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado);
        return acc + valorFinal;
      }, 0);

      // Encontrar celula atual que sera editada
      const celulaAtual = celulasCorretor.find((c: any) => c.parcela_id === parcela_id);
      if (!celulaAtual) {
        return NextResponse.json(
          { success: false, error: "Celula nao encontrada na matriz" },
          { status: 404 }
        );
      }

      const valorAtualCelula = celulaAtual.valor_manual !== null
        ? parseFloat(celulaAtual.valor_manual)
        : parseFloat(celulaAtual.valor_calculado);

      // Calcular diferenca
      const diferenca = novoValorNumerico - valorAtualCelula;

      // Se nao ha diferenca, nao precisa fazer nada
      if (Math.abs(diferenca) < 0.01) {
        return NextResponse.json({
          success: true,
          data: celulasCorretor.map((cel: any) => ({
            ...cel,
            valor_calculado: parseFloat(cel.valor_calculado),
            valor_manual: cel.valor_manual !== null ? parseFloat(cel.valor_manual) : null,
            valor_final: cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado),
          })),
          message: "Nenhuma alteracao necessaria",
        });
      }

      // Outras celulas (excluindo a editada)
      const outrasCelulas = celulasCorretor.filter((c: any) => c.parcela_id !== parcela_id);

      if (outrasCelulas.length === 0) {
        return NextResponse.json(
          { success: false, error: "Nao ha outras parcelas para redistribuir" },
          { status: 400 }
        );
      }

      // Calcular soma dos valores finais das outras celulas
      const somaOutrasCelulas = outrasCelulas.reduce((acc: number, cel: any) => {
        const valorFinal = cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado);
        return acc + valorFinal;
      }, 0);

      // Verificar se a redistribuicao e possivel (diferenca nao pode ser maior que soma das outras)
      if (diferenca > somaOutrasCelulas) {
        return NextResponse.json(
          {
            success: false,
            error: `Valor muito alto. O maximo possivel para esta parcela e ${arredondarValor(valorAtualCelula + somaOutrasCelulas)}`,
          },
          { status: 400 }
        );
      }

      // Iniciar transacao
      await client.query("BEGIN");

      try {
        // Atualizar celula editada
        await client.query(
          `UPDATE comissao_matriz
           SET valor_manual = $1, editado_manualmente = TRUE
           WHERE corretor_id = $2 AND parcela_id = $3 AND venda_id = $4`,
          [arredondarValor(novoValorNumerico), corretor_id, parcela_id, vendaId]
        );

        // Redistribuir diferenca nas outras celulas proporcionalmente
        for (const cel of outrasCelulas) {
          const valorFinalCel = cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado);
          const proporcao = valorFinalCel / somaOutrasCelulas;
          const ajuste = diferenca * proporcao;
          const novoValorCel = arredondarValor(valorFinalCel - ajuste);

          // Garantir que nao fique negativo
          const valorFinalAjustado = Math.max(0, novoValorCel);

          await client.query(
            `UPDATE comissao_matriz
             SET valor_manual = $1, editado_manualmente = TRUE
             WHERE corretor_id = $2 AND parcela_id = $3 AND venda_id = $4`,
            [valorFinalAjustado, corretor_id, cel.parcela_id, vendaId]
          );
        }

        await client.query("COMMIT");

        // Buscar celulas atualizadas
        const { rows: celulasAtualizadas } = await client.query(
          `SELECT m.*, p.numero as parcela_numero, p.descricao as parcela_descricao
           FROM comissao_matriz m
           JOIN comissao_parcelas p ON p.id = m.parcela_id
           WHERE m.corretor_id = $1 AND m.venda_id = $2
           ORDER BY p.numero`,
          [corretor_id, vendaId]
        );

        // Formatar resposta
        const linhaAtualizada = {
          corretor_id: corretor.id,
          corretor_nome: corretor.nome,
          corretor_comissao_total: totalComissaoCorretor,
          celulas: celulasAtualizadas.map((cel: any) => ({
            parcela_id: cel.parcela_id,
            parcela_numero: cel.parcela_numero,
            parcela_descricao: cel.parcela_descricao,
            valor_calculado: parseFloat(cel.valor_calculado),
            valor_manual: cel.valor_manual !== null ? parseFloat(cel.valor_manual) : null,
            valor_final: cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado),
            editado_manualmente: cel.editado_manualmente,
          })),
          total: arredondarValor(
            celulasAtualizadas.reduce((acc: number, cel: any) => {
              const vf = cel.valor_manual !== null ? parseFloat(cel.valor_manual) : parseFloat(cel.valor_calculado);
              return acc + vf;
            }, 0)
          ),
        };

        return NextResponse.json({
          success: true,
          data: linhaAtualizada,
          message: "Valores redistribuidos com sucesso",
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  } catch (error: any) {
    console.error("Erro ao redistribuir valores:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
