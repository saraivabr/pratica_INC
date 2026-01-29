import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { normalizePhone } from '@/lib/supabase';
import OpenAI from 'openai';
import { sendReaction, sendTextMessage } from '@/lib/zapi';
import {
  processMessage,
  handleOnboarding,
  handleUnregisteredUserConversation,
} from '@/lib/sofia';
import { isSimpleGreeting } from '@/lib/sofia';
import { getLeadInsight, saveLeadInsight } from '@/lib/cvcrm-insight';

// ============================================
// TYPES
// ============================================

// User type para compatibilidade com lib/sofia
interface User {
  id: string;
  nome: string;
  telefone: string;
  role: 'corretor' | 'gerente' | 'admin';
  gerente_id?: string;
  imobiliaria_id?: string;
  imobiliarias?: {
    nome: string;
  };
  cvcrm_id?: number;
}

interface ZAPIMessage {
  phone: string;
  participantPhone?: string;
  messageId: string;
  momment: number;
  type: string;
  body?: string;
  fromMe: boolean;
  contactName?: string;
  pushName?: string;
  contactPhone?: string;
  contactVcard?: string;
  audio?: {
    base64?: string;
    data?: string;
    url?: string;
    mimetype?: string;
    mimeType?: string;
  };
  media?: {
    base64?: string;
    data?: string;
    url?: string;
    mimetype?: string;
    mimeType?: string;
  };
}

interface ZAPIWebhook {
  instanceId: string;
  phone?: string;
  type?: string;
  fromMe?: boolean;
  fromApi?: boolean;
  status?: string;
  message?: ZAPIMessage;
  interactive?: any;
  momment?: number;
  reaction?: any;
  text?: {
    message?: string;
  };
  audio?: {
    base64?: string;
    data?: string;
    url?: string;
    mimetype?: string;
    mimeType?: string;
  };
  media?: {
    base64?: string;
    data?: string;
    url?: string;
    mimetype?: string;
    mimeType?: string;
  };
  contacts?: Array<{
    displayName: string;
    vcard: string;
  }>;
}

// ============================================
// UTILITÁRIOS
// ============================================

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Extrai número de telefone do vCard
 */
function extractPhoneFromVCard(vcard: string): string | null {
  const telMatch = vcard.match(/TEL[^:]*:([+\d\s-]+)/i);
  if (telMatch) {
    return normalizePhone(telMatch[1]);
  }
  return null;
}

/**
 * Extrai nome do vCard
 */
function extractNameFromVCard(vcard: string): string | null {
  const fnMatch = vcard.match(/FN:(.+)/i);
  if (fnMatch) {
    return fnMatch[1].trim();
  }
  const nMatch = vcard.match(/N:([^;]+)/i);
  if (nMatch) {
    return nMatch[1].trim();
  }
  return null;
}

/**
 * Extrai texto da mensagem em múltiplos formatos (texto, botões, listas)
 */
function extractMessageText(body: ZAPIWebhook): string | null {
  const message: any = body.message || {};
  const candidates = [
    message.body,
    body.text?.message,
    message.text?.message,
    (body as any).buttonsResponseMessage?.message,
    (body as any).listResponseMessage?.message,
    (body as any).listResponseMessage?.title,
    (body as any).listResponseMessage?.selectedRowId,
    message.button?.text,
    message.button?.label,
    message.button?.id,
    message.buttonReply?.title,
    message.buttonReply?.id,
    message.selectedButtonId,
    message.selectedDisplayText,
    message.listResponse?.title,
    message.listResponse?.description,
    message.listResponse?.singleSelectReply?.selectedRowId,
    message.listResponse?.singleSelectReply?.title,
    message.listResponse?.singleSelectReply?.description,
    message.listResponseMessage?.singleSelectReply?.selectedRowId,
    message.listResponseMessage?.singleSelectReply?.title,
    message.listResponseMessage?.singleSelectReply?.description,
    body.interactive?.button_reply?.id,
    body.interactive?.button_reply?.title,
    body.interactive?.list_reply?.id,
    body.interactive?.list_reply?.title,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function isAudioMessage(body: ZAPIWebhook): boolean {
  const type = String(body.message?.type || body.type || '').toLowerCase();
  if (type.includes('audio') || type.includes('ptt') || type.includes('voice')) return true;
  if (body.message?.audio || body.message?.media || body.audio || body.media) return true;
  return false;
}

function parseBase64Payload(value: string): { buffer: Buffer; mime?: string } | null {
  if (!value) return null;
  const dataUriMatch = value.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUriMatch) {
    const mime = dataUriMatch[1];
    const data = dataUriMatch[2];
    return { buffer: Buffer.from(data, 'base64'), mime };
  }
  return { buffer: Buffer.from(value, 'base64') };
}

async function fetchAudioBuffer(url: string): Promise<{ buffer: Buffer; mime?: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const mime = response.headers.get('content-type') || undefined;
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), mime };
  } catch (error) {
    console.error('Audio fetch error:', error);
    return null;
  }
}

async function extractAudioPayload(
  body: ZAPIWebhook
): Promise<{ buffer: Buffer; mime?: string } | null> {
  const message = (body.message || {}) as any;
  const candidates = [
    message.audio?.base64,
    message.audio?.data,
    message.media?.base64,
    message.media?.data,
    body.audio?.base64,
    body.audio?.data,
    body.media?.base64,
    body.media?.data,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return parseBase64Payload(candidate.trim());
    }
  }

  const urlCandidates = [
    message.audio?.url,
    message.media?.url,
    body.audio?.url,
    body.media?.url,
  ];
  for (const url of urlCandidates) {
    if (typeof url === 'string' && url.trim().length > 0) {
      return fetchAudioBuffer(url.trim());
    }
  }

  return null;
}

async function transcribeAudio(body: ZAPIWebhook): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const payload = await extractAudioPayload(body);
  if (!payload) return null;

  const mime =
    payload.mime ||
    body.message?.audio?.mimetype ||
    body.message?.audio?.mimeType ||
    body.message?.media?.mimetype ||
    body.message?.media?.mimeType ||
    body.audio?.mimetype ||
    body.audio?.mimeType ||
    body.media?.mimetype ||
    body.media?.mimeType ||
    'audio/ogg';

  const file = new File([payload.buffer], 'audio.ogg', { type: mime });
  const response = await getOpenAI().audio.transcriptions.create({
    model: 'gpt-4o-mini-transcribe',
    file,
    language: 'pt',
  });

  const text = response.text?.trim();
  return text && text.length > 0 ? text : null;
}

function isInboundUserMessage(body: ZAPIWebhook): boolean {
  if (body.message?.fromMe || body.fromMe || body.fromApi) return false;
  if (body.type && body.type !== 'ReceivedCallback') return false;
  if (body.status && body.status !== 'RECEIVED') return false;
  if (body.reaction) return false;
  return true;
}

function extractMessageId(body: ZAPIWebhook): string | null {
  const message: any = body.message || {};
  const candidates = [
    message.messageId,
    message.id,
    (body as any).messageId,
    (body as any).id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

async function shouldProcessInbound(
  phone: string,
  messageId: string | null,
  momment?: number
): Promise<boolean> {
  const id =
    messageId ||
    (momment ? `${phone}:${momment}` : null);

  if (!id) return false;

  const { rows } = await dbQuery(
    `insert into inbound_messages (message_id, phone, received_at)
     values ($1, $2, now())
     on conflict (message_id) do nothing
     returning id`,
    [id, phone]
  );

  return rows.length > 0;
}

async function acquireConversationLock(phone: string): Promise<boolean> {
  const { rows: updated } = await dbQuery(
    `update conversation_locks
     set locked_until = now() + interval '10 seconds'
     where phone = $1 and locked_until < now()
     returning phone`,
    [phone]
  );

  if (updated.length > 0) return true;

  const { rows: inserted } = await dbQuery(
    `insert into conversation_locks (phone, locked_until)
     values ($1, now() + interval '10 seconds')
     on conflict (phone) do nothing
     returning phone`,
    [phone]
  );

  return inserted.length > 0;
}

async function releaseConversationLock(phone: string): Promise<void> {
  await dbQuery(
    `update conversation_locks
     set locked_until = now()
     where phone = $1`,
    [phone]
  );
}

async function maybeReactToMessage(
  phone: string,
  messageId: string | null,
  messageText: string
): Promise<void> {
  if (!messageId) return;

  const trimmed = messageText.trim();
  if (!trimmed) return;

  const chance = trimmed.length <= 12 ? 0.4 : 0.2;
  if (Math.random() > chance) return;

  const lower = trimmed.toLowerCase();
  let reaction = '👍';

  if (isSimpleGreeting(trimmed)) {
    reaction = '👋';
  } else if (lower.includes('obrig') || lower.includes('valeu')) {
    reaction = '🙏';
  } else if (lower.includes('ok') || lower.includes('blz') || lower.includes('show')) {
    reaction = '✅';
  }

  await sendReaction(phone, messageId, reaction, { delayMessage: 2 });
}

/**
 * Busca usuário por telefone (múltiplos formatos)
 */
async function findUserByPhone(phone: string): Promise<User | undefined> {
  const numbers = phone.replace(/\D/g, '');

  // Formatos possíveis para buscar
  const formats = [
    `+${numbers}`,
    `+55${numbers}`,
    numbers,
    numbers.startsWith('55') ? numbers.slice(2) : numbers,
    numbers.startsWith('55') ? `+${numbers}` : `+55${numbers}`,
  ];

  const uniqueFormats = [...new Set(formats)];

  for (const format of uniqueFormats) {
    const { rows } = await dbQuery(
      `select u.*, i.nome as imobiliaria_nome
       from users u
       left join imobiliarias i on i.id = u.imobiliaria_id
       where u.telefone = $1
       limit 1`,
      [format]
    );
    const data = rows[0];

    if (data) {
      if (data.imobiliaria_nome) {
        data.imobiliarias = { nome: data.imobiliaria_nome };
      }
      return data as User;
    }
  }

  // Tenta busca com LIKE para pegar variações
  const lastDigits = numbers.slice(-9);

  const { rows } = await dbQuery(
    `select u.*, i.nome as imobiliaria_nome
     from users u
     left join imobiliarias i on i.id = u.imobiliaria_id
     where u.telefone like $1
     limit 1`,
    [`%${lastDigits}`]
  );
  const data = rows[0];

  if (data) {
    if (data.imobiliaria_nome) {
      data.imobiliarias = { nome: data.imobiliaria_nome };
    }
    return data as User;
  }

  return undefined;
}

// ============================================
// HANDLERS
// ============================================

/**
 * Processa contato compartilhado (onboarding de novo corretor)
 */
async function handleSharedContact(
  senderPhone: string,
  contactVcard: string,
  contactDisplayName: string
) {
  const sender = await findUserByPhone(senderPhone);

  if (!sender || sender.role !== 'gerente') {
    await sendTextMessage(
      normalizePhone(senderPhone),
      'Desculpe, apenas gerentes podem adicionar novos corretores.'
    );
    return;
  }

  // Extrair dados do contato
  const newPhone = extractPhoneFromVCard(contactVcard);
  const newName =
    extractNameFromVCard(contactVcard) || contactDisplayName || 'Corretor Parceiro';

  if (!newPhone) {
    await sendTextMessage(
      normalizePhone(senderPhone),
      'Não consegui extrair o número do contato. Tente enviar novamente.'
    );
    return;
  }

  // Verificar se já existe
  const existing = await findUserByPhone(newPhone);

  if (existing) {
    await sendTextMessage(
      normalizePhone(senderPhone),
      `O corretor ${existing.nome} (${newPhone}) já está cadastrado no sistema!`
    );
    return;
  }

  const { rows: newUserRows } = await dbQuery(
    `insert into users (telefone, nome, role, imobiliaria_id, gerente_id, onboarding_status, is_active)
     values ($1, $2, 'corretor', $3, $4, 'completed', true)
     returning *`,
    [newPhone, newName, sender.imobiliaria_id || null, sender.id]
  );
  const newUser = newUserRows[0];

  if (!newUser) {
    await sendTextMessage(
      normalizePhone(senderPhone),
      'Erro ao cadastrar o corretor. Tente novamente.'
    );
    return;
  }

  await sendTextMessage(
    normalizePhone(senderPhone),
    `Perfeito! Recebi o contato do ${newName}. Vou chamar agora.`
  );

  await handleOnboarding(newPhone, newName, sender);
}

const INSIGHT_PHONE = "+5511940716662";

async function tryHandleCvcrmInsight(phone: string) {
  if (phone !== INSIGHT_PHONE) return false;
  const insight = await getLeadInsight(phone);
  if (!insight) return false;
  const shouldPersist = insight.detail.length > 200;
  let slug: string | null = null;
  if (shouldPersist) {
    slug = await saveLeadInsight(phone, insight.summary, insight.detail);
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pratica.escreve.ai";
  let text = `${insight.summary}\n${insight.detail}`;
  if (slug) {
    text += `\n\nDetalhes completos: ${baseUrl}/insights/${slug}`;
  }
  await sendTextMessage(phone, text);
  return true;
}

/**
 * Processa mensagem de texto
 */
async function handleTextMessage(
  senderPhone: string,
  messageText: string,
  messageId?: string | null,
  contactName?: string
) {
  const user = await findUserByPhone(senderPhone);
  const normalizedPhone = normalizePhone(senderPhone);

  await maybeReactToMessage(normalizedPhone, messageId || null, messageText);

  if (await tryHandleCvcrmInsight(normalizedPhone)) {
    return;
  }

  if (!user) {
    await handleUnregisteredUserConversation(senderPhone, messageText, contactName);
    return;
  }

  // Processar mensagem via Sofia
  await processMessage(user, messageText);
}

// ============================================
// WEBHOOK HANDLERS
// ============================================

export async function POST(request: Request) {
  try {
    const body: ZAPIWebhook = await request.json();

    if (process.env.NODE_ENV === 'development') {
      console.log('Z-API Webhook received:', JSON.stringify(body, null, 2));
    }

    if (!isInboundUserMessage(body)) {
      return NextResponse.json({ received: true });
    }

    const senderPhone = body.message?.phone || body.phone;
    if (!senderPhone) {
      return NextResponse.json({ received: true });
    }
    const normalizedSender = normalizePhone(senderPhone);

    // Processar contato compartilhado
    if (body.message?.type === 'contactCard' || body.contacts) {
      const vcard = body.message?.contactVcard || body.contacts?.[0]?.vcard;
      const displayName =
        body.message?.contactName || body.contacts?.[0]?.displayName || '';

      if (vcard) {
        await handleSharedContact(senderPhone, vcard, displayName);
      }
      return NextResponse.json({ received: true });
    }

    // Processar mensagem de texto
    let messageText = extractMessageText(body);
    const messageId = extractMessageId(body);
    const contactName = body.message?.contactName || body.message?.pushName || '';

    if (!messageText && isAudioMessage(body)) {
      try {
        messageText = await transcribeAudio(body);
      } catch (error) {
        console.error('Audio transcription error:', error);
      }
    }

    if (!messageText && isAudioMessage(body)) {
      await sendTextMessage(
        normalizedSender,
        'Recebi seu audio, mas nao consegui entender. Pode mandar em texto ou reenviar o audio?'
      );
      return NextResponse.json({ received: true });
    }
    
    if (messageText) {
      const allowed = await shouldProcessInbound(
        normalizedSender,
        messageId,
        body.momment
      );
      if (!allowed) {
        return NextResponse.json({ received: true });
      }
      const lockAcquired = await acquireConversationLock(normalizedSender);
      if (!lockAcquired) {
        return NextResponse.json({ received: true });
      }
      try {
        await handleTextMessage(senderPhone, messageText, messageId, contactName);
      } finally {
        await releaseConversationLock(normalizedSender);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// GET para verificação do webhook
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Pratica Incorporadora Webhook - Sofia AI',
    version: '2.0',
  });
}
