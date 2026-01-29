/**
 * Sistema de Mensagens Proativas da Sofia
 * Gerencia triggers e condições para comunicação proativa com corretores
 */

// Tipos
export interface ProactiveTrigger {
  id: string;
  name: string;
  description: string;
  condition: (data: TriggerData) => boolean;
  priority: 'high' | 'medium' | 'low';
  cooldownHours: number; // Tempo mínimo entre mensagens do mesmo trigger
}

export interface TriggerData {
  userId: string;
  leads?: Lead[];
  meta?: MetaInfo;
  empreendimentos?: Empreendimento[];
  atividades?: Atividade[];
  vendas?: Venda[];
  lastTriggerTime?: Record<string, Date>;
}

export interface Lead {
  id: string;
  nome: string;
  status: 'quente' | 'morno' | 'frio';
  ultimoContato: Date;
  interesse?: string;
}

export interface MetaInfo {
  valor: number;
  atingido: number;
  percentual: number;
  periodo: string;
}

export interface Empreendimento {
  id: string;
  nome: string;
  dataLancamento: Date;
  tipo: string;
  localizacao: string;
}

export interface Atividade {
  id: string;
  titulo: string;
  dataHora: Date;
  tipo: string;
  leadId?: string;
  leadNome?: string;
}

export interface Venda {
  id: string;
  clienteNome: string;
  empreendimento: string;
  dataVenda: Date;
  valor: number;
}

export interface ProactiveMessage {
  triggerId: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: {
    label: string;
    route: string;
  };
  data?: Record<string, any>;
}

export interface TriggerCheckResult {
  triggered: boolean;
  triggerId: string;
  data?: Record<string, any>;
}

// Funções auxiliares
const horasDesde = (data: Date): number => {
  const agora = new Date();
  return (agora.getTime() - new Date(data).getTime()) / (1000 * 60 * 60);
};

const diasDesde = (data: Date): number => {
  return horasDesde(data) / 24;
};

const minutosAte = (data: Date): number => {
  const agora = new Date();
  return (new Date(data).getTime() - agora.getTime()) / (1000 * 60);
};

const isHoje = (data: Date): boolean => {
  const hoje = new Date();
  const dataCheck = new Date(data);
  return (
    dataCheck.getDate() === hoje.getDate() &&
    dataCheck.getMonth() === hoje.getMonth() &&
    dataCheck.getFullYear() === hoje.getFullYear()
  );
};

// PROACTIVE_TRIGGERS - Objeto com triggers e condições
export const PROACTIVE_TRIGGERS: Record<string, ProactiveTrigger> = {
  leadEsfriando: {
    id: 'leadEsfriando',
    name: 'Lead Esfriando',
    description: 'Lead quente sem contato há 24 horas',
    condition: (data: TriggerData) => {
      if (!data.leads || data.leads.length === 0) return false;
      return data.leads.some(
        (lead) => lead.status === 'quente' && horasDesde(lead.ultimoContato) >= 24
      );
    },
    priority: 'high',
    cooldownHours: 12,
  },

  metaProxima: {
    id: 'metaProxima',
    name: 'Meta Próxima',
    description: 'Usuário a 90% ou mais da meta',
    condition: (data: TriggerData) => {
      if (!data.meta) return false;
      return data.meta.percentual >= 90 && data.meta.percentual < 100;
    },
    priority: 'medium',
    cooldownHours: 24,
  },

  novoLancamento: {
    id: 'novoLancamento',
    name: 'Novo Lançamento',
    description: 'Empreendimento lançado hoje',
    condition: (data: TriggerData) => {
      if (!data.empreendimentos || data.empreendimentos.length === 0) return false;
      return data.empreendimentos.some((emp) => isHoje(emp.dataLancamento));
    },
    priority: 'high',
    cooldownHours: 24,
  },

  lembreteAtividade: {
    id: 'lembreteAtividade',
    name: 'Lembrete de Atividade',
    description: 'Atividade agendada para daqui a 1 hora',
    condition: (data: TriggerData) => {
      if (!data.atividades || data.atividades.length === 0) return false;
      return data.atividades.some((ativ) => {
        const minutos = minutosAte(ativ.dataHora);
        return minutos > 0 && minutos <= 60;
      });
    },
    priority: 'high',
    cooldownHours: 1,
  },

  feedbackPosVenda: {
    id: 'feedbackPosVenda',
    name: 'Feedback Pós-Venda',
    description: '7 dias após uma venda realizada',
    condition: (data: TriggerData) => {
      if (!data.vendas || data.vendas.length === 0) return false;
      return data.vendas.some((venda) => {
        const dias = diasDesde(venda.dataVenda);
        return dias >= 7 && dias < 8;
      });
    },
    priority: 'low',
    cooldownHours: 168, // 7 dias
  },
};

/**
 * Verifica todos os triggers proativos para um usuário
 * @param userId - ID do usuário
 * @param data - Dados para verificação dos triggers (opcional, será buscado se não fornecido)
 * @returns Array com os triggers ativados e seus dados
 */
export async function checkProactiveTriggers(
  userId: string,
  data?: Partial<TriggerData>
): Promise<TriggerCheckResult[]> {
  const results: TriggerCheckResult[] = [];

  // Monta os dados do trigger
  const triggerData: TriggerData = {
    userId,
    leads: data?.leads || [],
    meta: data?.meta,
    empreendimentos: data?.empreendimentos || [],
    atividades: data?.atividades || [],
    vendas: data?.vendas || [],
    lastTriggerTime: data?.lastTriggerTime || {},
  };

  // Verifica cada trigger
  for (const [key, trigger] of Object.entries(PROACTIVE_TRIGGERS)) {
    try {
      // Verifica cooldown
      const lastTime = triggerData.lastTriggerTime?.[key];
      if (lastTime) {
        const horasPassadas = horasDesde(lastTime);
        if (horasPassadas < trigger.cooldownHours) {
          continue; // Ainda em cooldown
        }
      }

      // Verifica condição
      if (trigger.condition(triggerData)) {
        const triggerResult: TriggerCheckResult = {
          triggered: true,
          triggerId: key,
          data: extractTriggerData(key, triggerData),
        };
        results.push(triggerResult);
      }
    } catch (error) {
      console.error(`Erro ao verificar trigger ${key}:`, error);
    }
  }

  // Ordena por prioridade
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  results.sort((a, b) => {
    const priorityA = PROACTIVE_TRIGGERS[a.triggerId]?.priority || 'low';
    const priorityB = PROACTIVE_TRIGGERS[b.triggerId]?.priority || 'low';
    return priorityOrder[priorityA] - priorityOrder[priorityB];
  });

  return results;
}

/**
 * Extrai dados relevantes para cada tipo de trigger
 */
function extractTriggerData(
  triggerId: string,
  data: TriggerData
): Record<string, any> | undefined {
  switch (triggerId) {
    case 'leadEsfriando': {
      const leadQuente = data.leads?.find(
        (lead) => lead.status === 'quente' && horasDesde(lead.ultimoContato) >= 24
      );
      return leadQuente
        ? {
            leadId: leadQuente.id,
            leadNome: leadQuente.nome,
            horasSemContato: Math.floor(horasDesde(leadQuente.ultimoContato)),
            interesse: leadQuente.interesse,
          }
        : undefined;
    }

    case 'metaProxima': {
      return data.meta
        ? {
            percentual: data.meta.percentual,
            faltando: data.meta.valor - data.meta.atingido,
            periodo: data.meta.periodo,
          }
        : undefined;
    }

    case 'novoLancamento': {
      const lancamento = data.empreendimentos?.find((emp) => isHoje(emp.dataLancamento));
      return lancamento
        ? {
            empreendimentoId: lancamento.id,
            empreendimentoNome: lancamento.nome,
            tipo: lancamento.tipo,
            localizacao: lancamento.localizacao,
          }
        : undefined;
    }

    case 'lembreteAtividade': {
      const atividade = data.atividades?.find((ativ) => {
        const minutos = minutosAte(ativ.dataHora);
        return minutos > 0 && minutos <= 60;
      });
      return atividade
        ? {
            atividadeId: atividade.id,
            titulo: atividade.titulo,
            dataHora: atividade.dataHora,
            tipo: atividade.tipo,
            leadNome: atividade.leadNome,
            minutosRestantes: Math.floor(minutosAte(atividade.dataHora)),
          }
        : undefined;
    }

    case 'feedbackPosVenda': {
      const venda = data.vendas?.find((v) => {
        const dias = diasDesde(v.dataVenda);
        return dias >= 7 && dias < 8;
      });
      return venda
        ? {
            vendaId: venda.id,
            clienteNome: venda.clienteNome,
            empreendimento: venda.empreendimento,
            dataVenda: venda.dataVenda,
          }
        : undefined;
    }

    default:
      return undefined;
  }
}

/**
 * Gera uma mensagem personalizada para um trigger específico
 * @param trigger - ID do trigger
 * @param data - Dados contextuais para personalização
 * @returns Mensagem proativa formatada
 */
export function getProactiveMessage(
  trigger: string,
  data: Record<string, any> = {}
): ProactiveMessage | null {
  const triggerConfig = PROACTIVE_TRIGGERS[trigger];
  if (!triggerConfig) {
    console.warn(`Trigger não encontrado: ${trigger}`);
    return null;
  }

  switch (trigger) {
    case 'leadEsfriando':
      return {
        triggerId: trigger,
        title: '🔥 Lead esfriando!',
        message: `Oi! Percebi que o lead ${data.leadNome || 'interessado'} está há ${data.horasSemContato || 24}h sem contato. ${
          data.interesse
            ? `Ele demonstrou interesse em ${data.interesse}.`
            : 'Leads quentes precisam de atenção rápida!'
        } Que tal enviar uma mensagem agora?`,
        priority: triggerConfig.priority,
        action: data.leadId
          ? {
              label: 'Ver Lead',
              route: `/corretor/leads/${data.leadId}`,
            }
          : undefined,
        data,
      };

    case 'metaProxima':
      return {
        triggerId: trigger,
        title: '🎯 Você está quase lá!',
        message: `Parabéns! Você já atingiu ${data.percentual?.toFixed(1) || 90}% da sua meta ${
          data.periodo || 'do mês'
        }! Falta apenas R$ ${(data.faltando || 0).toLocaleString('pt-BR')} para bater. Vamos fechar mais uma venda?`,
        priority: triggerConfig.priority,
        action: {
          label: 'Ver Metas',
          route: '/corretor/metas',
        },
        data,
      };

    case 'novoLancamento':
      return {
        triggerId: trigger,
        title: '🏗️ Novo lançamento hoje!',
        message: `Acabou de sair do forno! O ${data.empreendimentoNome || 'novo empreendimento'}${
          data.localizacao ? ` em ${data.localizacao}` : ''
        } foi lançado hoje. Confira os detalhes e comece a oferecer para seus clientes!`,
        priority: triggerConfig.priority,
        action: data.empreendimentoId
          ? {
              label: 'Ver Empreendimento',
              route: `/corretor/empreendimentos/${data.empreendimentoId}`,
            }
          : undefined,
        data,
      };

    case 'lembreteAtividade':
      return {
        triggerId: trigger,
        title: '⏰ Atividade em breve!',
        message: `Lembrete: você tem "${data.titulo || 'uma atividade'}" agendada para daqui a ${
          data.minutosRestantes || 60
        } minutos${data.leadNome ? ` com ${data.leadNome}` : ''}. Está tudo preparado?`,
        priority: triggerConfig.priority,
        action: data.atividadeId
          ? {
              label: 'Ver Atividade',
              route: `/corretor/atividades/${data.atividadeId}`,
            }
          : undefined,
        data,
      };

    case 'feedbackPosVenda':
      return {
        triggerId: trigger,
        title: '📞 Hora do follow-up!',
        message: `Já faz uma semana que você fechou a venda com ${data.clienteNome || 'seu cliente'}${
          data.empreendimento ? ` no ${data.empreendimento}` : ''
        }. Que tal entrar em contato para saber como está a experiência e pedir indicações?`,
        priority: triggerConfig.priority,
        action: data.vendaId
          ? {
              label: 'Ver Venda',
              route: `/corretor/vendas/${data.vendaId}`,
            }
          : undefined,
        data,
      };

    default:
      return null;
  }
}

/**
 * Verifica e retorna mensagens proativas prontas para exibição
 * @param userId - ID do usuário
 * @param data - Dados para verificação
 * @returns Array de mensagens proativas
 */
export async function getProactiveMessagesForUser(
  userId: string,
  data?: Partial<TriggerData>
): Promise<ProactiveMessage[]> {
  const triggers = await checkProactiveTriggers(userId, data);
  const messages: ProactiveMessage[] = [];

  for (const triggerResult of triggers) {
    if (triggerResult.triggered) {
      const message = getProactiveMessage(triggerResult.triggerId, triggerResult.data || {});
      if (message) {
        messages.push(message);
      }
    }
  }

  return messages;
}

/**
 * Registra que um trigger foi exibido (para controle de cooldown)
 * @param userId - ID do usuário
 * @param triggerId - ID do trigger
 */
export async function markTriggerShown(userId: string, triggerId: string): Promise<void> {
  // Implementação depende do sistema de persistência utilizado
  // Pode ser localStorage, banco de dados, etc.
  console.log(`Trigger ${triggerId} marcado como exibido para usuário ${userId}`);
}

