/**
 * Sistema de Proatividade da Luna
 *
 * Define gatilhos e regras para quando a Luna deve
 * proativamente entrar em contato com leads.
 */

import { dbQuery } from '@/lib/db';
import { withTenant } from '@/lib/tenant-context';
import type { SalvaLeadsConversation } from './types';

// ============================================================================
// TIPOS
// ============================================================================

export type ProactiveTriggerType =
  | 'new_lead'           // Lead acabou de entrar na base
  | 'no_response_1h'     // Lead não respondeu em 1 hora
  | 'no_response_24h'    // Lead não respondeu em 24 horas
  | 'no_response_3d'     // Lead não respondeu em 3 dias
  | 'reactivation'       // Lead inativo há mais de 7 dias
  | 'visit_reminder'     // Lembrete de visita agendada
  | 'post_visit'         // Follow-up pós-visita
  | 'price_drop'         // Preço baixou em imóvel de interesse
  | 'new_property'       // Novo imóvel no perfil do lead
  | 'birthday'           // Aniversário do lead
  | 'special_condition'  // Condição especial (desconto, feirão, etc)

export interface ProactiveTrigger {
  type: ProactiveTriggerType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  cooldownHours: number;  // Mínimo de horas entre mensagens do mesmo tipo
  maxAttempts: number;    // Máximo de tentativas antes de desistir
  messageGenerator: (context: ProactiveContext) => string;
  shouldTrigger: (context: ProactiveContext) => boolean;
}

export interface ProactiveContext {
  lead: {
    id: string;
    phone: string;
    name?: string;
    interesse?: Record<string, any>;
  };
  corretor: {
    id: string;
    nome: string;
    phone?: string;
  };
  conversation?: SalvaLeadsConversation;
  lastMessageAt?: Date;
  diasInativo?: number;
  attemptCount?: number;
  customData?: Record<string, any>;
}

export interface ProactiveJob {
  id: string;
  triggerId: ProactiveTriggerType;
  leadPhone: string;
  corretorId: string;
  workspaceId: number;
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttemptAt?: Date;
  result?: string;
}

// ============================================================================
// GATILHOS PROATIVOS
// ============================================================================

export const PROACTIVE_TRIGGERS: Record<ProactiveTriggerType, ProactiveTrigger> = {
  new_lead: {
    type: 'new_lead',
    priority: 'high',
    cooldownHours: 0,
    maxAttempts: 1,
    shouldTrigger: (ctx) => !ctx.conversation || ctx.conversation.messages.length === 0,
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const hora = new Date().getHours();
      const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

      if (ctx.lead.interesse?.bairro) {
        return `${saudacao}${nome ? `, ${nome}` : ''}! Aqui é a Luna, assistente do ${ctx.corretor.nome}. Vi que você se interessou por imóveis no ${ctx.lead.interesse.bairro}. Posso te ajudar a encontrar o lugar perfeito?`;
      }
      return `${saudacao}${nome ? `, ${nome}` : ''}! Aqui é a Luna, assistente do ${ctx.corretor.nome}. Tudo bem? Vi que você está procurando imóvel. Me conta o que você tem em mente que eu te ajudo!`;
    }
  },

  no_response_1h: {
    type: 'no_response_1h',
    priority: 'medium',
    cooldownHours: 1,
    maxAttempts: 1,
    shouldTrigger: (ctx) => {
      if (!ctx.lastMessageAt) return false;
      const hoursSince = (Date.now() - ctx.lastMessageAt.getTime()) / (1000 * 60 * 60);
      return hoursSince >= 1 && hoursSince < 2;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      return `${nome ? `${nome}, ` : ''}só passando pra ver se você recebeu a mensagem. Qualquer dúvida é só chamar!`;
    }
  },

  no_response_24h: {
    type: 'no_response_24h',
    priority: 'medium',
    cooldownHours: 24,
    maxAttempts: 1,
    shouldTrigger: (ctx) => {
      if (!ctx.lastMessageAt) return false;
      const hoursSince = (Date.now() - ctx.lastMessageAt.getTime()) / (1000 * 60 * 60);
      return hoursSince >= 24 && hoursSince < 48;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      if (ctx.lead.interesse?.bairro) {
        return `Oi${nome ? ` ${nome}` : ''}! Apareceram algumas opções novas no ${ctx.lead.interesse.bairro}. Quer que eu te mande?`;
      }
      return `Oi${nome ? ` ${nome}` : ''}! Tô por aqui se precisar de ajuda na busca do imóvel. É só chamar!`;
    }
  },

  no_response_3d: {
    type: 'no_response_3d',
    priority: 'low',
    cooldownHours: 72,
    maxAttempts: 1,
    shouldTrigger: (ctx) => {
      if (!ctx.lastMessageAt) return false;
      const daysSince = (Date.now() - ctx.lastMessageAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 3 && daysSince < 7;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      return `${nome ? `${nome}, ` : ''}sei que a busca por imóvel pode ser corrida. Se mudar de ideia ou quiser retomar, é só me chamar que eu te ajudo!`;
    }
  },

  reactivation: {
    type: 'reactivation',
    priority: 'medium',
    cooldownHours: 168, // 7 dias
    maxAttempts: 3,
    shouldTrigger: (ctx) => {
      return (ctx.diasInativo || 0) >= 7 && (ctx.attemptCount || 0) < 3;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const attempt = ctx.attemptCount || 0;

      if (attempt === 0) {
        return `Oi${nome ? ` ${nome}` : ''}! Aqui é a Luna, assistente do ${ctx.corretor.nome}. Faz um tempo que a gente conversou sobre imóveis. Ainda tá procurando?`;
      } else if (attempt === 1) {
        return `${nome ? `${nome}, ` : ''}passando pra avisar que tem condições especiais essa semana${ctx.lead.interesse?.bairro ? ` pra região do ${ctx.lead.interesse.bairro}` : ''}. Quer saber mais?`;
      } else {
        return `Última chamada${nome ? `, ${nome}` : ''}! 😊 Se mudar de ideia sobre o imóvel, me chama que eu guardo seu contato aqui.`;
      }
    }
  },

  visit_reminder: {
    type: 'visit_reminder',
    priority: 'urgent',
    cooldownHours: 0,
    maxAttempts: 2,
    shouldTrigger: (ctx) => {
      const visitDate = ctx.customData?.visitDate;
      if (!visitDate) return false;
      const hoursUntil = (new Date(visitDate).getTime() - Date.now()) / (1000 * 60 * 60);
      return hoursUntil > 0 && hoursUntil <= 24;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const imovel = ctx.customData?.imovelNome || 'o imóvel';
      return `${nome ? `${nome}, ` : ''}só lembrando da visita amanhã em ${imovel}! Tá confirmado? Se precisar reagendar, me avisa!`;
    }
  },

  post_visit: {
    type: 'post_visit',
    priority: 'high',
    cooldownHours: 2,
    maxAttempts: 1,
    shouldTrigger: (ctx) => {
      const visitDate = ctx.customData?.visitDate;
      if (!visitDate) return false;
      const hoursSince = (Date.now() - new Date(visitDate).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 2 && hoursSince <= 24;
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const imovel = ctx.customData?.imovelNome || 'o imóvel';
      return `${nome ? `${nome}, ` : ''}e aí, o que achou da visita em ${imovel}? Me conta sua impressão!`;
    }
  },

  price_drop: {
    type: 'price_drop',
    priority: 'high',
    cooldownHours: 0,
    maxAttempts: 1,
    shouldTrigger: (ctx) => !!ctx.customData?.priceDropPercent,
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const imovel = ctx.customData?.imovelNome || 'aquele imóvel';
      const percent = ctx.customData?.priceDropPercent || 0;
      return `${nome ? `${nome}! ` : ''}Boa notícia: ${imovel} que você curtiu baixou ${percent}%! Quer dar uma olhada de novo?`;
    }
  },

  new_property: {
    type: 'new_property',
    priority: 'medium',
    cooldownHours: 48,
    maxAttempts: 1,
    shouldTrigger: (ctx) => !!ctx.customData?.newPropertyId,
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const bairro = ctx.lead.interesse?.bairro || ctx.customData?.bairro;
      return `${nome ? `${nome}, ` : ''}acabou de entrar um imóvel novo${bairro ? ` no ${bairro}` : ''} que combina com o que você procura! Quer ver?`;
    }
  },

  birthday: {
    type: 'birthday',
    priority: 'low',
    cooldownHours: 8760, // 1 ano
    maxAttempts: 1,
    shouldTrigger: (ctx) => {
      const birthday = ctx.customData?.birthday;
      if (!birthday) return false;
      const today = new Date();
      const bday = new Date(birthday);
      return today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth();
    },
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || 'você';
      return `Feliz aniversário, ${nome}! 🎂 Que esse novo ano traga muitas conquistas - inclusive o imóvel dos sonhos! Um abraço do time ${ctx.corretor.nome}!`;
    }
  },

  special_condition: {
    type: 'special_condition',
    priority: 'high',
    cooldownHours: 168, // 7 dias
    maxAttempts: 1,
    shouldTrigger: (ctx) => !!ctx.customData?.specialCondition,
    messageGenerator: (ctx) => {
      const nome = ctx.lead.name?.split(' ')[0] || '';
      const condition = ctx.customData?.specialCondition || 'condição especial';
      return `${nome ? `${nome}, ` : ''}surgiu uma ${condition}${ctx.lead.interesse?.bairro ? ` pra região do ${ctx.lead.interesse.bairro}` : ''}! Quer que eu te explique?`;
    }
  }
};

// ============================================================================
// FUNÇÕES DE GERENCIAMENTO
// ============================================================================

/**
 * Check which triggers should fire for a lead
 */
export function getTriggersForLead(context: ProactiveContext): ProactiveTrigger[] {
  return Object.values(PROACTIVE_TRIGGERS).filter(trigger =>
    trigger.shouldTrigger(context)
  ).sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Generate proactive message for a trigger
 */
export function generateProactiveMessage(
  trigger: ProactiveTrigger,
  context: ProactiveContext
): string {
  return trigger.messageGenerator(context);
}

/**
 * Schedule a proactive job
 */
export async function scheduleProactiveJob(
  job: Omit<ProactiveJob, 'id' | 'status' | 'attempts'>
): Promise<string> {
  const id = `proactive_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  await withTenant(job.workspaceId, async (client) => {
    await client.query(
      `INSERT INTO salva_leads_proactive_jobs
       (id, trigger_id, lead_phone, corretor_id, workspace_id, scheduled_for, status, attempts)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0)`,
      [id, job.triggerId, job.leadPhone, job.corretorId, job.workspaceId, job.scheduledFor]
    );
  }).catch(err => {
    console.warn('[Luna Proactive] Table may not exist:', err.message);
  });

  return id;
}

/**
 * Get pending proactive jobs
 */
export async function getPendingProactiveJobs(workspaceId?: number): Promise<ProactiveJob[]> {
  if (workspaceId) {
    return withTenant(workspaceId, async (client) => {
      const result = await client.query(
        `SELECT * FROM salva_leads_proactive_jobs WHERE status = 'pending' AND scheduled_for <= NOW() AND workspace_id = $1`,
        [workspaceId]
      ).catch(() => ({ rows: [] }));
      return result.rows as ProactiveJob[];
    });
  }

  const result = await dbQuery(
    `SELECT * FROM salva_leads_proactive_jobs WHERE status = 'pending' AND scheduled_for <= NOW()`
  ).catch(() => ({ rows: [] }));
  return result.rows as ProactiveJob[];
}

/**
 * Calculate next proactive action for a lead
 */
export function calculateNextProactiveAction(
  conversation: SalvaLeadsConversation,
  diasInativo: number
): { trigger: ProactiveTrigger; scheduledFor: Date } | null {
  const context: ProactiveContext = {
    lead: {
      id: conversation.atendimento_id,
      phone: conversation.lead_phone,
      name: conversation.lead_name || undefined,
      interesse: conversation.context?.interesse,
    },
    corretor: {
      id: conversation.corretor_id,
      nome: conversation.context?.corretorNome || 'Corretor',
    },
    conversation,
    diasInativo,
    attemptCount: 0,
  };

  const triggers = getTriggersForLead(context);
  if (triggers.length === 0) return null;

  const trigger = triggers[0];
  const scheduledFor = new Date(Date.now() + trigger.cooldownHours * 60 * 60 * 1000);

  return { trigger, scheduledFor };
}
