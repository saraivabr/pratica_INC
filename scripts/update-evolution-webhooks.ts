/**
 * Script para atualizar webhooks das instâncias Evolution existentes
 *
 * Adiciona o header de autenticação (EVOLUTION_WEBHOOK_SECRET) aos webhooks
 * de instâncias que foram criadas antes dessa configuração existir.
 *
 * Executar: npx tsx scripts/update-evolution-webhooks.ts
 */

import { setWebhook, getWebhook, fetchInstances } from '../lib/evolution-api';
import pool from '../lib/db';

const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

async function main() {
  console.log('=== Atualizando Webhooks das Instâncias Evolution ===\n');

  if (!WEBHOOK_BASE_URL) {
    console.error('ERRO: WEBHOOK_BASE_URL não configurado');
    process.exit(1);
  }

  if (!WEBHOOK_SECRET) {
    console.warn('AVISO: EVOLUTION_WEBHOOK_SECRET não configurado - webhooks não terão autenticação');
  }

  try {
    // 1. Buscar todas as instâncias da Evolution API
    console.log('Buscando instâncias da Evolution API...');
    const instances = await fetchInstances();
    console.log(`Encontradas ${instances.length} instâncias\n`);

    // 2. Buscar mapeamento instância -> tenant do banco
    const { rows: users } = await pool.query(`
      SELECT evolution_instance_name, tenant_id
      FROM users
      WHERE evolution_instance_name IS NOT NULL
    `);

    const instanceToTenant = new Map<string, number>();
    for (const user of users) {
      if (user.evolution_instance_name) {
        instanceToTenant.set(user.evolution_instance_name, user.tenant_id);
      }
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // 3. Atualizar cada instância
    for (const instance of instances) {
      const instanceName = instance.instance?.instanceName;
      if (!instanceName) {
        console.log(`⚠ Instância sem nome, pulando...`);
        skipped++;
        continue;
      }

      try {
        // Buscar tenant_id do usuário
        const tenantId = instanceToTenant.get(instanceName);

        if (!tenantId) {
          // Tentar extrair do nome da instância (formato: corretor-{userId}-{timestamp})
          const match = instanceName.match(/^corretor-(\d+)-/);
          if (match) {
            const userId = match[1];
            const { rows } = await pool.query(
              'SELECT tenant_id FROM users WHERE id = $1',
              [userId]
            );
            if (rows[0]?.tenant_id) {
              instanceToTenant.set(instanceName, rows[0].tenant_id);
            }
          }
        }

        const finalTenantId = instanceToTenant.get(instanceName);

        if (!finalTenantId) {
          console.log(`⚠ ${instanceName}: tenant_id não encontrado, pulando...`);
          skipped++;
          continue;
        }

        // Montar URL do webhook (com secret se configurado)
        const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
        const webhookUrl = webhookSecret
          ? `${WEBHOOK_BASE_URL}/api/webhook/evolution/${finalTenantId}?secret=${webhookSecret}`
          : `${WEBHOOK_BASE_URL}/api/webhook/evolution/${finalTenantId}`;

        // Atualizar webhook
        console.log(`📌 ${instanceName}: Atualizando webhook...`);

        // Evolution API v2 não suporta headers customizados em webhooks
        // A autenticação é feita via tenant_id na URL
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

        console.log(`   ✅ Webhook atualizado: ${webhookUrl}`);
        updated++;

      } catch (error: any) {
        console.log(`   ❌ Erro: ${error.message}`);
        errors++;
      }
    }

    // 4. Resumo
    console.log('\n=== Resumo ===');
    console.log(`Total de instâncias: ${instances.length}`);
    console.log(`Atualizadas: ${updated}`);
    console.log(`Puladas: ${skipped}`);
    console.log(`Erros: ${errors}`);

  } catch (error) {
    console.error('Erro fatal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
