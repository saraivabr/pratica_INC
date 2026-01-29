import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/salva-leads/agendar-visita
 * 
 * Agenda uma visita e notifica o corretor
 * Body:
 * - lead_id (string)
 * - data_visita (string - ISO format)
 * - horario (string - "HH:mm")
 * - observacoes (string, opcional)
 * - tenant_id (number)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, data_visita, horario, observacoes, tenant_id } = body;

    if (!lead_id || !data_visita || !horario || !tenant_id) {
      return NextResponse.json(
        { error: 'lead_id, data_visita, horario e tenant_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar lead
    const leadResult = await pool.query(
      `SELECT * FROM leads WHERE id = $1 AND tenant_id = $2`,
      [lead_id, tenant_id]
    );

    if (!leadResult.rows[0]) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }

    const lead = leadResult.rows[0];

    // Combinar data e horário
    const [hora, minuto] = horario.split(':').map(Number);
    const dataAgendamento = new Date(data_visita);
    dataAgendamento.setHours(hora, minuto, 0, 0);

    // Criar agendamento de visita
    const agendamentoResult = await pool.query(
      `INSERT INTO leads_visits (
        lead_id,
        tenant_id,
        scheduled_date,
        status,
        observacoes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        lead_id,
        tenant_id,
        dataAgendamento.toISOString(),
        'agendada',
        observacoes || null,
      ]
    );

    if (!agendamentoResult.rows[0]) {
      throw new Error('Falha ao agendar visita');
    }

    // Atualizar status do lead
    await pool.query(
      `UPDATE leads SET status = 'agendado', updated_at = NOW() WHERE id = $1`,
      [lead_id]
    );

    // Buscar corretor para enviar notificação
    if (lead.corretor_id) {
      const corretorResult = await pool.query(
        `SELECT telefone, nome FROM users WHERE id = $1`,
        [lead.corretor_id]
      );

      if (corretorResult.rows[0]) {
        const corretor = corretorResult.rows[0];
        const dataFormatada = new Date(dataAgendamento).toLocaleDateString('pt-BR');
        
        try {
          const { sendTextMessage } = await import('@/lib/zapi');
          const msg = `📅 VISITA AGENDADA!\n\n👤 Cliente: ${lead.nome}\n📱 ${lead.whatsapp}\n🏢 Imóvel: ${lead.imovel_nome}\n📍 Data: ${dataFormatada} às ${horario}\n${observacoes ? `\n📝 Obs: ${observacoes}` : ''}\n\nNão se atrase! ⏰`;
          
          await sendTextMessage(corretor.telefone, msg);

          // Enviar também para o cliente confirmar
          const msgCliente = `Olá ${lead.nome}! 📅\n\nSua visita está confirmada!\n🏢 ${lead.imovel_nome}\n📍 ${dataFormatada} às ${horario}\n\nNos vemos lá! 🚀`;
          await sendTextMessage(lead.whatsapp, msgCliente);
        } catch (err) {
          console.warn('[Agendar Visita] Erro ao enviar notificação:', err);
        }
      }
    }

    // Registrar interação
    try {
      await pool.query(
        `INSERT INTO leads_interactions (
          lead_id,
          tenant_id,
          tipo,
          descricao,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [
          lead_id,
          tenant_id,
          'agendamento_visita',
          `Visita agendada para ${new Date(dataAgendamento).toLocaleDateString('pt-BR')} às ${horario}`,
        ]
      );
    } catch (err) {
      console.warn('[Agendar Visita] Erro ao registrar interação:', err);
    }

    return NextResponse.json({
      success: true,
      agendamento: {
        id: agendamentoResult.rows[0].id,
        lead_id: lead_id,
        scheduled_date: dataAgendamento.toISOString(),
        status: 'agendada',
        notificacoes_enviadas: true,
      },
    });

  } catch (error: any) {
    console.error('[Agendar Visita] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
