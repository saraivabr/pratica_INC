import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        // Autenticação e contexto do tenant
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        // Construir filtros baseados na role do usuário
        let leadFilter = 'WHERE l.workspace_id = $1';
        let whatsappFilter = 'WHERE w.workspace_id = $1';
        const params: any[] = [workspaceId];
        let paramIndex = 2;

        // Filtrar por role
        if (user.role === 'admin') {
            // Admin vê todos os dados do workspace
        } else if (user.role === 'gerente') {
            // Gerente vê dados dos corretores da sua equipe
            leadFilter += ` AND l.corretor_nome IN (
                SELECT nome FROM users WHERE gerente_id = $${paramIndex} OR id = $${paramIndex}
            )`;
            // Para WhatsApp, filtrar por telefones dos leads da equipe
            whatsappFilter += ` AND w.phone_number IN (
                SELECT REGEXP_REPLACE(l.telefone, '[^0-9]', '', 'g') 
                FROM cvcrm_leads l 
                WHERE l.workspace_id = $1 AND l.corretor_nome IN (
                    SELECT nome FROM users WHERE gerente_id = $${paramIndex} OR id = $${paramIndex}
                )
            )`;
            params.push(user.id);
            paramIndex++;
        } else {
            // Corretor vê apenas seus dados
            leadFilter += ` AND l.corretor_nome = $${paramIndex}`;
            // Para WhatsApp, filtrar por telefones dos seus leads
            whatsappFilter += ` AND w.phone_number IN (
                SELECT REGEXP_REPLACE(l.telefone, '[^0-9]', '', 'g') 
                FROM cvcrm_leads l 
                WHERE l.workspace_id = $1 AND l.corretor_nome = $${paramIndex}
            )`;
            params.push(user.nome);
            paramIndex++;
        }

        // Buscar estatísticas em paralelo
        const queries = [
            // Total de leads ativos
            `SELECT COUNT(*) as total_leads 
             FROM cvcrm_leads l 
             ${leadFilter} AND l.situacao_nome NOT IN ('cancelado', 'perdido', 'vendido')`,
            
            // Leads quentes (situação específica ou score alto)
            `SELECT COUNT(*) as leads_quentes 
             FROM cvcrm_leads l 
             ${leadFilter} AND (
                 l.situacao_nome ILIKE '%quente%' 
                 OR l.situacao_nome ILIKE '%interessado%'
                 OR l.score >= 80
             )`,
            
            // Conversas hoje no WhatsApp
            `SELECT COUNT(*) as conversas_hoje 
             FROM whatsapp_messages w 
             ${whatsappFilter} AND DATE(w.timestamp) = CURRENT_DATE`,
            
            // Taxa de resposta (últimos 7 dias)
            `SELECT 
                COUNT(CASE WHEN w.is_from_me = false THEN 1 END) as received,
                COUNT(CASE WHEN w.is_from_me = true THEN 1 END) as sent
             FROM whatsapp_messages w 
             ${whatsappFilter} AND w.timestamp >= NOW() - INTERVAL '7 days'`,
            
            // Leads esfriando (sem mensagem WhatsApp há 7+ dias)
            `SELECT COUNT(DISTINCT l.id) as leads_esfriando
             FROM cvcrm_leads l
             ${leadFilter}
             AND l.situacao_nome NOT IN ('cancelado', 'perdido', 'vendido')
             AND (
                 l.telefone IS NULL 
                 OR NOT EXISTS (
                     SELECT 1 FROM whatsapp_messages w2 
                     WHERE REGEXP_REPLACE(w2.phone_number, '[^0-9]', '', 'g') = REGEXP_REPLACE(l.telefone, '[^0-9]', '', 'g')
                     AND w2.workspace_id = l.workspace_id
                     AND w2.timestamp >= NOW() - INTERVAL '7 days'
                 )
             )`
        ];

        const [totalResult, quentesResult, conversasResult, respostaResult, esfriandoResult] = 
            await Promise.all(queries.map(query => pool.query(query, params)));

        // Calcular taxa de resposta
        const received = parseInt(respostaResult.rows[0]?.received || '0');
        const sent = parseInt(respostaResult.rows[0]?.sent || '0');
        const taxa_resposta = sent > 0 ? Math.round((received / sent) * 100) : 0;

        const stats = {
            total_leads: parseInt(totalResult.rows[0].total_leads),
            leads_quentes: parseInt(quentesResult.rows[0].leads_quentes),
            conversas_hoje: parseInt(conversasResult.rows[0].conversas_hoje),
            taxa_resposta,
            leads_esfriando_count: parseInt(esfriandoResult.rows[0].leads_esfriando),
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Erro ao buscar estatísticas do dashboard:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar estatísticas', details: String(error) },
            { status: 500 }
        );
    }
}