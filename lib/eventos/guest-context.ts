/**
 * Funcoes para gerenciar contexto de convidados de eventos
 *
 * Usado pelo webhook do Evolution para detectar se uma mensagem
 * vem de um convidado de evento e passar o contexto para a Sofia.
 */

import { dbQuery } from '@/lib/db';
import type { Evento, EventoConvidado, EventoContext, ConvidadoStatus } from './types';

// ============================================
// BUSCA DE CONVIDADOS
// ============================================

/**
 * Busca convidado de evento pelo telefone
 * Retorna o contexto se encontrar um convidado com convite enviado
 */
export async function buscarConvidadoPorTelefone(
  workspaceId: number,
  telefone: string
): Promise<EventoContext | null> {
  // Normaliza o telefone para busca
  const telefoneLimpo = telefone.replace(/\D/g, '');

  // Formatos possiveis de busca
  const formatos = [
    telefoneLimpo,
    telefoneLimpo.startsWith('55') ? telefoneLimpo.slice(2) : `55${telefoneLimpo}`,
    `+${telefoneLimpo}`,
    `+55${telefoneLimpo.startsWith('55') ? telefoneLimpo.slice(2) : telefoneLimpo}`,
  ];

  // Busca convidado com convite enviado em evento ativo
  const { rows } = await dbQuery(
    `SELECT
      ec.*,
      e.id as evento_id,
      e.nome as evento_nome,
      e.descricao as evento_descricao,
      e.data_hora as evento_data_hora,
      e.local as evento_local,
      e.lembrete_horas as evento_lembrete_horas,
      e.status as evento_status,
      COALESCE(e.com_sofia, true) as evento_com_sofia
    FROM evento_convidados ec
    JOIN eventos e ON e.id = ec.evento_id
    WHERE ec.workspace_id = $1
      AND e.status = 'ativo'
      AND ec.convite_enviado_at IS NOT NULL
      AND (
        ec.celular = $2
        OR ec.celular = $3
        OR ec.celular = $4
        OR ec.celular = $5
        OR ec.celular LIKE $6
      )
    ORDER BY ec.convite_enviado_at DESC
    LIMIT 1`,
    [
      workspaceId,
      formatos[0],
      formatos[1],
      formatos[2],
      formatos[3],
      `%${telefoneLimpo.slice(-9)}`, // Ultimos 9 digitos
    ]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  const evento: Evento = {
    id: row.evento_id,
    workspace_id: workspaceId,
    nome: row.evento_nome,
    descricao: row.evento_descricao,
    data_hora: row.evento_data_hora,
    local: row.evento_local,
    lembrete_horas: row.evento_lembrete_horas,
    status: row.evento_status,
    com_sofia: row.evento_com_sofia ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };

  const convidado: EventoConvidado = {
    id: row.id,
    evento_id: row.evento_id,
    workspace_id: row.workspace_id,
    nome: row.nome,
    celular: row.celular,
    origem: row.origem,
    cvcrm_id: row.cvcrm_id,
    status: row.status,
    convite_enviado_at: row.convite_enviado_at,
    lembrete_enviado_at: row.lembrete_enviado_at,
    confirmado_at: row.confirmado_at,
    created_at: row.created_at,
  };

  return {
    evento,
    convidado,
    isEventGuest: true,
  };
}

// ============================================
// ATUALIZACAO DE STATUS
// ============================================

/**
 * Atualiza o status do convidado
 */
export async function atualizarStatusConvidado(
  convidadoId: string,
  novoStatus: ConvidadoStatus
): Promise<void> {
  await dbQuery(
    `UPDATE evento_convidados
     SET status = $1, confirmado_at = NOW()
     WHERE id = $2`,
    [novoStatus, convidadoId]
  );
}

/**
 * Marca convite como enviado
 */
export async function marcarConviteEnviado(
  convidadoId: string
): Promise<void> {
  await dbQuery(
    `UPDATE evento_convidados
     SET convite_enviado_at = NOW()
     WHERE id = $1`,
    [convidadoId]
  );
}

/**
 * Marca lembrete como enviado
 */
export async function marcarLembreteEnviado(
  convidadoId: string
): Promise<void> {
  await dbQuery(
    `UPDATE evento_convidados
     SET lembrete_enviado_at = NOW()
     WHERE id = $1`,
    [convidadoId]
  );
}

// ============================================
// QUERIES UTILITARIAS
// ============================================

/**
 * Busca todos os convidados de um evento
 */
export async function listarConvidados(
  eventoId: string
): Promise<EventoConvidado[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM evento_convidados
     WHERE evento_id = $1
     ORDER BY nome`,
    [eventoId]
  );

  return rows as EventoConvidado[];
}

/**
 * Busca convidados pendentes de convite
 */
export async function listarConvidadosPendentesConvite(
  eventoId: string
): Promise<EventoConvidado[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM evento_convidados
     WHERE evento_id = $1
       AND convite_enviado_at IS NULL
     ORDER BY nome`,
    [eventoId]
  );

  return rows as EventoConvidado[];
}

/**
 * Busca convidados para envio de lembrete
 * (confirmados ou "talvez" que ainda nao receberam lembrete)
 */
export async function listarConvidadosParaLembrete(
  eventoId: string
): Promise<EventoConvidado[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM evento_convidados
     WHERE evento_id = $1
       AND convite_enviado_at IS NOT NULL
       AND lembrete_enviado_at IS NULL
       AND status IN ('confirmado', 'talvez')
     ORDER BY nome`,
    [eventoId]
  );

  return rows as EventoConvidado[];
}

/**
 * Busca estatisticas de um evento
 */
export async function getEstatisticasEvento(
  eventoId: string
): Promise<{
  total: number;
  pendentes: number;
  confirmados: number;
  recusados: number;
  talvez: number;
  convitesEnviados: number;
  lembretesEnviados: number;
}> {
  const { rows } = await dbQuery(
    `SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
      COUNT(*) FILTER (WHERE status = 'confirmado') as confirmados,
      COUNT(*) FILTER (WHERE status = 'recusado') as recusados,
      COUNT(*) FILTER (WHERE status = 'talvez') as talvez,
      COUNT(*) FILTER (WHERE convite_enviado_at IS NOT NULL) as convites_enviados,
      COUNT(*) FILTER (WHERE lembrete_enviado_at IS NOT NULL) as lembretes_enviados
    FROM evento_convidados
    WHERE evento_id = $1`,
    [eventoId]
  );

  const stats = rows[0];

  return {
    total: parseInt(stats.total, 10),
    pendentes: parseInt(stats.pendentes, 10),
    confirmados: parseInt(stats.confirmados, 10),
    recusados: parseInt(stats.recusados, 10),
    talvez: parseInt(stats.talvez, 10),
    convitesEnviados: parseInt(stats.convites_enviados, 10),
    lembretesEnviados: parseInt(stats.lembretes_enviados, 10),
  };
}

// ============================================
// EVENTOS
// ============================================

/**
 * Busca eventos ativos com lembrete pendente
 * (para o cron job de lembretes)
 */
export async function listarEventosParaLembrete(
  workspaceId: number
): Promise<Evento[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM eventos
     WHERE workspace_id = $1
       AND status = 'ativo'
       AND data_hora > NOW()
       AND data_hora <= NOW() + (lembrete_horas || ' hours')::interval
     ORDER BY data_hora`,
    [workspaceId]
  );

  return rows as Evento[];
}

/**
 * Busca evento por ID
 */
export async function buscarEvento(
  eventoId: string
): Promise<Evento | null> {
  const { rows } = await dbQuery(
    `SELECT * FROM eventos WHERE id = $1`,
    [eventoId]
  );

  return rows[0] as Evento | null;
}

/**
 * Verifica se telefone esta em algum evento ativo (cache-friendly)
 * Usado para decisao rapida no webhook
 */
export async function isConvidadoDeEventoAtivo(
  workspaceId: number,
  telefone: string
): Promise<boolean> {
  const telefoneLimpo = telefone.replace(/\D/g, '');

  const { rows } = await dbQuery(
    `SELECT 1 FROM evento_convidados ec
     JOIN eventos e ON e.id = ec.evento_id
     WHERE ec.workspace_id = $1
       AND e.status = 'ativo'
       AND ec.convite_enviado_at IS NOT NULL
       AND (
         ec.celular LIKE $2
         OR ec.celular LIKE $3
       )
     LIMIT 1`,
    [
      workspaceId,
      `%${telefoneLimpo.slice(-9)}`,
      `%${telefoneLimpo}`,
    ]
  );

  return rows.length > 0;
}
