/**
 * Agent 03: Leads Tarefas
 *
 * Syncs: /api/v1/comercial/leads/tarefas
 * Records: ~8.182
 * Table: cvcrm_leads_tarefas
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { getLeadsTarefas, getAllRecords } from '../cvcrm-api-simple';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface TarefaData {
  idtarefa: number;
  idlead: number | null;
  responsavel: string;
  tipo_responsavel: string;
  idusuario: number;
  idcorretor: number;
  idimobiliaria: number;
  nome: string;
  descricao: string;
  tipo: string;
  data_cad: string;
  data: string;
  data_vencimento: string;
  data_conclusao: string | null;
  data_cancelamento: string | null;
  situacao: string;
  nota_conclusao: string | null;
  observacao: string | null;
}

export async function syncLeadsTarefas(workspaceId: number, fullSync = false): Promise<void> {
  console.log(`\n🔄 Starting Leads Tarefas Sync (Tenant ${workspaceId})...`);
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
      ['leads-tarefas', 'cvcrm_leads_tarefas', workspaceId, 'running']
    );
    const logId = logResult.rows[0].id;

    // Fetch all tarefas
    console.log('\n📥 Fetching tarefas from CV CRM API...');

    const tarefas = await getAllRecords<TarefaData>(
      getLeadsTarefas,
      (current, total) => {
        process.stdout.write(`\r  Progress: ${current}/${total} tarefas`);
      }
    );

    console.log(`\n✅ Fetched ${tarefas.length} tarefas\n`);

    // Prepare upsert query
    const upsertQuery = `
      INSERT INTO cvcrm_leads_tarefas (
        workspace_id, idtarefa, idlead,
        responsavel, tipo_responsavel,
        idusuario, idcorretor, idimobiliaria,
        nome, descricao, tipo,
        data_cad, data, data_vencimento, data_conclusao, data_cancelamento,
        situacao, nota_conclusao, observacao,
        synced_at
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        $6, $7, $8,
        $9, $10, $11,
        $12, $13, $14, $15, $16,
        $17, $18, $19,
        NOW()
      )
      ON CONFLICT (workspace_id, idtarefa) DO UPDATE SET
        idlead = EXCLUDED.idlead,
        responsavel = EXCLUDED.responsavel,
        tipo_responsavel = EXCLUDED.tipo_responsavel,
        idusuario = EXCLUDED.idusuario,
        idcorretor = EXCLUDED.idcorretor,
        idimobiliaria = EXCLUDED.idimobiliaria,
        nome = EXCLUDED.nome,
        descricao = EXCLUDED.descricao,
        tipo = EXCLUDED.tipo,
        data_cad = EXCLUDED.data_cad,
        data = EXCLUDED.data,
        data_vencimento = EXCLUDED.data_vencimento,
        data_conclusao = EXCLUDED.data_conclusao,
        data_cancelamento = EXCLUDED.data_cancelamento,
        situacao = EXCLUDED.situacao,
        nota_conclusao = EXCLUDED.nota_conclusao,
        observacao = EXCLUDED.observacao,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    // Insert/Update tarefas
    console.log('💾 Saving to database...');

    for (const tarefa of tarefas) {
      try {
        const result = await pool.query(upsertQuery, [
          workspaceId,
          tarefa.idtarefa,
          tarefa.idlead,
          tarefa.responsavel,
          tarefa.tipo_responsavel,
          tarefa.idusuario,
          tarefa.idcorretor,
          tarefa.idimobiliaria,
          tarefa.nome,
          tarefa.descricao,
          tarefa.tipo,
          tarefa.data_cad,
          tarefa.data,
          tarefa.data_vencimento,
          tarefa.data_conclusao,
          tarefa.data_cancelamento,
          tarefa.situacao,
          tarefa.nota_conclusao,
          tarefa.observacao
        ]);

        recordsProcessed++;

        if (result.rows[0].inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Progress every 100 records
        if (recordsProcessed % 100 === 0) {
          process.stdout.write(`\r  Processed: ${recordsProcessed}/${tarefas.length}`);
        }

      } catch (error) {
        console.error(`\n❌ Error processing tarefa ${tarefa.idtarefa}:`, error);
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

  syncLeadsTarefas(workspaceId, true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
