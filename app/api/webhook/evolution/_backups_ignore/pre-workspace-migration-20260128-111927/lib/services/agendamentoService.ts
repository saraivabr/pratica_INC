/**
 * Serviço de Agendamentos
 * Gerencia criação, confirmação e lembretes de agendamentos de visitas
 */

import { dbQuery } from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';
import { notificarAgendamentoProximo } from './notificacaoService';

export interface AgendamentoData {
  lead_id: string;
  corretor_id: string;
  data_visita: string; // ISO date string
  imovel_id?: string;
  imovel_nome?: string;
  imovel_endereco?: string;
  notas?: string;
  duracao_minutos?: number;
}

/**
 * Cria um novo agendamento
 */
export async function criarAgendamento(data: AgendamentoData) {
  // Buscar dados do lead
  const { rows: leadRows } = await dbQuery(
    `SELECT id, name, phone, email FROM leads WHERE id = $1`,
    [data.lead_id]
  );

  if (leadRows.length === 0) {
    throw new Error('Lead não encontrado');
  }

  const lead = leadRows[0];

  // Criar agendamento
  const { rows } = await dbQuery(
    `
    INSERT INTO agendamentos (
      lead_id, corretor_id, cliente_nome, cliente_telefone, cliente_email,
      imovel_id, imovel_nome, imovel_endereco,
      data_visita, duracao_minutos, notas, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pendente')
    RETURNING *
    `,
    [
      data.lead_id,
      data.corretor_id,
      lead.name,
      lead.phone,
      lead.email || null,
      data.imovel_id || null,
      data.imovel_nome || null,
      data.imovel_endereco || null,
      data.data_visita,
      data.duracao_minutos || 60,
      data.notas || null,
    ]
  );

  const agendamento = rows[0];

  // Agendar lembrete 1h antes
  await agendarLembrete1hAntes(agendamento.id);

  return agendamento;
}

/**
 * Agenda lembrete automático 1 hora antes da visita
 */
export async function agendarLembrete1hAntes(agendamento_id: string) {
  const { rows: agendamentoRows } = await dbQuery(
    `SELECT * FROM agendamentos WHERE id = $1`,
    [agendamento_id]
  );

  if (agendamentoRows.length === 0) {
    throw new Error('Agendamento não encontrado');
  }

  const agendamento = agendamentoRows[0];
  const dataVisita = new Date(agendamento.data_visita);
  const dataLembrete = new Date(dataVisita.getTime() - 60 * 60 * 1000); // 1h antes

  // Só agendar se for no futuro
  if (dataLembrete <= new Date()) {
    return null;
  }

  // Criar follow-up para lembrete
  const { rows } = await dbQuery(
    `
    INSERT INTO followups (
      lead_id, corretor_id, tipo, mensagem,
      agendado_para, canal, status, metadata
    ) VALUES ($1, $2, 'lembrete_visita', $3, $4, 'whatsapp', 'agendado', $5)
    RETURNING *
    `,
    [
      agendamento.lead_id,
      agendamento.corretor_id,
      `Lembrete: Visita em 1 hora! 🔔`,
      dataLembrete.toISOString(),
      JSON.stringify({ agendamento_id }),
    ]
  );

  return rows[0];
}

/**
 * Confirma um agendamento
 */
export async function confirmarAgendamento(agendamento_id: string, corretor_id?: string) {
  const { rows } = await dbQuery(
    `
    UPDATE agendamentos 
    SET confirmado = TRUE,
        confirmado_em = NOW(),
        status = 'confirmado',
        updated_at = NOW()
    WHERE id = $1
      ${corretor_id ? 'AND corretor_id = $2' : ''}
    RETURNING *
    `,
    corretor_id ? [agendamento_id, corretor_id] : [agendamento_id]
  );

  if (rows.length === 0) {
    throw new Error('Agendamento não encontrado ou não pertence a você');
  }

  return rows[0];
}

/**
 * Marca agendamento como realizado
 */
export async function marcarComoRealizado(agendamento_id: string, notas?: string) {
  const { rows } = await dbQuery(
    `
    UPDATE agendamentos 
    SET status = 'realizado',
        notas = COALESCE($2, notas),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [agendamento_id, notas || null]
  );

  if (rows.length === 0) {
    throw new Error('Agendamento não encontrado');
  }

  const agendamento = rows[0];

  // Atualizar lead (temperatura ou score)
  await dbQuery(
    `
    UPDATE leads 
    SET temperature = CASE 
          WHEN temperature = 'cold' THEN 'warm'
          WHEN temperature = 'warm' THEN 'hot'
          ELSE temperature
        END,
        score = LEAST(score + 20, 100),
        last_interaction_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    `,
    [agendamento.lead_id]
  );

  return agendamento;
}

/**
 * Cancela um agendamento
 */
export async function cancelarAgendamento(
  agendamento_id: string,
  motivo: string,
  corretor_id?: string
) {
  const { rows } = await dbQuery(
    `
    UPDATE agendamentos 
    SET status = 'cancelado',
        motivo_cancelamento = $2,
        updated_at = NOW()
    WHERE id = $1
      ${corretor_id ? 'AND corretor_id = $3' : ''}
    RETURNING *
    `,
    corretor_id ? [agendamento_id, motivo, corretor_id] : [agendamento_id, motivo]
  );

  if (rows.length === 0) {
    throw new Error('Agendamento não encontrado ou não pertence a você');
  }

  const agendamento = rows[0];

  // Notificar cliente
  if (agendamento.cliente_telefone) {
    await sendTextMessage(
      agendamento.cliente_telefone,
      `Olá ${agendamento.cliente_nome}, sua visita foi cancelada. Entre em contato para reagendar! 📞`
    );
  }

  return agendamento;
}

/**
 * Reagenda uma visita
 */
export async function reagendarVisita(
  agendamento_id: string,
  nova_data: string,
  motivo?: string
) {
  const { rows } = await dbQuery(
    `
    UPDATE agendamentos 
    SET data_visita = $2,
        status = 'pendente',
        confirmado = FALSE,
        confirmado_em = NULL,
        notas = CONCAT(COALESCE(notas, ''), '\nReagendado: ', COALESCE($3, 'Sem motivo')),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [agendamento_id, nova_data, motivo || null]
  );

  if (rows.length === 0) {
    throw new Error('Agendamento não encontrado');
  }

  const agendamento = rows[0];

  // Agendar novo lembrete
  await agendarLembrete1hAntes(agendamento_id);

  // Notificar cliente
  if (agendamento.cliente_telefone) {
    const dataFormatada = new Date(nova_data).toLocaleString('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    await sendTextMessage(
      agendamento.cliente_telefone,
      `📅 Sua visita foi reagendada!\n\nNova data: ${dataFormatada}\n\nConfirme respondendo SIM.`
    );
  }

  return agendamento;
}

/**
 * Lista agendamentos próximos (próximas 24h)
 */
export async function listarAgendamentosProximos(corretor_id?: string) {
  const query = `
    SELECT 
      a.*,
      l.name as lead_nome,
      l.phone as lead_telefone,
      l.score as lead_score
    FROM agendamentos a
    JOIN leads l ON a.lead_id = l.id
    WHERE a.data_visita BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND a.status IN ('pendente', 'confirmado')
      ${corretor_id ? 'AND a.corretor_id = $1' : ''}
    ORDER BY a.data_visita ASC
  `;

  const { rows } = await dbQuery(query, corretor_id ? [corretor_id] : []);
  return rows;
}

/**
 * Processa lembretes pendentes (executar via cron job)
 */
export async function processarLembretesPendentes() {
  // Buscar follow-ups de lembrete que estão na hora
  const { rows: followupsRows } = await dbQuery(
    `
    SELECT * 
    FROM followups
    WHERE tipo = 'lembrete_visita'
      AND status = 'agendado'
      AND agendado_para <= NOW()
    ORDER BY agendado_para ASC
    LIMIT 100
    `,
    []
  );

  const resultados = [];

  for (const followup of followupsRows) {
    try {
      const agendamento_id = followup.metadata?.agendamento_id;
      if (!agendamento_id) continue;

      // Enviar notificação
      await notificarAgendamentoProximo(agendamento_id);

      // Marcar follow-up como enviado
      await dbQuery(
        `
        UPDATE followups 
        SET status = 'enviado',
            enviado_em = NOW(),
            updated_at = NOW()
        WHERE id = $1
        `,
        [followup.id]
      );

      // Marcar lembrete enviado no agendamento
      await dbQuery(
        `
        UPDATE agendamentos 
        SET lembrete_enviado = TRUE,
            lembrete_enviado_em = NOW()
        WHERE id = $1
        `,
        [agendamento_id]
      );

      resultados.push({ id: followup.id, success: true });
    } catch (error: any) {
      console.error(`[AgendamentoService] Erro ao processar lembrete ${followup.id}:`, error);
      resultados.push({ id: followup.id, success: false, error: error.message });
    }
  }

  return {
    total: followupsRows.length,
    sucesso: resultados.filter((r) => r.success).length,
    falhas: resultados.filter((r) => !r.success).length,
    detalhes: resultados,
  };
}
