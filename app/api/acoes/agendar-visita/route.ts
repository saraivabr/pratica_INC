import { NextRequest, NextResponse } from 'next/server';
import { withTenant } from '@/lib/tenant-context';
import { sendToClient } from '@/lib/evolution-helpers';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireWorkspaceContext(request);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const {
      lead_id,
      corretor_id = 'default-user',
      data_visita,
      imovel_id,
      imovel_nome,
      imovel_endereco,
      notas,
      duracao_minutos = 60,
      enviar_whatsapp = true,
    } = body;

    if (!lead_id || !data_visita) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: lead_id, data_visita' },
        { status: 400 }
      );
    }

    return await withTenant(ctx.workspaceId, async (client) => {
      const { rows: leadRows } = await client.query(
        `SELECT id, name, phone, email FROM leads WHERE id = $1`,
        [lead_id]
      );

      if (leadRows.length === 0) {
        return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
      }

      const lead = leadRows[0];

      const { rows: agendamentoRows } = await client.query(
        `
        INSERT INTO agendamentos (
          lead_id, corretor_id, cliente_nome, cliente_telefone, cliente_email,
          imovel_id, imovel_nome, imovel_endereco,
          data_visita, duracao_minutos, notas, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pendente')
        RETURNING *
        `,
        [
          lead_id, corretor_id, lead.name, lead.phone, lead.email || null,
          imovel_id || null, imovel_nome || null, imovel_endereco || null,
          data_visita, duracao_minutos, notas || null,
        ]
      );

      const agendamento = agendamentoRows[0];
      let whatsapp_enviado = false;

      if (enviar_whatsapp && lead.phone) {
        try {
          const dataFormatada = new Date(data_visita).toLocaleString('pt-BR', {
            dateStyle: 'full',
            timeStyle: 'short',
          });

          const mensagem = `📅 *Visita Agendada!*\n\n` +
            `Olá ${lead.name},\n\n` +
            `Sua visita foi confirmada:\n\n` +
            `🏠 Imóvel: ${imovel_nome || 'A definir'}\n` +
            `📍 ${imovel_endereco || 'Endereço a confirmar'}\n` +
            `📆 ${dataFormatada}\n\n` +
            `Confirme respondendo *SIM*.`;

          whatsapp_enviado = await sendToClient(lead.phone, mensagem, corretor_id);
        } catch (error: any) {
          console.error('[Agendamento] Erro WhatsApp:', error);
        }
      }

      return NextResponse.json({
        success: true,
        agendamento,
        whatsapp_enviado,
      }, { status: 201 });
    });
  } catch (error: any) {
    console.error('[POST /api/acoes/agendar-visita] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao agendar visita', details: error.message },
      { status: 500 }
    );
  }
}
