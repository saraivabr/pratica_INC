/**
 * Detector de intencao de confirmacao para eventos
 *
 * Identifica se o convidado esta:
 * - Confirmando presenca
 * - Recusando convite
 * - Em duvida (talvez)
 */

import type { ConvidadoStatus, ConfirmacaoIntentResult } from './types';

// ============================================
// PADROES DE DETECCAO
// ============================================

interface IntentPattern {
  status: ConvidadoStatus;
  patterns: RegExp[];
  priority: number; // Maior = mais prioritario
}

const INTENT_PATTERNS: IntentPattern[] = [
  // ============ CONFIRMADO ============
  {
    status: 'confirmado',
    patterns: [
      // Afirmacoes diretas
      /^(sim|s|ss|sss|siiim|siim)$/i,
      /^(vou|vo|vamo|vamos|bora|pode crer|fechado|fechou|combinado)$/i,
      /^(ok|oks|blz|beleza|show|top|otimo|maravilha|perfeito|massa|dale)$/i,

      // Frases de confirmacao
      /\b(vou sim|eu vou|pode confirmar|confirmo|confirmado|ta confirmado)\b/i,
      /\b(estarei la|estarei presente|vou estar la|conto comigo)\b/i,
      /\b(pode contar|conte comigo|pode me colocar|me coloca|me inclui)\b/i,
      /\b(com certeza|claro|claro que sim|obvio|logico)\b/i,
      /\b(vou aparecer|vou comparecer|passo la|chego la)\b/i,
      /\b(ja marquei|anotei aqui|ta na agenda|ja reservei)\b/i,
      /\b(nao perco|nao vou perder|nao perca)\b/i,

      // Variacoes informais
      /\b(to dentro|to la|vou nessa|bora la|partiu)\b/i,
      /\b(pode cre|tmj|to junto|estamos juntos)\b/i,
    ],
    priority: 90,
  },

  // ============ RECUSADO ============
  {
    status: 'recusado',
    patterns: [
      // Negacoes diretas
      /^(nao|n|nn|nops|nope|nega|negativo)$/i,

      // Frases de recusa
      /\b(nao vou|n vou|nao posso|n posso|nao consigo|n consigo)\b/i,
      /\b(nao da|nao vai dar|nao rola|n rola|impossivel)\b/i,
      /\b(nao vou poder|nao vou conseguir|infelizmente nao)\b/i,
      /\b(tenho compromisso|ja tenho|estarei ocupado|ocupado|indisponivel)\b/i,
      /\b(nao vou estar|nao estarei|vou estar viajando|viajando)\b/i,
      /\b(passar essa|passo essa|fica pra proxima|proxima vez)\b/i,
      /\b(dessa vez nao|dessa nao|agora nao)\b/i,
      /\b(vou ter que|preciso|tenho que fazer outra coisa)\b/i,
      /\b(desculpa mas|infelizmente|sinto muito mas)\b/i,
    ],
    priority: 90,
  },

  // ============ TALVEZ ============
  {
    status: 'talvez',
    patterns: [
      // Incerteza direta
      /^(talvez|talves|tvz|quem sabe|sei la|sei nao)$/i,

      // Frases de duvida
      /\b(vou tentar|tento|vou ver se|ver se consigo)\b/i,
      /\b(ainda nao sei|nao sei ainda|ainda n sei|n sei ainda)\b/i,
      /\b(depende|vou ver|preciso ver|tenho que ver)\b/i,
      /\b(se der|se conseguir|se eu puder|se der certo)\b/i,
      /\b(acho que sim|acho que vou|provavelmente|provavel)\b/i,
      /\b(acho que nao|acho dificil|vai ser dificil|ta dificil)\b/i,
      /\b(deixa eu ver|deixa ver|vou confirmar depois)\b/i,
      /\b(te aviso|te falo|te confirmo depois|depois te falo)\b/i,
      /\b(pode ser|talvez de|quem sabe de)\b/i,
      /\b(nao tenho certeza|sem certeza|incerto)\b/i,
      /\b(espera|espera ai|calma|um momento)\b/i,
    ],
    priority: 80,
  },
];

// ============================================
// FUNCAO PRINCIPAL DE DETECCAO
// ============================================

/**
 * Detecta intencao de confirmacao na mensagem
 */
export function detectarIntencaoConfirmacao(mensagem: string): ConfirmacaoIntentResult {
  // Normaliza a mensagem
  const normalizada = mensagem
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();

  const matchedPatterns: Array<{
    status: ConvidadoStatus;
    triggers: string[];
    priority: number;
  }> = [];

  // Testa todos os padroes
  for (const pattern of INTENT_PATTERNS) {
    const triggers: string[] = [];

    for (const regex of pattern.patterns) {
      const match = normalizada.match(regex);
      if (match) {
        triggers.push(match[0]);
      }
    }

    if (triggers.length > 0) {
      matchedPatterns.push({
        status: pattern.status,
        triggers,
        priority: pattern.priority,
      });
    }
  }

  // Ordena por prioridade
  matchedPatterns.sort((a, b) => b.priority - a.priority);

  // Se encontrou match
  if (matchedPatterns.length > 0) {
    const best = matchedPatterns[0];

    // Calcula confianca baseada em:
    // - Quantidade de triggers encontrados
    // - Prioridade do padrao
    // - Tamanho da mensagem (mensagens curtas e diretas tem maior confianca)
    const baseConfidence = 0.5;
    const triggerBonus = Math.min(best.triggers.length * 0.15, 0.3);
    const priorityBonus = best.priority * 0.003;
    const shortMessageBonus = normalizada.length < 20 ? 0.1 : 0;

    const confidence = Math.min(
      baseConfidence + triggerBonus + priorityBonus + shortMessageBonus,
      0.95
    );

    // Verifica se precisa de follow-up
    // Se a confianca for baixa ou a mensagem for ambigua
    const needsFollowUp = confidence < 0.7 || mensagem.includes('?');

    return {
      status: best.status,
      confidence,
      triggers: best.triggers,
      needsFollowUp,
    };
  }

  // Nenhuma intencao clara detectada
  return {
    status: null,
    confidence: 0.1,
    triggers: [],
    needsFollowUp: true, // Precisa perguntar
  };
}

/**
 * Verifica se a mensagem e uma pergunta sobre o evento
 */
export function isPerguntaSobreEvento(mensagem: string): boolean {
  const normalizada = mensagem.toLowerCase();

  const perguntasComuns = [
    // Perguntas sobre horario
    /\b(que horas?|qual hor[aá]rio|hora|quando|a que horas)\b/i,

    // Perguntas sobre local
    /\b(onde|qual o local|qual lugar|endere[çc]o|como chegar)\b/i,

    // Perguntas sobre o evento
    /\b(o que [eé]|do que se trata|sobre o que|qual [eé] o tema)\b/i,
    /\b(quem vai|quem mais|quantas pessoas)\b/i,
    /\b(precisa levar|tem que levar|o que levar)\b/i,
    /\b(tem estacionamento|estacionar|vaga)\b/i,
    /\b(pode levar|posso levar|acompanhante)\b/i,
    /\b(quanto custa|[eé] pago|gratuito|gratis)\b/i,
    /\b(quanto tempo|dura quanto|at[eé] que horas)\b/i,
    /\b(vai ter|ter[aá])\s+(comida|bebida|coffee)\b/i,
  ];

  return perguntasComuns.some(regex => regex.test(normalizada));
}

/**
 * Categoriza o tipo de pergunta para ajudar a Sofia a responder
 */
export function categorizarPergunta(mensagem: string): string | null {
  const normalizada = mensagem.toLowerCase();

  if (/\b(que horas?|qual hor[aá]rio|hora|quando|a que horas)\b/i.test(normalizada)) {
    return 'horario';
  }

  if (/\b(onde|qual o local|qual lugar|endere[çc]o|como chegar)\b/i.test(normalizada)) {
    return 'local';
  }

  if (/\b(o que [eé]|do que se trata|sobre o que)\b/i.test(normalizada)) {
    return 'descricao';
  }

  if (/\b(quem vai|quem mais|quantas pessoas)\b/i.test(normalizada)) {
    return 'participantes';
  }

  if (/\b(pode levar|posso levar|acompanhante)\b/i.test(normalizada)) {
    return 'acompanhante';
  }

  if (/\b(quanto custa|[eé] pago|gratuito|gratis)\b/i.test(normalizada)) {
    return 'preco';
  }

  if (/\b(quanto tempo|dura quanto|at[eé] que horas)\b/i.test(normalizada)) {
    return 'duracao';
  }

  return null;
}

/**
 * Gera resposta automatica para perguntas simples sobre evento
 */
export function gerarRespostaAutomatica(
  categoria: string,
  evento: {
    nome: string;
    data_hora: Date | string;
    local: string;
    descricao?: string;
  }
): string | null {
  const dataEvento = new Date(evento.data_hora);
  const dia = dataEvento.getDate();
  const mes = dataEvento.getMonth() + 1;
  const hora = dataEvento.getHours();
  const minutos = dataEvento.getMinutes().toString().padStart(2, '0');

  switch (categoria) {
    case 'horario':
      return `O evento comeca as ${hora}:${minutos} do dia ${dia}/${mes}. Te espero la!`;

    case 'local':
      return `O local e: ${evento.local}. Qualquer duvida pra chegar, me avisa!`;

    case 'descricao':
      if (evento.descricao) {
        return `Sobre o *${evento.nome}*: ${evento.descricao}`;
      }
      return `E o ${evento.nome}! Vai ser bem legal. Mais detalhes eu confirmo com a organizacao e te aviso.`;

    case 'preco':
      return `Esse evento nao tem custo, e de graca! Pode confirmar tranquilo.`;

    default:
      return null;
  }
}

// ============================================
// VALIDACOES
// ============================================

/**
 * Verifica se a resposta indica mudanca de status
 * Util para quando ja tem um status e quer detectar mudanca
 */
export function detectarMudancaStatus(
  mensagem: string,
  statusAtual: ConvidadoStatus
): { novoStatus: ConvidadoStatus | null; confidence: number } {
  const resultado = detectarIntencaoConfirmacao(mensagem);

  // Se nao detectou intencao clara, nao muda
  if (!resultado.status || resultado.confidence < 0.6) {
    return { novoStatus: null, confidence: 0 };
  }

  // Se e o mesmo status, nao muda
  if (resultado.status === statusAtual) {
    return { novoStatus: null, confidence: resultado.confidence };
  }

  return {
    novoStatus: resultado.status,
    confidence: resultado.confidence,
  };
}

/**
 * Verifica se a mensagem menciona o nome do evento
 * Util para confirmar que a resposta e sobre o evento correto
 */
export function mencionaEvento(mensagem: string, nomeEvento: string): boolean {
  const normalizar = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const msgNormalizada = normalizar(mensagem);
  const nomeNormalizado = normalizar(nomeEvento);

  // Verifica se menciona palavras-chave do nome do evento
  const palavras = nomeNormalizado.split(/\s+/).filter(p => p.length > 3);

  return palavras.some(palavra => msgNormalizada.includes(palavra));
}
