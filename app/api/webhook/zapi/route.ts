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
import * as crypto from 'crypto';

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
// NORMALIZED EVENT + STRUCTURED LOGGING
// ============================================

/**
 * Normalized payload extracted from a raw Z-API webhook body.
 */
interface ZapiEvent {
  phone: string;
  messageId: string;
  text?: string;
  type: string;
  fromMe: boolean;
  timestamp: number;
  contactName?: string;
  media?: { url?: string; mimetype?: string };
}

/**
 * Parse a raw Z-API webhook body into a clean, normalized ZapiEvent.
 * Returns null when the payload lacks the minimum required fields.
 */
function parseZapiPayload(body: ZAPIWebhook): ZapiEvent | null {
  const message: any = body.message || {};

  const phone = message.phone || body.phone;
  if (!phone) return null;

  const messageId =
    message.messageId || message.id || (body as any).messageId || (body as any).id || '';

  const type = String(message.type || body.type || 'unknown');

  const fromMe = !!(message.fromMe || body.fromMe || body.fromApi);

  const timestamp = message.momment || body.momment || Date.now();

  const contactName = message.contactName || message.pushName || '';

  // Extract text from all known locations (lightweight — full extraction still in extractMessageText)
  const text =
    message.body ||
    body.text?.message ||
    message.text?.message ||
    undefined;

  // Extract media metadata if present
  const rawMedia = message.media || body.media || message.audio || body.audio;
  const media = rawMedia
    ? { url: rawMedia.url, mimetype: rawMedia.mimetype || rawMedia.mimeType }
    : undefined;

  return { phone, messageId, text, type, fromMe, timestamp, contactName, media };
}

/**
 * Structured log helper. All webhook logs go through here for uniform format.
 */
function zapiLog(
  level: 'info' | 'warn' | 'error',
  cid: string,
  action: string,
  meta?: Record<string, unknown>
) {
  const prefix = `[ZAPI][cid=${cid}]`;
  const payload = meta ? JSON.stringify(meta) : '';
  if (level === 'error') {
    console.error(`${prefix} ${action}`, payload);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${action}`, payload);
  } else {
    console.log(`${prefix} ${action}`, payload);
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
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
    console.error('[ZAPI] Audio fetch error:', error);
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

/**
 * Check if a messageId has already been processed (idempotency guard).
 * Uses the existing inbound_messages table which is the de-facto message dedup store.
 * Returns true if the message is a duplicate and should be skipped.
 */
async function isDuplicateMessage(messageId: string, cid: string): Promise<boolean> {
  if (!messageId) return false;
  try {
    const { rows } = await dbQuery(
      `SELECT 1 FROM inbound_messages WHERE message_id = $1 LIMIT 1`,
      [messageId]
    );
    if (rows.length > 0) {
      zapiLog('info', cid, `Duplicate messageId=${messageId}, skipping`);
      return true;
    }
  } catch {
    // Table may not exist yet or column mismatch — not a reason to block processing
  }
  return false;
}

/**
 * Dry-run context: when active, records actions instead of executing them.
 */
interface DryRunContext {
  enabled: boolean;
  actions: string[];
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
 * IMPORTANTE: Filtra por workspace_id para garantir isolamento entre tenants
 */
async function findUserByPhone(phone: string, workspaceId: number): Promise<User | undefined> {
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
       where u.telefone = $1 and u.workspace_id = $2
       limit 1`,
      [format, workspaceId]
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
     where u.telefone like $1 and u.workspace_id = $2
     limit 1`,
    [`%${lastDigits}`, workspaceId]
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
// WORKSPACE RESOLUTION
// ============================================

/**
 * Resolve workspace_id para o webhook Z-API.
 * Z-API usa uma única instância global (configurada via env vars),
 * então o workspace é definido via ZAPI_WORKSPACE_ID.
 * Fallback: busca o workspace associado ao instanceId no banco.
 */
async function resolveWorkspaceId(instanceId?: string): Promise<number | null> {
  // 1. Variável de ambiente explícita (preferencial)
  const envWorkspaceId = process.env.ZAPI_WORKSPACE_ID;
  if (envWorkspaceId) {
    const parsed = parseInt(envWorkspaceId, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // 2. Fallback: buscar workspace pelo instanceId do Z-API nos metadados do tenant
  if (instanceId) {
    const { rows } = await dbQuery(
      `SELECT id FROM tenants
       WHERE metadata->>'zapi_instance_id' = $1
       LIMIT 1`,
      [instanceId]
    );
    if (rows[0]) return rows[0].id;
  }

  // 3. Último recurso: se há apenas 1 workspace ativo, usar esse
  const { rows } = await dbQuery(
    `SELECT id FROM tenants WHERE status = 'active' LIMIT 2`
  );
  if (rows.length === 1) return rows[0].id;

  return null;
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
  contactDisplayName: string,
  workspaceId: number
) {
  const sender = await findUserByPhone(senderPhone, workspaceId);

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
  const existing = await findUserByPhone(newPhone, workspaceId);

  if (existing) {
    await sendTextMessage(
      normalizePhone(senderPhone),
      `O corretor ${existing.nome} (${newPhone}) já está cadastrado no sistema!`
    );
    return;
  }

  const { rows: newUserRows } = await dbQuery(
    `insert into users (telefone, nome, role, imobiliaria_id, gerente_id, onboarding_status, is_active, workspace_id)
     values ($1, $2, 'corretor', $3, $4, 'completed', true, $5)
     returning *`,
    [newPhone, newName, sender.imobiliaria_id || null, sender.id, workspaceId]
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
  workspaceId: number,
  messageId?: string | null,
  contactName?: string
) {
  const user = await findUserByPhone(senderPhone, workspaceId);
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
  const cid = crypto.randomUUID();
  const dryRun: DryRunContext = {
    enabled: request.headers.get('X-Dry-Run') === '1',
    actions: [],
  };

  try {
    const body: ZAPIWebhook = await request.json();

    // Parse normalized payload for logging context
    const event = parseZapiPayload(body);

    if (process.env.NODE_ENV === 'development') {
      zapiLog('info', cid, 'Webhook received', {
        type: body.type,
        instanceId: body.instanceId,
        phone: event?.phone,
        messageId: event?.messageId,
        dryRun: dryRun.enabled,
      });
    }

    if (!isInboundUserMessage(body)) {
      zapiLog('info', cid, 'Skipping non-inbound message', {
        type: body.type,
        status: body.status,
        fromMe: body.fromMe || body.message?.fromMe,
      });
      return NextResponse.json({ received: true });
    }

    const senderPhone = body.message?.phone || body.phone;
    if (!senderPhone) {
      zapiLog('warn', cid, 'No sender phone found in payload');
      return NextResponse.json({ received: true });
    }
    const normalizedSender = normalizePhone(senderPhone);

    // Idempotency check: skip already-processed messageIds
    const messageId = extractMessageId(body);
    if (messageId && await isDuplicateMessage(messageId, cid)) {
      return NextResponse.json({ received: true });
    }

    // Resolver workspace para isolamento de tenant
    const workspaceId = await resolveWorkspaceId(body.instanceId);
    if (!workspaceId) {
      zapiLog('error', cid, 'Could not resolve workspace_id. Set ZAPI_WORKSPACE_ID env var.', {
        instanceId: body.instanceId,
      });
      return NextResponse.json({ error: 'Workspace not resolved' }, { status: 400 });
    }

    zapiLog('info', cid, 'Processing inbound message', {
      phone: normalizedSender,
      messageId,
      workspace: workspaceId,
      dryRun: dryRun.enabled,
    });

    // Processar contato compartilhado
    if (body.message?.type === 'contactCard' || body.contacts) {
      const vcard = body.message?.contactVcard || body.contacts?.[0]?.vcard;
      const displayName =
        body.message?.contactName || body.contacts?.[0]?.displayName || '';

      if (vcard) {
        if (dryRun.enabled) {
          dryRun.actions.push(`handleSharedContact(${normalizedSender}, vcard, "${displayName}", workspace=${workspaceId})`);
          zapiLog('info', cid, 'DRY-RUN: would handleSharedContact', { phone: normalizedSender, displayName });
        } else {
          await handleSharedContact(senderPhone, vcard, displayName, workspaceId);
        }
      }

      if (dryRun.enabled) {
        return NextResponse.json({ dryRun: true, correlationId: cid, actions: dryRun.actions });
      }
      return NextResponse.json({ received: true });
    }

    // Processar mensagem de texto
    let messageText = extractMessageText(body);
    const contactName = body.message?.contactName || body.message?.pushName || '';

    if (!messageText && isAudioMessage(body)) {
      try {
        zapiLog('info', cid, 'Attempting audio transcription', { phone: normalizedSender });
        if (dryRun.enabled) {
          dryRun.actions.push(`transcribeAudio(phone=${normalizedSender})`);
        } else {
          messageText = await transcribeAudio(body);
        }
      } catch (error) {
        zapiLog('error', cid, 'Audio transcription error', {
          phone: normalizedSender,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!messageText && isAudioMessage(body)) {
      if (dryRun.enabled) {
        dryRun.actions.push(`sendTextMessage(${normalizedSender}, "audio-not-understood fallback")`);
        return NextResponse.json({ dryRun: true, correlationId: cid, actions: dryRun.actions });
      }
      await sendTextMessage(
        normalizedSender,
        'Recebi seu audio, mas nao consegui entender. Pode mandar em texto ou reenviar o audio?'
      );
      return NextResponse.json({ received: true });
    }

    if (messageText) {
      if (!dryRun.enabled) {
        const allowed = await shouldProcessInbound(
          normalizedSender,
          messageId,
          body.momment
        );
        if (!allowed) {
          zapiLog('info', cid, 'shouldProcessInbound returned false (dedup)', {
            phone: normalizedSender,
            messageId,
          });
          return NextResponse.json({ received: true });
        }
        const lockAcquired = await acquireConversationLock(normalizedSender);
        if (!lockAcquired) {
          zapiLog('warn', cid, 'Could not acquire conversation lock', { phone: normalizedSender });
          return NextResponse.json({ received: true });
        }
        try {
          await handleTextMessage(senderPhone, messageText, workspaceId, messageId, contactName);
        } finally {
          await releaseConversationLock(normalizedSender);
        }
      } else {
        dryRun.actions.push(`handleTextMessage(${normalizedSender}, text="${messageText.slice(0, 80)}...", workspace=${workspaceId}, messageId=${messageId})`);
        zapiLog('info', cid, 'DRY-RUN: would handleTextMessage', {
          phone: normalizedSender,
          textPreview: messageText.slice(0, 80),
          workspace: workspaceId,
        });
      }
    }

    if (dryRun.enabled) {
      zapiLog('info', cid, 'DRY-RUN complete', { actionsCount: dryRun.actions.length });
      return NextResponse.json({ dryRun: true, correlationId: cid, actions: dryRun.actions });
    }

    zapiLog('info', cid, 'Webhook processed successfully', {
      phone: normalizedSender,
      messageId,
      workspace: workspaceId,
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    zapiLog('error', cid, 'Webhook error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
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
