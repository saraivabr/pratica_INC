/**
 * Z-API WhatsApp Integration
 * Docs: https://developer.z-api.io/
 */

const INSTANCE_ID = process.env.ZAPI_INSTANCE_ID!;
const TOKEN = process.env.ZAPI_TOKEN!;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN!;

const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

// ============================================
// TIPOS
// ============================================

interface ZAPIResponse {
  zapiMessageId?: string;
  messageId?: string;
  id?: string;
  error?: string;
}

export interface QuickReplyButton {
  id: string;
  label: string;
}

export interface ListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface ActionButton {
  id?: string;
  type: 'CALL' | 'URL' | 'REPLY';
  phone?: string;
  url?: string;
  label: string;
}

// ============================================
// HELPERS
// ============================================

function cleanPhone(phone: string): string {
  return phone.replace(/^\+/, '');
}

async function zapiRequest(endpoint: string, body: object): Promise<ZAPIResponse> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': CLIENT_TOKEN,
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

// ============================================
// MENSAGENS BÁSICAS
// ============================================

/**
 * Envia mensagem de texto simples
 */
export async function sendTextMessage(
  phone: string,
  message: string,
  options?: { delayTyping?: number }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-text', {
    phone: cleanPhone(phone),
    message,
    ...(options?.delayTyping ? { delayTyping: options.delayTyping } : {}),
  });
}

/**
 * Envia reação a uma mensagem
 */
export async function sendReaction(
  phone: string,
  messageId: string,
  reaction: string,
  options?: { delayMessage?: number }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-reaction', {
    phone: cleanPhone(phone),
    messageId,
    reaction,
    ...(options?.delayMessage ? { delayMessage: options.delayMessage } : {}),
  });
}

// ============================================
// MENSAGENS INTERATIVAS
// ============================================

/**
 * Envia mensagem com botões de resposta rápida (máx 3 botões)
 * Ideal para: Sim/Não, Escolhas simples
 */
export async function sendQuickButtons(
  phone: string,
  message: string,
  buttons: QuickReplyButton[],
  options?: { title?: string; footer?: string }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-button-list', {
    phone: cleanPhone(phone),
    message,
    title: options?.title,
    footer: options?.footer,
    buttonList: {
      buttons: buttons.slice(0, 3).map(b => ({
        id: b.id,
        label: b.label.slice(0, 20), // Limite de 20 chars
      })),
    },
  });
}

/**
 * Envia lista de opções (menu expansível)
 * Ideal para: Múltiplas escolhas, Categorias
 */
export async function sendOptionList(
  phone: string,
  message: string,
  buttonText: string,
  sections: ListSection[],
  options?: { title?: string; footer?: string }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-option-list', {
    phone: cleanPhone(phone),
    message,
    title: options?.title,
    footer: options?.footer,
    buttonLabel: buttonText,
    optionList: {
      options: sections.map(section => ({
        title: section.title,
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title.slice(0, 24),
          description: row.description?.slice(0, 72),
        })),
      })),
    },
  });
}

/**
 * Envia botões com ações (URL, Telefone, Resposta)
 * Ideal para: Links, Ligações
 */
export async function sendActionButtons(
  phone: string,
  message: string,
  buttons: ActionButton[],
  options?: { title?: string; footer?: string }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-button-actions', {
    phone: cleanPhone(phone),
    message,
    title: options?.title,
    footer: options?.footer,
    buttonActions: buttons,
  });
}

// ============================================
// ATALHOS PRÁTICOS
// ============================================

/**
 * Pergunta Sim ou Não
 */
export async function askYesNo(
  phone: string,
  question: string,
  context?: string
): Promise<ZAPIResponse> {
  return sendQuickButtons(phone, question, [
    { id: `${context || 'q'}_sim`, label: '✅ Sim' },
    { id: `${context || 'q'}_nao`, label: '❌ Não' },
  ]);
}

/**
 * Oferece opções de ação
 */
export async function askAction(
  phone: string,
  message: string,
  actions: Array<{ id: string; emoji?: string; label: string }>
): Promise<ZAPIResponse> {
  return sendQuickButtons(
    phone,
    message,
    actions.slice(0, 3).map(a => ({
      id: a.id,
      label: a.emoji ? `${a.emoji} ${a.label}` : a.label,
    }))
  );
}

/**
 * Menu de empreendimentos
 */
export async function sendEmpreendimentosMenu(
  phone: string,
  empreendimentos: Array<{ id: string; nome: string; cidade: string; disponiveis: number }>
): Promise<ZAPIResponse> {
  return sendOptionList(
    phone,
    'Escolha um empreendimento para ver mais detalhes:',
    '🏢 Ver Empreendimentos',
    [{
      title: 'Empreendimentos Disponíveis',
      rows: empreendimentos.map(e => ({
        id: `emp_${e.id}`,
        title: e.nome,
        description: `${e.cidade} • ${e.disponiveis} disponíveis`,
      })),
    }],
    { footer: 'Pratica Incorporadora' }
  );
}

/**
 * Menu de empreendimentos por bairro
 */
export async function sendBairrosMenu(
  phone: string,
  sections: Array<{
    bairro: string;
    empreendimentos: Array<{ id: string; nome: string; disponiveis: number }>;
  }>
): Promise<ZAPIResponse> {
  const rows: ListSection[] = [];
  let totalRows = 0;

  for (const section of sections) {
    if (totalRows >= 10) break;
    const available = section.empreendimentos.slice(0, 10 - totalRows);
    if (available.length === 0) continue;

    rows.push({
      title: section.bairro,
      rows: available.map((emp) => ({
        id: `emp_${emp.id}`,
        title: emp.nome,
        description: emp.disponiveis ? `${emp.disponiveis} disponíveis` : undefined,
      })),
    });

    totalRows += available.length;
  }

  return sendOptionList(
    phone,
    'Imoveis da Pratica por bairro. Escolhe um:',
    '📍 Bairros',
    rows,
    { footer: 'Pratica Incorporadora' }
  );
}

/**
 * Menu de unidades de um empreendimento
 */
export async function sendUnidadesMenu(
  phone: string,
  empreendimento: string,
  unidades: Array<{ id: string; numero: string; tipo: string; valor: number }>
): Promise<ZAPIResponse> {
  const formatPrice = (v: number) => `R$ ${(v / 1000).toFixed(0)}mil`;

  return sendOptionList(
    phone,
    `Unidades disponíveis no *${empreendimento}*:`,
    '🏠 Ver Unidades',
    [{
      title: 'Unidades Disponíveis',
      rows: unidades.slice(0, 10).map(u => ({
        id: `unit_${u.id}`,
        title: `Unidade ${u.numero}`,
        description: `${u.tipo} • ${formatPrice(u.valor)}`,
      })),
    }],
    { footer: 'Toque para ver detalhes' }
  );
}

/**
 * Opções após ver uma unidade
 */
export async function sendUnitActions(
  phone: string,
  unidade: string,
  valor: number
): Promise<ZAPIResponse> {
  return askAction(phone, `O que você quer fazer com a unidade *${unidade}*?`, [
    { id: 'simular', emoji: '💰', label: 'Simular' },
    { id: 'tabela', emoji: '📊', label: 'Tabela' },
    { id: 'material', emoji: '📱', label: 'Material' },
  ]);
}

/**
 * Opções de entrada para simulação
 */
export async function askEntrada(
  phone: string,
  valor: number
): Promise<ZAPIResponse> {
  const formatPrice = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  return sendQuickButtons(
    phone,
    `Valor: *${formatPrice(valor)}*\n\nQual entrada você quer simular?`,
    [
      { id: 'entrada_10', label: '10% entrada' },
      { id: 'entrada_20', label: '20% entrada' },
      { id: 'entrada_30', label: '30% entrada' },
    ],
    { footer: 'Ou digite um valor específico' }
  );
}

/**
 * Próximos passos após simulação
 */
export async function askPostSimulacao(phone: string): Promise<ZAPIResponse> {
  return askAction(phone, 'O que você quer fazer agora?', [
    { id: 'outra_entrada', emoji: '🔄', label: 'Outra entrada' },
    { id: 'enviar_cliente', emoji: '📤', label: 'Enviar p/ cliente' },
    { id: 'ver_outras', emoji: '🏠', label: 'Ver outras' },
  ]);
}

// ============================================
// MENSAGENS LEGADAS (mantidas para compatibilidade)
// ============================================

/**
 * @deprecated Use sendQuickButtons
 */
export async function sendButtonMessage(
  phone: string,
  message: string,
  buttons: Array<{ id: string; label: string }>
): Promise<ZAPIResponse> {
  return sendQuickButtons(phone, message, buttons);
}

/**
 * Envia imagem com legenda
 */
export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<ZAPIResponse> {
  return zapiRequest('/send-image', {
    phone: cleanPhone(phone),
    image: imageUrl,
    caption: caption || '',
  });
}

/**
 * Envia documento (PDF, etc)
 */
export async function sendDocument(
  phone: string,
  documentUrl: string,
  fileName: string,
  caption?: string
): Promise<ZAPIResponse> {
  return zapiRequest(`/send-document/${cleanPhone(phone)}`, {
    document: documentUrl,
    fileName,
    caption: caption || '',
  });
}

/**
 * Envia localização fixa
 */
export async function sendLocation(
  phone: string,
  location: {
    title: string;
    address: string;
    latitude: string | number;
    longitude: string | number;
    messageId?: string;
    delayMessage?: number;
  }
): Promise<ZAPIResponse> {
  return zapiRequest('/send-location', {
    phone: cleanPhone(phone),
    title: location.title,
    address: location.address,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    ...(location.messageId ? { messageId: location.messageId } : {}),
    ...(location.delayMessage ? { delayMessage: location.delayMessage } : {}),
  });
}

/**
 * @deprecated Use sendActionButtons
 */
export async function sendButtonActions(
  phone: string,
  message: string,
  buttonActions: ActionButton[],
  options?: { title?: string; footer?: string }
): Promise<ZAPIResponse> {
  return sendActionButtons(phone, message, buttonActions, options);
}

/**
 * Envia link mágico de login
 */
export async function sendMagicLink(phone: string, magicToken: string, userName?: string): Promise<ZAPIResponse> {
  const greeting = userName ? `Olá, ${userName}!` : 'Olá!';
  const baseUrl = 'https://corretorparceria.com.br';
  const loginUrl = `${baseUrl}/api/auth/magic?token=${magicToken}`;

  const message = `${greeting}

🔐 *Seu código de acesso: ${magicToken}*

Você pode digitar esse código na tela ou clicar no botão abaixo para entrar direto.

_Válido por 5 minutos._`;

  return sendActionButtons(
    phone,
    message,
    [
      {
        type: 'URL',
        label: 'Acessar Pratica',
        url: loginUrl,
      },
    ],
    { title: 'Acesso Rápido', footer: 'Pratica Incorporadora' }
  );
}

/**
 * @deprecated Use sendMagicLink instead
 * Envia código OTP (mantido para compatibilidade)
 */
export async function sendOTPCode(phone: string, code: string, userName?: string): Promise<ZAPIResponse> {
  const greeting = userName ? `Olá, ${userName}!` : 'Olá!';

  const message = `${greeting}

Seu código de acesso ao *Pratica Incorporadora* é:

*${code}*

_Este código expira em 5 minutos._`;

  return sendTextMessage(phone, message);
}

/**
 * Envia mensagem de boas-vindas para novo usuário
 */
export async function sendWelcomeMessage(
  phone: string,
  userName: string,
  imobiliaria: string
): Promise<ZAPIResponse> {
  const message = `🎉 *Bem-vindo ao Pratica Incorporadora, ${userName}!*

Você agora faz parte da família ${imobiliaria}! 🏠

Sou sua parceira comercial e estou aqui para te ajudar a:
• 🔍 Encontrar imóveis perfeitos para seus clientes
• 📊 Acessar tabelas de preço rapidamente
• 💰 Simular financiamentos
• 📱 Receber materiais direto no WhatsApp

*Pode me chamar a qualquer momento!*

Quando precisar de algo no app, é só clicar em "📱 Me manda no Whats" que eu te envio aqui.

Bons negócios! 🚀`;

  return sendTextMessage(phone, message);
}

/**
 * Envia material de empreendimento
 */
export async function sendEmpreendimentoInfo(
  phone: string,
  userName: string,
  empreendimento: {
    nome: string;
    cidade?: string;
    bairro?: string;
    precoMinimo?: number;
    precoMaximo?: number;
    imagemPrincipal?: string;
  }
): Promise<ZAPIResponse> {
  const priceMin = empreendimento.precoMinimo
    ? empreendimento.precoMinimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Consulte valores';
  const priceMax = empreendimento.precoMaximo
    ? empreendimento.precoMaximo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'Consulte valores';
  const location = [empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(', ');

  const message = `📍 *${empreendimento.nome}*

${location ? `🏙️ ${location}\n\n` : ''}💰 A partir de ${priceMin}
📈 Até ${priceMax}

${userName}, você estava olhando esse empreendimento agora no app! Se precisar de mais detalhes, é só me chamar.`;

  if (empreendimento.imagemPrincipal) {
    return sendImage(phone, empreendimento.imagemPrincipal, message);
  }

  return sendTextMessage(phone, message);
}

/**
 * Envia notificação proativa baseada no contexto
 */
export async function sendProactiveMessage(
  phone: string,
  userName: string,
  context: {
    type: 'viewing_long' | 'returned_unit' | 'inactive_leads' | 'price_drop';
    data: Record<string, any>;
  }
): Promise<ZAPIResponse> {
  let message = '';

  switch (context.type) {
    case 'viewing_long':
      message = `Oi ${userName}! 👀

Vi que você tá analisando o *${context.data.unidade}* do *${context.data.empreendimento}* há um tempinho.

Quer que eu te mande a simulação com entrada de 20%? 📊

Ou se tiver alguma dúvida, só perguntar!`;
      break;

    case 'returned_unit':
      message = `${userName}, lembrei de você! 💡

Aquela unidade *${context.data.unidade}* do *${context.data.empreendimento}* que você olhou ${context.data.diasAtras} dias atrás ainda está disponível!

Quer que eu atualize os valores pra você?`;
      break;

    case 'inactive_leads':
      message = `Bom dia, ${userName}! ☀️

Você tem *${context.data.quantidade} leads* sem interação há mais de 5 dias no CV CRM.

Quer que eu prepare um resumo com os contatos pra você ligar hoje?`;
      break;

    case 'price_drop':
      message = `🎯 Novidade, ${userName}!

A unidade *${context.data.unidade}* do *${context.data.empreendimento}* baixou *${context.data.desconto}*!

Novo valor: *${context.data.novoPreco}*

Algum cliente seu pode se interessar?`;
      break;
  }

  return sendTextMessage(phone, message);
}

/**
 * Verifica status da conexão WhatsApp
 */
export async function getConnectionStatus(): Promise<{
  connected: boolean;
  phone?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${BASE_URL}/status`, {
      method: 'GET',
      headers: {
        'Client-Token': CLIENT_TOKEN,
      },
    });

    const data = await response.json();
    return {
      connected: data.connected || false,
      phone: data.phone,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
