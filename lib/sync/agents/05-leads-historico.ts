/**
 * Agent 05: Leads Histórico
 * Synchronizes lead history and broker assignments from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMHistoricoData {
  id: number;
  idlead: number;
  data: string;
  situacao_anterior?: string;
  situacao_nova?: string;
  usuario_id?: number;
  usuario_nome?: string;
  observacao?: string;
  [key: string]: unknown;
}

interface DBHistoricoData {
  cvcrm_id: number;
  lead_id: number;
  data_mudanca: Date;
  situacao_anterior?: string;
  situacao_nova?: string;
  usuario_id?: number;
  usuario_nome?: string;
  observacao?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class LeadsHistoricoAgent extends BaseSyncAgent<CVCRMHistoricoData, DBHistoricoData> {
  constructor() {
    const config: AgentConfig = {
      name: 'leads-historico',
      description: 'Syncs lead history and broker assignments',
      tables: ['cvcrm_leads_historico_situacoes', 'cvcrm_leads_corretores'],
      endpoints: [
        {
          path: '/api/v1/comercial/leads/historico_situacoes',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads/corretores',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['leads-core'],
      priority: 3,
    };

    super(config);
  }

  transformData(cvcrmData: CVCRMHistoricoData): DBHistoricoData {
    return {
      cvcrm_id: cvcrmData.id,
      lead_id: cvcrmData.idlead,
      data_mudanca: new Date(cvcrmData.data),
      situacao_anterior: cvcrmData.situacao_anterior,
      situacao_nova: cvcrmData.situacao_nova,
      usuario_id: cvcrmData.usuario_id,
      usuario_nome: cvcrmData.usuario_nome,
      observacao: cvcrmData.observacao,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, lead_id, data_mudanca,
        situacao_anterior, situacao_nova,
        usuario_id, usuario_nome, observacao,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        data_mudanca = EXCLUDED.data_mudanca,
        situacao_anterior = EXCLUDED.situacao_anterior,
        situacao_nova = EXCLUDED.situacao_nova,
        usuario_id = EXCLUDED.usuario_id,
        usuario_nome = EXCLUDED.usuario_nome,
        observacao = EXCLUDED.observacao,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBHistoricoData) => [
      data.cvcrm_id,
      data.lead_id,
      data.data_mudanca,
      data.situacao_anterior,
      data.situacao_nova,
      data.usuario_id,
      data.usuario_nome,
      data.observacao,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[LeadsHistoricoAgent] SKIPPED - endpoints not available in CV CRM API');
    const empty = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [], duration: 0, startedAt: new Date(), completedAt: new Date() };
    return { historico: empty, corretores: empty };
  }
}

export const leadsHistoricoAgent = new LeadsHistoricoAgent();
