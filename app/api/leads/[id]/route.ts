import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { dbQuery } from '@/lib/db';

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
    cpf: string | null;
    data_cad: string | null;
    origem: string | null;
    midia_principal: string | null;
    corretor: CorretorInfo | string | null;
    corretor_id: number | null;
    imobiliaria: ImobiliariaInfo | string | null;
    situacao_nome: string | null;
    situacao_id: number | null;
    empreendimento: EmpreendimentoInfo | EmpreendimentoInfo[] | string | null;
    score: number | null;
    valor_negocio: number | null;
    renda_familiar: number | null;
    cidade: string | null;
    estado: string | null;
    bairro: string | null;
    cep: string | null;
    endereco: string | null;
    tags: string[] | string | null;
    ultima_data_conversao: string | null;
    synced_at: string | null;
}

interface DBInteracao {
    id: number;
    tipo: string | null;
    descricao: string | null;
    data_cadastro: string | null;
    usuario_nome: string | null;
}

/**
 * Normaliza lead do banco local para formato da API
 */
function normalizeLead(lead: DBLead, interacoes: DBInteracao[] = []) {
    const corretor = typeof lead.corretor === 'string' ? JSON.parse(lead.corretor) : lead.corretor;
    const imobiliaria = typeof lead.imobiliaria === 'string' ? JSON.parse(lead.imobiliaria) : lead.imobiliaria;
    const empreendimento = typeof lead.empreendimento === 'string' ? JSON.parse(lead.empreendimento) : lead.empreendimento;
    const tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags;

    return {
        id: lead.idlead,
        idlead: lead.idlead,
        nome: lead.nome || 'Sem nome',
        email: lead.email || '',
        telefone: lead.telefone || '',
        celular: lead.telefone || '',
        cpf: lead.cpf || '',
        data_cadastro: lead.data_cad,
        origem: lead.origem || lead.midia_principal || 'Não informada',
        midia: lead.midia_principal,
        corretor: corretor,
        corretor_nome: corretor?.nome || null,
        imobiliaria: imobiliaria,
        imobiliaria_nome: imobiliaria?.nome || null,
        situacao: lead.situacao_nome || null,
        situacao_id: lead.situacao_id,
        empreendimento: Array.isArray(empreendimento) ? empreendimento[0] : empreendimento,
        empreendimento_nome: Array.isArray(empreendimento) ? empreendimento[0]?.nome : empreendimento?.nome,
        score: lead.score,
        valor_negocio: lead.valor_negocio,
        renda_familiar: lead.renda_familiar,
        cidade: lead.cidade,
        estado: lead.estado,
        bairro: lead.bairro,
        cep: lead.cep,
        endereco: lead.endereco,
        tags: tags || [],
        ultima_conversao: lead.ultima_data_conversao,
        synced_at: lead.synced_at,
        observacao: (lead as any).observacao || null,
        interacoes: interacoes.map(i => ({
            id: i.id,
            tipo: i.tipo || 'Interação',
            descricao: i.descricao,
            data_cad: i.data_cadastro,
            usuario: i.usuario_nome
        }))
    };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leadId = parseInt(id);

        if (isNaN(leadId)) {
            return NextResponse.json(
                { error: 'ID inválido' },
                { status: 400 }
            );
        }

        // Autenticação e contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        // Buscar lead
        let query = `
            SELECT
                idlead, nome, email, telefone, cpf, data_cad, origem, midia_principal,
                corretor, corretor_id, imobiliaria, situacao_nome, situacao_id,
                empreendimento, score, valor_negocio, renda_familiar,
                cidade, estado, bairro, cep, endereco, tags, ultima_data_conversao, synced_at, observacao
            FROM cvcrm_leads
            WHERE workspace_id = $1 AND idlead = $2
        `;
        const queryParams: any[] = [workspaceId, leadId];

        // Se não for admin ou gerente, verificar se é o corretor do lead
        if (user.role !== 'admin' && user.role !== 'gerente') {
            const cvcrm_id = (user as any).cvcrm_id || null;
            if (cvcrm_id) {
                query += ` AND corretor_id = $3`;
                queryParams.push(cvcrm_id);
            }
        }

        const result = await pool.query<DBLead>(query, queryParams);

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'Lead não encontrado' },
                { status: 404 }
            );
        }

        // Buscar interações do lead
        const interacoesQuery = `
            SELECT id, tipo, descricao, data_cadastro, usuario_nome
            FROM cvcrm_lead_interacoes
            WHERE cvcrm_lead_id = $1 AND workspace_id = $2
            ORDER BY data_cadastro DESC
            LIMIT 50
        `;
        const interacoesResult = await pool.query<DBInteracao>(interacoesQuery, [leadId, workspaceId]);

        const lead = normalizeLead(result.rows[0], interacoesResult.rows);

        return NextResponse.json({ data: lead });
    } catch (error) {
        console.error('Erro ao buscar lead:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar lead', details: String(error) },
            { status: 500 }
        );
    }
}

// Campos editaveis permitidos (whitelist)
const EDITABLE_FIELDS: Record<string, string> = {
    nome: 'nome',
    email: 'email',
    telefone: 'telefone',
    cpf: 'cpf',
    cidade: 'cidade',
    estado: 'estado',
    bairro: 'bairro',
    cep: 'cep',
    endereco: 'endereco',
    origem: 'origem',
    valor_negocio: 'valor_negocio',
    renda_familiar: 'renda_familiar',
    observacao: 'observacao',
};

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const leadId = parseInt(id);

        if (isNaN(leadId)) {
            return NextResponse.json({ error: 'ID invalido' }, { status: 400 });
        }

        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        const body = await request.json();

        // Build SET clause from allowed fields only
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        for (const [key, dbColumn] of Object.entries(EDITABLE_FIELDS)) {
            if (body[key] !== undefined) {
                let value = body[key];
                // Sanitize numeric fields
                if (key === 'valor_negocio' || key === 'renda_familiar') {
                    value = value === '' || value === null ? null : Number(value);
                    if (value !== null && isNaN(value)) continue;
                }
                // Sanitize string fields - trim
                if (typeof value === 'string') {
                    value = value.trim();
                }
                setClauses.push(`${dbColumn} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
        }

        // Add updated_at
        setClauses.push(`updated_at = NOW()`);

        // Add workspace and lead id params
        values.push(workspaceId, leadId);

        const query = `
            UPDATE cvcrm_leads
            SET ${setClauses.join(', ')}
            WHERE workspace_id = $${paramIndex} AND idlead = $${paramIndex + 1}
            RETURNING idlead, nome, email, telefone, cidade, estado, valor_negocio, renda_familiar
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Lead nao encontrado' }, { status: 404 });
        }

        console.log(`[LEAD] Updated fields [${Object.keys(body).filter(k => EDITABLE_FIELDS[k]).join(', ')}] for lead ${leadId} by user ${(user as any).id}`);

        return NextResponse.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar lead', details: String(error) },
            { status: 500 }
        );
    }
}
