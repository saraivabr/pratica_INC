/**
 * Script minimalista para atualizar URLs de webhook Evolution API
 * Usa apenas fetch nativo
 * 
 * Execute: pnpm exec tsx scripts/update-webhooks-simple.ts
 */

// Carregar variáveis de ambiente
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'https://evoapi.pratica.digital';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY!;
const BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://185.182.184.122:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variáveis de ambiente Supabase não configuradas!');
  process.exit(1);
}

if (!BASE_URL) {
  console.error('❌ WEBHOOK_BASE_URL ou NEXT_PUBLIC_APP_URL não configurado!');
  process.exit(1);
}

if (!EVOLUTION_API_KEY) {
  console.error('❌ EVOLUTION_API_KEY não configurado!');
  process.exit(1);
}

interface Workspace {
  id: number;
  name: string;
  evolution_instance_name: string;
  evolution_connected: boolean;
}

async function fetchWorkspaces(): Promise<Workspace[]> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/workspaces?select=id,name,evolution_instance_name,evolution_connected&evolution_instance_name=not.is.null`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Erro ao buscar workspaces: ${response.statusText}`);
  }

  return await response.json();
}

async function updateWebhook(instanceName: string, workspaceId: number) {
  const webhookUrl = `${BASE_URL}/api/webhook/evolution/${workspaceId}`;

  const response = await fetch(
    `${EVOLUTION_API_URL}/webhook/set/${instanceName}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔄 Atualizando URLs de webhook Evolution API...\n');

  const workspaces = await fetchWorkspaces();
  console.log(`📊 Encontrados ${workspaces.length} workspaces com Evolution API\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const workspace of workspaces) {
    const { id, name, evolution_instance_name } = workspace;
    const newWebhookUrl = `${BASE_URL}/api/webhook/evolution/${id}`;

    console.log(`\n🔧 Workspace ${id} (${name})`);
    console.log(`   Instance: ${evolution_instance_name}`);
    console.log(`   Nova URL: ${newWebhookUrl}`);

    try {
      await updateWebhook(evolution_instance_name, id);
      console.log(`   ✅ Webhook atualizado`);
      successCount++;
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log('\n✅ Atualização concluída!');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
