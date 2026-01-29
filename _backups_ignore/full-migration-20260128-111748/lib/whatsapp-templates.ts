/**
 * Templates de Mensagens Rápidas para WhatsApp
 *
 * Templates organizados por categoria para uso rápido no chat
 */

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  message: string;
  variables?: string[]; // Variáveis que podem ser substituídas: {{nome}}, {{empreendimento}}, etc.
  emoji?: string;
}

export type TemplateCategory =
  | 'saudacao'
  | 'agendamento'
  | 'followup'
  | 'informacoes'
  | 'fechamento'
  | 'outros';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { label: string; emoji: string }> = {
  saudacao: { label: 'Saudação', emoji: '👋' },
  agendamento: { label: 'Agendamento', emoji: '📅' },
  followup: { label: 'Follow-up', emoji: '🔄' },
  informacoes: { label: 'Informações', emoji: 'ℹ️' },
  fechamento: { label: 'Fechamento', emoji: '🎯' },
  outros: { label: 'Outros', emoji: '💬' },
};

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  // Saudações
  {
    id: 'saudacao-1',
    name: 'Bom dia',
    category: 'saudacao',
    message: 'Bom dia, {{nome}}! Tudo bem com você? 😊',
    variables: ['nome'],
    emoji: '☀️',
  },
  {
    id: 'saudacao-2',
    name: 'Boa tarde',
    category: 'saudacao',
    message: 'Boa tarde, {{nome}}! Como posso ajudá-lo(a) hoje?',
    variables: ['nome'],
    emoji: '🌤️',
  },
  {
    id: 'saudacao-3',
    name: 'Primeiro contato',
    category: 'saudacao',
    message:
      'Olá, {{nome}}! Sou {{corretor}} da Prática Incorporadora. Vi que você demonstrou interesse em nossos empreendimentos. Posso te ajudar com mais informações?',
    variables: ['nome', 'corretor'],
    emoji: '👋',
  },

  // Agendamento
  {
    id: 'agendamento-1',
    name: 'Agendar visita',
    category: 'agendamento',
    message:
      'Que tal agendarmos uma visita ao {{empreendimento}}? Tenho horários disponíveis essa semana. Qual dia e horário fica melhor para você?',
    variables: ['empreendimento'],
    emoji: '📅',
  },
  {
    id: 'agendamento-2',
    name: 'Confirmar visita',
    category: 'agendamento',
    message:
      'Olá, {{nome}}! Passando para confirmar nossa visita ao {{empreendimento}} amanhã às {{horario}}. Posso contar com sua presença?',
    variables: ['nome', 'empreendimento', 'horario'],
    emoji: '✅',
  },
  {
    id: 'agendamento-3',
    name: 'Reagendar',
    category: 'agendamento',
    message:
      'Entendo, {{nome}}! Sem problemas. Vamos remarcar para outro momento. Qual seria a melhor data para você?',
    variables: ['nome'],
    emoji: '🔄',
  },

  // Follow-up
  {
    id: 'followup-1',
    name: 'Após visita',
    category: 'followup',
    message:
      'Olá, {{nome}}! Foi um prazer te receber no {{empreendimento}}. O que achou? Ficou alguma dúvida que eu possa esclarecer?',
    variables: ['nome', 'empreendimento'],
    emoji: '🏠',
  },
  {
    id: 'followup-2',
    name: 'Sem resposta',
    category: 'followup',
    message:
      'Oi, {{nome}}! Tudo bem? Não consegui falar com você nos últimos dias. Ainda tem interesse no {{empreendimento}}? Estou à disposição! 😊',
    variables: ['nome', 'empreendimento'],
    emoji: '📱',
  },
  {
    id: 'followup-3',
    name: 'Proposta enviada',
    category: 'followup',
    message:
      'Olá, {{nome}}! Conseguiu analisar a proposta que enviei? Fico no aguardo do seu retorno para tirar qualquer dúvida.',
    variables: ['nome'],
    emoji: '📋',
  },

  // Informações
  {
    id: 'info-1',
    name: 'Enviar tabela',
    category: 'informacoes',
    message:
      'Segue a tabela de valores do {{empreendimento}}. Qualquer dúvida sobre condições de pagamento, é só me chamar!',
    variables: ['empreendimento'],
    emoji: '📊',
  },
  {
    id: 'info-2',
    name: 'Condições especiais',
    category: 'informacoes',
    message:
      '🎉 Temos condições especiais esse mês para o {{empreendimento}}! Entrada facilitada e parcelas que cabem no seu bolso. Quer saber mais?',
    variables: ['empreendimento'],
    emoji: '💰',
  },
  {
    id: 'info-3',
    name: 'Últimas unidades',
    category: 'informacoes',
    message:
      '⚠️ {{nome}}, as unidades do {{empreendimento}} estão acabando! Restam apenas {{quantidade}} unidades. Não perca essa oportunidade!',
    variables: ['nome', 'empreendimento', 'quantidade'],
    emoji: '🔥',
  },

  // Fechamento
  {
    id: 'fechamento-1',
    name: 'Reserva confirmada',
    category: 'fechamento',
    message:
      '🎉 Parabéns, {{nome}}! Sua reserva foi confirmada! Em breve entrarei em contato com os próximos passos. Bem-vindo(a) à família Prática!',
    variables: ['nome'],
    emoji: '🎊',
  },
  {
    id: 'fechamento-2',
    name: 'Documentação',
    category: 'fechamento',
    message:
      'Olá, {{nome}}! Para darmos continuidade, preciso dos seguintes documentos:\n\n📄 RG e CPF\n📄 Comprovante de residência\n📄 Comprovante de renda\n\nPode me enviar por aqui mesmo!',
    variables: ['nome'],
    emoji: '📑',
  },

  // Outros
  {
    id: 'outros-1',
    name: 'Agradecimento',
    category: 'outros',
    message:
      'Obrigado pelo seu contato, {{nome}}! Foi um prazer atendê-lo(a). Qualquer dúvida, estou à disposição. Tenha um ótimo dia! 😊',
    variables: ['nome'],
    emoji: '🙏',
  },
  {
    id: 'outros-2',
    name: 'Indicação',
    category: 'outros',
    message:
      '{{nome}}, você conhece alguém que também está procurando imóvel? Temos um programa de indicação com benefícios especiais para você! 🎁',
    variables: ['nome'],
    emoji: '🤝',
  },
];

/**
 * Substituir variáveis no template
 */
export function applyTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Obter templates por categoria
 */
export function getTemplatesByCategory(category: TemplateCategory): MessageTemplate[] {
  return DEFAULT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Buscar templates por texto
 */
export function searchTemplates(query: string): MessageTemplate[] {
  const lowerQuery = query.toLowerCase();
  return DEFAULT_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.message.toLowerCase().includes(lowerQuery)
  );
}
