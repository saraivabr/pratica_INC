import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // Autenticação e contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const offset = (page - 1) * limit;

        // Construir filtros baseados na role do usuário
        let leadFilter = 'l.workspace_id = $1';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        // Filtrar por role
        if (user.role === 'admin') {
            // Admin vê todos os leads do workspace
        } else if (user.role === 'gerente') {
            // Gerente vê leads dos corretores da sua equipe
            leadFilter += ` AND l.corretor_nome IN (
                SELECT nome FROM users WHERE gerente_id = $${paramIndex} OR id = $${paramIndex}
            )`;
            params.push(user.id);
            paramIndex++;
        } else {
            // Corretor vê apenas seus leads
            leadFilter += ` AND l.corretor_nome = $${paramIndex}`;
            params.push(user.nome);
            paramIndex++;
        }

        // Query para encontrar leads "frios" (sem mensagem no WhatsApp há 7+ dias)
        const leadsQuery = `
            WITH lead_last_messages AS (
                SELECT 
                    l.id as lead_id,
                    l.cvcrm_id,
                    l.nome,
                    l.telefone,
                    l.situacao_nome,
                    l.empreendimento,
                    MAX(w.timestamp) as last_message_date,
                    EXTRACT(DAY FROM (NOW() - MAX(w.timestamp))) as days_since_contact
                FROM cvcrm_leads l
                LEFT JOIN whatsapp_messages w ON (
                    REGEXP_REPLACE(w.phone_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(l.telefone, '[^0-9]', '', 'g')
                    AND w.workspace_id = l.workspace_id
                )
                WHERE ${leadFilter}
                    AND l.situacao_nome NOT IN ('cancelado', 'perdido', 'vendido', 'finalizado')
                    AND l.telefone IS NOT NULL 
                    AND l.telefone != ''
                GROUP BY l.id, l.cvcrm_id, l.nome, l.telefone, l.situacao_nome, l.empreendimento
            ),
            cold_leads AS (
                SELECT *
                FROM lead_last_messages
                WHERE last_message_date IS NULL 
                   OR days_since_contact >= 7
                ORDER BY 
                    CASE 
                        WHEN last_message_date IS NULL THEN 999 
                        ELSE days_since_contact 
                    END DESC,
                    nome ASC
            )
            SELECT 
                lead_id as id,
                cvcrm_id,
                nome,
                telefone,
                situacao_nome as situacao,
                empreendimento,
                last_message_date,
                COALESCE(days_since_contact, 999) as days_since_contact
            FROM cold_leads
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        // Query para contar total de leads frios
        const countQuery = `
            WITH lead_last_messages AS (
                SELECT 
                    l.id as lead_id,
                    MAX(w.timestamp) as last_message_date,
                    EXTRACT(DAY FROM (NOW() - MAX(w.timestamp))) as days_since_contact
                FROM cvcrm_leads l
                LEFT JOIN whatsapp_messages w ON (
                    REGEXP_REPLACE(w.phone_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(l.telefone, '[^0-9]', '', 'g')
                    AND w.workspace_id = l.workspace_id
                )
                WHERE ${leadFilter}
                    AND l.situacao_nome NOT IN ('cancelado', 'perdido', 'vendido', 'finalizado')
                    AND l.telefone IS NOT NULL 
                    AND l.telefone != ''
                GROUP BY l.id
            )
            SELECT COUNT(*) as total
            FROM lead_last_messages
            WHERE last_message_date IS NULL 
               OR days_since_contact >= 7
        `;

        params.push(limit, offset);
        
        // Executar queries em paralelo
        const [leadsResult, countResult] = await Promise.all([
            pool.query(leadsQuery, params),
            pool.query(countQuery, params.slice(0, -2)) // Remove limit e offset para count
        ]);

        const leads = leadsResult.rows.map(row => ({
            ...row,
            empreendimento: row.empreendimento && typeof row.empreendimento === 'string' 
                ? JSON.parse(row.empreendimento)
                : row.empreendimento,
            days_since_contact: parseInt(row.days_since_contact) || 999,
        }));

        const total = parseInt(countResult.rows[0]?.total || '0');
        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            leads,
            pagination: {
                currentPage: page,
                totalPages,
                totalLeads: total,
                limit,
                offset
            },
            // Compatibilidade com o componente
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error('Erro ao buscar leads frios:', error);
        return NextResponse.json(
            { 
                error: 'Erro ao buscar leads para recuperação',
                details: String(error)
            },
            { status: 500 }
        );
    }
}