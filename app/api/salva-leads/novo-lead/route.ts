import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withTenant } from '@/lib/tenant-context';
import { calcularScoreLead, calcularLeadQualificado } from '@/lib/salva-leads/lead-scoring';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/salva-leads/novo-lead
 *
 * Cria um novo lead com score automático
 * Body:
 * - nome (string)
 * - whatsapp (string)
 * - email (string, opcional)
 * - imovel_id (string)
 * - imovel_nome (string)
 * - imovel_preco (number)
 * - filtros (object) - quartos, preco, bairro, etc
 * - corretor_id (string, opcional)
 * - source (string) - 'whatsapp_sofia', 'website', etc
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const {
      nome,
      whatsapp,
      email,
      imovel_id,
      imovel_nome,
      imovel_preco,
      filtros = {},
      corretor_id,
      source = 'whatsapp_sofia',
    } = body;

    const workspace_id = ctx.workspaceId;

    // Validações
    if (!nome || !whatsapp) {
      return NextResponse.json(
        { error: 'nome e whatsapp são obrigatórios' },
        { status: 400 }
      );
    }

    // Calcular score do lead
    const score = calcularScoreLead({
      filtros,
      nome,
      whatsapp,
      imovelPreco: imovel_preco,
    });

    // Verificar se é lead qualificado (score >= 7)
    const qualificado = score >= 7;

    return await withTenant(workspace_id, async (client) => {
      // Buscar o corretor responsável (primeiro da imobiliária se não informado)
      let corretorId = corretor_id;
      if (!corretorId) {
        const corretorResult = await client.query(
          `SELECT id FROM users
           WHERE workspace_id = $1
           AND role = 'corretor'
           LIMIT 1`,
          [workspace_id]
        );
        if (corretorResult.rows[0]) {
          corretorId = corretorResult.rows[0].id;
        }
      }

      // Criar lead no banco de dados
      const leadResult = await client.query(
        `INSERT INTO leads (
          workspace_id,
          nome,
          email,
          whatsapp,
          imovel_id,
          imovel_nome,
          imovel_preco,
          filtros,
          score,
          qualificado,
          source,
          corretor_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *`,
        [
          workspace_id,
          nome,
          email || null,
          whatsapp,
          imovel_id || null,
          imovel_nome || null,
          imovel_preco || null,
          JSON.stringify(filtros),
          score,
          qualificado,
          source,
          corretorId || null,
          'novo', // status inicial
        ]
      );

      if (!leadResult.rows[0]) {
        throw new Error('Falha ao criar lead');
      }

      const lead = leadResult.rows[0];

      // Se é qualificado, enviar notificação ao corretor
      if (qualificado && corretorId) {
        // Enviar notificação WhatsApp ao corretor
        try {
          const { sendTextMessage } = await import('@/lib/zapi');
          // Query users by ID - use pool (non-workspace-scoped)
          const corretorResult = await pool.query(
            `SELECT telefone, nome FROM users WHERE id = $1`,
            [corretorId]
          );

          if (corretorResult.rows[0]) {
            const corretor = corretorResult.rows[0];
            const msg = `🔥 NOVO LEAD QUALIFICADO!\n\n👤 ${nome}\n📱 ${whatsapp}\n🏢 ${imovel_nome || 'Imóvel'}\n💰 Score: ${score}/10\n\nAcesse o CRM para mais detalhes!`;
            await sendTextMessage(corretor.telefone, msg);
          }
        } catch (err) {
          console.warn('[Novo-Lead] Erro ao enviar notificação:', err);
        }
      }

      return NextResponse.json({
        success: true,
        lead: {
          id: lead.id,
          nome: lead.nome,
          whatsapp: lead.whatsapp,
          score: lead.score,
          qualificado: lead.qualificado,
          status: lead.status,
          created_at: lead.created_at,
        },
      });
    });

  } catch (error: any) {
    console.error('[Novo-Lead] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
