/**
 * Agent 05: Assistências Core
 *
 * Syncs: /api/v1/relacionamento/assistencias
 * Records: ~1
 * Table: cvcrm_assistencias
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { getAssistencias, getAllRecords } from '../cvcrm-api-simple';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface AssistenciaData {
  idassistencia: number;
  situacao: string;
  idsituacao: number;
  idatendimento: number;
  protocolo_atendimento: string;
  cadastro: string;
  sla_assistencia_vencido: boolean;
}

export async function syncAssistenciasCore(workspaceId: number, fullSync = false): Promise<void> {
  console.log(`\n🔄 Starting Assistências Core Sync (Tenant ${workspaceId})...`);
  console.log('=' .repeat(60));

  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  try {
    // Log start
    const logResult = await pool.query(
      `INSERT INTO cvcrm_sync_logs (agent_name, table_name, workspace_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['assistencias-core', 'cvcrm_assistencias', workspaceId, 'running']
    );
    const logId = logResult.rows[0].id;

    // Fetch all assistências
    console.log('\n📥 Fetching assistências from CV CRM API...');

    const assistencias = await getAllRecords<AssistenciaData>(
      getAssistencias,
      (current, total) => {
        process.stdout.write(`\r  Progress: ${current}/${total} assistências`);
      }
    );

    console.log(`\n✅ Fetched ${assistencias.length} assistências\n`);

    // Prepare upsert query
    const upsertQuery = `
      INSERT INTO cvcrm_assistencias (
        workspace_id, idassistencia, situacao, idsituacao,
        idatendimento, protocolo_atendimento,
        cadastro, sla_assistencia_vencido,
        synced_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8,
        NOW()
      )
      ON CONFLICT (workspace_id, idassistencia) DO UPDATE SET
        situacao = EXCLUDED.situacao,
        idsituacao = EXCLUDED.idsituacao,
        idatendimento = EXCLUDED.idatendimento,
        protocolo_atendimento = EXCLUDED.protocolo_atendimento,
        cadastro = EXCLUDED.cadastro,
        sla_assistencia_vencido = EXCLUDED.sla_assistencia_vencido,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    // Insert/Update assistências
    console.log('💾 Saving to database...');

    for (const assistencia of assistencias) {
      try {
        const result = await pool.query(upsertQuery, [
          workspaceId,
          assistencia.idassistencia,
          assistencia.situacao,
          assistencia.idsituacao,
          assistencia.idatendimento,
          assistencia.protocolo_atendimento,
          assistencia.cadastro,
          assistencia.sla_assistencia_vencido
        ]);

        recordsProcessed++;

        if (result.rows[0].inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Progress every 10 records (small dataset)
        if (recordsProcessed % 10 === 0) {
          process.stdout.write(`\r  Processed: ${recordsProcessed}/${assistencias.length}`);
        }

      } catch (error) {
        console.error(`\n❌ Error processing assistência ${assistencia.idassistencia}:`, error);
      }
    }

    console.log(`\n\n✅ Sync completed!`);
    console.log(`  Total processed: ${recordsProcessed}`);
    console.log(`  Created: ${recordsCreated}`);
    console.log(`  Updated: ${recordsUpdated}`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  Duration: ${duration}s`);

    // Update log
    await pool.query(
      `UPDATE cvcrm_sync_logs
       SET status = $1, completed_at = NOW(),
           records_processed = $2, records_created = $3, records_updated = $4
       WHERE id = $5`,
      ['completed', recordsProcessed, recordsCreated, recordsUpdated, logId]
    );

    console.log('=' .repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// Allow running directly
if (require.main === module) {
  const workspaceId = process.argv[2] ? parseInt(process.argv[2]) : 1;
  console.log(`Running sync for workspace_id: ${workspaceId}\n`);

  syncAssistenciasCore(workspaceId, true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
