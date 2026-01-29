/**
 * Sistema de Detecção de Intents da Sofia
 *
 * Classifica mensagens do usuário em categorias de intenção
 */

// ============================================
// TIPOS
// ============================================

export type IntentCategory =
  | 'SAUDACAO'
  | 'BUSCA_IMOVEL'
  | 'SIMULACAO'
  | 'TABELA_PRECO'
  | 'MATERIAL'
  | 'SUPORTE'
  | 'FEEDBACK'
  | 'META'
  | 'CONCORRENCIA'
  | 'OBJECAO'
  | 'AGENDA'
  | 'CAMPANHA'
  | 'AJUDA_APP'
  | 'STATUS_PROCESSO'
  | 'COMISSAO'
  | 'METAS'
  | 'UNKNOWN';

export type Intent =
  // Saudação
  | 'greeting_hello'
  | 'greeting_return'
  | 'greeting_question'
  // Busca de imóvel
  | 'search_general'
  | 'search_specific'
  | 'search_filter'
  | 'search_availability'
  // Simulação
  | 'simulate_request'
  | 'simulate_params'
  | 'simulate_compare'
  // Tabela de preço
  | 'price_request'
  | 'price_unit'
  | 'price_compare'
  // Material
  | 'material_request'
  | 'material_share'
  | 'material_specific'
  // Suporte
  | 'support_help'
  | 'support_error'
  | 'support_human'
  | 'support_call'
  // Feedback
  | 'feedback_positive'
  | 'feedback_negative'
  | 'feedback_suggestion'
  // Meta
  | 'meta_capabilities'
  | 'meta_identity'
  | 'meta_app'
  // Concorrência
  | 'concorrencia_comparar'
  | 'concorrencia_diferencial'
  | 'concorrencia_vantagem'
  // Objeção
  | 'objecao_preco'
  | 'objecao_localizacao'
  | 'objecao_prazo'
  | 'objecao_confianca'
  | 'objecao_geral'
  // Agenda
  | 'agenda_consultar'
  | 'agenda_visita'
  | 'agenda_compromisso'
  // Campanha
  | 'campanha_consultar'
  | 'campanha_promocao'
  | 'campanha_desconto'
  // Ajuda App
  | 'ajuda_app_navegacao'
  | 'ajuda_app_funcionalidade'
  | 'ajuda_app_tutorial'
  // Status de Processo
  | 'status_reserva'
  | 'status_proposta'
  | 'status_contrato'
  // Comissao
  | 'comissao_consultar'
  | 'comissao_previsao'
  | 'comissao_extrato'
  // Metas
  | 'metas_consultar'
  | 'metas_performance'
  | 'metas_ranking'
  // Desconhecido
  | 'unknown';

export interface IntentResult {
  category: IntentCategory;
  intent: Intent;
  confidence: number; // 0-1
  entities: ExtractedEntities;
  triggers: string[]; // palavras que acionaram
}

export interface ExtractedEntities {
  valor?: number;
  entrada?: number;
  percentual?: number;
  quartos?: number;
  metragem?: number;
  unidade?: string;
  empreendimento?: string;
  prazo?: number;
  nomeCliente?: string;
  cpf?: string;
  data?: string;
  horario?: string;
  tipoUnidade?: string;
  concorrente?: string;
  agendamentoDescricao?: string;
  tipoObjecao?: string | null;
  simulacaoCEF?: {
    parcelaTotal?: number;
    cetAnual?: number;
    rendaMinima?: number;
  };
  reservaId?: string | number;
  leadId?: string | number;
  phone?: string;
  [key: string]: unknown; // Allow additional properties
}

// ============================================
// PADRÕES DE DETECÇÃO
// ============================================

interface IntentPattern {
  intent: Intent;
  category: IntentCategory;
  patterns: RegExp[];
  priority: number; // maior = mais prioritário
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ============ SAUDAÇÃO ============
  {
    intent: 'greeting_hello',
    category: 'SAUDACAO',
    patterns: [
      /^(oi|olá|ola|eai|e ai|fala|hey|hello|opa)\b/i,
      /^bom\s*(dia|tarde|noite)/i,
      /^(boa\s*(tarde|noite))/i,
    ],
    priority: 50,
  },
  {
    intent: 'greeting_return',
    category: 'SAUDACAO',
    patterns: [
      /voltei/i,
      /t[oô]\s*de\s*volta/i,
      /cheguei/i,
    ],
    priority: 50,
  },
  {
    intent: 'greeting_question',
    category: 'SAUDACAO',
    patterns: [
      /tudo\s*(bem|bom|certo|tranquilo|beleza)/i,
      /como\s*(vai|est[aá]|voc[eê]\s*t[aá])/i,
      /beleza\??$/i,
    ],
    priority: 40,
  },

  // ============ BUSCA DE IMÓVEL ============
  {
    intent: 'search_general',
    category: 'BUSCA_IMOVEL',
    patterns: [
      /^(buscar|buscar im[oó]veis|ver im[oó]veis)$/i,
      /^im[oó]veis$/i,
      /^empreendimentos$/i,
      /empreendimentos?/i,
      /bairro(s)?/i,
      /quero\s*(ver|buscar|encontrar|achar)\s*(im[oó]ve|apartamento|apto|casa|unidade)/i,
      /tem\s*(apartamento|apto|casa|im[oó]ve|unidade)/i,
      /mostrar?\s*(im[oó]ve|apartamento)/i,
      /preciso\s*(de)?\s*(um)?\s*(im[oó]ve|apartamento|apto)/i,
    ],
    priority: 80,
  },
  {
    intent: 'search_specific',
    category: 'BUSCA_IMOVEL',
    patterns: [
      /unidade\s*\d+/i,
      /bloco\s*[a-z]/i,
      /apartamento\s*\d+/i,
      /apto\s*\d+/i,
    ],
    priority: 90,
  },
  {
    intent: 'search_filter',
    category: 'BUSCA_IMOVEL',
    patterns: [
      /\d+\s*(quartos?|qtos?|dormit[oó]rios?)/i,
      /at[eé]\s*\d+\s*(mil|k|reais|R\$)/i,
      /\d+\s*m[²2]/i,
      /com\s*(su[ií]te|varanda|churrasqueira)/i,
    ],
    priority: 85,
  },
  {
    intent: 'search_availability',
    category: 'BUSCA_IMOVEL',
    patterns: [
      /tem\s*dispon[ií]vel/i,
      /sobrou/i,
      /(o\s*que|quais)\s*(tem|sobrou)/i,
      /ainda\s*tem/i,
    ],
    priority: 75,
  },

  // ============ SIMULAÇÃO ============
  {
    intent: 'simulate_request',
    category: 'SIMULACAO',
    patterns: [
      /^(simular|simulacao|simulação)$/i,
      /simul(ar?|a[çc][aã]o)/i,
      /calcula\s*(pra\s*mim)?/i,
      /quanto\s*fica\s*(a\s*parcela)?/i,
      /financiamento/i,
      /parcela(r|mento)?/i,
    ],
    priority: 85,
  },
  {
    intent: 'simulate_params',
    category: 'SIMULACAO',
    patterns: [
      /com\s*\d+\s*%?\s*(de\s*)?(entrada)?/i,
      /entrada\s*(de)?\s*\d+/i,
      /em\s*\d+\s*(meses|anos|x|vezes)/i,
      /\d+\s*%\s*(de\s*)?(entrada)?/i,
    ],
    priority: 80,
  },
  {
    intent: 'simulate_compare',
    category: 'SIMULACAO',
    patterns: [
      /e\s*se\s*(eu\s*)?(der|colocar|pagar)/i,
      /com\s*outra\s*entrada/i,
      /muda\s*(a\s*)?(entrada|prazo)/i,
      /e\s*com\s*\d+/i,
    ],
    priority: 75,
  },

  // ============ TABELA DE PREÇO ============
  {
    intent: 'price_request',
    category: 'TABELA_PRECO',
    patterns: [
      /^(tabela|tabelas|ver tabelas)$/i,
      /tabela(\s*de\s*pre[çc]o)?/i,
      /(me\s*)?(manda|envia)\s*(a\s*)?tabela/i,
      /valores/i,
      /pre[çc]os/i,
      /quanto\s*(t[aá]|custa|s[aã]o)/i,
    ],
    priority: 80,
  },
  {
    intent: 'price_unit',
    category: 'TABELA_PRECO',
    patterns: [
      /quanto\s*(custa|[eé])\s*(a|o)?\s*\d+/i,
      /pre[çc]o\s*(da|do)?\s*\d+/i,
      /valor\s*(da|do)?\s*(unidade)?\s*\d+/i,
    ],
    priority: 85,
  },
  {
    intent: 'price_compare',
    category: 'TABELA_PRECO',
    patterns: [
      /qual\s*(mais\s*)?(barato|em\s*conta|acess[ií]vel)/i,
      /mais\s*barato/i,
      /menor\s*(pre[çc]o|valor)/i,
    ],
    priority: 75,
  },

  // ============ MATERIAL ============
  {
    intent: 'material_request',
    category: 'MATERIAL',
    patterns: [
      /manda\s*(o\s*)?(book|material|pdf|folder)/i,
      /material\s*(de\s*venda)?/i,
      /book/i,
      /cat[aá]logo/i,
    ],
    priority: 70,
  },
  {
    intent: 'material_share',
    category: 'MATERIAL',
    patterns: [
      /compartilhar\s*(com)?\s*(cliente|lead)/i,
      /mandar\s*(pro|para\s*o?)\s*cliente/i,
      /enviar\s*(pro|para\s*o?)\s*cliente/i,
    ],
    priority: 75,
  },
  {
    intent: 'material_specific',
    category: 'MATERIAL',
    patterns: [
      /planta(\s*baixa)?/i,
      /imagem|foto/i,
      /v[ií]deo/i,
      /tour\s*(virtual)?/i,
    ],
    priority: 70,
  },

  // ============ SUPORTE ============
  {
    intent: 'support_help',
    category: 'SUPORTE',
    patterns: [
      /me\s*ajuda/i,
      /n[aã]o\s*(entendi|sei)/i,
      /como\s*(fa[çc]o|funciona|uso)/i,
      /ajuda/i,
    ],
    priority: 60,
  },
  {
    intent: 'support_error',
    category: 'SUPORTE',
    patterns: [
      /deu\s*erro/i,
      /n[aã]o\s*(t[aá])?\s*(funcionando|abrindo|carregando)/i,
      /erro/i,
      /bug/i,
      /problema/i,
    ],
    priority: 70,
  },
  {
    intent: 'support_human',
    category: 'SUPORTE',
    patterns: [
      /quero\s*falar\s*(com)?\s*(algu[eé]m|pessoa|humano|gerente)/i,
      /me\s*transfere/i,
      /atendente/i,
      /falar\s*com\s*gerente/i,
    ],
    priority: 90,
  },
  {
    intent: 'support_call',
    category: 'SUPORTE',
    patterns: [
      /me\s*liga/i,
      /me\s*ligue/i,
      /pode\s*me\s*ligar/i,
      /liga\s*pra\s*mim/i,
      /me\s*chama/i,
      /me\s*liga\s*agora/i,
    ],
    priority: 95,
  },

  // ============ FEEDBACK ============
  {
    intent: 'feedback_positive',
    category: 'FEEDBACK',
    patterns: [
      /obrigad[ao]/i,
      /valeu/i,
      /top/i,
      /perfeito/i,
      /maravilha/i,
      /show/i,
      /massa/i,
      /era\s*isso/i,
    ],
    priority: 40,
  },
  {
    intent: 'feedback_negative',
    category: 'FEEDBACK',
    patterns: [
      /n[aã]o\s*era\s*(isso)?/i,
      /errado/i,
      /incorreto/i,
      /n[aã]o\s*[eé]\s*(isso|o\s*que)/i,
    ],
    priority: 60,
  },
  {
    intent: 'feedback_suggestion',
    category: 'FEEDBACK',
    patterns: [
      /seria\s*(bom|legal)\s*se/i,
      /sugir?o|sugest[aã]o/i,
      /poderia\s*ter/i,
      /falta/i,
    ],
    priority: 50,
  },

  // ============ META ============
  {
    intent: 'meta_capabilities',
    category: 'META',
    patterns: [
      /o\s*que\s*(voc[eê])?\s*(faz|pode|consegue)/i,
      /como\s*(voc[eê])?\s*funciona/i,
      /suas?\s*(fun[çc][oõ]es|capacidades)/i,
    ],
    priority: 50,
  },
  {
    intent: 'meta_identity',
    category: 'META',
    patterns: [
      /quem\s*[eé]\s*voc[eê]/i,
      /(voc[eê]\s*)?[eé]\s*(um)?\s*(rob[oô]|bot|ia)/i,
      /seu\s*nome/i,
    ],
    priority: 50,
  },
  {
    intent: 'meta_app',
    category: 'META',
    patterns: [
      /como\s*(uso|usar)\s*(o\s*)?app/i,
      /onde\s*(fica|t[aá]|acho)/i,
      /link\s*(do\s*)?app/i,
    ],
    priority: 50,
  },

  // ============ CONCORRENCIA ============
  {
    intent: 'concorrencia_comparar',
    category: 'CONCORRENCIA',
    patterns: [
      /compar(ar?|ando|e)\s*(com)?\s*(o(s)?\s*)?(concorr[eê]ncia|outro(s)?|vizinho)/i,
      /(concorr[eê]ncia|outro\s*empreendimento)\s*(tem|oferece|cobra)/i,
      /e\s*(o|a)\s*(mrv|cyrela|tenda|direcional|even|eztec|cury|plano|viver|pdg)/i,
      /(mrv|cyrela|tenda|direcional|even|eztec|cury|plano|viver|pdg)\s*(tem|oferece|cobra|t[aá])/i,
      /versus|vs\.?/i,
      /diferen[çc]a\s*(d[eo]s?\s*)?(outros?|concorr[eê]ncia)/i,
    ],
    priority: 80,
  },
  {
    intent: 'concorrencia_diferencial',
    category: 'CONCORRENCIA',
    patterns: [
      /diferencia(l|is)/i,
      /o\s*que\s*(tem|voc[eê]s?\s*t[eê]m)\s*de\s*(diferente|especial|melhor)/i,
      /por\s*que\s*(esse?|comprar\s*aqui|escolher)/i,
      /qual\s*(a\s*)?(vantagem|diferença)/i,
      /vantagem\s*(competitiva|sobre)/i,
    ],
    priority: 75,
  },
  {
    intent: 'concorrencia_vantagem',
    category: 'CONCORRENCIA',
    patterns: [
      /melhor\s*(que|do\s*que)\s*(o(s)?\s*)?(outro|concorr[eê]ncia)/i,
      /porque\s*(aqui|esse)\s*[eé]\s*melhor/i,
      /ganha\s*(d[ao]|da)\s*concorr[eê]ncia/i,
      /supera\s*(o(s)?\s*)?(outro|concorr[eê]ncia)/i,
    ],
    priority: 75,
  },

  // ============ OBJECAO ============
  {
    intent: 'objecao_preco',
    category: 'OBJECAO',
    patterns: [
      /muito\s*caro/i,
      /t[aá]\s*caro/i,
      /(acho|achei)\s*(muito\s*)?(caro|puxado|salgado)/i,
      /n[aã]o\s*(tenho|consigo)\s*(pagar|dar\s*entrada)/i,
      /pre[çc]o\s*(t[aá]\s*)?(alto|elevado|puxado|salgado)/i,
      /fora\s*(do\s*)?(meu\s*)?(or[çc]amento|alcance|bolso)/i,
      /acima\s*(do\s*)?(meu\s*)?(or[çc]amento|limite)/i,
      /n[aã]o\s*(cabe|entra)\s*(no\s*)?(meu\s*)?(or[çc]amento|bolso)/i,
      /parcela\s*(t[aá]\s*)?(alta|pesada|puxada)/i,
      /entrada\s*(t[aá]\s*)?(alta|pesada|puxada)/i,
    ],
    priority: 85,
  },
  {
    intent: 'objecao_localizacao',
    category: 'OBJECAO',
    patterns: [
      /(muito\s*)?(longe|distante)/i,
      /localiza[çc][aã]o\s*(ruim|n[aã]o\s*(gost|agrad))/i,
      /bairro\s*(ruim|perigoso|n[aã]o\s*conhe[çc]o)/i,
      /n[aã]o\s*(gost|conhec)\s*(d[ao])?\s*(bairro|regi[aã]o|localiza)/i,
      /(fica|[eé])\s*(muito\s*)?(longe|distante)\s*(d[ao]|do\s*meu)/i,
      /acesso\s*(ruim|dif[ií]cil)/i,
      /transporte\s*(ruim|dif[ií]cil|longe)/i,
      /muito\s*(afastado|isolado)/i,
    ],
    priority: 85,
  },
  {
    intent: 'objecao_prazo',
    category: 'OBJECAO',
    patterns: [
      /demora\s*(muito|demais)/i,
      /prazo\s*(muito\s*)?(longo|grande|distante)/i,
      /entrega\s*(muito\s*)?(longe|distante|demorada)/i,
      /(s[oó]\s*)?(em|para|pra)\s*\d{4}/i,
      /muitos?\s*(anos?|meses?)\s*(pra|para)\s*(entregar|ficar\s*pronto)/i,
      /n[aã]o\s*(quero|posso)\s*esperar/i,
      /preciso\s*(agora|logo|r[aá]pido|urgente)/i,
    ],
    priority: 80,
  },
  {
    intent: 'objecao_confianca',
    category: 'OBJECAO',
    patterns: [
      /n[aã]o\s*(conhe[çc]o|confio)\s*(n[ao])?\s*(construtora|incorporadora|empresa)/i,
      /construtora\s*(desconhecida|pequena|n[aã]o\s*conhe[çc]o)/i,
      /(essa|essa)\s*(empresa|construtora)\s*[eé]\s*confi[aá]vel/i,
      /medo\s*(d[ea])?\s*(n[aã]o\s*)?(entregar|atrasar|quebrar)/i,
      /vai\s*(entregar|atrasar|quebrar)/i,
      /hist[oó]rico\s*(d[ea])?\s*(empresa|construtora)/i,
      /j[aá]\s*(atrasou|deu\s*problema)/i,
    ],
    priority: 80,
  },
  {
    intent: 'objecao_geral',
    category: 'OBJECAO',
    patterns: [
      /cliente\s*(n[aã]o\s*quer|reclamou|disse\s*que)/i,
      /obje[çc][aã]o/i,
      /como\s*(respondo|rebato|contorno)/i,
      /ele\s*(disse|falou|acha)\s*que/i,
      /ela\s*(disse|falou|acha)\s*que/i,
      /argumentos?\s*(para|pra)\s*(convencer|rebater)/i,
      /(me\s*)?ajuda\s*(a\s*)?(convencer|rebater|contornar)/i,
    ],
    priority: 75,
  },

  // ============ STATUS DE PROCESSO ============
  {
    intent: 'status_reserva',
    category: 'STATUS_PROCESSO',
    patterns: [
      /status\s*(da|de)?\s*(minha)?\s*reserva/i,
      /como\s*(t[aá]|est[aá]|anda)\s*(a|minha)?\s*reserva/i,
      /reserva\s*(t[aá]|est[aá])\s*(como|aprovada|pendente)/i,
      /minhas?\s*reservas?/i,
      /acompanhar\s*(a)?\s*reserva/i,
      /situa[çc][aã]o\s*(da)?\s*reserva/i,
    ],
    priority: 80,
  },
  {
    intent: 'status_proposta',
    category: 'STATUS_PROCESSO',
    patterns: [
      /status\s*(da|de)?\s*(minha)?\s*proposta/i,
      /como\s*(t[aá]|est[aá]|anda)\s*(a|minha)?\s*proposta/i,
      /proposta\s*(t[aá]|est[aá])\s*(como|aprovada|pendente)/i,
      /minhas?\s*propostas?/i,
      /acompanhar\s*(a)?\s*proposta/i,
      /situa[çc][aã]o\s*(da)?\s*proposta/i,
      /andamento\s*(da)?\s*proposta/i,
    ],
    priority: 80,
  },
  {
    intent: 'status_contrato',
    category: 'STATUS_PROCESSO',
    patterns: [
      /status\s*(do|de)?\s*(meu)?\s*contrato/i,
      /como\s*(t[aá]|est[aá]|anda)\s*(o|meu)?\s*contrato/i,
      /contrato\s*(t[aá]|est[aá])\s*(como|assinado|pronto)/i,
      /meus?\s*contratos?/i,
      /acompanhar\s*(o)?\s*contrato/i,
      /situa[çc][aã]o\s*(do)?\s*contrato/i,
    ],
    priority: 80,
  },

  // ============ COMISSAO ============
  {
    intent: 'comissao_consultar',
    category: 'COMISSAO',
    patterns: [
      /^comiss[aã]o$/i,
      /^comiss[oõ]es$/i,
      /minhas?\s*comiss[oõ]es?/i,
      /ver\s*(minhas?)?\s*comiss[oõ]es?/i,
      /quanto\s*(de)?\s*comiss[aã]o/i,
      /consultar\s*comiss[aã]o/i,
      /comiss[aã]o\s*(da|do)\s*m[eê]s/i,
    ],
    priority: 80,
  },
  {
    intent: 'comissao_previsao',
    category: 'COMISSAO',
    patterns: [
      /previs[aã]o\s*(de)?\s*comiss[aã]o/i,
      /quanto\s*(vou|vai)\s*receber\s*(de)?\s*comiss[aã]o/i,
      /comiss[aã]o\s*(a)?\s*receber/i,
      /comiss[aã]o\s*prevista/i,
      /pr[oó]xima\s*comiss[aã]o/i,
      /quando\s*(vou)?\s*receber\s*(a)?\s*comiss[aã]o/i,
    ],
    priority: 85,
  },
  {
    intent: 'comissao_extrato',
    category: 'COMISSAO',
    patterns: [
      /extrato\s*(de)?\s*comiss[oõ]es?/i,
      /hist[oó]rico\s*(de)?\s*comiss[oõ]es?/i,
      /comiss[oõ]es?\s*(pagas|recebidas)/i,
      /detalhamento\s*(de)?\s*comiss[aã]o/i,
      /relat[oó]rio\s*(de)?\s*comiss[oõ]es?/i,
    ],
    priority: 85,
  },

  // ============ METAS ============
  {
    intent: 'metas_consultar',
    category: 'METAS',
    patterns: [
      /^metas?$/i,
      /minhas?\s*metas?/i,
      /ver\s*(minhas?)?\s*metas?/i,
      /meta\s*(do|da)\s*(m[eê]s|semana)/i,
      /quanto\s*falta\s*(pra|para)\s*(a)?\s*meta/i,
      /consultar\s*meta/i,
      /como\s*(t[aá]|est[aá])\s*(a)?\s*meta/i,
    ],
    priority: 80,
  },
  {
    intent: 'metas_performance',
    category: 'METAS',
    patterns: [
      /minha\s*performance/i,
      /meu\s*desempenho/i,
      /como\s*(t[oô]|estou)\s*(indo|performando)/i,
      /resultado(s)?\s*(do|da)\s*(m[eê]s|semana)/i,
      /quanto\s*(j[aá])?\s*vendi/i,
      /minhas?\s*vendas?\s*(do|da)\s*(m[eê]s|semana)/i,
      /ating(i|ir)\s*(a)?\s*meta/i,
    ],
    priority: 85,
  },
  {
    intent: 'metas_ranking',
    category: 'METAS',
    patterns: [
      /ranking/i,
      /minha\s*posi[çc][aã]o/i,
      /onde\s*(eu)?\s*(t[oô]|estou)\s*(no)?\s*ranking/i,
      /top\s*vendedores?/i,
      /quem\s*(t[aá]|est[aá])\s*na\s*frente/i,
      /classifica[çc][aã]o/i,
      /placar\s*(de)?\s*vendas/i,
    ],
    priority: 85,
  },

  // ============ AGENDA ============
  {
    intent: 'agenda_consultar',
    category: 'AGENDA',
    patterns: [
      /^agenda$/i,
      /minha\s*agenda/i,
      /ver\s*(minha)?\s*agenda/i,
      /compromissos?\s*(de)?\s*(hoje|amanh[aã]|semana)/i,
      /o\s*que\s*(eu\s*)?(tenho|tem)\s*(pra)?\s*(hoje|amanh[aã]|semana)/i,
      /agenda\s*(de|do|da)?\s*(hoje|amanh[aã]|semana)/i,
      /atividades?\s*(de)?\s*(hoje|amanh[aã]|semana)/i,
      /como\s*(t[aá]|est[aá])\s*(a)?\s*(minha)?\s*agenda/i,
      /meus?\s*compromissos?/i,
      /pr[oó]ximos?\s*compromissos?/i,
      /pr[oó]ximas?\s*atividades?/i,
    ],
    priority: 80,
  },
  {
    intent: 'agenda_visita',
    category: 'AGENDA',
    patterns: [
      /agendar\s*(uma)?\s*visita/i,
      /marcar\s*(uma)?\s*visita/i,
      /criar\s*(uma)?\s*visita/i,
      /nova\s*visita/i,
      /quero\s*agendar/i,
      /preciso\s*agendar/i,
    ],
    priority: 85,
  },
  {
    intent: 'agenda_compromisso',
    category: 'AGENDA',
    patterns: [
      /agendar\s*(um)?\s*(compromisso|lembrete|tarefa)/i,
      /marcar\s*(um)?\s*(compromisso|lembrete|tarefa)/i,
      /criar\s*(um)?\s*(compromisso|lembrete|tarefa)/i,
      /novo\s*(compromisso|lembrete|tarefa)/i,
      /me\s*lembra\s*(de)?/i,
      /adicionar\s*(na)?\s*agenda/i,
    ],
    priority: 85,
  },

  // ============ CAMPANHA ============
  {
    intent: 'campanha_consultar',
    category: 'CAMPANHA',
    patterns: [
      /^(campanha|campanhas|ver campanhas)$/i,
      /(quais?)?\s*campanha(s)?(\s*ativa)?/i,
      /tem\s*(alguma)?\s*campanha/i,
      /campanha(s)?\s*(do\s*m[eê]s|atual|vigente)/i,
      /campanhas?\s*(em\s*)?(andamento|abertas?)/i,
      /ver\s*(as)?\s*campanhas?/i,
      /quais?\s*(s[aã]o)?\s*(as)?\s*campanhas?/i,
    ],
    priority: 75,
  },
  {
    intent: 'campanha_promocao',
    category: 'CAMPANHA',
    patterns: [
      /promo[çc][aã]o|promo[çc][oõ]es/i,
      /tem\s*(alguma)?\s*promo/i,
      /oferta(s)?\s*(especial|do\s*dia|da\s*semana)/i,
      /condi[çc][oõ]es?\s*especiais?/i,
      /t[aá]\s*rolando\s*(algo|alguma\s*promo)/i,
      /a[çc][aã]o\s*(promocional|de\s*venda)/i,
      /tem\s*oferta/i,
    ],
    priority: 80,
  },
  {
    intent: 'campanha_desconto',
    category: 'CAMPANHA',
    patterns: [
      /desconto(s)?\s*(especial|extra)?/i,
      /tem\s*desconto/i,
      /consigo\s*(algum)?\s*desconto/i,
      /d[aá]\s*(pra)?\s*(conseguir|ter)\s*desconto/i,
      /bonifica[çc][aã]o|b[oô]nus/i,
      /comiss[aã]o\s*(extra|especial|maior)/i,
      /incentivo(s)?\s*(de\s*venda)?/i,
    ],
    priority: 75,
  },

  // ============ AJUDA APP ============
  {
    intent: 'ajuda_app_navegacao',
    category: 'AJUDA_APP',
    patterns: [
      /como\s*(fa[çc]o|faz|usar?)\s*(uma?)?\s*simula[çc][aã]o/i,
      /como\s*simul(ar?|o)/i,
      /como\s*(fa[çc]o|faz|criar?)\s*(uma?)?\s*proposta/i,
      /como\s*(fa[çc]o|faz|ver?|acess(ar?|o))\s*(os?)?\s*relat[oó]rio/i,
      /como\s*(fa[çc]o|faz|ver?|acess(ar?|o))\s*(as?|minhas?)?\s*comiss[oõ]es?/i,
      /passo\s*a\s*passo/i,
      /me\s*ensina/i,
      /tutorial/i,
    ],
    priority: 75,
  },
  {
    intent: 'ajuda_app_funcionalidade',
    category: 'AJUDA_APP',
    patterns: [
      /ajuda\s*(com|no|na)?\s*(o\s*)?(app|aplicativo|sistema)/i,
      /n[aã]o\s*(sei|consigo)\s*(usar?|fazer?|achar?)/i,
      /onde\s*(fica|t[aá]|acho|encontro)\s*(o|a|no|na)?\s*(simula|proposta|relat[oó]rio|comiss)/i,
      /d[uú]vida\s*(sobre|no|na|com)/i,
      /me\s*explica/i,
    ],
    priority: 70,
  },
  {
    intent: 'ajuda_app_tutorial',
    category: 'AJUDA_APP',
    patterns: [
      /^ajuda$/i,
      /preciso\s*(de)?\s*ajuda/i,
      /o\s*que\s*(posso|da\s*pra)\s*fazer\s*(no|pelo)?\s*(app|aqui)?/i,
      /quais\s*(s[aã]o)?\s*(as)?\s*fun[çc][oõ]es/i,
      /menu\s*(de)?\s*ajuda/i,
      /op[çc][oõ]es\s*(do|de)?\s*(app|sistema)?/i,
    ],
    priority: 65,
  },
];

// ============================================
// EXTRAÇÃO DE ENTIDADES
// ============================================

function extractEntities(text: string): ExtractedEntities {
  const entities: ExtractedEntities = {};

  // Valor em reais (400000, 400.000, 400mil, 400k, R$ 400.000)
  const valorMatch = text.match(
    /(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)\s*(mil|k)?/i
  );
  if (valorMatch) {
    let valor = parseFloat(valorMatch[1].replace(/[.,]/g, ''));
    if (valorMatch[2]?.toLowerCase().match(/mil|k/)) {
      valor *= 1000;
    }
    if (valor >= 10000) {
      // Provavelmente é valor de imóvel
      entities.valor = valor;
    }
  }

  // Entrada (percentual ou valor)
  const entradaPercentMatch = text.match(/(\d+)\s*%/);
  if (entradaPercentMatch) {
    entities.percentual = parseInt(entradaPercentMatch[1]);
  }

  const entradaValorMatch = text.match(
    /entrada\s*(?:de)?\s*(?:R\$\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)/i
  );
  if (entradaValorMatch) {
    entities.entrada = parseFloat(entradaValorMatch[1].replace(/[.,]/g, ''));
  }

  // Quartos
  const quartosMatch = text.match(/(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i);
  if (quartosMatch) {
    entities.quartos = parseInt(quartosMatch[1]);
  }

  // Metragem
  const metragemMatch = text.match(/(\d+)\s*m[²2]/i);
  if (metragemMatch) {
    entities.metragem = parseInt(metragemMatch[1]);
  }

  // Unidade
  const unidadeMatch = text.match(
    /(?:unidade|apartamento|apto)\s*(\d+[a-z]?)/i
  );
  if (unidadeMatch) {
    entities.unidade = unidadeMatch[1].toUpperCase();
  }

  // Prazo em meses
  const prazoMesesMatch = text.match(/(\d+)\s*(?:meses|x|vezes)/i);
  if (prazoMesesMatch) {
    entities.prazo = parseInt(prazoMesesMatch[1]);
  }

  const prazoAnosMatch = text.match(/(\d+)\s*anos/i);
  if (prazoAnosMatch) {
    entities.prazo = parseInt(prazoAnosMatch[1]) * 12;
  }

  // Nome do cliente (padrões: "cliente João", "do João", "para Maria", "sr. Carlos", "dona Ana")
  const nomeClienteMatch = text.match(
    /(?:cliente|do|da|para|pro|pra|sr\.?|sra\.?|dona|senhor|senhora)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i
  );
  if (nomeClienteMatch) {
    entities.nomeCliente = nomeClienteMatch[1].trim();
  }

  // CPF (com ou sem formatação: 123.456.789-00 ou 12345678900)
  const cpfMatch = text.match(/(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-.\s]?\d{2})/);
  if (cpfMatch) {
    // Normaliza removendo pontos e traços
    entities.cpf = cpfMatch[1].replace(/[.\s-]/g, '');
  }

  // Data (hoje, amanhã, dias da semana, dd/mm, dd/mm/aaaa)
  const dataHojeMatch = text.match(/\bhoje\b/i);
  const dataAmanhaMatch = text.match(/\bamanh[aã]\b/i);
  const dataDiaSemanaMatch = text.match(
    /\b(segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)(?:-feira)?\b/i
  );
  const dataFormatadaMatch = text.match(
    /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/
  );

  if (dataHojeMatch) {
    entities.data = 'hoje';
  } else if (dataAmanhaMatch) {
    entities.data = 'amanha';
  } else if (dataDiaSemanaMatch) {
    entities.data = dataDiaSemanaMatch[1]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  } else if (dataFormatadaMatch) {
    const dia = dataFormatadaMatch[1].padStart(2, '0');
    const mes = dataFormatadaMatch[2].padStart(2, '0');
    const ano = dataFormatadaMatch[3] || new Date().getFullYear().toString();
    entities.data = `${dia}/${mes}/${ano.length === 2 ? '20' + ano : ano}`;
  }

  // Horário (10h, 14:30, 14h30, manhã, tarde, noite)
  const horarioCompletoMatch = text.match(/(\d{1,2})[h:](\d{2})?(?:\s*h)?/i);
  const horarioPeriodoMatch = text.match(/\b(manh[aã]|tarde|noite)\b/i);

  if (horarioCompletoMatch) {
    const hora = horarioCompletoMatch[1].padStart(2, '0');
    const minutos = horarioCompletoMatch[2] || '00';
    entities.horario = `${hora}:${minutos}`;
  } else if (horarioPeriodoMatch) {
    entities.horario = horarioPeriodoMatch[1]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Tipo de unidade (apartamento, casa, sala, cobertura, studio/estúdio)
  const tipoUnidadeMatch = text.match(
    /\b(apartamento|apto|casa|sala\s*comercial|sala|cobertura|studio|est[uú]dio|loft|kit(?:net|inete)?|flat)\b/i
  );
  if (tipoUnidadeMatch) {
    const tipo = tipoUnidadeMatch[1].toLowerCase();
    // Normaliza os tipos
    if (tipo === 'apto') {
      entities.tipoUnidade = 'apartamento';
    } else if (tipo.match(/studio|est[uú]dio/)) {
      entities.tipoUnidade = 'studio';
    } else if (tipo.match(/kit(?:net|inete)?/)) {
      entities.tipoUnidade = 'kitnet';
    } else if (tipo === 'sala comercial') {
      entities.tipoUnidade = 'sala comercial';
    } else {
      entities.tipoUnidade = tipo;
    }
  }

  return entities;
}

// ============================================
// FUNÇÃO PRINCIPAL DE DETECÇÃO
// ============================================

export function detectIntent(text: string): IntentResult {
  const normalizedText = text
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  const matchedPatterns: Array<{
    pattern: IntentPattern;
    triggers: string[];
  }> = [];

  // Testar todos os padrões
  for (const intentPattern of INTENT_PATTERNS) {
    const triggers: string[] = [];

    for (const regex of intentPattern.patterns) {
      const match = normalizedText.match(regex);
      if (match) {
        triggers.push(match[0]);
      }
    }

    if (triggers.length > 0) {
      matchedPatterns.push({ pattern: intentPattern, triggers });
    }
  }

  // Ordenar por prioridade
  matchedPatterns.sort((a, b) => b.pattern.priority - a.pattern.priority);

  // Extrair entidades
  const entities = extractEntities(text);

  // Retornar melhor match ou unknown
  if (matchedPatterns.length > 0) {
    const best = matchedPatterns[0];
    const confidence = Math.min(
      0.5 + best.triggers.length * 0.15 + best.pattern.priority * 0.003,
      0.95
    );

    return {
      category: best.pattern.category,
      intent: best.pattern.intent,
      confidence,
      entities,
      triggers: best.triggers,
    };
  }

  return {
    category: 'UNKNOWN',
    intent: 'unknown',
    confidence: 0.1,
    entities,
    triggers: [],
  };
}

/**
 * Verifica se a mensagem é uma saudação simples
 */
export function isSimpleGreeting(text: string): boolean {
  const result = detectIntent(text);
  return result.category === 'SAUDACAO' && result.confidence > 0.6;
}

/**
 * Verifica se é pedido de escalação humana
 */
export function isHumanRequest(text: string): boolean {
  const result = detectIntent(text);
  return result.intent === 'support_human';
}
