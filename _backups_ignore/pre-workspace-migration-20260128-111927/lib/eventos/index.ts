/**
 * Modulo de Eventos para Corretores
 *
 * Sistema de convites e lembretes via WhatsApp com IA (Sofia).
 *
 * Este modulo fornece:
 * - Geracao de mensagens variadas (anti-spam)
 * - Deteccao de intencao de confirmacao
 * - Gerenciamento de contexto de convidados
 * - Integracao com Sofia para conversas sobre eventos
 */

// ============================================
// TIPOS
// ============================================

export type {
  Evento,
  EventoConvidado,
  EventoContext,
  ConvidadoStatus,
  ConfirmacaoIntentResult,
  MessageGeneratorOptions,
  MessageVariations,
} from './types';

// ============================================
// GERACAO DE MENSAGENS (ANTI-SPAM)
// ============================================

export {
  // Convites
  gerarMensagemConvite,

  // Lembretes
  gerarMensagemLembrete,

  // Respostas da Sofia
  gerarSofiaEventoPrompt,
  gerarRespostaConfirmacao,

  // Utilidades
  gerarDelayEnvio,
  verificarDiferenca,
} from './message-generator';

// ============================================
// DETECCAO DE INTENCAO
// ============================================

export {
  // Deteccao principal
  detectarIntencaoConfirmacao,

  // Perguntas sobre evento
  isPerguntaSobreEvento,
  categorizarPergunta,
  gerarRespostaAutomatica,

  // Mudanca de status
  detectarMudancaStatus,

  // Validacoes
  mencionaEvento,
} from './intent-detector';

// ============================================
// CONTEXTO DE CONVIDADOS
// ============================================

export {
  // Busca de convidados
  buscarConvidadoPorTelefone,
  isConvidadoDeEventoAtivo,

  // Atualizacao de status
  atualizarStatusConvidado,
  marcarConviteEnviado,
  marcarLembreteEnviado,

  // Listagens
  listarConvidados,
  listarConvidadosPendentesConvite,
  listarConvidadosParaLembrete,

  // Estatisticas
  getEstatisticasEvento,

  // Eventos
  listarEventosParaLembrete,
  buscarEvento,
} from './guest-context';

// ============================================
// FUNCAO PRINCIPAL DE PROCESSAMENTO
// ============================================

import type { EventoContext, ConvidadoStatus } from './types';
import { detectarIntencaoConfirmacao, isPerguntaSobreEvento, categorizarPergunta, gerarRespostaAutomatica } from './intent-detector';
import { gerarRespostaConfirmacao } from './message-generator';
import { atualizarStatusConvidado } from './guest-context';

/**
 * Processa mensagem de convidado de evento
 *
 * Esta funcao e chamada pela Sofia quando detecta que a mensagem
 * vem de um convidado de evento.
 *
 * Retorna:
 * - resposta: Mensagem de resposta a ser enviada (ou null se Sofia deve responder livremente)
 * - novoStatus: Novo status do convidado (se mudou)
 * - categoria: Tipo de pergunta se for uma pergunta
 */
export async function processarMensagemConvidado(
  mensagem: string,
  contexto: EventoContext
): Promise<{
  resposta: string | null;
  novoStatus: ConvidadoStatus | null;
  categoria: string | null;
  atualizouStatus: boolean;
}> {
  const { evento, convidado } = contexto;
  const primeiroNome = convidado.nome.split(' ')[0];

  // 1. Detecta se e uma pergunta sobre o evento
  if (isPerguntaSobreEvento(mensagem)) {
    const categoria = categorizarPergunta(mensagem);

    if (categoria) {
      const respostaAutomatica = gerarRespostaAutomatica(categoria, evento);

      if (respostaAutomatica) {
        return {
          resposta: respostaAutomatica,
          novoStatus: null,
          categoria,
          atualizouStatus: false,
        };
      }
    }

    // Se nao conseguiu gerar resposta automatica, Sofia responde livremente
    return {
      resposta: null,
      novoStatus: null,
      categoria,
      atualizouStatus: false,
    };
  }

  // 2. Detecta intencao de confirmacao
  const intencao = detectarIntencaoConfirmacao(mensagem);

  // Se detectou intencao com confianca razoavel
  if (intencao.status && intencao.confidence >= 0.6) {
    // Verifica se e uma mudanca de status
    const statusMudou = intencao.status !== convidado.status;

    if (statusMudou && intencao.status !== 'pendente') {
      // Atualiza o status no banco
      await atualizarStatusConvidado(convidado.id, intencao.status);

      // Gera resposta apropriada
      const resposta = gerarRespostaConfirmacao(primeiroNome, evento, intencao.status);

      return {
        resposta,
        novoStatus: intencao.status,
        categoria: null,
        atualizouStatus: true,
      };
    }

    // Status igual - confirma que ja esta registrado
    const mensagensJaConfirmado: Record<ConvidadoStatus, string> = {
      confirmado: `Ja tenho sua confirmacao anotada, ${primeiroNome}! Te vejo la.`,
      recusado: `Ja anotei que voce nao podera ir. Se mudar de ideia, me avisa!`,
      talvez: `Ja anotei que voce vai tentar. Me avisa quando souber!`,
      pendente: 'Aguardando sua confirmacao!',
    };

    return {
      resposta: mensagensJaConfirmado[intencao.status],
      novoStatus: null,
      categoria: null,
      atualizouStatus: false,
    };
  }

  // 3. Se precisar de follow-up ou nao detectou intencao, Sofia responde livremente
  return {
    resposta: null,
    novoStatus: null,
    categoria: null,
    atualizouStatus: false,
  };
}

/**
 * Verifica se deve usar o fluxo de eventos ou o fluxo normal da Sofia
 *
 * Criterios:
 * - Mensagem vem de convidado de evento ativo
 * - Convite ja foi enviado
 */
export function deveUsarFluxoEventos(contexto: EventoContext | null): boolean {
  if (!contexto) return false;

  // Verifica se o evento ainda esta ativo
  if (contexto.evento.status !== 'ativo') return false;

  // Verifica se o convite foi enviado
  if (!contexto.convidado.convite_enviado_at) return false;

  // Verifica se o evento ainda nao aconteceu
  const dataEvento = new Date(contexto.evento.data_hora);
  const agora = new Date();
  if (dataEvento < agora) return false;

  return true;
}
