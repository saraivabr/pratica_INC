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

        // Filtrar por role
        let isFiltered = false;

        // Construir query com filtros
        let whereClause = 'WHERE workspace_id = $1';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        // Filtro por role
        if (user.role === 'admin') {
            // Admin vê tudo do workspace
        } else if (user.role === 'gerente') {
            // Gerente vê leads dos corretores da sua equipe
            // Mapeia corretores da equipe pelo corretor_nome (cvcrm_leads usa IDs do CRM)
            whereClause += ` AND (corretor_nome IN (
                SELECT nome FROM users WHERE gerente_id = $${paramIndex}
            ) OR corretor_nome = (SELECT nome FROM users WHERE id = $${paramIndex}))`;
            params.push(user.id);
            paramIndex++;
            isFiltered = true;
        } else {
            // Corretor vê apenas seus leads (match por nome)
            whereClause += ` AND corretor_nome = $${paramIndex}`;
            params.push(user.nome);
            paramIndex++;
            isFiltered = true;
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
                cvcrm_id as idlead, nome, email, telefone, 
                data_cadastro_cvcrm as data_cad, origem, midia_principal,
                json_build_object('id', corretor_id, 'nome', corretor_nome) as corretor,
                corretor_id, 
                json_build_object('id', imobiliaria_id, 'nome', imobiliaria_nome) as imobiliaria,
                json_build_object('id', situacao_id, 'nome', situacao_nome) as situacao,
                situacao_id,
                empreendimentos as empreendimento, 
                score, 
                (cvcrm_data->>'valor_negocio')::numeric as valor_negocio,
                (cvcrm_data->>'renda_familiar')::numeric as renda_familiar,
                cvcrm_data->>'cidade' as cidade, 
                cvcrm_data->>'estado' as estado,
                cvcrm_data->>'bairro' as bairro,
                cvcrm_data->'tags' as tags, 
                data_atualizacao_cvcrm as ultima_data_conversao, 
                synced_at
            FROM cvcrm_leads
            ${whereClause}
            ORDER BY data_cadastro_cvcrm DESC NULLS LAST, cvcrm_id DESC
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

export async function POST(request: NextRequest) {
    try {
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;
        const body = await request.json();

        // Validar dados obrigatórios
        const { nome, telefone, empreendimento_id, empreendimento_nome, observacoes, origem = 'manual', midia_principal = 'Cadastro manual' } = body;

        if (!nome || !telefone) {
            return NextResponse.json(
                { error: 'Nome e telefone são obrigatórios' },
                { status: 400 }
            );
        }

        // Validar comprimento mínimo
        if (nome.trim().length < 2) {
            return NextResponse.json(
                { error: 'Nome deve ter pelo menos 2 caracteres' },
                { status: 400 }
            );
        }

        // Limpar telefone (remover caracteres especiais)
        const telefoneClean = telefone.replace(/\D/g, '');

        // Validar telefone
        if (telefoneClean.length < 10 || telefoneClean.length > 13) {
            return NextResponse.json(
                { error: 'Telefone inválido' },
                { status: 400 }
            );
        }

        // Verificar se já existe lead com esse telefone
        const existingLead = await pool.query(
            'SELECT id FROM cvcrm_leads WHERE telefone = $1 AND workspace_id = $2 LIMIT 1',
            [telefoneClean, workspaceId]
        );

        if (existingLead.rows.length > 0) {
            return NextResponse.json(
                { error: 'Já existe um cliente com este telefone' },
                { status: 400 }
            );
        }

        // Preparar dados do empreendimento
        let empreendimentos = null;
        if (empreendimento_id && empreendimento_nome) {
            empreendimentos = JSON.stringify([{
                id: empreendimento_id,
                nome: empreendimento_nome
            }]);
        }

        // Definir corretor (usuário atual se não for admin)
        let corretor_nome = user.nome;
        let corretor_id = user.cvcrm_id || null;

        // Inserir novo lead
        const insertQuery = `
            INSERT INTO cvcrm_leads (
                nome, telefone, workspace_id, 
                data_cadastro_cvcrm, data_cad, data_atualizacao_cvcrm,
                origem, midia_principal,
                corretor_nome, corretor_id,
                empreendimentos,
                situacao_nome, situacao_id,
                cvcrm_data
            ) VALUES (
                $1, $2, $3,
                NOW(), NOW(), NOW(),
                $4, $5,
                $6, $7,
                $8,
                'Novo Lead', 1,
                $9
            ) RETURNING id, cvcrm_id
        `;

        const cvcrm_data = JSON.stringify({
            observacoes: observacoes || '',
            origem_cadastro: 'manual',
            data_criacao: new Date().toISOString()
        });

        const result = await pool.query(insertQuery, [
            nome.trim(),
            telefoneClean,
            workspaceId,
            origem,
            midia_principal,
            corretor_nome,
            corretor_id,
            empreendimentos,
            cvcrm_data
        ]);

        const newLead = result.rows[0];

        return NextResponse.json({
            success: true,
            message: 'Cliente adicionado com sucesso',
            data: {
                id: newLead.id,
                cvcrm_id: newLead.cvcrm_id,
                nome: nome.trim(),
                telefone: telefoneClean,
                corretor: corretor_nome,
                empreendimento: empreendimento_nome
            }
        });

    } catch (error) {
        console.error('Erro ao criar lead:', error);
        return NextResponse.json(
            { error: 'Erro ao criar lead', details: String(error) },
            { status: 500 }
        );
    }
}
