/**
 * Webhook Evolution API - Receber Eventos WhatsApp por Tenant
 *
 * POST /api/webhook/evolution/:workspaceId
 *
 * Eventos recebidos:
 * - MESSAGES_UPSERT: Nova mensagem recebida
 * - MESSAGES_UPDATE: Mensagem atualizada
 * - CONNECTION_UPDATE: Status da conexão mudou
 * - QRCODE_UPDATED: Novo QR Code gerado
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWorkspace, updateWorkspace, tenantQuery, withTenant } from '@/lib/tenant-context';
import {
  getConversationByPhone,
  pauseBot,
  appendPendingMessage,
  setDebounceUntil,
} from '@/lib/salva-leads/conversation';
import { sendTextMessage } from '@/lib/evolution-api';
import {
  processMessage as processSofiaMessage,
  handleUnregisteredUserConversation,
} from '@/lib/sofia';
import { withProvider } from '@/lib/whatsapp-sender';
import { dbQuery } from '@/lib/db';
import { enqueueMessage } from '@/lib/message-queue';
import {
  getAgentConfig,
  isWithinBusinessHours,
  shouldEscalate,
  logConversation,
} from '@/lib/agents/config';
import {
  buscarConvidadoPorTelefone,
  processarMensagemConvidado,
  deveUsarFluxoEventos,
  gerarSofiaEventoPrompt,
} from '@/lib/eventos';

// AsyncLocalStorage (used by withProvider) requires Node.js runtime
export const runtime = 'nodejs';

/**
 * Valida autenticação do webhook.
 * Aceita:
 * - Query parameter: ?secret={secret} (Evolution API v2 não suporta headers)
 * - Authorization: Bearer {secret}
 * - x-webhook-secret: {secret}
 * Em desenvolvimento, aceita qualquer request.
 */
function validateWebhookAuth(request: NextRequest): boolean {
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

  // SECURITY: Sempre exigir secret, mesmo em dev.
  // Se secret não está configurado, rejeitar.
  if (!webhookSecret) {
    console.error('[Webhook Evolution] EVOLUTION_WEBHOOK_SECRET não configurado. Rejeitando request.');
    return false;
  }

  // Verificar query parameter (Evolution API v2 não suporta headers customizados)
  const urlSecret = request.nextUrl.searchParams.get('secret');
  if (urlSecret === webhookSecret) {
    return true;
  }

  // Verificar Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${webhookSecret}`) {
    return true;
  }

  // Verificar x-webhook-secret header
  const xWebhookSecret = request.headers.get('x-webhook-secret');
  if (xWebhookSecret === webhookSecret) {
    return true;
  }

  return false;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // Validar autenticação do webhook
    if (!validateWebhookAuth(request)) {
      console.error('[Webhook Evolution] Request não autorizado - secret inválido ou ausente');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const workspaceId = parseInt(params.workspaceId);

    if (isNaN(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    console.log(`[Webhook Evolution] Tenant ${workspaceId}:`, {
      event: body.event,
      instance: body.instance,
    });

    // Processar evento baseado no tipo
    // Evolution API pode enviar eventos em diferentes formatos:
    // - UPPERCASE: MESSAGES_UPSERT, CONNECTION_UPDATE
    // - lowercase com ponto: messages.upsert, connection.update
    const eventName = (body.event || '').toUpperCase().replace('.', '_');

    switch (eventName) {
      case 'QRCODE_UPDATED':
        await handleQRCodeUpdate(workspaceId, body);
        break;

      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(workspaceId, body);
        break;

      case 'MESSAGES_UPSERT':
        await handleNewMessage(workspaceId, body);
        break;

      case 'MESSAGES_UPDATE':
        await handleMessageUpdate(workspaceId, body);
        break;

      default:
        console.log('[Webhook Evolution] Unknown event:', body.event, '-> normalized:', eventName);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook Evolution] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Find user by phone number (multiple formats)
 * IMPORTANTE: Filtra por workspace_id para garantir isolamento entre tenants
 */
async function findUserByPhone(phone: string, workspaceId: number) {
  return await withTenant(workspaceId, async (client) => {
    const numbers = phone.replace(/\D/g, '');

    // Possible formats to search
    const formats = [
      `+${numbers}`,
      `+55${numbers}`,
      numbers,
      numbers.startsWith('55') ? numbers.slice(2) : numbers,
      numbers.startsWith('55') ? `+${numbers}` : `+55${numbers}`,
    ];

    const uniqueFormats = [...new Set(formats)];

    for (const format of uniqueFormats) {
      const { rows } = await client.query(
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
        return data;
      }
    }

    // Try LIKE search with last 9 digits
    const lastDigits = numbers.slice(-9);
    const { rows } = await client.query(
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
    }

    return data;
  });
}

/**
 * Handle QR Code update
 */
async function handleQRCodeUpdate(workspaceId: number, data: any) {
  const tenant = await getWorkspace(workspaceId);
  if (!tenant) return;

  const instances = tenant.evolution_instances || [];
  const instanceIndex = instances.findIndex(
    (i: any) => i.instance_name === data.instance
  );

  if (instanceIndex !== -1) {
    (instances[instanceIndex] as any).qr_code = data.data?.qrcode?.base64 || null;
    (instances[instanceIndex] as any).pairing_code = data.data?.qrcode?.pairingCode || null;

    await updateWorkspace(workspaceId, { evolution_instances: instances as any[] });

    console.log(`[QR Code Updated] Instance: ${data.instance}`);
  }
}

/**
 * Handle connection status update
 */
async function handleConnectionUpdate(workspaceId: number, data: any) {
  const tenant = await getWorkspace(workspaceId);
  if (!tenant) return;

  const instanceName = data.instance;
  const instances = tenant.evolution_instances || [];
  const instanceIndex = instances.findIndex(
    (i: any) => i.instance_name === instanceName
  );

  // Evolution API pode enviar estado em diferentes formatos
  const state = data.data?.state
    || data.data?.instance?.state
    || data.data?.status
    || data.data?.connectionState
    || 'unknown';

  const isConnected = state === 'open' || state === 'connected';

  if (instanceIndex !== -1) {
    (instances[instanceIndex] as any).status = isConnected ? 'connected' : 'disconnected';
    (instances[instanceIndex] as any).last_connection_update = new Date().toISOString();

    await updateWorkspace(workspaceId, { evolution_instances: instances as any[] });
  }

  // Atualizar status de conexão no registro do usuário (para Salva-Leads)
  // O nome da instância segue o padrão: corretor-{userId}-{timestamp}
  // userId pode ser UUID (ex: d027e287-919d-4fbd-af01-d6bfc84e1855) ou numérico
  await withTenant(workspaceId, async (client) => {
    const userIdMatch = instanceName?.match(/^corretor-([a-f0-9-]+)-\d+$/);
    if (userIdMatch) {
      const userId = userIdMatch[1];
      // IMPORTANTE: Só atualizar se esta é a instância ATUAL do usuário
      // Evita que instâncias antigas sobrescrevam o status da instância nova
      const result = await client.query(
        `UPDATE users SET evolution_connected = $1, updated_at = NOW()
         WHERE id = $2 AND evolution_instance_name = $3`,
        [isConnected, userId, instanceName]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[Connection Update] User ${userId} evolution_connected = ${isConnected}`);
      } else {
        console.log(`[Connection Update] Ignored stale instance ${instanceName} (user ${userId} has a different current instance)`);
      }
    } else {
      // Fallback: buscar usuário pelo nome da instância (só atualiza se é a instância atual)
      const result = await client.query(
        `UPDATE users SET evolution_connected = $1, updated_at = NOW() WHERE evolution_instance_name = $2`,
        [isConnected, instanceName]
      );
      console.log(`[Connection Update] Updated ${result.rowCount || 0} users with instance ${instanceName} -> connected = ${isConnected}`);
    }
  });

  console.log(`[Connection Update] Instance: ${instanceName}, State: ${state}, Connected: ${isConnected}`);
}

/**
 * Handle new message (integração com CV CRM e Salva-Leads)
 */
async function handleNewMessage(workspaceId: number, data: any) {
  try {
    const message = data.data;
    const isFromMe = message.key?.fromMe || false;

    // Extrair dados da mensagem
    const phoneNumber = message.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = message.message?.conversation ||
                       message.message?.extendedTextMessage?.text ||
                       '';

    const messageType = Object.keys(message.message || {})[0];
    const timestamp = new Date(message.messageTimestamp * 1000);

    console.log('[New Message]', {
      from: phoneNumber,
      text: messageText,
      type: messageType,
      isFromMe,
      timestamp,
    });

    // Verificar se é uma conversa Salva-Leads ativa
    const salvaLeadsHandled = await handleSalvaLeadsCheck(
      workspaceId,
      phoneNumber,
      messageText,
      isFromMe,
      data.instance
    );

    if (salvaLeadsHandled) {
      return; // Mensagem tratada pelo Salva-Leads
    }

    // Salvar mensagem no banco (tanto recebidas quanto enviadas)
    // Usar upsert para evitar duplicatas se webhook enviar mesmo evento duas vezes
    // IMPORTANTE: O índice único é (instance_name, message_id), não (workspace_id, message_id)
    const messageId = message.key?.id;
    if (messageId) {
      await withTenant(workspaceId, async (client) => {
        await client.query(
          `INSERT INTO whatsapp_messages (
            workspace_id, instance_name, phone_number, message_id, message_type,
            message_text, is_from_me, timestamp, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (instance_name, message_id)
          DO UPDATE SET
            updated_at = NOW(),
            raw_data = EXCLUDED.raw_data`,
          [
            workspaceId,
            data.instance,
            phoneNumber,
            messageId,
            messageType,
            messageText,
            isFromMe,
            timestamp.toISOString(),
            JSON.stringify(message),
          ]
        );
      });
    } else {
      // Mensagens sem ID (raro, mas possível)
      const query = tenantQuery(workspaceId);
      await query.insert('whatsapp_messages', {
        instance_name: data.instance,
        phone_number: phoneNumber,
        message_id: messageId,
        message_type: messageType,
        message_text: messageText,
        is_from_me: isFromMe,
        timestamp: timestamp.toISOString(),
        raw_data: message,
      });
    }

    // Async dual-write to MongoDB + Elasticsearch (non-blocking)
    if (messageId && phoneNumber) {
      const hasMedia = !!(
        message.message?.imageMessage ||
        message.message?.videoMessage ||
        message.message?.audioMessage ||
        message.message?.documentMessage ||
        message.message?.stickerMessage
      );

      enqueueMessage(workspaceId, 'index_message', {
        workspace_id: workspaceId,
        instance_name: data.instance,
        phone_number: phoneNumber,
        remote_jid: message.key?.remoteJid || `${phoneNumber}@s.whatsapp.net`,
        message_id: messageId,
        message_type: messageType,
        message_text: messageText,
        is_from_me: isFromMe,
        is_group: false,
        has_media: hasMedia,
        timestamp: timestamp.toISOString(),
        contact_name: message.pushName || null,
        status: isFromMe ? 'sent' : 'received',
        raw_data: message,
      }).catch(err => console.error('[Pipeline] Enqueue error:', err.message));

      // Enqueue AI analysis (runs in background, not on every message)
      enqueueMessage(workspaceId, 'analyze_conversation', {
        phone_number: phoneNumber,
        workspace_id: workspaceId,
      }).catch(err => console.error('[Pipeline] Enqueue analyze error:', err.message));
    }

    // Apenas processar leads para mensagens recebidas
    if (isFromMe) {
      return; // Mensagem enviada por nós, não precisa processar lead
    }

    // Processar mensagem com Sofia para usuários cadastrados
    if (messageText) {
      try {
        // Buscar configuração do agente para esta instância
        const agentConfig = await getAgentConfig(workspaceId, data.instance);

        // Verificar se agente está ativo
        if (agentConfig && !agentConfig.isActive) {
          console.log(`[Sofia] Agent disabled for instance: ${data.instance}`);
          // Não processa automaticamente, mas ainda registra
          return;
        }

        // Verificar horário de funcionamento
        if (agentConfig && !isWithinBusinessHours(agentConfig)) {
          console.log(`[Sofia] Outside business hours for instance: ${data.instance}`);
          // Enviar mensagem de fora do horário
          if (agentConfig.outOfHoursMessage) {
            await sendTextMessage(data.instance, {
              number: phoneNumber,
              text: agentConfig.outOfHoursMessage,
            });
          }
          return;
        }

        // Verificar palavras de escalação
        if (agentConfig && shouldEscalate(agentConfig, messageText)) {
          console.log(`[Sofia] Escalation triggered for message from: ${phoneNumber}`);
          // Enviar mensagem de escalação e não processar automaticamente
          if (agentConfig.escalationMessage) {
            await sendTextMessage(data.instance, {
              number: phoneNumber,
              text: agentConfig.escalationMessage,
            });
          }
          // Log escalação
          await logConversation(workspaceId, {
            agentConfigId: agentConfig.id,
            instanceName: data.instance,
            phoneNumber,
            messageReceived: messageText,
            wasEscalated: true,
            escalationReason: 'keyword_match',
          });
          return;
        }

        // ============================================
        // VERIFICAR SE É CONVIDADO DE EVENTO
        // ============================================
        const eventoContext = await buscarConvidadoPorTelefone(workspaceId, phoneNumber);

        if (eventoContext && deveUsarFluxoEventos(eventoContext)) {
          console.log(`[Eventos] Processando mensagem de convidado: ${eventoContext.convidado.nome}`);

          // Verificar se Sofia está ativa para este evento
          if (!eventoContext.evento.com_sofia) {
            console.log(`[Eventos] Sofia desativada para evento ${eventoContext.evento.id} - apenas salvando mensagem`);
            // Apenas log a conversa se agentConfig existe, mas não responde
            if (agentConfig) {
              await logConversation(workspaceId, {
                agentConfigId: agentConfig.id,
                instanceName: data.instance,
                phoneNumber,
                messageReceived: messageText,
                responseSent: false,
              });
            }
            return; // Não processa automaticamente
          }

          // Processa a mensagem no contexto de evento
          const resultado = await processarMensagemConvidado(messageText, eventoContext);

          if (resultado.resposta) {
            // Envia resposta direta (confirmação, resposta automática, etc)
            await sendTextMessage(data.instance, {
              number: phoneNumber,
              text: resultado.resposta,
            });

            console.log(`[Eventos] Resposta enviada para ${phoneNumber}:`, {
              novoStatus: resultado.novoStatus,
              categoria: resultado.categoria,
              atualizouStatus: resultado.atualizouStatus,
            });
          } else {
            // Sofia responde livremente com contexto do evento
            const user = await findUserByPhone(phoneNumber, workspaceId);

            if (user) {
              // Passa contexto do evento para Sofia processar
              await withProvider('evolution', data.instance, () =>
                processSofiaMessage(
                  user as any,
                  messageText,
                  agentConfig || undefined,
                  {
                    eventoContext,
                    eventoPrompt: gerarSofiaEventoPrompt(eventoContext.evento, eventoContext.convidado.status),
                  }
                )
              );
            } else {
              // Convidado não é usuário cadastrado, mas é convidado de evento
              // Responde com base no contexto do evento
              await sendTextMessage(data.instance, {
                number: phoneNumber,
                text: `Oi! Vi que você é convidado do *${eventoContext.evento.nome}*. Posso te ajudar com alguma dúvida sobre o evento?`,
              });
            }
          }

          // Log conversa de evento
          if (agentConfig) {
            await logConversation(workspaceId, {
              agentConfigId: agentConfig.id,
              instanceName: data.instance,
              phoneNumber,
              messageReceived: messageText,
              responseSent: true,
            });
          }

          return; // Mensagem tratada pelo fluxo de eventos
        }
        // ============================================
        // FIM DO FLUXO DE EVENTOS
        // ============================================

        const user = await findUserByPhone(phoneNumber, workspaceId);

        if (user) {
          console.log(`[Sofia] Processing message for user: ${user.nome}`);

          // Process with Sofia (sends response internally)
          // Pass agentConfig to customize response based on tenant configuration
          await withProvider('evolution', data.instance, () =>
            processSofiaMessage(user as any, messageText, agentConfig || undefined)
          );

          console.log(`[Sofia] Message processed for ${phoneNumber}`);

          // Log conversa
          if (agentConfig) {
            await logConversation(workspaceId, {
              agentConfigId: agentConfig.id,
              instanceName: data.instance,
              phoneNumber,
              messageReceived: messageText,
              responseSent: true,
            });
          }
        } else {
          // Handle unregistered user (handles response internally)
          console.log(`[Sofia] Unregistered user: ${phoneNumber}`);
          await withProvider('evolution', data.instance, () =>
            handleUnregisteredUserConversation(phoneNumber, messageText)
          );
        }
      } catch (error) {
        console.error('[Sofia] Error processing message:', error);
      }
    }

    // Query helper para operações de tenant
    const query = tenantQuery(workspaceId);

    // Verificar se existe lead com este telefone
    const leads = await query.select('cvcrm_leads', { telefone: phoneNumber });

    if (leads.length > 0) {
      const lead = leads[0];
      console.log(`[Message] Matched to lead: ${lead.nome} (${lead.id_lead})`);

      // Criar interação no CV CRM
      try {
        await query.insert('cvcrm_leads_interacoes', {
          id_lead: lead.id_lead,
          tipo: 'whatsapp',
          titulo: 'Mensagem WhatsApp Recebida',
          descricao: messageText,
          data: timestamp.toISOString(),
          contato: phoneNumber,
          origem: 'whatsapp_auto',
          metadata: JSON.stringify({
            instance_name: data.instance,
            message_type: messageType,
            phone_number: phoneNumber,
          }),
        });

        console.log(`[Message] Interaction created for lead ${lead.id_lead}`);
      } catch (error) {
        console.error('[Message] Error creating interaction:', error);
      }
    } else {
      console.log(`[Message] No lead found for phone: ${phoneNumber}`);

      // Salvar como contato potencial
      try {
        // Atualizar ou criar contato WhatsApp
        const existingContacts = await query.select('whatsapp_contacts', {
          phone_number: phoneNumber,
        });

        if (existingContacts.length > 0) {
          await query.update(
            'whatsapp_contacts',
            { phone_number: phoneNumber },
            {
              last_message_at: timestamp.toISOString(),
              total_messages: (existingContacts[0].total_messages || 0) + 1,
            }
          );
        } else {
          await query.insert('whatsapp_contacts', {
            workspace_id: workspaceId,
            instance_name: data.instance,
            phone_number: phoneNumber,
            contact_name: phoneNumber,
            last_message_at: timestamp.toISOString(),
            total_messages: 1,
          });
        }

        console.log(`[Message] Contact created/updated for ${phoneNumber}`);
      } catch (error) {
        console.error('[Message] Error managing contact:', error);
      }
    }
  } catch (error) {
    console.error('[Handle Message] Error:', error);
  }
}

/**
 * Verificar se mensagem deve ser tratada pelo Salva-Leads
 */
async function handleSalvaLeadsCheck(
  workspaceId: number,
  phoneNumber: string,
  messageText: string,
  isFromMe: boolean,
  instanceName: string
): Promise<boolean> {
  // Verificar se há conversa Salva-Leads ativa para este telefone
  const salvaLeadsConv = await getConversationByPhone(workspaceId, phoneNumber);

  if (!salvaLeadsConv || !['pending', 'active'].includes(salvaLeadsConv.status)) {
    return false; // Não há conversa ativa, continuar fluxo normal
  }

  // Se corretor enviou mensagem -> pausar bot
  if (isFromMe) {
    await pauseBot(salvaLeadsConv.id);
    console.log(`[Salva-Leads] Bot pausado pelo corretor para ${phoneNumber}`);
    return true;
  }

  // Se bot está pausado, não processar
  if (salvaLeadsConv.bot_paused) {
    console.log(`[Salva-Leads] Bot pausado, ignorando mensagem de ${phoneNumber}`);
    return false;
  }

  // Cliente respondeu -> processar com debounce
  await handleSalvaLeadsResponse(workspaceId, salvaLeadsConv, messageText, instanceName);
  return true;
}

/**
 * Processar resposta do cliente no Salva-Leads com debounce
 *
 * Estrategia de debounce:
 * 1. Cada mensagem e adicionada ao pending_messages (Redis + PostgreSQL)
 * 2. debounce_until e atualizado para NOW + 10s
 * 3. Mensagens NAO sao processadas imediatamente
 * 4. Um cron job separado (/api/salva-leads/process-debounced) processa
 *    conversas onde debounce_until ja expirou
 *
 * ARQUITETURA HÍBRIDA:
 * - Redis: Cache rápido para debounce (TTL automático, contagem eficiente)
 * - PostgreSQL: Fonte de verdade (persistência, queries complexas)
 *
 * Isso permite que mensagens rapidas em sequencia sejam combinadas
 * em uma unica resposta do bot.
 */
async function handleSalvaLeadsResponse(
  workspaceId: number,
  conversation: any, // SalvaLeadsConversation
  message: string,
  _instanceName: string
) {
  // Contexto para Redis
  const context = {
    workspaceId,
    phone: conversation.lead_phone,
  };

  // Debounce: acumular mensagens (Redis + PostgreSQL)
  const { isFirst, count } = await appendPendingMessage(
    conversation.id,
    message,
    context
  );

  const debounceUntil = new Date(Date.now() + 10000); // 10 segundos
  await setDebounceUntil(conversation.id, debounceUntil);

  console.log(`[Salva-Leads] Mensagem ${count} acumulada para conversa ${conversation.id}${isFirst ? ' (primeira)' : ''}, debounce ate ${debounceUntil.toISOString()}`);

  // NAO processar imediatamente - o cron /api/salva-leads/process-debounced
  // vai processar quando o debounce expirar
}

/**
 * Handle message update (read receipts, etc)
 */
async function handleMessageUpdate(workspaceId: number, data: any) {
  try {
    const updates = data.data;

    if (!updates || !Array.isArray(updates)) {
      return;
    }

    const query = tenantQuery(workspaceId);

    for (const update of updates) {
      const messageId = update.key?.id;
      const status = update.update?.status; // 'DELIVERY_ACK' | 'READ' | 'PLAYED'

      if (!messageId || !status) continue;

      const statusMap: Record<string, string> = {
        'DELIVERY_ACK': 'delivered',
        'READ': 'read',
        'PLAYED': 'read',
        'ERROR': 'failed',
      };

      const newStatus = statusMap[status] || status.toLowerCase();

      console.log(`[Message Update] ${messageId} -> ${newStatus}`);

      await query.update(
        'whatsapp_messages',
        { message_id: messageId },
        { status: newStatus }
      );
    }
  } catch (error) {
    console.error('[Handle Message Update] Error:', error);
  }
}
