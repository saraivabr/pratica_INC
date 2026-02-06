import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceContext } from "@/lib/api-helpers";
import { withTenant } from "@/lib/tenant-context";

// Definição das etapas do funil na ordem correta
const PIPELINE_STAGES = [
  { id: "aguardando_atendimento", name: "Aguardando Atendimento", color: "#6b7280", position: 1 },
  { id: "aguardando_corretor", name: "Aguardando Atendimento Corretor", color: "#8b5cf6", position: 2 },
  { id: "em_atendimento", name: "Em Atendimento", color: "#3b82f6", position: 3 },
  { id: "visita_agendada", name: "Visita Agendada", color: "#06b6d4", position: 4 },
  { id: "visita_realizada", name: "Visita Realizada", color: "#14b8a6", position: 5 },
  { id: "simulacao", name: "Simulação", color: "#f59e0b", position: 6 },
  { id: "analise_credito", name: "Em Análise de Crédito", color: "#f97316", position: 7 },
  { id: "montagem_pasta", name: "Montagem Pasta", color: "#ec4899", position: 8 },
  { id: "com_reserva", name: "Com Reserva", color: "#8b5cf6", position: 9 },
  { id: "venda_realizada", name: "Venda Realizada", color: "#10b981", position: 10, isWonStage: true },
  { id: "perdido", name: "Perdido", color: "#ef4444", position: 11, isLostStage: true },
];

// Mapeamento de nome da situação para ID do stage
function getStageIdFromSituacao(situacaoNome: string | null): string {
  if (!situacaoNome) return "aguardando_atendimento";

  const normalizado = situacaoNome.toLowerCase().trim();

  if (normalizado.includes("aguardando atendimento corretor")) return "aguardando_corretor";
  if (normalizado.includes("aguardando atendimento")) return "aguardando_atendimento";
  if (normalizado.includes("em atendimento")) return "em_atendimento";
  if (normalizado.includes("visita agendada")) return "visita_agendada";
  if (normalizado.includes("visita realizada")) return "visita_realizada";
  if (normalizado.includes("simulação") || normalizado.includes("simulacao")) return "simulacao";
  if (normalizado.includes("análise de crédito") || normalizado.includes("analise de credito")) return "analise_credito";
  if (normalizado.includes("montagem pasta")) return "montagem_pasta";
  if (normalizado.includes("reserva")) return "com_reserva";
  if (normalizado.includes("venda realizada")) return "venda_realizada";
  if (normalizado.includes("perdido")) return "perdido";

  return "aguardando_atendimento";
}

export async function GET(req: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireWorkspaceContext(req);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "500");
    const corretorId = searchParams.get("corretor_id");

    // Auto-filter by corretor for non-admin/gerente users
    let effectiveCorretorId = corretorId ? parseInt(corretorId) : null;
    if (!effectiveCorretorId && user.role !== 'admin' && user.role !== 'gerente') {
      effectiveCorretorId = (user as any).cvcrm_id || null;
    }

    return await withTenant(workspaceId, async (client) => {
      // Buscar leads do CV CRM
      let query = `
        SELECT
          id_lead as id,
          nome as name,
          email,
          telefone as phone,
          origem as source,
          score,
          valor_negocio,
          renda_familiar,
          data_cad as created_at,
          ultima_data_conversao as last_interaction_at,
          situacao_nome,
          corretor,
          empreendimento,
          tags,
          qtde_simulacoes_associadas as simulacoes,
          qtde_reservas_associadas as reservas,
          possibilidade_venda
        FROM cvcrm_leads
        WHERE workspace_id = $1
      `;

      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (effectiveCorretorId) {
        query += ` AND corretor_id = $${paramIndex}`;
        params.push(effectiveCorretorId);
        paramIndex++;
      }

      query += ` ORDER BY data_cad DESC NULLS LAST LIMIT $${paramIndex}`;
      params.push(limit);

      const leadsRes = await client.query(query, params);

      // Processar leads e mapear para stages
      const leads = leadsRes.rows.map((row) => {
        const corretor = typeof row.corretor === 'string' ? JSON.parse(row.corretor) : row.corretor;
        const empreendimento = typeof row.empreendimento === 'string' ? JSON.parse(row.empreendimento) : row.empreendimento;
        const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;

        const situacaoNome = row.situacao_nome || null;
        const stageId = getStageIdFromSituacao(situacaoNome);

        // Determinar temperatura baseado no score
        let temperature: "cold" | "warm" | "hot" = "cold";
        if (row.score >= 70) temperature = "hot";
        else if (row.score >= 40) temperature = "warm";

        // Garantir que valor_negocio seja um número válido
        let valorNegocio = 0;
        if (row.valor_negocio) {
          const parsed = parseFloat(String(row.valor_negocio));
          if (!isNaN(parsed) && isFinite(parsed)) {
            valorNegocio = parsed;
          }
        }

        // Parse renda_familiar
        let rendaFamiliar = 0;
        if (row.renda_familiar) {
          const parsed = parseFloat(String(row.renda_familiar));
          if (!isNaN(parsed) && isFinite(parsed)) rendaFamiliar = parsed;
        }

        return {
          id: String(row.id),
          stage_id: stageId,
          name: row.name || "Sem nome",
          email: row.email || null,
          phone: row.phone || null,
          source: row.source || "Não informada",
          score: row.score || 0,
          temperature,
          valor_negocio: valorNegocio,
          renda_familiar: rendaFamiliar,
          created_at: row.created_at,
          last_interaction_at: row.last_interaction_at,
          situacao: situacaoNome,
          corretor: corretor?.nome || null,
          corretor_id: corretor?.id || null,
          empreendimento: Array.isArray(empreendimento) ? empreendimento[0]?.nome : empreendimento?.nome || null,
          tags: tags || [],
          simulacoes: row.simulacoes || 0,
          reservas: row.reservas || 0,
          possibilidade_venda: row.possibilidade_venda || 0,
        };
      });

      // Contar leads por stage
      const stagesWithCount = PIPELINE_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.stage_id === stage.id);
        const totalValor = stageLeads.reduce((sum, l) => {
          const val = l.valor_negocio || 0;
          return sum + (isFinite(val) ? val : 0);
        }, 0);

        return {
          ...stage,
          count: stageLeads.length,
          totalValor: isFinite(totalValor) ? totalValor : 0,
        };
      });

      // Estatísticas gerais
      const totalLeads = leads.length;
      const totalValor = leads.reduce((sum, l) => {
        const val = l.valor_negocio || 0;
        return sum + (isFinite(val) ? val : 0);
      }, 0);
      const vendasRealizadas = leads.filter((l) => l.stage_id === "venda_realizada").length;
      const perdidos = leads.filter((l) => l.stage_id === "perdido").length;
      const conversionRate = totalLeads > 0 ? Math.round((vendasRealizadas / totalLeads) * 100) : 0;

      return NextResponse.json({
        stages: stagesWithCount,
        leads,
        stats: {
          totalLeads,
          totalValor,
          vendasRealizadas,
          perdidos,
          conversionRate,
          emAndamento: totalLeads - vendasRealizadas - perdidos,
        },
      });
    });
  } catch (error) {
    console.error("Pipeline CV CRM API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
