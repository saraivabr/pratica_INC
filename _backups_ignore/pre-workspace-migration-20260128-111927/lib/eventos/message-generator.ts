/**
 * Gerador de mensagens variadas para eventos (anti-spam)
 *
 * Cada mensagem gerada e unica para evitar deteccao de spam pelo WhatsApp.
 * Varia: saudacao, formato de data, emojis, tom, estrutura.
 */

import type { Evento, MessageGeneratorOptions, MessageVariations } from './types';

// ============================================
// VARIACOES DISPONIVEIS
// ============================================

const SAUDACOES = [
  'Oi',
  'Ola',
  'E ai',
  'Fala',
  'Hey',
  'Opa',
  'Eae',
];

const SAUDACOES_COM_NOME = [
  (nome: string) => `Oi ${nome}!`,
  (nome: string) => `Ola ${nome}!`,
  (nome: string) => `E ai ${nome}!`,
  (nome: string) => `Fala ${nome}!`,
  (nome: string) => `Opa ${nome}!`,
  (nome: string) => `Eae ${nome}!`,
  (nome: string) => `Hey ${nome}!`,
  (nome: string) => `${nome}, tudo bem?`,
  (nome: string) => `${nome}!`,
];

const PERGUNTAS_BEM_ESTAR = [
  'Tudo bem?',
  'Tudo certo?',
  'Como vai?',
  'Beleza?',
  'Tranquilo?',
  '',
];

const EMOJIS_ABERTURA = ['', '', '', ''];
const EMOJIS_FECHAMENTO = ['', '', '', '', '', ''];
const EMOJIS_EVENTO = ['', '', '', '', ''];

const MESES = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const DIAS_SEMANA = [
  'domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado',
];

// ============================================
// FUNCOES DE VARIACAO
// ============================================

/**
 * Gera uma seed pseudo-aleatoria baseada em strings
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seleciona um item de array baseado em seed
 */
function pickRandom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/**
 * Gera numero aleatorio entre min e max baseado em seed
 */
function randomInRange(min: number, max: number, seed: number): number {
  return min + (seed % (max - min + 1));
}

/**
 * Formata data de varias formas diferentes
 */
function formatarDataVariado(data: Date, variacao: number): string {
  const dia = data.getDate();
  const mes = data.getMonth();
  const diaSemana = data.getDay();

  switch (variacao % 6) {
    case 0: // 15/02
      return `${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}`;
    case 1: // dia 15 de fevereiro
      return `dia ${dia} de ${MESES[mes]}`;
    case 2: // 15 de fevereiro
      return `${dia} de ${MESES[mes]}`;
    case 3: // proxima sexta, dia 15
      return `${DIAS_SEMANA[diaSemana]}, dia ${dia}`;
    case 4: // na sexta (15/02)
      return `${DIAS_SEMANA[diaSemana]} (${dia.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')})`;
    case 5: // dia 15
    default:
      return `dia ${dia}`;
  }
}

/**
 * Formata hora de varias formas
 */
function formatarHoraVariado(data: Date, variacao: number): string {
  const hora = data.getHours();
  const minutos = data.getMinutes();
  const minStr = minutos > 0 ? `:${minutos.toString().padStart(2, '0')}` : '';

  switch (variacao % 4) {
    case 0: // 19h
      return `${hora}h${minutos > 0 ? minutos : ''}`;
    case 1: // as 19h
      return `as ${hora}h${minutos > 0 ? minutos : ''}`;
    case 2: // 19:00
      return `${hora.toString().padStart(2, '0')}${minStr || ':00'}`;
    case 3: // as 19 horas
    default:
      return `as ${hora} horas${minutos > 0 ? ` e ${minutos} minutos` : ''}`;
  }
}

/**
 * Gera variacoes para uma mensagem especifica
 */
function gerarVariacoes(seed: number): MessageVariations {
  const usarEmojis = seed % 3 !== 0; // 66% das mensagens tem emoji

  return {
    saudacao: pickRandom(SAUDACOES, seed),
    formatoData: (seed >> 4).toString(),
    formatoHora: (seed >> 8).toString(),
    estrutura: pickRandom(['direta', 'casual', 'animada'], seed >> 2),
    usarEmojis,
    emojiAbertura: usarEmojis ? pickRandom(EMOJIS_ABERTURA, seed >> 3) : undefined,
    emojiFechamento: usarEmojis ? pickRandom(EMOJIS_FECHAMENTO, seed >> 5) : undefined,
  };
}

// ============================================
// GERADORES DE CONVITE
// ============================================

/**
 * Gera mensagem de convite unica para cada destinatario
 */
export function gerarMensagemConvite(options: MessageGeneratorOptions): string {
  const { evento, convidadoNome, seed: customSeed } = options;

  // Gera seed unica baseada no nome do convidado + evento
  const seed = customSeed ?? hashCode(`${convidadoNome}-${evento.id}-convite`);
  const dataEvento = new Date(evento.data_hora);

  const variacoes = gerarVariacoes(seed);
  const primeiroNome = convidadoNome.split(' ')[0];

  // Partes da mensagem
  const saudacao = pickRandom(SAUDACOES_COM_NOME, seed)(primeiroNome);
  const perguntaBemEstar = pickRandom(PERGUNTAS_BEM_ESTAR, seed >> 1);
  const dataFormatada = formatarDataVariado(dataEvento, seed >> 4);
  const horaFormatada = formatarHoraVariado(dataEvento, seed >> 8);
  const emojiEvento = variacoes.usarEmojis ? pickRandom(EMOJIS_EVENTO, seed >> 6) : '';

  // Escolhe estrutura da mensagem
  switch (variacoes.estrutura) {
    case 'direta':
      return gerarConviteDireto({
        saudacao,
        perguntaBemEstar,
        nomeEvento: evento.nome,
        dataFormatada,
        horaFormatada,
        local: evento.local,
        descricao: evento.descricao,
        emojiEvento,
        seed,
      });

    case 'casual':
      return gerarConviteCasual({
        saudacao,
        perguntaBemEstar,
        nomeEvento: evento.nome,
        dataFormatada,
        horaFormatada,
        local: evento.local,
        descricao: evento.descricao,
        emojiEvento,
        primeiroNome,
        seed,
      });

    case 'animada':
    default:
      return gerarConviteAnimado({
        saudacao,
        perguntaBemEstar,
        nomeEvento: evento.nome,
        dataFormatada,
        horaFormatada,
        local: evento.local,
        descricao: evento.descricao,
        emojiEvento,
        primeiroNome,
        seed,
      });
  }
}

interface ConviteParams {
  saudacao: string;
  perguntaBemEstar: string;
  nomeEvento: string;
  dataFormatada: string;
  horaFormatada: string;
  local: string;
  descricao?: string;
  emojiEvento: string;
  primeiroNome?: string;
  seed: number;
}

function gerarConviteDireto(params: ConviteParams): string {
  const { saudacao, perguntaBemEstar, nomeEvento, dataFormatada, horaFormatada, local, emojiEvento, seed } = params;

  const introducoes = [
    'Queria te convidar pro',
    'Voce ta convidado pro',
    'Te convido pro',
    'Vem pro',
  ];

  const fechamentos = [
    'Me confirma ai!',
    'Posso contar com voce?',
    'Confirma pra mim se vai conseguir ir!',
    'Da pra ir?',
    'Me diz se voce vem!',
    'Confirma sua presenca!',
  ];

  const intro = pickRandom(introducoes, seed);
  const fechamento = pickRandom(fechamentos, seed >> 7);

  const bemEstar = perguntaBemEstar ? ` ${perguntaBemEstar}` : '';

  return `${saudacao}${bemEstar} ${intro} *${nomeEvento}*${emojiEvento ? ` ${emojiEvento}` : ''}

${dataFormatada} ${horaFormatada}
Local: ${local}

${fechamento}`;
}

function gerarConviteCasual(params: ConviteParams): string {
  const { saudacao, nomeEvento, dataFormatada, horaFormatada, local, descricao, emojiEvento, primeiroNome, seed } = params;

  const aberturas = [
    `${primeiroNome}, passa la no`,
    `Olha so, vai ter`,
    `Fica ligado que vai rolar`,
    `Bora pro`,
  ];

  const fechamentos = [
    'Bora?',
    'Cola la!',
    'Vai ser show!',
    'Te espero la!',
    'Confirma pra gente!',
  ];

  const abertura = pickRandom(aberturas, seed >> 2);
  const fechamento = pickRandom(fechamentos, seed >> 9);

  let mensagem = `${saudacao}

${abertura} *${nomeEvento}*${emojiEvento ? ` ${emojiEvento}` : ''}

Quando: ${dataFormatada}, ${horaFormatada}
Onde: ${local}`;

  if (descricao && seed % 2 === 0) {
    mensagem += `\n\n${descricao}`;
  }

  mensagem += `\n\n${fechamento}`;

  return mensagem;
}

function gerarConviteAnimado(params: ConviteParams): string {
  const { saudacao, nomeEvento, dataFormatada, horaFormatada, local, descricao, seed } = params;

  const emojisAnimados = ['', '', '', '', ''];
  const emoji = pickRandom(emojisAnimados, seed);

  const aberturas = [
    'Tenho um convite especial pra voce!',
    'Vem comigo!',
    'Reserva na agenda!',
    'Nao perde essa!',
  ];

  const fechamentos = [
    'Vai ser demais! Me confirma ai!',
    'Nao fica de fora! Posso contar contigo?',
    'Esperando voce la! Confirma?',
    'Vai rolar muita coisa boa! Vem?',
  ];

  const abertura = pickRandom(aberturas, seed >> 3);
  const fechamento = pickRandom(fechamentos, seed >> 10);

  let mensagem = `${saudacao} ${emoji}

${abertura}

*${nomeEvento}*
${dataFormatada} ${horaFormatada}
${local}`;

  if (descricao && seed % 3 !== 0) {
    mensagem += `\n\n${descricao}`;
  }

  mensagem += `\n\n${fechamento}`;

  return mensagem;
}

// ============================================
// GERADORES DE LEMBRETE
// ============================================

/**
 * Gera mensagem de lembrete unica
 */
export function gerarMensagemLembrete(options: MessageGeneratorOptions): string {
  const { evento, convidadoNome, seed: customSeed } = options;

  // Seed diferente para lembrete (evitar repeticao do convite)
  const seed = customSeed ?? hashCode(`${convidadoNome}-${evento.id}-lembrete`);
  const dataEvento = new Date(evento.data_hora);
  const primeiroNome = convidadoNome.split(' ')[0];

  const horaFormatada = formatarHoraVariado(dataEvento, seed >> 8);
  const usarEmoji = seed % 2 === 0;

  // Calcular tempo ate o evento
  const agora = new Date();
  const diffMs = dataEvento.getTime() - agora.getTime();
  const diffHoras = Math.round(diffMs / (1000 * 60 * 60));

  // Escolhe estilo do lembrete
  const estilo = seed % 4;

  switch (estilo) {
    case 0:
      return gerarLembreteDireto(primeiroNome, evento.nome, horaFormatada, evento.local, diffHoras, usarEmoji);
    case 1:
      return gerarLembreteAnimado(primeiroNome, evento.nome, horaFormatada, evento.local, diffHoras);
    case 2:
      return gerarLembreteCasual(primeiroNome, evento.nome, horaFormatada, evento.local, diffHoras, usarEmoji);
    case 3:
    default:
      return gerarLembreteUrgente(primeiroNome, evento.nome, horaFormatada, evento.local, diffHoras);
  }
}

function gerarLembreteDireto(nome: string, nomeEvento: string, hora: string, local: string, horasRestantes: number, usarEmoji: boolean): string {
  const emoji = usarEmoji ? '' : '';
  const tempoTexto = horasRestantes <= 1 ? 'daqui a pouco' : horasRestantes < 24 ? `em ${horasRestantes}h` : 'amanha';

  return `${emoji} Lembrete, ${nome}!

O *${nomeEvento}* comeca ${tempoTexto}, ${hora}.
Local: ${local}

Te vejo la!`;
}

function gerarLembreteAnimado(nome: string, nomeEvento: string, hora: string, local: string, horasRestantes: number): string {
  const tempoTexto = horasRestantes <= 1 ? 'Ja ja comeca!' : horasRestantes < 24 ? 'E hoje!' : 'E amanha!';

  return `Fala ${nome}!

${tempoTexto} Nao esquece do *${nomeEvento}*.

${hora} - ${local}

Bora!`;
}

function gerarLembreteCasual(nome: string, nomeEvento: string, hora: string, local: string, horasRestantes: number, usarEmoji: boolean): string {
  const emoji = usarEmoji ? '' : '';
  const tempoTexto = horasRestantes <= 1 ? 'ta quase na hora' : horasRestantes < 24 ? 'e hoje' : 'e amanha';

  return `E ai ${nome}, ${tempoTexto} do *${nomeEvento}*! ${emoji}

${hora}, la no ${local}.

Nos vemos la!`;
}

function gerarLembreteUrgente(nome: string, nomeEvento: string, hora: string, local: string, horasRestantes: number): string {
  const urgencia = horasRestantes <= 1 ? 'Comeca ja!' : horasRestantes <= 2 ? 'Falta pouco!' : '';

  return `${nome}! ${urgencia}

*${nomeEvento}*
${hora} - ${local}

Te esperando!`;
}

// ============================================
// GERADORES PARA SOFIA (CONTEXTO DE EVENTO)
// ============================================

/**
 * Gera prompt de sistema para Sofia quando conversa com convidado de evento
 */
export function gerarSofiaEventoPrompt(evento: Evento, statusConvidado: string): string {
  const dataEvento = new Date(evento.data_hora);
  const dataFormatada = `${dataEvento.getDate()}/${dataEvento.getMonth() + 1}/${dataEvento.getFullYear()}`;
  const horaFormatada = `${dataEvento.getHours()}:${dataEvento.getMinutes().toString().padStart(2, '0')}`;

  return `
CONTEXTO ESPECIAL: CONVIDADO DE EVENTO

Esta pessoa foi convidada para um evento e esta respondendo ao convite.

DADOS DO EVENTO:
- Nome: ${evento.nome}
- Data: ${dataFormatada}
- Horario: ${horaFormatada}
- Local: ${evento.local}
${evento.descricao ? `- Descricao: ${evento.descricao}` : ''}
- Status atual do convidado: ${statusConvidado}

SUAS RESPONSABILIDADES:
1. Responder duvidas sobre o evento com base nas informacoes acima
2. Identificar se a pessoa esta confirmando, recusando ou em duvida
3. Ser acolhedora e incentivar a participacao (sem ser insistente)
4. Se perguntar algo que nao esta nas informacoes, diga que vai verificar

EXEMPLOS DE RESPOSTAS:
- Se confirmar: "Que otimo! Anotei sua confirmacao. Te esperamos dia ${dataFormatada}!"
- Se recusar: "Entendo, sem problemas! Fica pra proxima."
- Se em duvida: "Tranquilo, qualquer coisa me avisa quando decidir!"
- Se perguntar sobre detalhes: Responda baseado nas informacoes do evento acima.

REGRAS:
- Seja breve e direta
- Nao invente informacoes que nao estao acima
- Se nao souber algo, diga que vai verificar com a organizacao
`;
}

/**
 * Gera resposta para confirmacao detectada
 */
export function gerarRespostaConfirmacao(
  primeiroNome: string,
  evento: Evento,
  status: 'confirmado' | 'recusado' | 'talvez',
  seed?: number
): string {
  const s = seed ?? hashCode(`${primeiroNome}-${evento.id}-resposta`);
  const dataEvento = new Date(evento.data_hora);
  const dataFormatada = formatarDataVariado(dataEvento, s);

  switch (status) {
    case 'confirmado': {
      const respostas = [
        `Show ${primeiroNome}! Anotado, te esperamos ${dataFormatada}!`,
        `Que otimo! Confirmado. Nos vemos la!`,
        `Fechado! Ta confirmado. Ate ${dataFormatada}!`,
        `Maravilha ${primeiroNome}, confirmado! Te vejo la.`,
        `Perfeito! Anotei sua presenca. Ate breve!`,
      ];
      return pickRandom(respostas, s);
    }

    case 'recusado': {
      const respostas = [
        `Entendo ${primeiroNome}, sem problemas! Fica pra proxima.`,
        `Tranquilo! Obrigado por avisar. Ate a proxima!`,
        `Beleza, anotado. Fica pra outra oportunidade!`,
        `Sem problema! Quando tiver outro evento, te aviso.`,
      ];
      return pickRandom(respostas, s);
    }

    case 'talvez':
    default: {
      const respostas = [
        `Tranquilo ${primeiroNome}! Qualquer coisa me avisa quando decidir.`,
        `Entendi! Se conseguir confirmar depois, e so me chamar.`,
        `Beleza! Fica a vontade pra me avisar quando souber.`,
        `Ok! Se der certo, e so me mandar uma mensagem confirmando.`,
      ];
      return pickRandom(respostas, s);
    }
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Gera delay aleatorio para envio (anti-spam)
 * Entre 5 e 15 segundos conforme design
 */
export function gerarDelayEnvio(seed?: number): number {
  const s = seed ?? Math.random() * 1000000;
  return randomInRange(5000, 15000, Math.floor(s));
}

/**
 * Valida se mensagem nao e muito similar a anterior
 * Retorna true se for suficientemente diferente
 */
export function verificarDiferenca(msg1: string, msg2: string): boolean {
  const normalizar = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const n1 = normalizar(msg1);
  const n2 = normalizar(msg2);

  // Conta caracteres diferentes
  const maxLen = Math.max(n1.length, n2.length);
  let diffs = 0;
  for (let i = 0; i < maxLen; i++) {
    if (n1[i] !== n2[i]) diffs++;
  }

  // Considera diferente se mais de 30% dos caracteres forem diferentes
  return diffs / maxLen > 0.3;
}
