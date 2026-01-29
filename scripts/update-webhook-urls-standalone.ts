/**
 * Script standalone para atualizar URLs de webhook Evolution API
 * workspace_id baseado (não usa lib/db.ts)
 * 
 * Execute: node --loader tsx/esm scripts/update-webhook-urls-standalone.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EvolutionWebhookConfig {
  url: string;
  webhook_by_events?: boolean;
  webhook_base64?: boolean;
  events?: string[];
}

async function setWebhook(instanceName: string, config: EvolutionWebhookConfig) {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://evoapi.pratica.digital';
  const apiKey = process.env.EVOLUTION_API_KEY!;

  const response = await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('🔄 Atualizando URLs de webhook Evolution API...\n');

  const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  
  if (!baseUrl) {
    console.error('❌ WEBHOOK_BASE_URL ou NEXT_PUBLIC_APP_URL não configurado!');
    process.exit(1);
  }

  // Buscar todos os workspaces com instância Evolution
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('id, owner_id, name, evolution_instance_name, evolution_connected')
    .not('evolution_instance_name', 'is', null);

  if (error) {
    console.error('❌ Erro ao buscar workspaces:', error);
    process.exit(1);
  }

  console.log(`📊 Encontrados ${workspaces?.length || 0} workspaces com Evolution API\n`);

  for (const workspace of workspaces || []) {
    const instanceName = workspace.evolution_instance_name;
    const workspaceId = workspace.id;
    const newWebhookUrl = `${baseUrl}/api/webhook/evolution/${workspaceId}`;

    console.log(`\n🔧 Workspace ${workspaceId} (${workspace.name})`);
    console.log(`   Instance: ${instanceName}`);
    console.log(`   Nova URL: ${newWebhookUrl}`);

    try {
      await setWebhook(instanceName, {
        url: newWebhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      });

      console.log(`   ✅ Webhook atualizado com sucesso`);
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }

  console.log('\n✅ Atualização concluída!');
}

main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
