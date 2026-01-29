import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

interface CorretorInfo {
    id?: number;
    nome?: string;
    telefone?: string;
}

interface ImobiliariaInfo {
    id?: number;
    nome?: string;
}

interface SituacaoInfo {
    id?: number;
    nome?: string;
}

interface EmpreendimentoInfo {
    id?: number;
    nome?: string;
}

interface DBLead {
    idlead: number;
    nome: string;
    email: string | null;
    telefone: string | null;
    data_cad: string | null;
    origem: string | null;
    midia_principal: string | null;
    corretor: CorretorInfo | string | null;
    corretor_id: number | null;
    imobiliaria: ImobiliariaInfo | string | null;
    situacao: SituacaoInfo | string | null;
    situacao_id: number | null;
    empreendimento: EmpreendimentoInfo | EmpreendimentoInfo[] | string | null;
    score: number | null;
    valor_negocio: number | null;
    renda_familiar: number | null;
    cidade: string | null;
    estado: string | null;
    bairro: string | null;
    tags: string[] | string | null;
    ultima_data_conversao: string | null;
    synced_at: string | null;
}

/**
 * Normaliza lead do banco local para formato da API
 */
function normalizeLead(lead: DBLead) {
    const corretor = typeof lead.corretor === 'string' ? JSON.parse(lead.corretor) : lead.corretor;
    const imobiliaria = typeof lead.imobiliaria === 'string' ? JSON.parse(lead.imobiliaria) : lead.imobiliaria;
    const situacao = typeof lead.situacao === 'string' ? JSON.parse(lead.situacao) : lead.situacao;
    const empreendimento = typeof lead.empreendimento === 'string' ? JSON.parse(lead.empreendimento) : lead.empreendimento;
    const tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags;

    return {
        id: lead.idlead,
        nome: lead.nome || 'Sem nome',
        email: lead.email || '',
        telefone: lead.telefone || '',
        celular: lead.telefone || '',
        data_cadastro: lead.data_cad,
        origem: lead.origem || lead.midia_principal || 'Não informada',
        midia: lead.midia_principal,
        corretor: corretor,
        imobiliaria: imobiliaria,
        situacao: situacao?.nome || null,
        situacao_id: lead.situacao_id,
        empreendimento: Array.isArray(empreendimento) ? empreendimento[0] : empreendimento,
        score: lead.score,
        valor_negocio: lead.valor_negocio,
        renda_familiar: lead.renda_familiar,
        cidade: lead.cidade,
        estado: lead.estado,
        bairro: lead.bairro,
        tags: tags || [],
        ultima_conversao: lead.ultima_data_conversao,
        synced_at: lead.synced_at
    };
}

export async function GET(request: NextRequest) {
    try {
        // Autenticação e contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        const { searchParams } = new URL(request.url);

        // Validate and sanitize input parameters
        const rawLimit = parseInt(searchParams.get('limit') || '30');
        const rawOffset = parseInt(searchParams.get('offset') || '0');

        // Prevent DoS with reasonable limits
        const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 30 : rawLimit), 100);
        const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

        const search = searchParams.get('search')?.slice(0, 100); // Limit search length
        const situacaoFilter = searchParams.get('situacao');

        // Se não for admin ou gerente, filtrar por corretor
        let cvcrm_id: number | null = null;
        let isFiltered = false;

        if (user.role !== 'admin' && user.role !== 'gerente') {
            cvcrm_id = (user as any).cvcrm_id || null;
            isFiltered = cvcrm_id !== null;
        }

        // Construir query com filtros
        let whereClause = 'WHERE workspace_id = $1';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        // Filtro por corretor (se não for admin/gerente)
        if (cvcrm_id) {
            whereClause += ` AND corretor_id = $${paramIndex}`;
            params.push(cvcrm_id);
            paramIndex++;
        }

        // Filtro por busca (nome, email, telefone)
        if (search) {
            whereClause += ` AND (
                LOWER(nome) LIKE LOWER($${paramIndex})
                OR LOWER(email) LIKE LOWER($${paramIndex})
                OR telefone LIKE $${paramIndex}
            )`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filtro por situação
        if (situacaoFilter && situacaoFilter !== 'all') {
            whereClause += ` AND situacao_id = $${paramIndex}`;
            params.push(parseInt(situacaoFilter));
            paramIndex++;
        }

        // Buscar total
        const countQuery = `SELECT COUNT(*) as total FROM cvcrm_leads ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Buscar leads paginados
        const query = `
            SELECT
                idlead, nome, email, telefone, data_cad, origem, midia_principal,
                corretor, corretor_id, imobiliaria, situacao, situacao_id,
                empreendimento, score, valor_negocio, renda_familiar,
                cidade, estado, bairro, tags, ultima_data_conversao, synced_at
            FROM cvcrm_leads
            ${whereClause}
            ORDER BY data_cad DESC NULLS LAST, idlead DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await pool.query<DBLead>(query, params);
        const normalizedLeads = result.rows.map(normalizeLead);

        return NextResponse.json({
            data: normalizedLeads,
            total,
            limit,
            offset,
            filtered: isFiltered,
            source: 'local'
        });
    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar leads', details: String(error) },
            { status: 500 }
        );
    }
}
