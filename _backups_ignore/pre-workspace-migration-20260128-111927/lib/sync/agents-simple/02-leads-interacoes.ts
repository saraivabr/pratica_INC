/**
 * Agent 02: Leads Interações
 *
 * Syncs: /api/v1/cv/leads_interacoes
 * Records: ~35.305
 * Table: cvcrm_leads_interacoes
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { getLeadsInteracoes, getAllRecords } from '../cvcrm-api-simple';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface InteracaoData {
  idinteracao: number;
  idlead: number;
  referencia: string;
  referencia_data: string;
  ativo: string;
  tipo: string;
  descricao: string;
  data_cad: string;
  situacao: string;
  enviar_corretor: string;
  enviar_imobiliaria: string;
  enviar_cliente: string;
  idimobiliaria: number;
  imobiliaria: string;
  idcorretor: number;
  corretor: string;
  idgestor: number;
  gestor_interacao: string;
  corretor_interacao: string;
  imobiliaria_interacao: string;
}

export async function syncLeadsInteracoes(tenantId: number, fullSync = false): Promise<void> {
  console.log(`\n🔄 Starting Leads Interações Sync (Tenant ${tenantId})...`);
  console.log('=' .repeat(60));

  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;

  try {
    // Log start
    const logResult = await pool.query(
      `INSERT INTO cvcrm_sync_logs (agent_name, table_name, tenant_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['leads-interacoes', 'cvcrm_leads_interacoes', tenantId, 'running']
    );
    const logId = logResult.rows[0].id;

    // Fetch all interações
    console.log('\n📥 Fetching interações from CV CRM API...');

    const interacoes = await getAllRecords<InteracaoData>(
      getLeadsInteracoes,
      (current, total) => {
        process.stdout.write(`\r  Progress: ${current}/${total} interações`);
      }
    );

    console.log(`\n✅ Fetched ${interacoes.length} interações\n`);

    // Prepare upsert query
    const upsertQuery = `
      INSERT INTO cvcrm_leads_interacoes (
        tenant_id, idinteracao, idlead, referencia, referencia_data,
        ativo, tipo, descricao, data_cad, situacao,
        enviar_corretor, enviar_imobiliaria, enviar_cliente,
        idimobiliaria, imobiliaria,
        idcorretor, corretor,
        idgestor, gestor_interacao, corretor_interacao, imobiliaria_interacao,
        synced_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13,
        $14, $15,
        $16, $17,
        $18, $19, $20, $21,
        NOW()
      )
      ON CONFLICT (tenant_id, idinteracao) DO UPDATE SET
        idlead = EXCLUDED.idlead,
        referencia = EXCLUDED.referencia,
        referencia_data = EXCLUDED.referencia_data,
        ativo = EXCLUDED.ativo,
        tipo = EXCLUDED.tipo,
        descricao = EXCLUDED.descricao,
        data_cad = EXCLUDED.data_cad,
        situacao = EXCLUDED.situacao,
        enviar_corretor = EXCLUDED.enviar_corretor,
        enviar_imobiliaria = EXCLUDED.enviar_imobiliaria,
        enviar_cliente = EXCLUDED.enviar_cliente,
        idimobiliaria = EXCLUDED.idimobiliaria,
        imobiliaria = EXCLUDED.imobiliaria,
        idcorretor = EXCLUDED.idcorretor,
        corretor = EXCLUDED.corretor,
        idgestor = EXCLUDED.idgestor,
        gestor_interacao = EXCLUDED.gestor_interacao,
        corretor_interacao = EXCLUDED.corretor_interacao,
        imobiliaria_interacao = EXCLUDED.imobiliaria_interacao,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    // Insert/Update interações
    console.log('💾 Saving to database...');

    for (const interacao of interacoes) {
      try {
        const result = await pool.query(upsertQuery, [
          tenantId,
          interacao.idinteracao,
          interacao.idlead,
          interacao.referencia,
          interacao.referencia_data,
          interacao.ativo,
          interacao.tipo,
          interacao.descricao,
          interacao.data_cad,
          interacao.situacao,
          interacao.enviar_corretor,
          interacao.enviar_imobiliaria,
          interacao.enviar_cliente,
          interacao.idimobiliaria,
          interacao.imobiliaria,
          interacao.idcorretor,
          interacao.corretor,
          interacao.idgestor,
          interacao.gestor_interacao,
          interacao.corretor_interacao,
          interacao.imobiliaria_interacao
        ]);

        recordsProcessed++;

        if (result.rows[0].inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Progress every 100 records
        if (recordsProcessed % 100 === 0) {
          process.stdout.write(`\r  Processed: ${recordsProcessed}/${interacoes.length}`);
        }

      } catch (error) {
        console.error(`\n❌ Error processing interação ${interacao.idinteracao}:`, error);
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
  const tenantId = process.argv[2] ? parseInt(process.argv[2]) : 1;
  console.log(`Running sync for tenant_id: ${tenantId}\n`);

  syncLeadsInteracoes(tenantId, true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
