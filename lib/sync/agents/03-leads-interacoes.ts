/**
 * Agent 03: Leads Interações
 * Synchronizes lead interactions, infos and moments from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMInteracaoData {
  id: number;
  idlead: number;
  tipo: string;
  data: string;
  descricao?: string;
  usuario_id?: number;
  usuario_nome?: string;
  canal?: string;
  duracao?: number;
  [key: string]: unknown;
}

interface DBInteracaoData {
  cvcrm_id: number;
  lead_id: number;
  tipo: string;
  data_interacao: Date;
  descricao?: string;
  usuario_id?: number;
  usuario_nome?: string;
  canal?: string;
  duracao?: number;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class LeadsInteracoesAgent extends BaseSyncAgent<CVCRMInteracaoData, DBInteracaoData> {
  constructor() {
    const config: AgentConfig = {
      name: 'leads-interacoes',
      description: 'Syncs lead interactions, infos and moments',
      tables: ['cvcrm_leads_interacoes', 'cvcrm_leads_infos', 'cvcrm_leads_momentos'],
      endpoints: [
        {
          path: '/api/v1/comercial/leads/interacoes',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads/infos',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads/momentos',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['leads-core'],
      priority: 2,
    };

    super(config);
  }

  transformData(cvcrmData: CVCRMInteracaoData): DBInteracaoData {
    return {
      cvcrm_id: cvcrmData.id,
      lead_id: cvcrmData.idlead,
      tipo: cvcrmData.tipo,
      data_interacao: new Date(cvcrmData.data),
      descricao: cvcrmData.descricao,
      usuario_id: cvcrmData.usuario_id,
      usuario_nome: cvcrmData.usuario_nome,
      canal: cvcrmData.canal,
      duracao: cvcrmData.duracao,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, lead_id, tipo, data_interacao, descricao,
        usuario_id, usuario_nome, canal, duracao,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        tipo = EXCLUDED.tipo,
        data_interacao = EXCLUDED.data_interacao,
        descricao = EXCLUDED.descricao,
        usuario_id = EXCLUDED.usuario_id,
        usuario_nome = EXCLUDED.usuario_nome,
        canal = EXCLUDED.canal,
        duracao = EXCLUDED.duracao,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBInteracaoData) => [
      data.cvcrm_id,
      data.lead_id,
      data.tipo,
      data.data_interacao,
      data.descricao,
      data.usuario_id,
      data.usuario_nome,
      data.canal,
      data.duracao,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[LeadsInteracoesAgent] SKIPPED - endpoints not available in CV CRM API');
    const empty = { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [], duration: 0, startedAt: new Date(), completedAt: new Date() };
    return { interacoes: empty, infos: empty, momentos: empty };
  }
}

export const leadsInteracoesAgent = new LeadsInteracoesAgent();
