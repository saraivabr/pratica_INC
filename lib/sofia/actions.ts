/**
 * Sofia Actions - Funcoes para Sofia executar acoes no sistema
 *
 * Este modulo contem funcoes que a Sofia pode chamar para executar
 * acoes como agendar visitas, enviar materiais, criar lembretes e
 * escalar para gerentes.
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface AgendarVisitaResult {
  success: boolean;
  visitId?: number;
  leadId: string;
  data: string;
  horario: string;
  notificationSent?: boolean;
  error?: string;
}

export interface EnviarMaterialResult {
  success: boolean;
  pdfUrl?: string;
  landingUrl?: string;
  sentTo?: string;
  error?: string;
}

export interface CriarLembreteResult {
  success: boolean;
  activityId?: string;
  corretorId: string;
  mensagem: string;
  data: string;
  error?: string;
}

export interface EscalarParaGerenteResult {
  success: boolean;
  escalationId?: string;
  leadId: string;
  motivo: string;
  corretorId: string;
  gerenteNotificado?: boolean;
  error?: string;
}

export interface RegistrarAtividadeResult {
  success: boolean;
  activityId?: string;
  error?: string;
}

// ============================================================================
// IMPORTS
// ============================================================================

import {
  phonesMatch,
  isValidPhone,
  formatPhoneForWhatsApp,
} from '../phone-utils';

// ============================================================================
// CONFIGURACAO
// ============================================================================

/**
 * Obtem a URL base da API
 * Em ambiente servidor usa a variavel de ambiente ou localhost
 */
function getBaseUrl(): string {
  // Em ambiente de servidor (Node.js)
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  // Em ambiente de cliente (browser)
  return window.location.origin;
}

/**
 * Faz uma requisicao para a API interna
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || errorText;
    } catch {
      errorMessage = errorText || `HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================================================
// FUNCOES DE ACAO
// ============================================================================

/**
 * Agenda uma visita para um lead
 *
 * @param leadId - ID do lead no sistema (id_lead do cvcrm_leads)
 * @param data - Data da visita
 * @param horario - Horario da visita (formato HH:MM)
 * @param options - Opcoes adicionais
 * @returns Resultado do agendamento
 *
 * @example
 * ```ts
 * const result = await agendarVisita('12345', new Date('2024-01-15'), '14:00', {
 *   propertyId: 'emp_123',
 *   notes: 'Cliente prefere tarde'
 * });
 * ```
 */
export async function agendarVisita(
  leadId: string,
  data: Date,
  horario: string,
  options?: {
    propertyId?: string;
    notes?: string;
  }
): Promise<AgendarVisitaResult> {
  try {
    // Formatar data para YYYY-MM-DD
    const dataFormatada = data.toISOString().split('T')[0];

    const result = await fetchApi<{
      success: boolean;
      visit_id?: number;
      lead_id: number;
      date: string;
      time: string;
      notification_sent?: boolean;
    }>(`/api/leads/${leadId}/schedule-visit`, {
      method: 'POST',
      body: JSON.stringify({
        date: dataFormatada,
        time: horario,
        property_id: options?.propertyId,
        notes: options?.notes,
      }),
    });

    return {
      success: result.success,
      visitId: result.visit_id,
      leadId,
      data: dataFormatada,
      horario,
      notificationSent: result.notification_sent,
    };
  } catch (error) {
    console.error('[Sofia Actions] Erro ao agendar visita:', error);
    return {
      success: false,
      leadId,
      data: data.toISOString().split('T')[0],
      horario,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Envia material de empreendimento via WhatsApp
 *
 * @param telefone - Telefone do destinatario (com ou sem codigo do pais)
 * @param empreendimentoId - ID do empreendimento
 * @param options - Opcoes adicionais
 * @returns Resultado do envio
 *
 * @example
 * ```ts
 * const result = await enviarMaterial('11999999999', 'emp_123', {
 *   tipo: 'book',
 *   userId: 'user_456'
 * });
 * ```
 */
export async function enviarMaterial(
  telefone: string,
  empreendimentoId: string,
  options?: {
    tipo?: 'tabela' | 'simulacao' | 'book';
    userId?: string;
    simulacao?: {
      valorImovel: number;
      entrada: number;
      percentualEntrada: number;
      valorFinanciado: number;
      prazoMeses: number;
      taxaAnual: number;
      parcelaMensal: number;
      totalPago: number;
      totalJuros: number;
    };
    unidade?: {
      numero: string;
      tipo: string;
    };
  }
): Promise<EnviarMaterialResult> {
  try {
    // Primeiro, buscar dados do empreendimento
    const empResponse = await fetchApi<{
      success: boolean;
      data: Array<{
        id: string;
        nome: string;
        cidade?: string;
        bairro?: string;
        construtora?: string;
        previsaoEntrega?: string;
        tipo?: string;
        descricao?: string;
        diferenciais?: string[];
        imagemPrincipal?: string;
        precoMinimo?: number;
        precoMaximo?: number;
      }>;
    }>('/api/empreendimentos');

    const empreendimento = empResponse.data.find(
      (e) => e.id === empreendimentoId
    );

    if (!empreendimento) {
      return {
        success: false,
        error: `Empreendimento ${empreendimentoId} nao encontrado`,
      };
    }

    // Buscar unidades do empreendimento
    const unidadesResponse = await fetchApi<{
      success: boolean;
      data: Array<{
        id: string;
        tipo: string;
        metragem: number;
        valor: number;
        status: string;
        quartos: number;
        vagas: number;
        andar?: number;
        final?: string;
      }>;
    }>(`/api/unidades?empreendimentoId=${empreendimentoId}`);

    const unidades = unidadesResponse.data || [];

    // Buscar usuario pelo telefone se nao foi fornecido userId
    let userId = options?.userId;
    if (!userId) {
      // Tentar encontrar usuario pelo telefone
      const corretoresResponse = await fetchApi<{
        success: boolean;
        data: Array<{ id: string; telefone: string }>;
      }>('/api/corretores');

      // Usar comparacao robusta de telefones
      const corretor = corretoresResponse.data?.find((c) => {
        return phonesMatch(telefone, c.telefone, 'high');
      });

      if (corretor) {
        userId = corretor.id;
      }
    }

    if (!userId) {
      return {
        success: false,
        error: 'Usuario nao encontrado para o telefone informado',
      };
    }

    // Enviar material
    const tipo = options?.tipo || 'book';
    const result = await fetchApi<{
      success: boolean;
      data?: {
        pdfUrl: string;
        landingUrl: string;
        sentTo: string;
      };
      error?: string;
    }>('/api/whatsapp/send-material', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        type: tipo,
        empreendimento: {
          id: empreendimento.id,
          nome: empreendimento.nome,
          cidade: empreendimento.cidade,
          bairro: empreendimento.bairro,
          construtora: empreendimento.construtora,
          previsaoEntrega: empreendimento.previsaoEntrega,
          tipo: empreendimento.tipo,
          descricao: empreendimento.descricao,
          diferenciais: empreendimento.diferenciais,
          imagemPrincipal: empreendimento.imagemPrincipal,
          precoMinimo: empreendimento.precoMinimo,
          precoMaximo: empreendimento.precoMaximo,
        },
        unidades: unidades.map((u) => ({
          id: u.id,
          tipo: u.tipo,
          metragem: u.metragem,
          valor: u.valor,
          status: u.status,
          quartos: u.quartos,
          vagas: u.vagas,
          andar: u.andar,
          final: u.final,
        })),
        simulacao: options?.simulacao,
        unidade: options?.unidade,
      }),
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Falha ao enviar material',
      };
    }

    return {
      success: true,
      pdfUrl: result.data?.pdfUrl,
      landingUrl: result.data?.landingUrl,
      sentTo: result.data?.sentTo,
    };
  } catch (error) {
    console.error('[Sofia Actions] Erro ao enviar material:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Cria um lembrete para o corretor
 *
 * @param corretorId - ID do corretor
 * @param mensagem - Mensagem do lembrete
 * @param data - Data/hora do lembrete
 * @param options - Opcoes adicionais
 * @returns Resultado da criacao
 *
 * @example
 * ```ts
 * const result = await criarLembrete(
 *   'corretor_123',
 *   'Ligar para cliente sobre visita',
 *   new Date('2024-01-15T14:00:00'),
 *   { leadId: 'lead_456', priority: 'high' }
 * );
 * ```
 */
export async function criarLembrete(
  corretorId: string,
  mensagem: string,
  data: Date,
  options?: {
    leadId?: string;
    priority?: 'low' | 'medium' | 'high';
  }
): Promise<CriarLembreteResult> {
  try {
    const result = await fetchApi<{
      id: string;
      title: string;
      scheduled_at: string;
    }>('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify({
        user_id: corretorId,
        lead_id: options?.leadId || null,
        title: 'Lembrete Sofia',
        description: mensagem,
        activity_type: 'reminder',
        scheduled_at: data.toISOString(),
        priority: options?.priority || 'medium',
      }),
    });

    return {
      success: true,
      activityId: result.id,
      corretorId,
      mensagem,
      data: data.toISOString(),
    };
  } catch (error) {
    console.error('[Sofia Actions] Erro ao criar lembrete:', error);
    return {
      success: false,
      corretorId,
      mensagem,
      data: data.toISOString(),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Registra uma atividade simples no CRM
 *
 * @param userId - ID do usuario
 * @param title - Titulo da atividade
 * @param description - Descricao detalhada
 * @param options - Opcoes adicionais
 */
export async function registrarAtividade(
  userId: string,
  title: string,
  description: string,
  options?: {
    leadId?: string | null;
    activityType?: string;
    priority?: 'low' | 'medium' | 'high';
    scheduledAt?: Date;
  }
): Promise<RegistrarAtividadeResult> {
  try {
    const result = await fetchApi<{
      id: string;
    }>('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        lead_id: options?.leadId || null,
        title,
        description,
        activity_type: options?.activityType || 'note',
        scheduled_at: (options?.scheduledAt || new Date()).toISOString(),
        priority: options?.priority || 'medium',
      }),
    });

    return {
      success: true,
      activityId: result.id,
    };
  } catch (error) {
    console.error('[Sofia Actions] Erro ao registrar atividade:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Escala um lead para o gerente
 *
 * @param leadId - ID do lead
 * @param motivo - Motivo da escalacao
 * @param corretorId - ID do corretor que esta escalando
 * @param options - Opcoes adicionais
 * @returns Resultado da escalacao
 *
 * @example
 * ```ts
 * const result = await escalarParaGerente(
 *   'lead_123',
 *   'Cliente insatisfeito com atendimento',
 *   'corretor_456',
 *   { urgente: true }
 * );
 * ```
 */
export async function escalarParaGerente(
  leadId: string,
  motivo: string,
  corretorId: string,
  options?: {
    urgente?: boolean;
    gerenteId?: string;
  }
): Promise<EscalarParaGerenteResult> {
  try {
    // Criar atividade de escalacao para o gerente
    const escalationActivity = await fetchApi<{
      id: string;
    }>('/api/crm/activities', {
      method: 'POST',
      body: JSON.stringify({
        user_id: options?.gerenteId || corretorId, // Se nao tiver gerente, cria para o proprio corretor
        lead_id: leadId,
        title: options?.urgente ? 'URGENTE: Escalacao para Gerente' : 'Escalacao para Gerente',
        description: `Motivo: ${motivo}\n\nEscalado por: Corretor ${corretorId}\nVia: Sofia (IA)`,
        activity_type: 'escalation',
        scheduled_at: new Date().toISOString(),
        priority: options?.urgente ? 'high' : 'medium',
      }),
    });

    // Registrar interacao no lead
    try {
      await fetchApi('/api/interacoes', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: leadId,
          tipo: 'escalation',
          descricao: `Lead escalado para gerente. Motivo: ${motivo}`,
          user_id: corretorId,
        }),
      });
    } catch (interacaoError) {
      console.warn('[Sofia Actions] Erro ao registrar interacao:', interacaoError);
      // Nao falha a operacao principal
    }

    // Tentar notificar gerente via WhatsApp (se configurado)
    let gerenteNotificado = false;
    if (options?.gerenteId) {
      try {
        // Buscar dados do lead para a notificacao
        const leadResponse = await fetchApi<{
          success: boolean;
          data: Array<{ nome: string; telefone: string }>;
        }>(`/api/leads?id=${leadId}`);

        const lead = leadResponse.data?.[0];
        const leadNome = lead?.nome || `Lead #${leadId}`;

        // Criar notificacao (usando sistema de atividades)
        await fetchApi('/api/crm/activities', {
          method: 'POST',
          body: JSON.stringify({
            user_id: options.gerenteId,
            lead_id: leadId,
            title: `Notificacao: Lead ${leadNome} escalado`,
            description: `O corretor ${corretorId} escalou o lead ${leadNome}.\n\nMotivo: ${motivo}`,
            activity_type: 'notification',
            scheduled_at: new Date().toISOString(),
            priority: options?.urgente ? 'high' : 'medium',
          }),
        });

        gerenteNotificado = true;
      } catch (notifyError) {
        console.warn('[Sofia Actions] Erro ao notificar gerente:', notifyError);
      }
    }

    return {
      success: true,
      escalationId: escalationActivity.id,
      leadId,
      motivo,
      corretorId,
      gerenteNotificado,
    };
  } catch (error) {
    console.error('[Sofia Actions] Erro ao escalar para gerente:', error);
    return {
      success: false,
      leadId,
      motivo,
      corretorId,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

// ============================================================================
// FUNCOES AUXILIARES
// ============================================================================

/**
 * Valida formato de horario (HH:MM)
 */
export function validarHorario(horario: string): boolean {
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(horario);
}

/**
 * Valida formato de telefone brasileiro
 * Usa validacao robusta que considera diversos formatos
 */
export function validarTelefone(telefone: string): boolean {
  return isValidPhone(telefone);
}

/**
 * Formata telefone para padrao WhatsApp (55 + DDD + numero)
 */
export function formatarTelefone(telefone: string): string {
  return formatPhoneForWhatsApp(telefone, true);
}
