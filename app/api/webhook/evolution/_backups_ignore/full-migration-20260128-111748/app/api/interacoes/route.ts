import { NextRequest, NextResponse } from 'next/server';
import { createInteracao, getInteracoesByEmpreendimento, getInteracoesCountByEmpreendimento, getUserById } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Helper para pegar usuário autenticado
async function getAuthenticatedUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('pratica-session')?.value;

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(decodeURIComponent(sessionCookie));
        if (session?.userId) {
            return session.userId;
        }
    } catch {
        // Ignora erro de parse
    }
    return null;
}

/**
 * GET /api/interacoes?empreendimento_id=XXX
 * Busca histórico de compartilhamentos de um empreendimento
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get('empreendimento_id');

    if (!empreendimentoId) {
        return NextResponse.json({ error: 'empreendimento_id é obrigatório' }, { status: 400 });
    }

    try {
        const interacoes = await getInteracoesByEmpreendimento(empreendimentoId, 20);
        const count = await getInteracoesCountByEmpreendimento(empreendimentoId);

        return NextResponse.json({
            interacoes,
            total: count,
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
export async function POST(request: Request) {
    try {
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

        // Validações
        if (!empreendimento_id) {
            return NextResponse.json({ error: 'empreendimento_id é obrigatório' }, { status: 400 });
        }

        if (!tipo_material) {
            return NextResponse.json({ error: 'tipo_material é obrigatório' }, { status: 400 });
        }

        // Pegar ID do corretor autenticado (da sessão)
        const userId = await getAuthenticatedUserId();

        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const corretorId = userId;

        const interacao = await createInteracao({
            corretor_id: corretorId,
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
        });

        if (!interacao) {
            throw new Error('Falha ao criar interação');
        }

        return NextResponse.json({
            success: true,
            interacao
        });

    } catch (error: any) {
        console.error('Erro ao criar interação:', error);
        return NextResponse.json({
            error: 'Erro ao registrar compartilhamento',
            details: error.message
        }, { status: 500 });
    }
}
