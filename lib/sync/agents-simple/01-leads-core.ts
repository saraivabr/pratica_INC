/**
 * Agent 01: Leads Core
 *
 * Syncs: /api/v1/comercial/leads
 * Records: ~19.642
 * Table: cvcrm_leads
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';
import { getLeads, getAllRecords } from '../cvcrm-api-simple';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

interface LeadData {
  idlead: number;
  gestor: { id: number | null; nome: string | null; email: string | null };
  imobiliaria: { id: number; nome: string };
  corretor: { id: number; nome: string; email: string };
  situacao: { id: number; nome: string };
  nome: string;
  email: string;
  telefone: string;
  score: number;
  data_cad: string;
  midia_principal: string;
  documento_tipo: string;
  documento: string | null;
  sexo: string | null;
  renda_familiar: string | null;
  valor_negocio: string;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  complemento: string | null;
  estado: string | null;
  cidade: string | null;
  profissao: string | null;
  origem: string;
  data_reativacao: string | null;
  data_vencimento: string | null;
  ultima_data_conversao: string;
  codigointerno: number | null;
  possibilidade_venda: number | null;
  empreendimento: Array<{ id: number; nome: string }>;
  midias: string[];
  tags?: string[];
  data_cancelamento?: string | null;
  motivo_cancelamento?: any;
  submotivo_cancelamento?: any;
  data_venda?: string | null;
  campos_adicionais?: any[];
  interacao?: any[];
  tarefa?: any[];
  valor_venda?: string;
  autor_ultima_alteracao: string | null;
  qtde_simulacoes_associadas: number;
  qtde_reservas_associadas: number;
  link_interacoes: string;
  link_simulacoes: string;
  link_reservas: string;
  link_interesses: string;
  idrd_station?: string;
  link_rdstation?: string;
  empreendimentosId: string;
}

export async function syncLeadsCore(workspaceId: number, fullSync = false): Promise<void> {
  console.log(`\n🔄 Starting Leads Core Sync (Tenant ${workspaceId})...`);
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
      ['leads-core', 'cvcrm_leads', workspaceId, 'running']
    );
    const logId = logResult.rows[0].id;

    // Fetch all leads
    console.log('\n📥 Fetching leads from CV CRM API...');

    const leads = await getAllRecords<LeadData>(
      getLeads,
      (current, total) => {
        process.stdout.write(`\r  Progress: ${current}/${total} leads`);
      }
    );

    console.log(`\n✅ Fetched ${leads.length} leads\n`);

    // Prepare upsert query
    // JSONB columns removed: corretor, gestor, imobiliaria, empreendimento,
    // situacao, midias, tags, motivo_cancelamento, submotivo_cancelamento, empreendimentos
    // Kept: campos_adicionais (has data), cvcrm_data (raw API response)
    // Added: situacao_nome (normalized from situacao JSONB)
    const upsertQuery = `
      INSERT INTO cvcrm_leads (
        workspace_id, id_lead, codigo_interno, nome, email, telefone,
        documento_tipo, documento, sexo, profissao,
        cep, endereco, numero, bairro, complemento, cidade, estado,
        score, renda_familiar, valor_negocio, possibilidade_venda,
        origem, midia_principal,
        gestor_id, imobiliaria_id, corretor_id,
        situacao_id, situacao_nome,
        data_cad, data_reativacao, data_vencimento, ultima_data_conversao,
        data_cancelamento, data_venda,
        qtde_simulacoes_associadas, qtde_reservas_associadas,
        link_interacoes, link_simulacoes, link_reservas, link_interesses,
        id_rd_station, link_rdstation,
        campos_adicionais, autor_ultima_alteracao, empreendimentos_id,
        synced_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23,
        $24, $25, $26,
        $27, $28,
        $29, $30, $31, $32,
        $33, $34,
        $35, $36,
        $37, $38, $39, $40,
        $41, $42,
        $43, $44, $45,
        NOW()
      )
      ON CONFLICT (workspace_id, id_lead) DO UPDATE SET
        codigo_interno = EXCLUDED.codigo_interno,
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        documento_tipo = EXCLUDED.documento_tipo,
        documento = EXCLUDED.documento,
        sexo = EXCLUDED.sexo,
        profissao = EXCLUDED.profissao,
        cep = EXCLUDED.cep,
        endereco = EXCLUDED.endereco,
        numero = EXCLUDED.numero,
        bairro = EXCLUDED.bairro,
        complemento = EXCLUDED.complemento,
        cidade = EXCLUDED.cidade,
        estado = EXCLUDED.estado,
        score = EXCLUDED.score,
        renda_familiar = EXCLUDED.renda_familiar,
        valor_negocio = EXCLUDED.valor_negocio,
        possibilidade_venda = EXCLUDED.possibilidade_venda,
        origem = EXCLUDED.origem,
        midia_principal = EXCLUDED.midia_principal,
        gestor_id = EXCLUDED.gestor_id,
        imobiliaria_id = EXCLUDED.imobiliaria_id,
        corretor_id = EXCLUDED.corretor_id,
        situacao_id = EXCLUDED.situacao_id,
        situacao_nome = EXCLUDED.situacao_nome,
        data_cad = EXCLUDED.data_cad,
        data_reativacao = EXCLUDED.data_reativacao,
        data_vencimento = EXCLUDED.data_vencimento,
        ultima_data_conversao = EXCLUDED.ultima_data_conversao,
        data_cancelamento = EXCLUDED.data_cancelamento,
        data_venda = EXCLUDED.data_venda,
        qtde_simulacoes_associadas = EXCLUDED.qtde_simulacoes_associadas,
        qtde_reservas_associadas = EXCLUDED.qtde_reservas_associadas,
        link_interacoes = EXCLUDED.link_interacoes,
        link_simulacoes = EXCLUDED.link_simulacoes,
        link_reservas = EXCLUDED.link_reservas,
        link_interesses = EXCLUDED.link_interesses,
        id_rd_station = EXCLUDED.id_rd_station,
        link_rdstation = EXCLUDED.link_rdstation,
        campos_adicionais = EXCLUDED.campos_adicionais,
        autor_ultima_alteracao = EXCLUDED.autor_ultima_alteracao,
        empreendimentos_id = EXCLUDED.empreendimentos_id,
        synced_at = NOW(),
        updated_at = NOW()
      RETURNING (xmax = 0) AS inserted
    `;

    // Insert/Update leads
    console.log('💾 Saving to database...');

    for (const lead of leads) {
      try {
        // Parse valores decimais
        const rendaFamiliar = lead.renda_familiar
          ? parseFloat(lead.renda_familiar.replace(',', '.'))
          : null;

        const valorNegocio = lead.valor_negocio
          ? parseFloat(lead.valor_negocio.replace(/\./g, '').replace(',', '.'))
          : null;

        const result = await pool.query(upsertQuery, [
          workspaceId,                                                              // $1
          lead.idlead,                                                              // $2
          lead.codigointerno,                                                       // $3
          lead.nome,                                                                // $4
          lead.email,                                                               // $5
          lead.telefone,                                                            // $6
          lead.documento_tipo,                                                      // $7
          lead.documento,                                                           // $8
          lead.sexo,                                                                // $9
          lead.profissao,                                                           // $10
          lead.cep,                                                                 // $11
          lead.endereco,                                                            // $12
          lead.numero,                                                              // $13
          lead.bairro,                                                              // $14
          lead.complemento,                                                         // $15
          lead.cidade,                                                              // $16
          lead.estado,                                                              // $17
          lead.score,                                                               // $18
          rendaFamiliar,                                                            // $19
          valorNegocio,                                                             // $20
          lead.possibilidade_venda,                                                 // $21
          lead.origem,                                                              // $22
          lead.midia_principal,                                                     // $23
          lead.gestor?.id,                                                          // $24
          lead.imobiliaria?.id,                                                     // $25
          lead.corretor?.id,                                                        // $26
          lead.situacao?.id,                                                        // $27
          lead.situacao?.nome,                                                      // $28
          lead.data_cad,                                                            // $29
          lead.data_reativacao,                                                     // $30
          lead.data_vencimento,                                                     // $31
          lead.ultima_data_conversao,                                               // $32
          lead.data_cancelamento,                                                   // $33
          lead.data_venda,                                                          // $34
          lead.qtde_simulacoes_associadas,                                          // $35
          lead.qtde_reservas_associadas,                                            // $36
          lead.link_interacoes,                                                     // $37
          lead.link_simulacoes,                                                     // $38
          lead.link_reservas,                                                       // $39
          lead.link_interesses,                                                     // $40
          lead.idrd_station,                                                        // $41
          lead.link_rdstation,                                                      // $42
          lead.campos_adicionais ? JSON.stringify(lead.campos_adicionais) : null,   // $43
          lead.autor_ultima_alteracao,                                              // $44
          lead.empreendimentosId                                                    // $45
        ]);

        recordsProcessed++;

        if (result.rows[0].inserted) {
          recordsCreated++;
        } else {
          recordsUpdated++;
        }

        // Progress every 100 records
        if (recordsProcessed % 100 === 0) {
          process.stdout.write(`\r  Processed: ${recordsProcessed}/${leads.length}`);
        }

      } catch (error) {
        console.error(`\n❌ Error processing lead ${lead.idlead}:`, error);
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
  // Get workspace_id from command line args or use default (1)
  const workspaceId = process.argv[2] ? parseInt(process.argv[2]) : 1;

  console.log(`Running sync for workspace_id: ${workspaceId}`);
  console.log(`Usage: npx tsx lib/sync/agents-simple/01-leads-core.ts [workspace_id]\n`);

  syncLeadsCore(workspaceId, true)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
