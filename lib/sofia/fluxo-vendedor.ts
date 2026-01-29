// @ts-nocheck
/**
 * Fluxo de Venda de Imóvel - Sofia Vendedor
 *
 * Orquestra todo o pipeline de vendas:
 * 1. Detectar intenção
 * 2. Buscar imóveis
 * 3. Construir oferta agressiva
 * 4. Enviar + capturar lead
 */

import { 
  detectarIntencaoCompra,
  buscarImovelsCVCRM,
  construirOfertaAgressiva,
  enviarOfertaVenda,
  criarLeadVendedor,
  calcularScoreLead,
  construirContextoVendedor,
  type FiltrosImovel,
  type ImovelOferecido,
  type OfertaVenda,
  type Lead,
} from './vendedor-imovel';
import {
  buildVendedorSystemPrompt,
  RESPOSTAS_VENDEDOR,
  gerarMensagemPorFase,
  buildLeadQualificadoPrompt,
} from './vendedor-prompts';
import { updateContext, type ConversationContext } from './context';
import { sendTextMessage, sendQuickButtons, sendActionButtons } from '@/lib/zapi';
import { delay } from './persona';

// ============================================================================
// TIPOS
// ============================================================================

export interface EstadoFluxoVenda {
  fase: 'descoberta' | 'apresentacao' | 'objecao' | 'fechamento' | 'agendamento';
  filtros: FiltrosImovel;
  imoveisEncontrados: ImovelOferecido[];
  oferta: OfertaVenda | null;
  leadDados: {
    nome?: string;
    whatsapp?: string;
    imovelSelecionado?: string;
  };
  score: number;
  tentativas: number;
}

// ============================================================================
// DETECTAR E INICIAR FLUXO DE VENDA
// ============================================================================

/**
 * Ponto de entrada principal - detecta se é venda de imóvel
 */
export async function iniciarFluxoVendaImovel(
  texto: string,
  nomeCliente: string,
  telefoneCliente: string,
  workspaceId: number,
  context: ConversationContext
): Promise<{
  temVenda: boolean;
  messages: string[];
  novoContext?: ConversationContext;
  leadCriado?: Lead;
  deveEnviarBotoes: boolean;
  botoesAcao?: Array<{ id: string; label: string; emoji?: string }>;
}> {
  const resultado = detectarIntencaoCompra(texto);

  if (!resultado.temIntencao) {
    return { temVenda: false, messages: [], deveEnviarBotoes: false };
  }

  // Cliente quer comprar imóvel! 🔥
  console.log('[Sofia Vendedor] Intenção de venda detectada:', resultado);

  // Buscar imóveis em tempo real
  const imoveis = await buscarImovelsCVCRM(resultado.filtros);

  if (imoveis.length === 0) {
    return {
      temVenda: true,
      messages: [
        `${nomeCliente}! 🔍 Não encontrei imóveis com esses critérios AGORA.`,
        'Mas deixa eu expandir a busca... qual é sua PRIORIDADE: preço, bairro ou metragem? 📍',
      ],
      novoContext: updateContext(context, {
        flow: 'venda_imovel',
        step: 1,
        entities: { filtros: resultado.filtros },
        topic: 'venda_imovel',
      }),
      deveEnviarBotoes: false,
    };
  }

  // TEM IMÓVEIS! Construir oferta agressiva
  const oferta = construirOfertaAgressiva(imoveis, resultado.filtros);
  const score = calcularScoreLead(resultado.filtros);

  // Calcular mensagens
  const mensagens = [oferta.mensagemAbertura];
  mensagens.push(...oferta.mensagensDetalhadas.slice(1, -1));
  mensagens.push(oferta.mensagensDetalhadas[oferta.mensagensDetalhadas.length - 1]);

  return {
    temVenda: true,
    messages: mensagens,
    novoContext: updateContext(context, {
      flow: 'venda_imovel',
      step: 2,
      entities: {
        filtros: resultado.filtros,
        imoveisEncontrados: imoveis.map(i => ({ id: i.id, nome: i.nome, preco: i.preco })),
        score,
      },
      topic: 'venda_imovel',
      awaiting: 'selecao_imovel',
    }),
    deveEnviarBotoes: true,
    botoesAcao: oferta.botoes.slice(0, 3),
  };
}

// ============================================================================
// PROCESSAR SELEÇÃO DE IMÓVEL
// ============================================================================

/**
 * Quando cliente clica em "Agendar Visita" ou "Mais Detalhes"
 */
export async function processarSelecaoImovel(
  acao: 'agendar' | 'detalhes',
  imovelId: string,
  nomeCliente: string,
  telefoneCliente: string,
  workspaceId: number,
  context: ConversationContext
): Promise<{
  messages: string[];
  proximaFase: 'agendamento' | 'detalhes' | 'captura_nome';
  novoContext: ConversationContext;
}> {
  // Buscar imóvel nos dados do contexto
  const imoveisEncontrados = (context.entities as any).imoveisEncontrados || [];
  const imovelSelecionado = (imoveisEncontrados as any[]).find((i: any) => i.id === imovelId);

  if (!imovelSelecionado) {
    return {
      messages: ['Desculpa, não achei esse imóvel. Qual você quer de novo?'],
      proximaFase: 'detalhes',
      novoContext: context,
    };
  }

  if (acao === 'agendar') {
    return {
      messages: [
        `Perfeito! 📅 Vamo agendar a visita no *${imovelSelecionado.nome}*!`,
        'Qual dia bate melhor: HOJE à tarde, AMANHÃ de manhã, ou outro dia?',
      ],
      proximaFase: 'agendamento',
      novoContext: updateContext(context, {
        step: 3,
        entities: {
          ...context.entities,
          imovelSelecionado: imovelId,
        },
        awaiting: 'data_agendamento',
      }),
    };
  }

  // DETALHES
  return {
    messages: [
      `*${imovelSelecionado.nome}* 📍`,
      `💰 R$ ${imovelSelecionado.preco}`,
      `Tá INCRÍVEL! Com ${imovelSelecionado.quartos} quartos, ${imovelSelecionado.metragem}m², no ${imovelSelecionado.bairro || 'melhor bairro'}!`,
      '',
      'Quer agendar a visita HOJE mesmo? 🚀',
    ],
    proximaFase: 'agendamento',
    novoContext: updateContext(context, {
      step: 3,
      entities: {
        ...context.entities,
        imovelSelecionado: imovelId,
      },
      awaiting: 'confirmacao_agendamento',
    }),
  };
}

// ============================================================================
// CAPTURAR DADOS DO LEAD
// ============================================================================

/**
 * Quando cliente demonstra interesse forte, capturar dados
 */
export async function solicitarDadosClienteLead(
  nomeCliente: string,
  telefoneCliente: string,
  imovelInteressado: string,
  filtros: FiltrosImovel
): Promise<{
  messages: string[];
  proximaFase: 'captura_email';
}> {
  // Já temos nome do contexto da conversa
  // Só falta email/whatsapp pra confirmação
  
  return {
    messages: [
      `Ótimo ${nomeCliente}! ✅`,
      '',
      'Deixa eu capturar seus dados pra eu mandar a ficha técnica completa e fotos:',
      'Qual seu melhor email? 📧',
    ],
    proximaFase: 'captura_email',
  };
}

/**
 * Cria lead após capturar todos os dados
 */
export async function finalizarLeadVenda(
  nomeCliente: string,
  telefonCliente: string,
  imovelInteressado: string,
  filtros: FiltrosImovel,
  workspaceId: number
): Promise<{
  leadId: string;
  sucesso: boolean;
  mensagem: string;
  messages: string[];
}> {
  const score = calcularScoreLead(filtros);

  const lead: Lead = {
    nome: nomeCliente,
    whatsapp: telefonCliente,
    imovelInteressado,
    filtrosOriginais: filtros,
    score,
    fonte: 'whatsapp_sofia',
  };

  const resultado = await criarLeadVendedor(lead, workspaceId);

  const messages = [
    `Pronto ${nomeCliente}! ✅`,
    '',
    `Seu interesse no *${imovelInteressado}* tá registrado!`,
    '',
    'Um dos nossos corretores vai te contatar em até 2 horas com fotos e documentação completa. 📸',
    '',
    'Qualquer dúvida, é só chamar aqui! 🙌',
  ];

  return {
    leadId: resultado.id,
    sucesso: resultado.sucesso,
    mensagem: resultado.mensagem,
    messages,
  };
}

// ============================================================================
// CONFIRMAR AGENDAMENTO
// ============================================================================

/**
 * Processa confirmação de agendamento
 */
export async function confirmarAgendamento(
  nomeCliente: string,
  dataHoraTexto: string,
  imovelSelecionado: string,
  telefoneCliente: string,
  workspaceId: number
): Promise<{
  agendado: boolean;
  messages: string[];
  leadCriado?: { id: string; sucesso: boolean };
}> {
  // Aqui você integraria com um sistema de agendamento real
  // Por enquanto, vamos simular

  // Tentar extrair data e hora
  const dataMatch = dataHoraTexto.match(/hoje|amanhã|segunda|terça|quarta|quinta|sexta|sábado|domingo/i);
  const horaMatch = dataHoraTexto.match(/(\d{1,2})[:\s]*(\d{2})?|manhã|tarde|noite/i);

  const dataOk = dataMatch ? true : false;
  const horaOk = horaMatch ? true : false;

  if (!dataOk) {
    return {
      agendado: false,
      messages: [
        'Qual dia especificamente? 📅',
        '(HOJE, AMANHÃ, ou um dia da semana)',
      ],
    };
  }

  // Agendado! Criar lead
  // (Aqui você faria INSERT no banco de agendamentos)

  return {
    agendado: true,
    messages: [
      `✅ Agendado! ${dataHoraTexto.toUpperCase()}`,
      '',
      `Local: [ENDEREÇO DO IMÓVEL]`,
      `Contato: [CORRETOR RESPONSÁVEL]`,
      '',
      `${nomeCliente}, você vai AMAR essa oportunidade! 🏠`,
      '',
      'Qualquer dúvida, me liga!',
    ],
  };
}

// ============================================================================
// REFAZER OFERTA SE CLIENTE RECUSAR
// ============================================================================

/**
 * Cliente disse "não interessa" - tenta com outra alternativa
 */
export async function ofertaAlternativa(
  nomeCliente: string,
  motivoRecusa: string,
  context: ConversationContext
): Promise<{
  temAlternativa: boolean;
  messages: string[];
  novoContext: ConversationContext;
}> {
  const filtrosAtuais = context.entities?.filtros || {};

  // Tentar entender por que recusou
  const lower = motivoRecusa.toLowerCase();

  if (lower.includes('caro') || lower.includes('preço')) {
    return {
      temAlternativa: true,
      messages: [
        `Entendo ${nomeCliente}, preço é importante mesmo.`,
        '',
        'Tá, deixa eu procurar algo MAIS EM CONTA aí...',
        'Qual seria seu teto MÁXIMO? 💰',
      ],
      novoContext: updateContext(context, {
        entities: {
          ...context.entities,
          tipoObjecao: 'preco',
        },
      }),
    };
  }

  if (lower.includes('longe') || lower.includes('bairro') || lower.includes('localização')) {
    return {
      temAlternativa: true,
      messages: [
        `Achei! 🎯 Localização importa muito mesmo.`,
        '',
        'Qual bairro você IDEAL? Te mostro as melhores opções de lá!',
      ],
      novoContext: updateContext(context, {
        entities: {
          ...context.entities,
          tipoObjecao: 'localizacao',
        },
      }),
    };
  }

  if (lower.includes('pequeno') || lower.includes('metragem') || lower.includes('maior')) {
    return {
      temAlternativa: true,
      messages: [
        `Perfeito, precisas de mais espaço mesmo! 📐`,
        '',
        'Qual seria o MÍNIMO de metragem que você quer?',
      ],
      novoContext: updateContext(context, {
        entities: {
          ...context.entities,
          tipoObjecao: 'metragem',
        },
      }),
    };
  }

  // Recusa genérica - perguntar mesmo assim
  return {
    temAlternativa: true,
    messages: [
      `Tudo bem ${nomeCliente}! Sem problema.`,
      '',
      'Qual seria sua PRIORIDADE #1: Preço? Localização? Ou tamanho? 🎯',
    ],
    novoContext: context,
  };
}

// ============================================================================
// INTEGRAÇÃO COM FLUXO EXISTENTE SOFIA
// ============================================================================

/**
 * Detecta se é fluxo de venda e retorna resultado estruturado
 * para ser integrado aos flows.ts existentes
 */
export async function processarTextoVenda(
  texto: string,
  user: any,
  context: ConversationContext,
  nomeCliente: string,
  telefoneCliente: string,
  workspaceId: number
): Promise<{
  isVendaFlow: boolean;
  messages: string[];
  context: ConversationContext;
  shouldUseAI: boolean;
  followUp?: (phone: string) => Promise<void>;
}> {
  // Verificar se é continuação de fluxo de venda
  if (context.current_flow === 'venda_imovel') {
    if (context.awaiting_response === 'selecao_imovel') {
      // Cliente selecionou imóvel
      const acaoMatch = texto.match(/agendar|detalhes|mais info/i);
      const imovelMatch = texto.match(/apt|empreendimento|(\d+)/i);

      if (acaoMatch) {
        const acao = acaoMatch[0].toLowerCase() as 'agendar' | 'detalhes';
        // Aqui você processaria a seleção
        // Por enquanto, exemplo simples
        return {
          isVendaFlow: true,
          messages: ['Perfeito! Vamos agendar? 📅'],
          context: updateContext(context, {
            step: 3,
            awaiting: 'confirmacao_agendamento',
          }),
          shouldUseAI: false,
        };
      }
    }

    if (context.awaiting_response === 'confirmacao_agendamento') {
      const resultado = await confirmarAgendamento(
        nomeCliente,
        texto,
        (context.entities as any)?.imovelSelecionado || '',
        telefoneCliente,
        workspaceId
      );

      return {
        isVendaFlow: true,
        messages: resultado.messages,
        context: updateContext(context, {
          step: 4,
          awaiting: null,
          flow: null, // Finaliza fluxo
        }),
        shouldUseAI: false,
      };
    }
  }

  // Verificar se NOVO texto tem intenção de venda
  const resultado = await iniciarFluxoVendaImovel(
    texto,
    nomeCliente,
    telefoneCliente,
    workspaceId,
    context
  );

  if (resultado.temVenda) {
    return {
      isVendaFlow: true,
      messages: resultado.messages,
      context: resultado.novoContext || context,
      shouldUseAI: false,
      followUp: resultado.deveEnviarBotoes
        ? async (phone: string) => {
            if (resultado.botoesAcao) {
              await delay(1000);
              for (const botao of resultado.botoesAcao) {
                await sendQuickButtons(phone, botao.label, [
                  { id: botao.id, text: botao.label },
                ]);
                await delay(300);
              }
            }
          }
        : undefined,
    };
  }

  // Não é venda
  return {
    isVendaFlow: false,
    messages: [],
    context,
    shouldUseAI: true,
  };
}
