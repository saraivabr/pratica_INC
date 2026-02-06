/**
 * API: Puxar Lead (Pull Model)
 *
 * POST /api/recepcao/puxar-lead - Corretor puxa próximo lead disponível
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceContext } from '@/lib/api-helpers';
import pool from '@/lib/db';
import { sendToCorretor } from '@/lib/evolution-helpers';

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const { workspaceId, user } = ctx;
    const userId = (user as any).id;

    await client.query('BEGIN');

    // 1. Buscar presença ativa do corretor (checked-in, não pausado, sem feedback pendente, leads_ativos < 5)
    const presencaResult = await client.query<{
      id: string;
      plantao_id: string;
      posicao_fila: number;
      leads_ativos: number;
    }>(
      `SELECT id, plantao_id, posicao_fila, leads_ativos
       FROM recepcao_presencas
       WHERE user_id = $1
         AND workspace_id = $2
         AND status = 'presente'
         AND pausado = false
         AND feedback_pendente = false
         AND leads_ativos < 5
       LIMIT 1
       FOR UPDATE`,
      [userId, workspaceId]
    );

    if (presencaResult.rows.length === 0) {
      await client.query('ROLLBACK');

      // Check why it failed for better error message
      const checkResult = await client.query(
        `SELECT status, pausado, feedback_pendente, leads_ativos
         FROM recepcao_presencas
         WHERE user_id = $1 AND workspace_id = $2 AND status = 'presente'
         LIMIT 1`,
        [userId, workspaceId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Você precisa fazer check-in primeiro' },
          { status: 400 }
        );
      }

      const p = checkResult.rows[0];
      if (p.feedback_pendente) {
        return NextResponse.json(
          { success: false, error: 'Dê feedback dos leads anteriores antes de puxar outro' },
          { status: 400 }
        );
      }
      if (p.pausado) {
        return NextResponse.json(
          { success: false, error: 'Retome da pausa antes de puxar um lead' },
          { status: 400 }
        );
      }
      if (p.leads_ativos >= 5) {
        return NextResponse.json(
          { success: false, error: 'Você já tem 5 leads ativos. Finalize alguns antes de puxar outro' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Presença não encontrada ou indisponível' },
        { status: 400 }
      );
    }

    const presenca = presencaResult.rows[0];

    // 2. Buscar próximo lead disponível (FOR UPDATE SKIP LOCKED para concorrência)
    const leadResult = await client.query<{
      id: string;
      cvcrm_id: number;
      nome: string;
      telefone: string | null;
      celular: string | null;
      email: string | null;
      origem: string | null;
      situacao_nome: string | null;
      motivo: string;
      horas_aguardando: number;
    }>(
      `SELECT l.id, l.cvcrm_id, l.nome, l.telefone, l.celular, l.email,
              l.origem, l.situacao_nome,
              CASE WHEN l.corretor_id IS NULL THEN 'sem_corretor' ELSE 'abandonado' END as motivo,
              EXTRACT(EPOCH FROM (NOW() - l.created_at))/3600 AS horas_aguardando
       FROM cvcrm_leads l
       WHERE l.workspace_id = $1
         AND (
           (l.corretor_id IS NULL
            AND l.situacao_nome NOT IN ('Perdido','Descartado','Cancelado','Venda Realizada','Inativo','Fechado'))
           OR
           (l.corretor_id IS NOT NULL
            AND COALESCE(l.ultima_data_conversao, l.created_at) < NOW() - INTERVAL '7 days'
            AND l.situacao_nome IN ('Aguardando Atendimento Corretor','Aguardando Atendimento','Em Atendimento'))
         )
         AND NOT EXISTS (
           SELECT 1 FROM recepcao_atribuicoes ra
           WHERE ra.cvcrm_lead_id = l.cvcrm_id
             AND ra.atribuido_at > NOW() - INTERVAL '48 hours'
         )
       ORDER BY CASE WHEN l.corretor_id IS NULL THEN 0 ELSE 1 END,
                EXTRACT(EPOCH FROM (NOW() - COALESCE(l.ultima_data_conversao, l.created_at))) DESC
       LIMIT 1
       FOR UPDATE OF l SKIP LOCKED`,
      [workspaceId]
    );

    if (leadResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Não há leads disponíveis no momento' },
        { status: 404 }
      );
    }

    const lead = leadResult.rows[0];

    // 3. Criar atribuição com cvcrm_lead_id
    const atribuicaoResult = await client.query(
      `INSERT INTO recepcao_atribuicoes
       (workspace_id, plantao_id, presenca_id, user_id, lead_nome, lead_telefone, lead_email, lead_origem, cvcrm_lead_id, atribuido_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'sistema', $8, $4)
       RETURNING *`,
      [
        workspaceId,
        presenca.plantao_id,
        presenca.id,
        userId,
        lead.nome,
        lead.telefone || lead.celular || null,
        lead.email || null,
        lead.cvcrm_id,
      ]
    );

    // 4. Atualizar presença: feedback_pendente, leads_ativos++
    await client.query(
      `UPDATE recepcao_presencas
       SET feedback_pendente = true,
           leads_ativos = leads_ativos + 1,
           updated_at = NOW()
       WHERE id = $1`,
      [presenca.id]
    );

    // 5. Mover corretor pro fim da fila
    const maxPosResult = await client.query<{ max_pos: number }>(
      `SELECT COALESCE(MAX(posicao_fila), 0) as max_pos
       FROM recepcao_presencas
       WHERE plantao_id = $1 AND status = 'presente'`,
      [presenca.plantao_id]
    );

    await client.query(
      `UPDATE recepcao_presencas
       SET posicao_fila = $1
       WHERE id = $2`,
      [(maxPosResult.rows[0]?.max_pos || 0) + 1, presenca.id]
    );

    await client.query('COMMIT');

    // 6. Notificar corretor via WhatsApp (fire-and-forget)
    const corretorTelefone = (user as any).telefone;
    if (corretorTelefone) {
      const telefoneDisplay = lead.telefone || lead.celular || 'sem telefone';
      sendToCorretor(
        corretorTelefone,
        `🎯 *Novo lead pra você!*\n\n` +
        `👤 ${lead.nome}\n` +
        `📞 ${telefoneDisplay}\n` +
        `📍 Origem: ${lead.origem || 'N/A'}\n` +
        `⏰ ${lead.motivo === 'abandonado' ? 'Lead sem contato há 7+ dias' : 'Lead sem corretor'}\n\n` +
        `Abra o app para ver os detalhes e anotar o atendimento.`
      ).catch((err) => console.error('Erro ao notificar corretor:', err));
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          atribuicao: atribuicaoResult.rows[0],
          lead: {
            cvcrm_id: lead.cvcrm_id,
            nome: lead.nome,
            telefone: lead.telefone,
            celular: lead.celular,
            email: lead.email,
            origem: lead.origem,
            situacao_nome: lead.situacao_nome,
            motivo: lead.motivo,
          },
        },
        message: `Lead "${lead.nome}" atribuído a você!`,
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao puxar lead:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao puxar lead' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
