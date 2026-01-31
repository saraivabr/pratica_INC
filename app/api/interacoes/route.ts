import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/interacoes?empreendimento_id=XXX
 * Busca histórico de compartilhamentos de um empreendimento (isolado por workspace)
 */
export async function GET(request: NextRequest) {
    try {
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { searchParams } = new URL(request.url);
        const empreendimentoId = searchParams.get('empreendimento_id');

        if (!empreendimentoId) {
            return NextResponse.json({ error: 'empreendimento_id é obrigatório' }, { status: 400 });
        }

        const { rows } = await dbQuery(
            `SELECT i.*, u.nome as corretor_nome
             FROM cvcrm_lead_interacoes i
             LEFT JOIN users u ON u.cvcrm_id = i.usuario_id
             WHERE i.workspace_id = $1
             ORDER BY i.created_at DESC
             LIMIT 20`,
            [ctx.workspaceId]
        );

        const countRes = await dbQuery(
            `SELECT count(*) as total FROM cvcrm_lead_interacoes WHERE workspace_id = $1`,
            [ctx.workspaceId]
        );

        return NextResponse.json({
            interacoes: rows,
            total: parseInt(countRes.rows[0]?.total || '0', 10),
            success: true
        });
    } catch (error: any) {
        console.error('Erro ao buscar interações:', error);
        return NextResponse.json({
            error: 'Erro ao buscar histórico de compartilhamentos',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * POST /api/interacoes
 * Registra um novo compartilhamento
 */
export async function POST(request: NextRequest) {
    try {
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const body = await request.json();
        const {
            empreendimento_id,
            empreendimento_nome,
            tipo_material,
            lead_nome,
            lead_telefone,
            lead_id,
            unidade_id,
            simulacao_data,
            notas_internas,
            mensagem_enviada
        } = body;

        if (!empreendimento_id) {
            return NextResponse.json({ error: 'empreendimento_id é obrigatório' }, { status: 400 });
        }

        if (!tipo_material) {
            return NextResponse.json({ error: 'tipo_material é obrigatório' }, { status: 400 });
        }

        const { rows } = await dbQuery(
            `INSERT INTO cvcrm_lead_interacoes (
                usuario_id, usuario_nome, tipo, descricao, workspace_id, data_cadastro
            ) VALUES (
                (SELECT cvcrm_id FROM users WHERE id = $1),
                $2, $3, $4, $5, NOW()
            ) RETURNING *`,
            [
                ctx.user.id,
                ctx.user.nome || '',
                tipo_material,
                notas_internas || mensagem_enviada || '',
                ctx.workspaceId
            ]
        );

        return NextResponse.json({
            success: true,
            interacao: rows[0]
        });
    } catch (error: any) {
        console.error('Erro ao criar interação:', error);
        return NextResponse.json({
            error: 'Erro ao registrar compartilhamento',
            details: error.message
        }, { status: 500 });
    }
}
