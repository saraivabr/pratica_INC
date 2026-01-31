/**
 * API: Iniciar Sessão WhatsApp (via Evolution API)
 *
 * POST /api/whatsapp/session/start
 *
 * Cria ou reconecta instância WhatsApp usando Evolution API diretamente.
 * PRIORIZA PAIRING CODE quando o telefone do usuário está disponível.
 * Isso permite que o usuário conecte digitando um código de 8 dígitos
 * diretamente no WhatsApp, sem precisar escanear QR Code.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { updateWorkspace, findUserWorkspace, createTenant } from "@/lib/tenant-context";
import { dbQuery } from "@/lib/db";
import {
  createInstance,
  getQRCode,
  getPairingCode,
  getConnectionStatus,
  deleteInstance,
  setWebhook,
} from "@/lib/evolution-api";
import { validateRequest, WhatsAppSessionStartSchema } from "@/lib/validation-schemas";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado. Faça login novamente." }, { status: 401 });
    }

    // Verificar se é uma nova conexão (deletar instância existente)
    let freshConnection = false;
    const validation = await validateRequest(request, WhatsAppSessionStartSchema);
    if (validation.success) {
      freshConnection = validation.data.freshConnection;
    }
    // Body vazio ou inválido: continua normalmente com freshConnection = false

    // Buscar tenant do usuário
    let tenant = await findUserWorkspace(user);

    // Se nao encontrou tenant, criar um novo COM imobiliaria
    if (!tenant) {
      const userId = (user as any).id;
      const userName = (user as any).nome || 'Usuario';

      console.log(`[WhatsApp] Usuario ${userId} sem tenant. Criando tenant e imobiliaria...`);

      try {
        // 1. Criar tenant primeiro
        tenant = await createTenant({
          slug: `user-${userId}-${Date.now()}`,
          name: userName,
          cvcrm_config: {
            base_url: '',
            email: '',
            tokens: {}
          },
          plan: 'free'
        });

        console.log(`[WhatsApp] Tenant ${tenant.id} criado: ${tenant.name}`);

        // 2. Criar imobiliaria vinculada ao tenant
        const imobResult = await dbQuery(
          `INSERT INTO imobiliarias (nome, workspace_id, is_active, created_at)
           VALUES ($1, $2, true, NOW())
           RETURNING id`,
          [userName, tenant.id]
        );

        const newImobiliariaId = imobResult.rows[0]?.id;
        console.log(`[WhatsApp] Imobiliaria ${newImobiliariaId} criada e vinculada ao tenant ${tenant.id}`);

        // 3. Atualizar usuario com imobiliaria_id E workspace_id
        await dbQuery(
          `UPDATE users
           SET imobiliaria_id = $1, workspace_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [newImobiliariaId, tenant.id, userId]
        );

        console.log(`[WhatsApp] Usuario ${userId} vinculado ao tenant ${tenant.id} e imobiliaria ${newImobiliariaId}`);

      } catch (createError: any) {
        console.error('[WhatsApp] Erro ao criar tenant/imobiliaria:', createError);
        return NextResponse.json({
          error: "Erro ao configurar sua empresa. Tente novamente.",
          details: createError.message
        }, { status: 500 });
      }
    }

    if (!tenant) {
      return NextResponse.json({
        error: "Nao foi possivel identificar ou criar sua empresa.",
        details: "Entre em contato com o suporte tecnico."
      }, { status: 400 });
    }

    const workspaceId = tenant.id;

    // Obter telefone do usuário para pairing code
    const userPhone = (user as any).telefone || (user as any).phone || (user as any).celular;

    // Log de aviso se usuário não tem telefone cadastrado
    if (!userPhone) {
      console.warn(`[WhatsApp] Usuário ${(user as any).id} sem telefone cadastrado. Pairing code não estará disponível, apenas QR Code.`);
    }

    // Verificar se já existe instância para este tenant
    const instances = tenant.evolution_instances || [];
    let instance = instances[0];
    let instanceName = instance?.instance_name;

    // Se freshConnection=true, deletar instância existente para criar uma nova
    if (freshConnection && instanceName) {
      console.log(`[WhatsApp] Deletando instância existente: ${instanceName}`);
      try {
        await deleteInstance(instanceName);
        console.log(`[WhatsApp] Instância ${instanceName} deletada com sucesso`);
      } catch (deleteError: any) {
        console.error(`[WhatsApp] Erro ao deletar instância:`, deleteError);
        // Continuar mesmo se falhar a deleção
      }
      // Limpar referência para forçar criação de nova instância
      instance = undefined as any;
      instanceName = undefined as any;
      // Limpar instâncias salvas no tenant
      await updateWorkspace(workspaceId, { evolution_instances: [] });
    }

    // Se não existe instância, criar uma nova
    // Usar ID do usuário no nome para identificar a quem pertence
    // IMPORTANTE: Manter formato consistente: corretor-{userId}-{timestamp}
    // Este formato é usado pelo regex em handleConnectionUpdate do webhook
    const userId = (user as any).id;
    if (!instanceName) {
      instanceName = `corretor-${userId}-${Date.now()}`;

      // Determinar URL base para webhooks dinamicamente
      // 1. Usa WEBHOOK_BASE_URL se configurado (mais confiável)
      // 2. Usa NEXT_PUBLIC_APP_URL se configurado
      // 3. Detecta dinamicamente do request (host + protocolo)
      // 4. Fallback para localhost apenas em desenvolvimento local real
      let baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

      if (!baseUrl) {
        const host = request.headers.get('host') || request.headers.get('x-forwarded-host');
        const proto = request.headers.get('x-forwarded-proto') ||
                      (host?.includes('localhost') ? 'http' : 'https');

        if (host && !host.includes('localhost')) {
          baseUrl = `${proto}://${host}`;
        } else {
          baseUrl = 'http://localhost:3000';

          // Validação em produção: não permitir localhost
          if (process.env.NODE_ENV === 'production') {
            console.error('[WhatsApp] CRÍTICO: WEBHOOK_BASE_URL não configurado em produção! Webhooks não funcionarão corretamente.');
            return NextResponse.json(
              { error: 'Configuração de webhook inválida. Contate o administrador.' },
              { status: 500 }
            );
          }
        }
      }

      const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
      const webhookUrl = webhookSecret
        ? `${baseUrl}/api/webhook/evolution/${workspaceId}?secret=${webhookSecret}`
        : `${baseUrl}/api/webhook/evolution/${workspaceId}`;
      console.log(`[WhatsApp] Webhook URL configurado: ${baseUrl}/api/webhook/evolution/${workspaceId}`);

      try {
        // Criar instância na Evolution API
        // Se temos o telefone do usuário, passar para habilitar pairing code
        console.log(`[WhatsApp] Criando instância ${instanceName} com telefone: ${userPhone || 'não informado'}`);

        // Evolution API v2.3+: criar instância SEM webhook inline
        await createInstance({
          instanceName,
          number: userPhone, // Telefone para pairing code
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          reject_call: false,
          groups_ignore: true,
          always_online: false,
          read_messages: false,
        });

        // Evolution API v2.3+: configurar webhook SEPARADAMENTE após criação
        try {
          await setWebhook(instanceName, {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: [
              'MESSAGES_UPSERT',
              'MESSAGES_UPDATE',
              'CONNECTION_UPDATE',
              'QRCODE_UPDATED',
            ],
          });
          console.log(`[WhatsApp] Webhook configurado: ${webhookUrl}`);
        } catch (whError: any) {
          console.error(`[WhatsApp] Erro ao configurar webhook:`, whError.message);
        }

        // Salvar nova instância no tenant
        const newInstance = {
          instance_name: instanceName,
          display_name: `WhatsApp ${tenant.name || tenant.slug}`,
          qr_code: undefined as string | undefined,
          pairing_code: undefined as string | undefined,
          status: 'connecting',
          created_at: new Date().toISOString(),
          webhook_url: webhookUrl,
          settings: {
            reject_call: false,
            groups_ignore: true,
            always_online: false,
            read_messages: false,
          },
        };

        await updateWorkspace(workspaceId, {
          evolution_instances: [newInstance as any],
        });

        // Salvar instância também no registro do usuário (para Salva-Leads)
        await dbQuery(
          `UPDATE users SET evolution_instance_name = $1, updated_at = NOW() WHERE id = $2`,
          [instanceName, userId]
        );
        console.log(`[WhatsApp] Instância ${instanceName} salva no usuário ${userId}`);

        instance = newInstance as any;
      } catch (createError: any) {
        console.error("Error creating Evolution instance:", createError);
        return NextResponse.json(
          { error: "Erro ao criar instância WhatsApp: " + createError.message },
          { status: 500 }
        );
      }
    }

    // Verificar status atual da conexão
    try {
      const connectionStatus = await getConnectionStatus(instanceName);

      if (connectionStatus.state === 'open') {
        return NextResponse.json({
          status: "ready",
          pairedPhone: userPhone || null,
          deviceName: null,
          instanceName,
        });
      }
    } catch (statusError) {
      console.log("Instance status check failed, may need to recreate");
    }

    // PRIORIZAR PAIRING CODE quando temos o telefone do usuário
    let qrCode: string | null = null;
    let pairingCode: string | null = null;

    // Obter QR Code primeiro (sempre disponível)
    try {
      const qrData = await getQRCode(instanceName);
      qrCode = qrData?.code || qrData?.base64 || null;
      // Pairing code pode vir junto com o QR
      if (qrData?.pairingCode && qrData.pairingCode.length === 8 && /^\d+$/.test(qrData.pairingCode)) {
        pairingCode = qrData.pairingCode;
      }
      console.log(`QR Code obtained, pairingCode from QR: ${pairingCode ? 'yes' : 'no'}`);
    } catch (qrError: any) {
      console.error("Error getting QR code:", qrError);
    }

    // Tentar obter pairing code separadamente (se temos o telefone e ainda não temos pairing code)
    if (userPhone && !pairingCode) {
      try {
        console.log(`[WhatsApp] Requesting pairing code for phone: ${userPhone}`);
        const pairingData = await getPairingCode(instanceName, userPhone);
        console.log(`[WhatsApp] Pairing API response:`, JSON.stringify(pairingData, null, 2));

        // Pairing code deve ser exatamente 8 dígitos
        const receivedCode = pairingData?.pairingCode;
        if (receivedCode && receivedCode.length === 8 && /^\d+$/.test(receivedCode)) {
          pairingCode = receivedCode;
          console.log(`[WhatsApp] Pairing code generated successfully: ${pairingCode.slice(0,4)}****`);
        } else {
          console.log(`[WhatsApp] Invalid pairing code format. Received:`, JSON.stringify(pairingData));
        }
      } catch (pairingError: any) {
        // Log detalhado do erro para debugging
        console.error("[WhatsApp] Error getting pairing code:", {
          message: pairingError.message || pairingError,
          phone: userPhone,
          instance: instanceName,
          stack: pairingError.stack?.split('\n').slice(0, 3).join('\n'),
        });
        // Continua sem pairing code - QR Code já está disponível como fallback
      }
    } else if (!userPhone) {
      console.log(`[WhatsApp] No user phone available for pairing code`);
    }

    // Salvar ambos os códigos no tenant
    if (qrCode || pairingCode) {
      const updatedInstances = instances.length > 0
        ? instances.map((inst: any) => {
            if (inst.instance_name === instanceName) {
              return {
                ...inst,
                qr_code: qrCode,
                pairing_code: pairingCode,
                status: 'connecting'
              };
            }
            return inst;
          })
        : [{
            ...instance,
            qr_code: qrCode,
            pairing_code: pairingCode,
            status: 'connecting',
          }];

      await updateWorkspace(workspaceId, {
        evolution_instances: updatedInstances,
      });
    }

    // Determinar o melhor status baseado no que conseguimos
    let status: string = "connecting";
    if (pairingCode) {
      status = "pairing";
    } else if (qrCode) {
      status = "qr";
    }

    return NextResponse.json({
      status,
      qr: qrCode,
      pairingCode,
      userPhone: userPhone || null,
      instanceName,
      channelId: `poll-${workspaceId}-${Date.now()}`,
    });

  } catch (error: any) {
    console.error("WhatsApp start error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar sessão: " + (error.message || "Erro desconhecido") },
      { status: 500 }
    );
  }
}
