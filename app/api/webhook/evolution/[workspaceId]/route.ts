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
import { getWorkspace, updateWorkspace, tenantQuery } from '@/lib/tenant-context';
import {
  getConversationByPhone,
  pauseBot,
  appendPendingMessage,
  setDebounceUntil,
  addMessage,
  updateContext,
} from '@/lib/salva-leads/conversation';
import {
  scheduleSilenceTimer,
  cancelSilenceTimer,
  getCorretorConfig,
  isWithinBusinessHours as isWithinSilenceBusinessHours,
  isEmojiOrStickerOnly,
  isLunaAlreadyActive,
  findCorretorByInstance,
  incrementConfigCounter,
} from '@/lib/salva-leads/silence-monitor';
import { generateConversationSummary } from '@/lib/salva-leads/summary';
import { sendTextMessage } from '@/lib/evolution-api';
import {
  processMessage as processSofiaMessage,
  handleUnregisteredUserConversation,
} from '@/lib/sofia';
import { dbQuery } from '@/lib/db';
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
import { emitNewMessage, emitConnectionUpdate } from '@/lib/message-events';
import { isAudioMessage, extractAudioMessage, transcribeWhatsAppAudio } from '@/lib/whisper';

/**
 * Valida autenticação do webhook.
 * Aceita:
 * - Authorization: Bearer {secret}
 * - x-webhook-secret: {secret}
 * Em desenvolvimento, aceita qualquer request.
 */
function validateWebhookAuth(request: NextRequest): boolean {
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;

  // Em desenvolvimento sem secret configurado, aceitar todos
  if (process.env.NODE_ENV === 'development' && !webhookSecret) {
    return true;
  }

  // Se secret não está configurado em produção, logar aviso mas aceitar
  // (para não quebrar integrações existentes durante migração)
  if (!webhookSecret) {
    console.warn('[Webhook Evolution] AVISO: EVOLUTION_WEBHOOK_SECRET não configurado. Configurar para segurança em produção.');
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
      return data;
    }
  }

  // Try LIKE search with last 9 digits
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
  }

  return data;
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
  const userIdMatch = instanceName?.match(/^corretor-(\d+)-/);
  if (userIdMatch) {
    const userId = userIdMatch[1];
    await dbQuery(
      `UPDATE users SET evolution_connected = $1, updated_at = NOW() WHERE id = $2`,
      [isConnected, userId]
    );
    console.log(`[Connection Update] User ${userId} evolution_connected = ${isConnected}`);
  } else {
    // Fallback: buscar usuário pelo nome da instância
    await dbQuery(
      `UPDATE users SET evolution_connected = $1, updated_at = NOW() WHERE evolution_instance_name = $2`,
      [isConnected, instanceName]
    );
    console.log(`[Connection Update] Updated users with instance ${instanceName} -> connected = ${isConnected}`);
  }

  console.log(`[Connection Update] Instance: ${instanceName}, State: ${state}, Connected: ${isConnected}`);
  
  // Emitir evento SSE
  emitConnectionUpdate(instanceName, isConnected ? 'connected' : 'disconnected');
}

/**
 * Handle new message (integração com CV CRM e Salva-Leads)
 */
async function handleNewMessage(workspaceId: number, data: any) {
  try {
    const message = data.data;
    const isFromMe = message.key?.fromMe || false;

    // Extrair dados da mensagem — resolver LID para telefone real
    const remoteJid = message.key?.remoteJid || '';
    const remoteJidAlt = message.key?.remoteJidAlt || '';
    
    // 🔍 LOGGING TEMPORÁRIO: Captura grupos pra configuração
    if (remoteJid.endsWith('@g.us')) {
      const participantJid = message.key?.participant || '';
      const messageText = message.message?.conversation ||
                         message.message?.extendedTextMessage?.text ||
                         '';
      console.log('📱 GRUPO DETECTADO (Evolution):', {
        groupId: remoteJid,
        participantJid,
        messageText,
        isFromMe,
        pushName: message.pushName,
        timestamp: new Date().toISOString(),
      });
      
      // Por enquanto, ignora grupos (será configurado depois)
      return;
    }
    
    let phoneNumber: string;
    
    if (remoteJid.includes('@s.whatsapp.net')) {
      phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
    } else if (remoteJidAlt.includes('@s.whatsapp.net')) {
      phoneNumber = remoteJidAlt.replace('@s.whatsapp.net', '');
    } else if (remoteJid.includes('@lid') && remoteJidAlt) {
      phoneNumber = remoteJidAlt.split('@')[0];
    } else {
      phoneNumber = remoteJid.split('@')[0];
    }
    
    let messageText = message.message?.conversation ||
                      message.message?.extendedTextMessage?.text ||
                      '';

    const messageType = Object.keys(message.message || {})[0];
    const timestamp = new Date(message.messageTimestamp * 1000);

    // ✅ NOVA FEATURE: Transcrição de Áudio com Whisper
    if (isAudioMessage(message)) {
      try {
        console.log('[Webhook] Audio message detected, transcribing...');
        const audioMessage = extractAudioMessage(message);
        const transcription = await transcribeWhatsAppAudio(data.instance, audioMessage);
        messageText = `[Áudio transcrito]: ${transcription.text}`;
        console.log('[Webhook] Audio transcribed:', messageText.substring(0, 100));
      } catch (error: any) {
        console.error('[Webhook] Audio transcription failed:', error);
        messageText = '[Áudio recebido - erro na transcrição]';
      }
    }

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
    const messageId = message.key?.id;
    const contactName = message.pushName || phoneNumber;
    if (messageId) {
      await dbQuery(
        `INSERT INTO whatsapp_messages (
          tenant_id, instance_name, phone_number, message_id, contact_name, message_type,
          message_text, is_from_me, timestamp, raw_data, workspace_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $1)
        ON CONFLICT (instance_name, message_id)
        DO UPDATE SET
          phone_number = EXCLUDED.phone_number,
          updated_at = NOW(),
          raw_data = EXCLUDED.raw_data`,
        [
          workspaceId,
          data.instance,
          phoneNumber,
          messageId,
          contactName,
          messageType,
          messageText,
          isFromMe,
          timestamp.toISOString(),
          JSON.stringify(message),
        ]
      );
    }
    
    // Emitir evento SSE pra atualização real-time no frontend
    emitNewMessage(data.instance, {
      phone_number: phoneNumber,
      contact_name: contactName,
      message_text: messageText,
      message_type: messageType,
      is_from_me: isFromMe,
      timestamp: timestamp.toISOString(),
      status: 'received',
    });

    // === CataVendas AI Bot ===
    // Check if sender is a registered corretor messaging the main instance
    if (!isFromMe && messageText) {
      try {
        const corretor = await dbQuery(
          `SELECT id, name, nome, evolution_instance_name, telefone, phone, workspace_id
           FROM users WHERE (telefone = $1 OR phone = $1) AND role = 'corretor' LIMIT 1`,
          [phoneNumber]
        );
        
        if (corretor.rows.length > 0) {
          console.log(`[CataVendas] Message from corretor ${phoneNumber}, routing to CataVendas`);
          const { processCataVendasMessage } = await import('@/lib/catavendas');
          await processCataVendasMessage(
            data.instance, // the instance that received the message  
            phoneNumber,
            messageText, 
            workspaceId,
            corretor.rows[0]
          );
          return; // Handled by CataVendas, stop processing
        }
      } catch (err) {
        console.error('[CataVendas] Error:', err);
      }
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
              await processSofiaMessage(
                user as any,
                messageText,
                agentConfig || undefined,
                {
                  eventoContext,
                  eventoPrompt: gerarSofiaEventoPrompt(eventoContext.evento, eventoContext.convidado.status),
                }
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
          await processSofiaMessage(user as any, messageText, agentConfig || undefined);

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
          await handleUnregisteredUserConversation(phoneNumber, messageText);
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
      console.log(`[Message] Matched to lead: ${lead.nome} (${lead.idlead})`);

      // Criar interação no CV CRM
      try {
        await query.insert('cvcrm_leads_interacoes', {
          idlead: lead.idlead,
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

        console.log(`[Message] Interaction created for lead ${lead.idlead}`);
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
              total_messages_received: existingContacts[0].total_messages_received + 1,
            }
          );
        } else {
          await query.insert('whatsapp_contacts', {
            phone_number: phoneNumber,
            contact_name: phoneNumber,
            last_message_at: timestamp.toISOString(),
            total_messages_received: 1,
            total_messages_sent: 0,
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

  // === SILENCE MONITOR INTEGRATION ===
  if (isFromMe) {
    // Corretor sent a message -> cancel any silence timer for this lead
    await cancelSilenceTimer(workspaceId, phoneNumber);

    if (salvaLeadsConv && ['pending', 'active'].includes(salvaLeadsConv.status)) {
      // If Luna was active via silence takeover, generate summary
      if (salvaLeadsConv.silence_takeover && !salvaLeadsConv.bot_paused) {
        await handleCorretorReturn(workspaceId, salvaLeadsConv, instanceName);
      }

      await pauseBot(salvaLeadsConv.id);
      console.log(`[Salva-Leads] Bot pausado pelo corretor para ${phoneNumber}`);
      return true;
    }
    return false;
  }

  // Lead sent a message
  if (!isFromMe) {
    // If there's an active salva-leads conversation with Luna
    if (salvaLeadsConv && ['pending', 'active'].includes(salvaLeadsConv.status)) {
      if (salvaLeadsConv.bot_paused) {
        // Bot is paused (corretor is handling), but we should schedule silence timer
        // in case corretor stops responding again
        await scheduleTimerIfNeeded(workspaceId, phoneNumber, messageText, instanceName);
        return false;
      }

      // Luna is active - process with debounce
      await handleSalvaLeadsResponse(workspaceId, salvaLeadsConv, messageText, instanceName);
      return true;
    }

    // No active salva-leads conversation - schedule silence timer
    // This is the key new behavior: when lead messages and there's no Luna active,
    // start a timer to check if corretor responds
    await scheduleTimerIfNeeded(workspaceId, phoneNumber, messageText, instanceName);
  }

  return false;
}

/**
 * Schedule a silence timer if conditions are met.
 * Called when lead sends message and no Luna conversation is active.
 */
async function scheduleTimerIfNeeded(
  workspaceId: number,
  phoneNumber: string,
  messageText: string,
  instanceName: string
): Promise<void> {
  try {
    // Don't trigger for emoji/sticker-only messages
    if (isEmojiOrStickerOnly(messageText)) return;

    // Find the corretor who owns this instance
    const corretor = await findCorretorByInstance(instanceName);
    if (!corretor) return;

    // Get corretor's config
    const config = await getCorretorConfig(corretor.id);

    // Check if auto-assistant is enabled
    if (!config.autoAssistantEnabled) return;

    // Check business hours
    if (!isWithinSilenceBusinessHours(config)) return;

    // Check if Luna is already active for this lead
    const alreadyActive = await isLunaAlreadyActive(workspaceId, phoneNumber);
    if (alreadyActive) return;

    // Get lead name from contacts if available
    const { rows: contactRows } = await dbQuery(
      `SELECT contact_name FROM whatsapp_contacts WHERE tenant_id = $1 AND phone_number = $2 LIMIT 1`,
      [workspaceId, phoneNumber]
    );
    const leadName = contactRows[0]?.contact_name || null;

    const now = Date.now();
    const timeoutMs = config.silenceTimeoutMinutes * 60 * 1000;

    await scheduleSilenceTimer({
      workspaceId,
      leadPhone: phoneNumber,
      leadName,
      corretorId: corretor.id,
      corretorPhone: corretor.telefone,
      instanceName,
      messageText,
      createdAt: now,
      timeoutMinutes: config.silenceTimeoutMinutes,
      expiresAt: now + timeoutMs,
    });
  } catch (error) {
    console.error('[Silence Monitor] Error scheduling timer:', error);
  }
}

/**
 * Handle corretor returning while Luna was handling a silence takeover.
 * Generates summary and notifies corretor.
 */
async function handleCorretorReturn(
  workspaceId: number,
  conversation: any,
  instanceName: string
): Promise<void> {
  try {
    // Get messages exchanged during Luna's takeover
    const lunaMessages = (conversation.messages || []).filter((m: any) => {
      if (!conversation.silence_takeover_at) return true;
      return new Date(m.timestamp) >= new Date(conversation.silence_takeover_at);
    });

    if (lunaMessages.length === 0) return;

    // Generate summary
    const summary = await generateConversationSummary(lunaMessages);

    // Save summary to conversation context
    await updateContext(conversation.id, {
      lunaSummary: summary,
      corretorResumedAt: new Date().toISOString(),
    });

    // Update DB fields
    await dbQuery(
      `UPDATE salva_leads_conversations
       SET luna_summary = $1, corretor_resumed_at = NOW()
       WHERE id = $2`,
      [summary, conversation.id]
    );

    // Send internal notification to corretor via WhatsApp (from the same instance)
    // This is a message the corretor sees in the same chat
    const leadName = conversation.lead_name || 'lead';
    const notificationMsg = `📋 *Resumo da assistente:*\n\n${summary}\n\n_A assistente segurou a conversa com ${leadName} enquanto você estava ocupado._`;

    // Note: We don't send this as a WhatsApp message to avoid confusion.
    // Instead, it's available in the dashboard. The corretor sees the conversation
    // messages naturally in WhatsApp.

    console.log(`[Silence Monitor] Corretor returned. Summary for conv ${conversation.id}: ${summary}`);

    // Increment leads saved counter
    await incrementConfigCounter(conversation.corretor_id, workspaceId, 'total_leads_saved');
  } catch (error) {
    console.error('[Silence Monitor] Error handling corretor return:', error);
  }
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
