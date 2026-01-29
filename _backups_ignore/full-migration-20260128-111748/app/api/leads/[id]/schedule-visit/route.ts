/**
 * API: Agendar visita para um lead
 *
 * POST /api/leads/[id]/schedule-visit
 * Body: { date: string, time: string, property_id?: string, notes?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import { dbQuery } from '@/lib/db';
import { sendTextMessage, formatPhoneNumber } from '@/lib/evolution-api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId, tenant, user } = ctx;

    const { id } = await params;
    const leadId = parseInt(id);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { date, time, property_id, notes } = body;

    if (!date || !time) {
      return NextResponse.json({ error: 'Data e horário são obrigatórios' }, { status: 400 });
    }

    // Buscar dados do lead (com verificação de tenant)
    const leadResult = await dbQuery(
      `SELECT idlead, nome, telefone, corretor_id, corretor
       FROM cvcrm_leads
       WHERE idlead = $1 AND tenant_id = $2`,
      [leadId, tenantId]
    );

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const lead = leadResult.rows[0];
    const corretor = typeof lead.corretor === 'string' ? JSON.parse(lead.corretor) : lead.corretor;

    // Criar agendamento no banco
    const visitResult = await dbQuery(
      `INSERT INTO visitas_agendadas
       (lead_id, lead_name, lead_phone, scheduled_date, scheduled_time, property_id, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [leadId, lead.nome, lead.telefone, date, time, property_id || null, notes || null, (user as any).id]
    ).catch(async (err) => {
      // Se tabela não existe, criar
      if (err.message.includes('does not exist')) {
        await dbQuery(`
          CREATE TABLE IF NOT EXISTS visitas_agendadas (
            id SERIAL PRIMARY KEY,
            lead_id INTEGER NOT NULL,
            lead_name VARCHAR(255),
            lead_phone VARCHAR(50),
            scheduled_date DATE NOT NULL,
            scheduled_time TIME NOT NULL,
            property_id VARCHAR(100),
            notes TEXT,
            status VARCHAR(50) DEFAULT 'scheduled',
            created_by VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        // Tentar inserir novamente
        return dbQuery(
          `INSERT INTO visitas_agendadas
           (lead_id, lead_name, lead_phone, scheduled_date, scheduled_time, property_id, notes, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           RETURNING id`,
          [leadId, lead.nome, lead.telefone, date, time, property_id || null, notes || null, (user as any).id]
        );
      }
      throw err;
    });

    // Atualizar estágio do lead para "visita_agendada" (com verificação de tenant)
    await dbQuery(
      `UPDATE cvcrm_leads
       SET situacao_id = 4,
           situacao = jsonb_set(COALESCE(situacao, '{}')::jsonb, '{nome}', '"visita_agendada"'),
           updated_at = NOW()
       WHERE idlead = $1 AND tenant_id = $2`,
      [leadId, tenantId]
    ).catch(err => console.warn('[Visit] Erro ao atualizar estágio:', err.message));

    // Registrar interação
    await dbQuery(
      `INSERT INTO interacoes (lead_id, tipo, descricao, user_id, created_at)
       VALUES ($1, 'visit_scheduled', $2, $3, NOW())`,
      [leadId, `Visita agendada para ${date} às ${time}`, (user as any).id]
    ).catch(err => console.warn('[Visit] Erro ao registrar interação:', err.message));

    // Tentar notificar corretor via WhatsApp
    let notificationSent = false;
    try {
      const instances = tenant.evolution_instances || [];
      const activeInstance = instances.find((i: any) => i.status === 'connected' || i.status === 'open');

      if (activeInstance && corretor?.telefone) {
        const notificationMsg = [
          `📅 *Nova visita agendada!*`,
          ``,
          `👤 Cliente: ${lead.nome}`,
          `📞 Telefone: ${lead.telefone}`,
          `📆 Data: ${date}`,
          `⏰ Horário: ${time}`,
          notes ? `📝 Obs: ${notes}` : '',
        ].filter(Boolean).join('\n');

        await sendTextMessage(activeInstance.instance_name, {
          number: formatPhoneNumber(corretor.telefone),
          text: notificationMsg
        });
        notificationSent = true;
      }

    } catch (notifyError) {
      console.warn('[Visit] Erro ao notificar corretor:', notifyError);
    }

    return NextResponse.json({
      success: true,
      visit_id: visitResult.rows[0]?.id,
      lead_id: leadId,
      date,
      time,
      notification_sent: notificationSent
    });

  } catch (error: any) {
    console.error('[API] Erro ao agendar visita:', error);
    return NextResponse.json(
      { error: 'Erro ao agendar visita', details: error.message },
      { status: 500 }
    );
  }
}
