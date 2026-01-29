/**
 * Script para atualizar URLs de webhook Evolution API
 * tenant_id → workspace_id
 * 
 * Execute: tsx scripts/update-webhook-urls.ts
 */

import { dbQuery } from '../lib/db';
import { setWebhook, fetchInstances } from '../lib/evolution-api';

async function main() {
  console.log('🔄 Atualizando URLs de webhook Evolution API...\n');

  const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  
  if (!baseUrl) {
    console.error('❌ WEBHOOK_BASE_URL ou NEXT_PUBLIC_APP_URL não configurado!');
    process.exit(1);
  }

  // Buscar todos os workspaces com instância Evolution
  const { rows } = await dbQuery(
    `SELECT id, owner_id, name, evolution_instance_name, evolution_connected
     FROM workspaces
     WHERE evolution_instance_name IS NOT NULL`
  );

  console.log(`📊 Encontrados ${rows.length} workspaces com Evolution API\n`);

  for (const workspace of rows) {
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
