/**
 * WhatsApp Sync - Fetch Service
 *
 * Servico para buscar dados da Evolution API e sincronizar com o banco de dados.
 * Usa o padrao de chamadas HTTP do projeto (evolution-api.ts).
 */

import 'dotenv/config';
import pool from '../db';
import { EvolutionChat, EvolutionContact } from './types';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://pratica-evolution-api.robuvi.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

if (!EVOLUTION_API_KEY) {
  console.warn('[WhatsApp Sync] EVOLUTION_API_KEY not configured in environment');
}

/**
 * Custom error class for Evolution API errors
 */
class EvolutionAPIError extends Error {
  public statusCode: number;
  public endpoint: string;
  public retryable: boolean;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = 'EvolutionAPIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.retryable = statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }
}

/**
 * Sleep helper for retry delay
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse error response from Evolution API
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || json.detail || text;
    } catch {
      return text || `HTTP ${response.status}`;
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Base fetch for Evolution API with retry logic
 */
async function evolutionFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = `${EVOLUTION_BASE_URL}${endpoint}`;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY || '',
            ...options.headers,
          },
        },
        DEFAULT_TIMEOUT
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        const error = new EvolutionAPIError(errorMessage, response.status, endpoint);

        if (!error.retryable || attempt === retries) {
          throw error;
        }

        lastError = error;
      } else {
        const data = await response.json();
        return data;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        lastError = new EvolutionAPIError('Request timeout', 408, endpoint);
      } else if (error instanceof EvolutionAPIError) {
        lastError = error;
        if (!error.retryable) throw error;
      } else {
        lastError = new EvolutionAPIError(
          error.message || 'Network error',
          0,
          endpoint
        );
      }

      if (attempt === retries) {
        throw lastError;
      }
    }

    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    console.log(`[WhatsApp Sync] Retry ${attempt + 1}/${retries} for ${endpoint} in ${delay}ms`);
    await sleep(delay);
    attempt++;
  }

  throw lastError || new Error('Unknown error');
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extrai numero de telefone limpo do remoteJid
 * Ex: "5511999999999@s.whatsapp.net" -> "5511999999999"
 * Ex: "5511999999999@c.us" -> "5511999999999"
 * Ex: "5511999999999-1234567890@g.us" -> "5511999999999" (grupos)
 */
export function extractPhoneFromJid(remoteJid: string): string {
  if (!remoteJid) return '';

  // Remove o sufixo @s.whatsapp.net, @c.us, @g.us, etc
  const atIndex = remoteJid.indexOf('@');
  const jidPart = atIndex > 0 ? remoteJid.substring(0, atIndex) : remoteJid;

  // Para grupos, o formato e "numero-timestamp@g.us", pega so o numero
  const dashIndex = jidPart.indexOf('-');
  const phoneNumber = dashIndex > 0 ? jidPart.substring(0, dashIndex) : jidPart;

  // Remove caracteres nao numericos
  return phoneNumber.replace(/\D/g, '');
}

/**
 * Verifica se o JID e de um grupo
 */
function isGroupJid(remoteJid: string): boolean {
  return remoteJid.includes('@g.us');
}

/**
 * Extrai texto da mensagem (diferentes formatos)
 */
function extractMessageText(message: any): string | null {
  if (!message) return null;

  // Mensagem simples
  if (message.conversation) {
    return message.conversation;
  }

  // Mensagem extendida (com link preview, etc)
  if (message.extendedTextMessage?.text) {
    return message.extendedTextMessage.text;
  }

  // Caption de midia
  if (message.imageMessage?.caption) {
    return message.imageMessage.caption;
  }
  if (message.videoMessage?.caption) {
    return message.videoMessage.caption;
  }
  if (message.documentMessage?.caption) {
    return message.documentMessage.caption;
  }

  return null;
}

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

/**
 * Busca todas as conversas de uma instancia WhatsApp
 * Usa GET /chat/findChats/{instanceName}
 */
export async function fetchAllChats(
  workspaceId: number,
  instanceName: string
): Promise<EvolutionChat[]> {
  console.log(`[WhatsApp Sync] Fetching chats for tenant ${workspaceId}, instance ${instanceName}`);

  try {
    const chats = await evolutionFetch<EvolutionChat[]>(
      `/chat/findChats/${instanceName}`,
      { method: 'GET' }
    );

    console.log(`[WhatsApp Sync] Found ${chats?.length || 0} chats`);
    return Array.isArray(chats) ? chats : [];
  } catch (error: any) {
    console.error(`[WhatsApp Sync] Error fetching chats: ${error.message}`);
    throw error;
  }
}

/**
 * Busca mensagens de uma conversa especifica
 * Usa GET /chat/findMessages/{instanceName}
 * @param limit - Quantidade de mensagens (default 50)
 */
export async function fetchChatMessages(
  workspaceId: number,
  instanceName: string,
  remoteJid: string,
  limit: number = 50
): Promise<any[]> {
  console.log(`[WhatsApp Sync] Fetching messages for ${remoteJid}, limit ${limit}`);

  try {
    // A Evolution API usa POST com body para findMessages
    const messages = await evolutionFetch<any[]>(
      `/chat/findMessages/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remoteJid
            }
          },
          limit: limit
        })
      }
    );

    console.log(`[WhatsApp Sync] Found ${messages?.length || 0} messages`);
    return Array.isArray(messages) ? messages : [];
  } catch (error: any) {
    console.error(`[WhatsApp Sync] Error fetching messages: ${error.message}`);
    throw error;
  }
}

/**
 * Busca todos os contatos de uma instancia
 * Usa GET /chat/findContacts/{instanceName}
 */
export async function fetchAllContacts(
  workspaceId: number,
  instanceName: string
): Promise<EvolutionContact[]> {
  console.log(`[WhatsApp Sync] Fetching contacts for tenant ${workspaceId}, instance ${instanceName}`);

  try {
    const contacts = await evolutionFetch<EvolutionContact[]>(
      `/chat/findContacts/${instanceName}`,
      { method: 'GET' }
    );

    console.log(`[WhatsApp Sync] Found ${contacts?.length || 0} contacts`);
    return Array.isArray(contacts) ? contacts : [];
  } catch (error: any) {
    console.error(`[WhatsApp Sync] Error fetching contacts: ${error.message}`);
    throw error;
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sincroniza chats para o banco de dados
 * Busca da API e salva em whatsapp_synced_chats
 */
export async function syncChatsToDatabase(
  workspaceId: number,
  instanceName: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  console.log(`[WhatsApp Sync] Starting chat sync for tenant ${workspaceId}`);

  try {
    const chats = await fetchAllChats(workspaceId, instanceName);

    for (const chat of chats) {
      try {
        const phoneNumber = extractPhoneFromJid(chat.remoteJid);
        const isGroup = isGroupJid(chat.remoteJid);
        const contactName = chat.name || chat.pushName || null;

        // Extrai dados da ultima mensagem
        const lastMessageText = chat.lastMessage?.message
          ? extractMessageText(chat.lastMessage.message)
          : null;
        const lastMessageFromMe = chat.lastMessage?.key?.fromMe || false;
        const lastMessageAt = chat.lastMessage?.messageTimestamp
          ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
          : null;
        const unreadCount = chat.unreadCount || 0;

        // UPSERT no banco de dados
        await pool.query(`
          INSERT INTO whatsapp_synced_chats (
            workspace_id,
            remote_jid,
            phone_number,
            contact_name,
            is_group,
            last_message_at,
            last_message_text,
            last_message_from_me,
            unread_count,
            synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (workspace_id, remote_jid) DO UPDATE SET
            phone_number = EXCLUDED.phone_number,
            contact_name = EXCLUDED.contact_name,
            is_group = EXCLUDED.is_group,
            last_message_at = EXCLUDED.last_message_at,
            last_message_text = EXCLUDED.last_message_text,
            last_message_from_me = EXCLUDED.last_message_from_me,
            unread_count = EXCLUDED.unread_count,
            synced_at = NOW()
        `, [
          workspaceId,
          chat.remoteJid,
          phoneNumber,
          contactName,
          isGroup,
          lastMessageAt,
          lastMessageText,
          lastMessageFromMe,
          unreadCount
        ]);

        synced++;
      } catch (error: any) {
        const errorMsg = `Error syncing chat ${chat.remoteJid}: ${error.message}`;
        console.error(`[WhatsApp Sync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[WhatsApp Sync] Chat sync completed: ${synced} synced, ${errors.length} errors`);
    return { synced, errors };

  } catch (error: any) {
    const errorMsg = `Failed to fetch chats: ${error.message}`;
    console.error(`[WhatsApp Sync] ${errorMsg}`);
    errors.push(errorMsg);
    return { synced, errors };
  }
}

/**
 * Sincroniza contatos para o banco de dados
 * Busca da API e salva em whatsapp_synced_contacts
 */
export async function syncContactsToDatabase(
  workspaceId: number,
  instanceName: string
): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  console.log(`[WhatsApp Sync] Starting contact sync for tenant ${workspaceId}`);

  try {
    const contacts = await fetchAllContacts(workspaceId, instanceName);

    for (const contact of contacts) {
      try {
        const phoneNumber = extractPhoneFromJid(contact.remoteJid);
        const isGroup = isGroupJid(contact.remoteJid);

        // Ignora grupos na sincronizacao de contatos
        if (isGroup) {
          continue;
        }

        // UPSERT no banco de dados
        await pool.query(`
          INSERT INTO whatsapp_synced_contacts (
            workspace_id,
            remote_jid,
            phone_number,
            push_name,
            profile_picture_url,
            is_business,
            synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (workspace_id, remote_jid) DO UPDATE SET
            phone_number = EXCLUDED.phone_number,
            push_name = EXCLUDED.push_name,
            profile_picture_url = EXCLUDED.profile_picture_url,
            is_business = EXCLUDED.is_business,
            synced_at = NOW()
        `, [
          workspaceId,
          contact.remoteJid,
          phoneNumber,
          contact.pushName || null,
          contact.profilePictureUrl || null,
          contact.isBusiness || false
        ]);

        synced++;
      } catch (error: any) {
        const errorMsg = `Error syncing contact ${contact.remoteJid}: ${error.message}`;
        console.error(`[WhatsApp Sync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[WhatsApp Sync] Contact sync completed: ${synced} synced, ${errors.length} errors`);
    return { synced, errors };

  } catch (error: any) {
    const errorMsg = `Failed to fetch contacts: ${error.message}`;
    console.error(`[WhatsApp Sync] ${errorMsg}`);
    errors.push(errorMsg);
    return { synced, errors };
  }
}

/**
 * Sincroniza mensagens históricas para o banco de dados
 * Busca as últimas N mensagens de cada chat e salva em whatsapp_messages
 */
export async function syncMessagesToDatabase(
  workspaceId: number,
  instanceName: string,
  messagesPerChat: number = 50
): Promise<{ synced: number; chatsProcessed: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;
  let chatsProcessed = 0;

  console.log(`[WhatsApp Sync] Starting message sync for tenant ${workspaceId}, ${messagesPerChat} messages per chat`);

  try {
    // Primeiro, buscar todos os chats
    const chats = await fetchAllChats(workspaceId, instanceName);

    // Filtrar apenas conversas individuais (não grupos)
    const individualChats = chats.filter(chat => !isGroupJid(chat.remoteJid));

    console.log(`[WhatsApp Sync] Found ${individualChats.length} individual chats to sync messages`);

    for (const chat of individualChats) {
      try {
        const phoneNumber = extractPhoneFromJid(chat.remoteJid);
        const contactName = chat.name || chat.pushName || phoneNumber;

        // Buscar mensagens deste chat
        const messages = await fetchChatMessages(workspaceId, instanceName, chat.remoteJid, messagesPerChat);

        if (!messages || messages.length === 0) {
          chatsProcessed++;
          continue;
        }

        // Salvar cada mensagem
        for (const msg of messages) {
          try {
            const messageId = msg.key?.id;
            if (!messageId) continue;

            const isFromMe = msg.key?.fromMe || false;
            const messageText = extractMessageText(msg.message);
            const messageType = msg.message ? Object.keys(msg.message)[0] : 'unknown';
            const timestamp = msg.messageTimestamp
              ? new Date(msg.messageTimestamp * 1000).toISOString()
              : new Date().toISOString();

            // Verificar se mensagem já existe antes de inserir
            const existingMsg = await pool.query(
              `SELECT id FROM whatsapp_messages WHERE workspace_id = $1 AND message_id = $2 LIMIT 1`,
              [workspaceId, messageId]
            );

            if (existingMsg.rows.length > 0) {
              // Mensagem já existe, pular
              continue;
            }

            // Inserir nova mensagem
            await pool.query(`
              INSERT INTO whatsapp_messages (
                workspace_id,
                instance_name,
                phone_number,
                message_id,
                message_type,
                message_text,
                is_from_me,
                timestamp,
                contact_name,
                status,
                raw_data
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
              workspaceId,
              instanceName,
              phoneNumber,
              messageId,
              messageType,
              messageText,
              isFromMe,
              timestamp,
              contactName,
              'synced',
              JSON.stringify(msg)
            ]);

            synced++;
          } catch (msgError: any) {
            // Log mas continua com próxima mensagem
            console.error(`[WhatsApp Sync] Error saving message: ${msgError.message}`);
          }
        }

        chatsProcessed++;

        // Pequeno delay entre chats para não sobrecarregar a API
        await sleep(100);

      } catch (chatError: any) {
        const errorMsg = `Error syncing messages for ${chat.remoteJid}: ${chatError.message}`;
        console.error(`[WhatsApp Sync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`[WhatsApp Sync] Message sync completed: ${synced} messages synced from ${chatsProcessed} chats, ${errors.length} errors`);
    return { synced, chatsProcessed, errors };

  } catch (error: any) {
    const errorMsg = `Failed to sync messages: ${error.message}`;
    console.error(`[WhatsApp Sync] ${errorMsg}`);
    errors.push(errorMsg);
    return { synced, chatsProcessed, errors };
  }
}
