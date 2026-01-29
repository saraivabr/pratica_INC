/**
 * Script standalone para atualizar webhooks das instâncias Evolution
 *
 * Versão que não depende de módulos Next.js
 *
 * Executar: npx tsx scripts/update-evolution-webhooks-standalone.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
const WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL não configurado');
  process.exit(1);
}

if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
  console.error('ERRO: EVOLUTION_BASE_URL ou EVOLUTION_API_KEY não configurados');
  process.exit(1);
}

if (!WEBHOOK_BASE_URL) {
  console.error('ERRO: WEBHOOK_BASE_URL não configurado');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
});

interface EvolutionInstance {
  instance?: {
    instanceName: string;
    status: string;
  };
}

async function evolutionFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${EVOLUTION_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
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
}

async function fetchInstances(): Promise<EvolutionInstance[]> {
  return evolutionFetch<EvolutionInstance[]>('/instance/fetchInstances', {
    method: 'GET',
  });
}

interface WebhookConfig {
  url: string;
  webhook_by_events?: boolean;
  webhook_base64?: boolean;
  events?: string[];
  headers?: Record<string, string>;
}

async function setWebhook(instanceName: string, config: WebhookConfig): Promise<void> {
  // Evolution API v2 requires the config wrapped in a "webhook" object
  await evolutionFetch(`/webhook/set/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: config.url,
        webhookByEvents: config.webhook_by_events ?? false,
        webhookBase64: config.webhook_base64 ?? false,
        events: config.events || [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
        // Note: Evolution API v2 does not support custom headers
      },
    }),
  });
}

async function main() {
  console.log('=== Atualizando Webhooks das Instâncias Evolution ===\n');
  console.log(`EVOLUTION_BASE_URL: ${EVOLUTION_BASE_URL}`);
  console.log(`WEBHOOK_BASE_URL: ${WEBHOOK_BASE_URL}`);
  console.log(`WEBHOOK_SECRET: ${WEBHOOK_SECRET ? '***configurado***' : 'NÃO CONFIGURADO'}\n`);

  try {
    // 1. Buscar todas as instâncias da Evolution API
    console.log('Buscando instâncias da Evolution API...');
    const instances = await fetchInstances();
    console.log(`Encontradas ${instances.length} instâncias\n`);

    if (instances.length === 0) {
      console.log('Nenhuma instância encontrada.');
      return;
    }

    // 2. Buscar mapeamento instância -> tenant do banco
    const { rows: users } = await pool.query(`
      SELECT id, evolution_instance_name, tenant_id
      FROM users
      WHERE evolution_instance_name IS NOT NULL
    `);

    const instanceToTenant = new Map<string, number>();
    const userIdToTenant = new Map<string, number>();

    for (const user of users) {
      if (user.evolution_instance_name) {
        instanceToTenant.set(user.evolution_instance_name, user.tenant_id);
      }
      userIdToTenant.set(String(user.id), user.tenant_id);
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
        let tenantId = instanceToTenant.get(instanceName);

        if (!tenantId) {
          // Tentar extrair do nome da instância (formato: corretor-{userId}-{timestamp})
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
          console.log(`⚠ ${instanceName}: tenant_id não encontrado, pulando...`);
          skipped++;
          continue;
        }

        // Montar URL do webhook
        const webhookUrl = `${WEBHOOK_BASE_URL}/api/webhook/evolution/${tenantId}`;

        // Atualizar webhook
        console.log(`📌 ${instanceName}: Atualizando webhook...`);

        // Evolution API v2 não suporta headers customizados em webhooks
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
