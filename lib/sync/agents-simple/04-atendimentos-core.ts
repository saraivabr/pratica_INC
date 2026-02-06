/**
 * Agent 04: Atendimentos Core
 *
 * Syncs: /api/v1/relacionamento/atendimentos
 * Records: ~1.558
 * Tables: cvcrm_atendimentos + cvcrm_atendimentos_arquivos
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { getAtendimentos, getAllRecords } from '../cvcrm-api-simple';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface ArquivoData {
  idarquivo: number;
  nome: string;
  servidor: string;
  tipo: string;
  tamanho: number;
  data_cad: string;
  url: string;
}

interface AtendimentoData {
  idatendimento: number;
  nome: string;
  email: string;
  telefone: string;
  documento: string;
  titulo: string;
  descricao: string;
  tipo: string;
  classificacao: string;
  prioridade: string;
  humor_cliente: string;
  nota_atendimento: string;
  idsituacao: number;
  situacao: string;
  data_cad: string;
  data_ultima_modificacao_situacao: string;
  ultima_interacao: string;
  idassunto: number;
  assunto: string;
  idsubassunto: number;
  subassunto: string;
  sla_assunto: number;
  data_vencimento_assunto: string;
  sla_subassunto: number;
  data_vencimento_subassunto: string;
  sla_workflow: number;
  data_vencimento_workflow: string;
  tempo_resposta: number;
  tempo_finalizado: number;
  idassistencia: number;
  imobiliaria: string;
  corretor: string;
  idresponsavel: number;
  responsavel: string;
  ids_unidades: number;
  unidades: string;
  idbloco: number;
  bloco: string;
  empreendimento: { idempreendimento: number; nome: string };
  campos_adicionais: any[];
  arquivos?: ArquivoData[];
}

export async function syncAtendimentosCore(workspaceId: number, fullSync = false): Promise<void> {
  console.log(`\n🔄 Starting Atendimentos Core Sync (Tenant ${workspaceId})...`);
  console.log('=' .repeat(60));

  const startTime = Date.now();
  let recordsProcessed = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let arquivosProcessed = 0;

  try {
    // Log start
    const logResult = await pool.query(
      `INSERT INTO cvcrm_sync_logs (agent_name, table_name, workspace_id, status)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      ['atendimentos-core', 'cvcrm_atendimentos', workspaceId, 'running']
    );
    const logId = logResult.rows[0].id;

    // Fetch all atendimentos
    console.log('\n📥 Fetching atendimentos from CV CRM API...');

    const atendimentos = await getAllRecords<AtendimentoData>(
      getAtendimentos,
      (current, total) => {
        process.stdout.write(`\r  Progress: ${current}/${total} atendimentos`);
      }
    );

    console.log(`\n✅ Fetched ${atendimentos.length} atendimentos\n`);

    // Prepare upsert query
    const upsertQuery = `
      INSERT INTO cvcrm_atendimentos (
        workspace_id, id_atendimento, nome, email, telefone, documento,
        titulo, descricao, tipo, classificacao, prioridade,
        humor_cliente, nota_atendimento,
        id_situacao, situacao,
        data_cad, data_ultima_modificacao_situacao, ultima_interacao,
        id_assunto, assunto, id_subassunto, subassunto,
        sla_assunto, data_vencimento_assunto,
        sla_subassunto, data_vencimento_subassunto,
        sla_workflow, data_vencimento_workflow,
        tempo_resposta, tempo_finalizado,
        id_assistencia, imobiliaria, corretor,
        id_responsavel, responsavel,
        ids_unidades, unidades, id_bloco, bloco,
        empreendimento, id_empreendimento,
        campos_adicionais,
        synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $13,
        $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24,
        $25, $26,
        $27, $28,
        $29, $30,
        $31, $32, $33,
        $34, $35,
        $36, $37, $38, $39,
        $40, $41,
        $42,
        NOW()
      )
      ON CONFLICT (workspace_id, id_atendimento) DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        documento = EXCLUDED.documento,
        titulo = EXCLUDED.titulo,
        descricao = EXCLUDED.descricao,
        tipo = EXCLUDED.tipo,
        classificacao = EXCLUDED.classificacao,
        prioridade = EXCLUDED.prioridade,
        humor_cliente = EXCLUDED.humor_cliente,
        nota_atendimento = EXCLUDED.nota_atendimento,
        id_situacao = EXCLUDED.id_situacao,
        situacao = EXCLUDED.situacao,
        data_cad = EXCLUDED.data_cad,
        data_ultima_modificacao_situacao = EXCLUDED.data_ultima_modificacao_situacao,
        ultima_interacao = EXCLUDED.ultima_interacao,
        id_assunto = EXCLUDED.id_assunto,
        assunto = EXCLUDED.assunto,
        id_subassunto = EXCLUDED.id_subassunto,
        subassunto = EXCLUDED.subassunto,
        sla_assunto = EXCLUDED.sla_assunto,
        data_vencimento_assunto = EXCLUDED.data_vencimento_assunto,
        sla_subassunto = EXCLUDED.sla_subassunto,
        data_vencimento_subassunto = EXCLUDED.data_vencimento_subassunto,
        sla_workflow = EXCLUDED.sla_workflow,
        data_vencimento_workflow = EXCLUDED.data_vencimento_workflow,
        tempo_resposta = EXCLUDED.tempo_resposta,
        tempo_finalizado = EXCLUDED.tempo_finalizado,
        id_assistencia = EXCLUDED.id_assistencia,
        imobiliaria = EXCLUDED.imobiliaria,
        corretor = EXCLUDED.corretor,
        id_responsavel = EXCLUDED.id_responsavel,
        responsavel = EXCLUDED.responsavel,
        ids_unidades = EXCLUDED.ids_unidades,
        unidades = EXCLUDED.unidades,
        id_bloco = EXCLUDED.id_bloco,
        bloco = EXCLUDED.bloco,
        empreendimento = EXCLUDED.empreendimento,
        id_empreendimento = EXCLUDED.id_empreendimento,
        campos_adicionais = EXCLUDED.campos_adicionais,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    // Insert/Update atendimentos
    console.log('💾 Saving to database...');

    for (const atendimento of atendimentos) {
      try {
        const result = await pool.query(upsertQuery, [
          workspaceId,
          atendimento.idatendimento,
          atendimento.nome,
          atendimento.email,
          atendimento.telefone,
          atendimento.documento,
          atendimento.titulo,
          atendimento.descricao,
          atendimento.tipo,
          atendimento.classificacao,
          atendimento.prioridade,
          atendimento.humor_cliente,
          atendimento.nota_atendimento,
          atendimento.idsituacao,
          atendimento.situacao,
          atendimento.data_cad,
          atendimento.data_ultima_modificacao_situacao,
          atendimento.ultima_interacao,
          atendimento.idassunto,
          atendimento.assunto,
          atendimento.idsubassunto,
          atendimento.subassunto,
          atendimento.sla_assunto,
          atendimento.data_vencimento_assunto,
          atendimento.sla_subassunto,
          atendimento.data_vencimento_subassunto,
          atendimento.sla_workflow,
          atendimento.data_vencimento_workflow,
          atendimento.tempo_resposta,
          atendimento.tempo_finalizado,
          atendimento.idassistencia,
          atendimento.imobiliaria,
          atendimento.corretor,
          atendimento.idresponsavel,
          atendimento.responsavel,
          atendimento.ids_unidades,
          atendimento.unidades,
          atendimento.idbloco,
          atendimento.bloco,
          atendimento.empreendimento ? JSON.stringify(atendimento.empreendimento) : null,
          atendimento.empreendimento?.idempreendimento,
          atendimento.campos_adicionais ? JSON.stringify(atendimento.campos_adicionais) : null
        ]);

        recordsProcessed++;

        if (result.rows[0].inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Sync arquivos if present
        if (atendimento.arquivos && atendimento.arquivos.length > 0) {
          // Delete old arquivos first
          await pool.query(
            'DELETE FROM cvcrm_atendimentos_arquivos WHERE workspace_id = $1 AND id_atendimento = $2',
            [workspaceId, atendimento.idatendimento]
          );

          // Insert new arquivos
          for (const arquivo of atendimento.arquivos) {
            await pool.query(
              `INSERT INTO cvcrm_atendimentos_arquivos (
                workspace_id, id_atendimento, id_arquivo, nome, servidor, tipo, tamanho, data_cad, url
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                workspaceId,
                atendimento.idatendimento,
                arquivo.idarquivo,
                arquivo.nome,
                arquivo.servidor,
                arquivo.tipo,
                arquivo.tamanho,
                arquivo.data_cad,
                arquivo.url
              ]
            );
            arquivosProcessed++;
          }
        }

        // Progress every 100 records
        if (recordsProcessed % 100 === 0) {
          process.stdout.write(`\r  Processed: ${recordsProcessed}/${atendimentos.length}`);
        }

      } catch (error) {
        console.error(`\n❌ Error processing atendimento ${atendimento.idatendimento}:`, error);
      }
    }

    console.log(`\n\n✅ Sync completed!`);
    console.log(`  Total processed: ${recordsProcessed}`);
    console.log(`  Created: ${recordsCreated}`);
    console.log(`  Updated: ${recordsUpdated}`);
    console.log(`  Arquivos: ${arquivosProcessed}`);

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

  syncAtendimentosCore(workspaceId, true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
