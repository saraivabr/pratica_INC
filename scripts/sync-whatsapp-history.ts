/**
 * Script para sincronizar historico de chats WhatsApp da Evolution API
 *
 * Funcionalidades:
 * 1. Busca todas as instancias conectadas da Evolution API
 * 2. Para cada instancia, identifica o tenant_id correspondente
 * 3. Sincroniza chats, contatos e mensagens para o banco de dados
 *
 * Executar:
 *   npx tsx scripts/sync-whatsapp-history.ts
 *
 * Opcoes:
 *   --tenant=N     Sincronizar apenas um tenant especifico
 *   --instance=X   Sincronizar apenas uma instancia especifica
 *   --limit=N      Limite de mensagens por chat (default: 100)
 *   --dry-run      Apenas mostra o que seria feito, sem salvar
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carregar variaveis de ambiente
dotenv.config({ path: '.env.local' });

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL || process.env.SCALINGO_POSTGRESQL_URL;

// Validar configuracao
if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL nao configurado');
  process.exit(1);
}

if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
  console.error('ERRO: EVOLUTION_BASE_URL ou EVOLUTION_API_KEY nao configurados');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') || DATABASE_URL.includes('scalingo')
    ? { rejectUnauthorized: false }
    : undefined,
});

// =============================================================================
// TIPOS
// =============================================================================

interface EvolutionInstance {
  id?: string;
  name?: string;
  instance?: {
    instanceName: string;
    status: string;
  };
  connectionStatus?: 'open' | 'close' | 'connecting';
  ownerJid?: string | null;
  profileName?: string | null;
  number?: string | null;
}

interface EvolutionChat {
  remoteJid: string;
  name?: string;
  pushName?: string;
  unreadCount?: number;
  lastMessage?: {
    key: { id: string; fromMe: boolean };
    message: any;
    messageTimestamp: number;
  };
}

interface EvolutionContact {
  remoteJid: string;
  pushName?: string;
  profilePictureUrl?: string;
  isBusiness?: boolean;
}

interface SyncStats {
  instancesProcessed: number;
  chatsProcessed: number;
  contactsSynced: number;
  messagesSynced: number;
  errors: string[];
}

// =============================================================================
// EVOLUTION API CLIENT
// =============================================================================

const DEFAULT_TIMEOUT = 30000;

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLUTION_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY || '',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Evolution API error: ${response.status} - ${text}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchInstances(): Promise<EvolutionInstance[]> {
  return evolutionFetch<EvolutionInstance[]>('/instance/fetchInstances', {
    method: 'GET',
  });
}

async function getConnectionStatus(instanceName: string): Promise<{ state: string }> {
  try {
    return await evolutionFetch<{ state: string }>(
      `/instance/connectionState/${instanceName}`
    );
  } catch {
    return { state: 'unknown' };
  }
}

async function fetchAllChats(instanceName: string): Promise<EvolutionChat[]> {
  try {
    const chats = await evolutionFetch<EvolutionChat[]>(
      `/chat/findChats/${instanceName}`,
      { method: 'GET' }
    );
    return Array.isArray(chats) ? chats : [];
  } catch (error: any) {
    console.error(`  Erro ao buscar chats: ${error.message}`);
    return [];
  }
}

async function fetchAllContacts(instanceName: string): Promise<EvolutionContact[]> {
  try {
    const contacts = await evolutionFetch<EvolutionContact[]>(
      `/chat/findContacts/${instanceName}`,
      { method: 'GET' }
    );
    return Array.isArray(contacts) ? contacts : [];
  } catch (error: any) {
    console.error(`  Erro ao buscar contatos: ${error.message}`);
    return [];
  }
}

async function fetchChatMessages(
  instanceName: string,
  remoteJid: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const messages = await evolutionFetch<any[]>(
      `/chat/findMessages/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({
          where: {
            key: {
              remoteJid: remoteJid,
            },
          },
          limit: limit,
        }),
      }
    );
    return Array.isArray(messages) ? messages : [];
  } catch (error: any) {
    console.error(`  Erro ao buscar mensagens de ${remoteJid}: ${error.message}`);
    return [];
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function extractPhoneFromJid(remoteJid: string): string {
  if (!remoteJid) return '';
  const atIndex = remoteJid.indexOf('@');
  const jidPart = atIndex > 0 ? remoteJid.substring(0, atIndex) : remoteJid;
  const dashIndex = jidPart.indexOf('-');
  const phoneNumber = dashIndex > 0 ? jidPart.substring(0, dashIndex) : jidPart;
  return phoneNumber.replace(/\D/g, '');
}

function isGroupJid(remoteJid: string): boolean {
  return remoteJid.includes('@g.us');
}

function extractMessageText(message: any): string | null {
  if (!message) return null;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.caption) return message.documentMessage.caption;
  return null;
}

function getInstanceName(instance: EvolutionInstance): string | null {
  return (instance as any).name || instance.instance?.instanceName || null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

async function syncChats(
  tenantId: number,
  instanceName: string,
  chats: EvolutionChat[],
  dryRun: boolean
): Promise<number> {
  let synced = 0;

  for (const chat of chats) {
    const phoneNumber = extractPhoneFromJid(chat.remoteJid);
    const isGroup = isGroupJid(chat.remoteJid);
    const contactName = chat.name || chat.pushName || null;

    const lastMessageText = chat.lastMessage?.message
      ? extractMessageText(chat.lastMessage.message)
      : null;
    const lastMessageFromMe = chat.lastMessage?.key?.fromMe || false;
    const lastMessageAt = chat.lastMessage?.messageTimestamp
      ? new Date(chat.lastMessage.messageTimestamp * 1000).toISOString()
      : null;
    const unreadCount = chat.unreadCount || 0;

    if (dryRun) {
      console.log(`    [DRY-RUN] Chat: ${contactName || phoneNumber} (${chat.remoteJid})`);
      synced++;
      continue;
    }

    try {
      await pool.query(`
        INSERT INTO whatsapp_synced_chats (
          tenant_id,
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
        ON CONFLICT (tenant_id, remote_jid) DO UPDATE SET
          phone_number = EXCLUDED.phone_number,
          contact_name = EXCLUDED.contact_name,
          is_group = EXCLUDED.is_group,
          last_message_at = EXCLUDED.last_message_at,
          last_message_text = EXCLUDED.last_message_text,
          last_message_from_me = EXCLUDED.last_message_from_me,
          unread_count = EXCLUDED.unread_count,
          synced_at = NOW()
      `, [
        tenantId,
        chat.remoteJid,
        phoneNumber,
        contactName,
        isGroup,
        lastMessageAt,
        lastMessageText,
        lastMessageFromMe,
        unreadCount,
      ]);
      synced++;
    } catch (error: any) {
      console.error(`    Erro ao salvar chat ${chat.remoteJid}: ${error.message}`);
    }
  }

  return synced;
}

async function syncContacts(
  tenantId: number,
  instanceName: string,
  contacts: EvolutionContact[],
  dryRun: boolean
): Promise<number> {
  let synced = 0;

  for (const contact of contacts) {
    // Ignorar grupos
    if (isGroupJid(contact.remoteJid)) continue;

    const phoneNumber = extractPhoneFromJid(contact.remoteJid);

    if (dryRun) {
      console.log(`    [DRY-RUN] Contato: ${contact.pushName || phoneNumber}`);
      synced++;
      continue;
    }

    try {
      await pool.query(`
        INSERT INTO whatsapp_synced_contacts (
          tenant_id,
          remote_jid,
          phone_number,
          push_name,
          profile_picture_url,
          is_business,
          synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (tenant_id, remote_jid) DO UPDATE SET
          phone_number = EXCLUDED.phone_number,
          push_name = EXCLUDED.push_name,
          profile_picture_url = EXCLUDED.profile_picture_url,
          is_business = EXCLUDED.is_business,
          synced_at = NOW()
      `, [
        tenantId,
        contact.remoteJid,
        phoneNumber,
        contact.pushName || null,
        contact.profilePictureUrl || null,
        contact.isBusiness || false,
      ]);
      synced++;
    } catch (error: any) {
      console.error(`    Erro ao salvar contato ${contact.remoteJid}: ${error.message}`);
    }
  }

  return synced;
}

async function syncMessages(
  tenantId: number,
  instanceName: string,
  chats: EvolutionChat[],
  messagesPerChat: number,
  dryRun: boolean
): Promise<number> {
  let totalSynced = 0;

  // Filtrar apenas conversas individuais (nao grupos)
  const individualChats = chats.filter(chat => !isGroupJid(chat.remoteJid));
  console.log(`  Sincronizando mensagens de ${individualChats.length} conversas individuais...`);

  for (const chat of individualChats) {
    const phoneNumber = extractPhoneFromJid(chat.remoteJid);
    const contactName = chat.name || chat.pushName || phoneNumber;

    // Buscar mensagens deste chat
    const messages = await fetchChatMessages(instanceName, chat.remoteJid, messagesPerChat);

    if (messages.length === 0) continue;

    let chatSynced = 0;

    for (const msg of messages) {
      const messageId = msg.key?.id;
      if (!messageId) continue;

      const isFromMe = msg.key?.fromMe || false;
      const messageText = extractMessageText(msg.message);
      const messageType = msg.message ? Object.keys(msg.message)[0] : 'unknown';
      const timestamp = msg.messageTimestamp
        ? new Date(msg.messageTimestamp * 1000).toISOString()
        : new Date().toISOString();

      if (dryRun) {
        chatSynced++;
        continue;
      }

      try {
        // Verificar se mensagem ja existe
        const existingMsg = await pool.query(
          `SELECT id FROM whatsapp_messages WHERE tenant_id = $1 AND message_id = $2 LIMIT 1`,
          [tenantId, messageId]
        );

        if (existingMsg.rows.length > 0) {
          // Mensagem ja existe, pular
          continue;
        }

        // Inserir nova mensagem
        await pool.query(`
          INSERT INTO whatsapp_messages (
            tenant_id,
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
          tenantId,
          instanceName,
          phoneNumber,
          messageId,
          messageType,
          messageText,
          isFromMe,
          timestamp,
          contactName,
          'synced',
          JSON.stringify(msg),
        ]);

        chatSynced++;
      } catch (error: any) {
        // Ignorar erros de duplicata silenciosamente
        if (!error.message?.includes('duplicate key')) {
          console.error(`    Erro ao salvar mensagem: ${error.message}`);
        }
      }
    }

    if (chatSynced > 0) {
      console.log(`    ${contactName}: ${chatSynced} mensagens sincronizadas`);
      totalSynced += chatSynced;
    }

    // Pequeno delay para nao sobrecarregar a API
    await sleep(100);
  }

  return totalSynced;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  // Parse argumentos
  const args = process.argv.slice(2);
  const options = {
    tenant: null as number | null,
    instance: null as string | null,
    limit: 100,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--tenant=')) {
      options.tenant = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--instance=')) {
      options.instance = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  console.log('=== Sincronizacao de Historico WhatsApp ===\n');
  console.log(`EVOLUTION_BASE_URL: ${EVOLUTION_BASE_URL}`);
  console.log(`Limite de mensagens por chat: ${options.limit}`);
  if (options.tenant) console.log(`Filtro: tenant_id = ${options.tenant}`);
  if (options.instance) console.log(`Filtro: instance = ${options.instance}`);
  if (options.dryRun) console.log('MODO DRY-RUN: nenhum dado sera salvo');
  console.log('');

  const stats: SyncStats = {
    instancesProcessed: 0,
    chatsProcessed: 0,
    contactsSynced: 0,
    messagesSynced: 0,
    errors: [],
  };

  try {
    // 1. Buscar todas as instancias
    console.log('Buscando instancias da Evolution API...');
    const instances = await fetchInstances();
    console.log(`Encontradas ${instances.length} instancias\n`);

    if (instances.length === 0) {
      console.log('Nenhuma instancia encontrada.');
      return;
    }

    // 2. Buscar mapeamento instancia -> tenant do banco
    const { rows: users } = await pool.query(`
      SELECT id, evolution_instance_name, tenant_id, nome
      FROM users
      WHERE evolution_instance_name IS NOT NULL
    `);

    const instanceToTenant = new Map<string, number>();
    const instanceToUser = new Map<string, { id: string; nome: string }>();
    const userIdToTenant = new Map<string, number>();

    for (const user of users) {
      if (user.evolution_instance_name) {
        instanceToTenant.set(user.evolution_instance_name, user.tenant_id);
        instanceToUser.set(user.evolution_instance_name, { id: user.id, nome: user.nome });
      }
      userIdToTenant.set(String(user.id), user.tenant_id);
    }

    // 3. Processar cada instancia
    for (const instance of instances) {
      const instanceName = getInstanceName(instance);
      if (!instanceName) {
        console.log('Instancia sem nome, pulando...');
        continue;
      }

      // Filtro por instancia
      if (options.instance && instanceName !== options.instance) {
        continue;
      }

      // Buscar tenant_id
      let tenantId = instanceToTenant.get(instanceName);

      if (!tenantId) {
        // Tentar extrair do nome (formato: corretor-{userId}-{timestamp})
        const match = instanceName.match(/^corretor-(\d+)-/);
        if (match) {
          const userId = match[1];
          tenantId = userIdToTenant.get(userId);

          if (!tenantId) {
            const { rows } = await pool.query(
              'SELECT tenant_id FROM users WHERE id = $1',
              [userId]
            );
            if (rows[0]?.tenant_id) {
              tenantId = rows[0].tenant_id;
            }
          }
        }
      }

      if (!tenantId) {
        console.log(`${instanceName}: tenant_id nao encontrado, pulando...`);
        stats.errors.push(`${instanceName}: tenant_id nao encontrado`);
        continue;
      }

      // Filtro por tenant
      if (options.tenant && tenantId !== options.tenant) {
        continue;
      }

      // Verificar status da conexao
      const status = await getConnectionStatus(instanceName);
      const isConnected = status.state === 'open';

      const userInfo = instanceToUser.get(instanceName);
      console.log(`\n--- ${instanceName} ---`);
      console.log(`  Tenant: ${tenantId}`);
      console.log(`  Usuario: ${userInfo?.nome || 'N/A'}`);
      console.log(`  Status: ${status.state}`);

      if (!isConnected) {
        console.log('  AVISO: Instancia desconectada, tentando sincronizar mesmo assim...');
      }

      stats.instancesProcessed++;

      // Buscar chats
      console.log('  Buscando chats...');
      const chats = await fetchAllChats(instanceName);
      console.log(`  Encontrados ${chats.length} chats`);

      if (chats.length === 0) {
        console.log('  Nenhum chat encontrado, pulando...');
        continue;
      }

      // Sincronizar chats
      const chatsSynced = await syncChats(tenantId, instanceName, chats, options.dryRun);
      stats.chatsProcessed += chatsSynced;
      console.log(`  Chats sincronizados: ${chatsSynced}`);

      // Buscar e sincronizar contatos
      console.log('  Buscando contatos...');
      const contacts = await fetchAllContacts(instanceName);
      console.log(`  Encontrados ${contacts.length} contatos`);

      const contactsSynced = await syncContacts(tenantId, instanceName, contacts, options.dryRun);
      stats.contactsSynced += contactsSynced;
      console.log(`  Contatos sincronizados: ${contactsSynced}`);

      // Sincronizar mensagens
      const messagesSynced = await syncMessages(
        tenantId,
        instanceName,
        chats,
        options.limit,
        options.dryRun
      );
      stats.messagesSynced += messagesSynced;
      console.log(`  Total de mensagens sincronizadas: ${messagesSynced}`);

      // Registrar execucao no historico
      if (!options.dryRun) {
        await pool.query(`
          INSERT INTO whatsapp_sync_runs (
            tenant_id,
            status,
            chats_synced,
            contacts_synced,
            started_at,
            completed_at
          ) VALUES ($1, 'completed', $2, $3, NOW(), NOW())
        `, [tenantId, chatsSynced, contactsSynced]);
      }
    }

    // 4. Resumo
    console.log('\n=== Resumo da Sincronizacao ===');
    console.log(`Instancias processadas: ${stats.instancesProcessed}`);
    console.log(`Chats sincronizados: ${stats.chatsProcessed}`);
    console.log(`Contatos sincronizados: ${stats.contactsSynced}`);
    console.log(`Mensagens sincronizadas: ${stats.messagesSynced}`);

    if (stats.errors.length > 0) {
      console.log(`\nErros (${stats.errors.length}):`);
      for (const error of stats.errors) {
        console.log(`  - ${error}`);
      }
    }

    if (options.dryRun) {
      console.log('\nMODO DRY-RUN: nenhum dado foi salvo.');
    }

  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
