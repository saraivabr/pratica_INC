/**
 * Serviço de Notificações
 * Gerencia criação, envio e processamento de notificações para corretores
 */

import { dbQuery } from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';

export interface NotificacaoData {
  corretor_id: string;
  lead_id?: string;
  tipo: string;
  mensagem: string;
  link_acao?: string;
  metadata?: Record<string, any>;
}

export interface CorretorData {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

/**
 * Cria uma notificação no banco de dados
 */
export async function criarNotificacao(data: NotificacaoData) {
  const { rows } = await dbQuery(
    `
    INSERT INTO notificacoes (
      corretor_id, lead_id, tipo, mensagem, link_acao, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      data.corretor_id,
      data.lead_id || null,
      data.tipo,
      data.mensagem,
      data.link_acao || null,
      data.metadata || {},
    ]
  );

  return rows[0];
}

/**
 * Envia notificação via WhatsApp para o corretor
 */
export async function enviarNotificacaoWhatsApp(
  corretor: CorretorData,
  mensagem: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!corretor.telefone) {
      return { success: false, error: 'Corretor sem telefone cadastrado' };
    }

    await sendTextMessage(corretor.telefone, mensagem);
    return { success: true };
  } catch (error: any) {
    console.error('[NotificacaoService] Erro ao enviar WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notifica corretor sobre novo lead
 */
export async function notificarNovoLead(
  corretor_id: string,
  lead_id: string,
  lead_nome: string,
  lead_interesse: string,
  lead_score?: number
) {
  const notificacao = await criarNotificacao({
    corretor_id,
    lead_id,
    tipo: 'novo_lead',
    mensagem: `🔥 Novo lead: ${lead_nome} - ${lead_interesse}`,
    link_acao: `/corretor/leads/${lead_id}`,
    metadata: { score: lead_score },
  });

  // Buscar dados do corretor
  const { rows: corretorRows } = await dbQuery(
    `SELECT id, nome, telefone FROM users WHERE id = $1`,
    [corretor_id]
  );

  if (corretorRows.length > 0 && corretorRows[0].telefone) {
    const mensagemWhatsApp = `🔥 *Novo Lead*\n\n` +
      `Nome: ${lead_nome}\n` +
      `Interesse: ${lead_interesse}\n` +
      `${lead_score ? `Score: ${lead_score}/100\n` : ''}` +
      `\nAcesse o sistema para mais detalhes! 📱`;

    await enviarNotificacaoWhatsApp(corretorRows[0] as CorretorData, mensagemWhatsApp);
  }

  return notificacao;
}

/**
 * Notifica corretor sobre lead aquecido (score aumentou)
 */
export async function notificarLeadAqueceu(
  corretor_id: string,
  lead_id: string,
  lead_nome: string,
  score_anterior: number,
  score_atual: number
) {
  const diferenca = score_atual - score_anterior;

  const notificacao = await criarNotificacao({
    corretor_id,
    lead_id,
    tipo: 'lead_aqueceu',
    mensagem: `🔥 ${lead_nome} está aquecendo! Score: ${score_anterior} → ${score_atual} (+${diferenca})`,
    link_acao: `/corretor/leads/${lead_id}`,
    metadata: { score_anterior, score_atual, diferenca },
  });

  // Enviar WhatsApp se score >= 60 (lead qualificado)
  if (score_atual >= 60) {
    const { rows: corretorRows } = await dbQuery(
      `SELECT id, nome, telefone FROM users WHERE id = $1`,
      [corretor_id]
    );

    if (corretorRows.length > 0 && corretorRows[0].telefone) {
      const mensagemWhatsApp = `⚡ *Lead Aquecido!*\n\n` +
        `${lead_nome} está mais interessado!\n` +
        `Score: ${score_anterior} → ${score_atual} (+${diferenca})\n\n` +
        `💡 Hora de entrar em contato! 📞`;

      await enviarNotificacaoWhatsApp(corretorRows[0] as CorretorData, mensagemWhatsApp);
    }
  }

  return notificacao;
}

/**
 * Notifica corretor sobre agendamento próximo (1 hora antes)
 */
export async function notificarAgendamentoProximo(agendamento_id: string) {
  const { rows: agendamentoRows } = await dbQuery(
    `
    SELECT 
      a.*,
      l.name as lead_nome,
      l.phone as lead_telefone
    FROM agendamentos a
    JOIN leads l ON a.lead_id = l.id
    WHERE a.id = $1
    `,
    [agendamento_id]
  );

  if (agendamentoRows.length === 0) {
    throw new Error('Agendamento não encontrado');
  }

  const agendamento = agendamentoRows[0];

  // Notificar corretor
  const notificacao = await criarNotificacao({
    corretor_id: agendamento.corretor_id,
    lead_id: agendamento.lead_id,
    tipo: 'agendamento_proximo',
    mensagem: `⏰ Visita em 1 hora com ${agendamento.cliente_nome}`,
    link_acao: `/corretor/agendamentos/${agendamento_id}`,
    metadata: {
      imovel: agendamento.imovel_nome,
      horario: agendamento.data_visita,
    },
  });

  const { rows: corretorRows } = await dbQuery(
    `SELECT id, nome, telefone FROM users WHERE id = $1`,
    [agendamento.corretor_id]
  );

  if (corretorRows.length > 0 && corretorRows[0].telefone) {
    const dataVisita = new Date(agendamento.data_visita);
    const horario = dataVisita.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const mensagemWhatsApp = `⏰ *Lembrete de Visita*\n\n` +
      `Cliente: ${agendamento.cliente_nome}\n` +
      `Imóvel: ${agendamento.imovel_nome || 'N/A'}\n` +
      `Horário: ${horario}\n` +
      `📍 ${agendamento.imovel_endereco || 'Endereço a confirmar'}\n\n` +
      `Boa visita! 🏠`;

    await enviarNotificacaoWhatsApp(corretorRows[0] as CorretorData, mensagemWhatsApp);
  }

  // Notificar cliente também
  if (agendamento.lead_telefone) {
    const dataVisita = new Date(agendamento.data_visita);
    const horario = dataVisita.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const mensagemCliente = `⏰ *Lembrete*\n\n` +
      `Sua visita é em 1 hora!\n\n` +
      `🏠 ${agendamento.imovel_nome || 'Imóvel'}\n` +
      `⏱️ ${horario}\n` +
      `📍 ${agendamento.imovel_endereco || 'Endereço a confirmar'}\n\n` +
      `Nos vemos lá! 😊`;

    await sendTextMessage(agendamento.lead_telefone, mensagemCliente);
  }

  return notificacao;
}

/**
 * Processa resposta de confirmação do cliente
 */
export async function processarRespostaConfirmacao(
  telefone: string,
  resposta: string
): Promise<boolean> {
  const respostaNormalizada = resposta.toLowerCase().trim();
  const confirmou = ['sim', 'confirmo', 'ok', 'confirmar', 'yes'].some((palavra) =>
    respostaNormalizada.includes(palavra)
  );

  // Buscar agendamento pendente para este telefone
  const { rows: agendamentoRows } = await dbQuery(
    `
    SELECT a.* 
    FROM agendamentos a
    WHERE a.cliente_telefone = $1 
      AND a.status = 'pendente'
      AND a.confirmado = FALSE
      AND a.data_visita > NOW()
    ORDER BY a.data_visita ASC
    LIMIT 1
    `,
    [telefone]
  );

  if (agendamentoRows.length === 0) {
    return false;
  }

  const agendamento = agendamentoRows[0];

  if (confirmou) {
    // Marcar como confirmado
    await dbQuery(
      `
      UPDATE agendamentos 
      SET confirmado = TRUE, 
          confirmado_em = NOW(),
          status = 'confirmado',
          updated_at = NOW()
      WHERE id = $1
      `,
      [agendamento.id]
    );

    // Notificar corretor
    await notificarNovoLead(
      agendamento.corretor_id,
      agendamento.lead_id,
      agendamento.cliente_nome,
      'Confirmou visita via WhatsApp! ✅'
    );

    // Confirmar com cliente
    await sendTextMessage(
      telefone,
      '✅ Visita confirmada! Obrigado! Te esperamos. 🏠'
    );
  } else {
    // Marcar como cancelado
    await dbQuery(
      `
      UPDATE agendamentos 
      SET status = 'cancelado',
          motivo_cancelamento = 'Cliente não confirmou',
          updated_at = NOW()
      WHERE id = $1
      `,
      [agendamento.id]
    );

    // Notificar corretor
    await criarNotificacao({
      corretor_id: agendamento.corretor_id,
      lead_id: agendamento.lead_id,
      tipo: 'agendamento_cancelado',
      mensagem: `❌ ${agendamento.cliente_nome} cancelou a visita`,
      link_acao: `/corretor/agendamentos/${agendamento.id}`,
    });

    // Responder ao cliente
    await sendTextMessage(
      telefone,
      'Entendido. Se mudar de ideia, estamos à disposição! 😊'
    );
  }

  return confirmou;
}

/**
 * Marca todas as notificações como lidas
 */
export async function marcarTodasComoLidas(corretor_id: string) {
  const { rowCount } = await dbQuery(
    `UPDATE notificacoes SET lida = TRUE, updated_at = NOW() WHERE corretor_id = $1 AND lida = FALSE`,
    [corretor_id]
  );

  return rowCount || 0;
}
