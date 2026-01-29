import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const ctx = await requireWorkspaceContext(request);
        if (ctx.error) return ctx.error;

        const { workspaceId, user } = ctx;

        // Determinar se é admin ou corretor para filtrar dados
        const isAdmin = user.role === 'admin' || user.role === 'gerente';
        
        // ==========================================
        // 1. DADOS SEMANAIS DE LEADS (últimos 7 dias)
        // ==========================================
        let weeklyLeadsQuery = `
            SELECT 
                DATE(data_cadastro_cvcrm) as data,
                COUNT(*) as count
            FROM cvcrm_leads 
            WHERE workspace_id = $1 
            AND data_cadastro_cvcrm >= NOW() - INTERVAL '7 days'
        `;
        const params = [workspaceId];
        let paramIndex = 2;

        // Filtro por corretor se não for admin
        if (!isAdmin) {
            weeklyLeadsQuery += ` AND corretor_nome = $${paramIndex}`;
            params.push(user.nome);
            paramIndex++;
        }

        weeklyLeadsQuery += `
            GROUP BY DATE(data_cadastro_cvcrm)
            ORDER BY DATE(data_cadastro_cvcrm)
        `;

        // ==========================================
        // 2. INTERAÇÕES SEMANAIS DO WHATSAPP
        // ==========================================
        let weeklyInteractionsQuery = `
            SELECT 
                DATE(timestamp) as data,
                COUNT(*) as count
            FROM whatsapp_messages 
            WHERE workspace_id = $1 
            AND timestamp >= NOW() - INTERVAL '7 days'
            AND is_from_me = true
        `;
        const interactionParams = [workspaceId];
        let interactionParamIndex = 2;

        // Para corretor, filtramos por leads do corretor
        if (!isAdmin) {
            weeklyInteractionsQuery += ` 
            AND phone_number IN (
                SELECT DISTINCT telefone 
                FROM cvcrm_leads 
                WHERE workspace_id = $1 
                AND corretor_nome = $${interactionParamIndex}
            )`;
            interactionParams.push(user.nome);
            interactionParamIndex++;
        }

        weeklyInteractionsQuery += `
            GROUP BY DATE(timestamp)
            ORDER BY DATE(timestamp)
        `;

        // ==========================================
        // 3. COMISSÕES (baseado em valor_negocio)
        // ==========================================
        let commissionsQuery = `
            SELECT 
                SUM(CASE 
                    WHEN EXTRACT(MONTH FROM data_cadastro_cvcrm) = EXTRACT(MONTH FROM NOW())
                    AND EXTRACT(YEAR FROM data_cadastro_cvcrm) = EXTRACT(YEAR FROM NOW())
                    THEN valor_negocio 
                    ELSE 0 
                END) * 0.05 as comissao_mes,
                SUM(CASE 
                    WHEN EXTRACT(YEAR FROM data_cadastro_cvcrm) = EXTRACT(YEAR FROM NOW())
                    THEN valor_negocio 
                    ELSE 0 
                END) * 0.05 as comissao_ano
            FROM cvcrm_leads
            WHERE workspace_id = $1
            AND (
                LOWER(situacao_nome) LIKE '%vend%' 
                OR LOWER(situacao_nome) LIKE '%reserva%'
                OR LOWER(situacao_nome) LIKE '%fechad%'
            )
            AND valor_negocio > 0
        `;
        const commissionParams = [workspaceId];
        let commissionParamIndex = 2;

        if (!isAdmin) {
            commissionsQuery += ` AND corretor_nome = $${commissionParamIndex}`;
            commissionParams.push(user.nome);
            commissionParamIndex++;
        }

        // ==========================================
        // 4. EXECUTAR QUERIES
        // ==========================================
        const [weeklyLeadsResult, weeklyInteractionsResult, commissionsResult] = await Promise.all([
            pool.query(weeklyLeadsQuery, params),
            pool.query(weeklyInteractionsQuery, interactionParams),
            pool.query(commissionsQuery, commissionParams)
        ]);

        // ==========================================
        // 5. PROCESSAR DADOS SEMANAIS
        // ==========================================
        // Criar array com os últimos 7 dias
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return date.toISOString().split('T')[0];
        });

        // Mapear leads por dia
        const leadsMap = new Map();
        weeklyLeadsResult.rows.forEach(row => {
            const dateStr = new Date(row.data).toISOString().split('T')[0];
            leadsMap.set(dateStr, parseInt(row.count));
        });

        // Mapear interações por dia
        const interactionsMap = new Map();
        weeklyInteractionsResult.rows.forEach(row => {
            const dateStr = new Date(row.data).toISOString().split('T')[0];
            interactionsMap.set(dateStr, parseInt(row.count));
        });

        // Gerar arrays finais (últimos 7 dias)
        const weeklyLeads = last7Days.map(date => leadsMap.get(date) || 0);
        const weeklyInteractions = last7Days.map(date => interactionsMap.get(date) || 0);

        // ==========================================
        // 6. PROCESSAR COMISSÕES
        // ==========================================
        const commissions = commissionsResult.rows[0];
        const comissaoMes = Math.round(parseFloat(commissions?.comissao_mes) || 0);
        const comissaoAno = Math.round(parseFloat(commissions?.comissao_ano) || 0);

        // ==========================================
        // 7. RETORNAR RESPOSTA
        // ==========================================
        return NextResponse.json({
            success: true,
            data: {
                weeklyLeads,
                weeklyInteractions,
                comissaoMes,
                comissaoAno,
                period: {
                    start: last7Days[0],
                    end: last7Days[6]
                },
                isFiltered: !isAdmin,
                userRole: user.role,
                generatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dados do relatório:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Erro ao buscar dados do relatório',
                details: String(error) 
            },
            { status: 500 }
        );
    }
}