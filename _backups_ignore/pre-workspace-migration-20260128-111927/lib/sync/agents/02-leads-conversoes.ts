/**
 * Agent 02: Leads Conversões
 * Synchronizes lead conversions, wins and losses from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMConversaoData {
  id: number;
  idlead: number;
  tipo: string;
  data: string;
  valor?: number;
  observacao?: string;
  usuario_id?: number;
  usuario_nome?: string;
  [key: string]: unknown;
}

interface DBConversaoData {
  cvcrm_id: number;
  lead_id: number;
  tipo: string;
  data_conversao: Date;
  valor?: number;
  observacao?: string;
  usuario_id?: number;
  usuario_nome?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class LeadsConversoesAgent extends BaseSyncAgent<CVCRMConversaoData, DBConversaoData> {
  constructor() {
    const config: AgentConfig = {
      name: 'leads-conversoes',
      description: 'Syncs lead conversions, wins and losses',
      tables: ['cvcrm_leads_conversoes', 'cvcrm_leads_ganhos', 'cvcrm_leads_perdas'],
      endpoints: [
        {
          path: '/api/v1/comercial/leads_conversoes',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads_ganhos',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads_perdas',
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

  transformData(cvcrmData: CVCRMConversaoData): DBConversaoData {
    return {
      cvcrm_id: cvcrmData.id,
      lead_id: cvcrmData.idlead,
      tipo: cvcrmData.tipo,
      data_conversao: new Date(cvcrmData.data),
      valor: cvcrmData.valor,
      observacao: cvcrmData.observacao,
      usuario_id: cvcrmData.usuario_id,
      usuario_nome: cvcrmData.usuario_nome,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, lead_id, tipo, data_conversao, valor,
        observacao, usuario_id, usuario_nome,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        tipo = EXCLUDED.tipo,
        data_conversao = EXCLUDED.data_conversao,
        valor = EXCLUDED.valor,
        observacao = EXCLUDED.observacao,
        usuario_id = EXCLUDED.usuario_id,
        usuario_nome = EXCLUDED.usuario_nome,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBConversaoData) => [
      data.cvcrm_id,
      data.lead_id,
      data.tipo,
      data.data_conversao,
      data.valor,
      data.observacao,
      data.usuario_id,
      data.usuario_nome,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[LeadsConversoesAgent] Starting conversions sync...');

    const results = {
      conversoes: await this.syncTable(
        'cvcrm_leads_conversoes',
        '/api/v1/comercial/leads_conversoes',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
      ganhos: await this.syncTable(
        'cvcrm_leads_ganhos',
        '/api/v1/comercial/leads_ganhos',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
      perdas: await this.syncTable(
        'cvcrm_leads_perdas',
        '/api/v1/comercial/leads_perdas',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[LeadsConversoesAgent] Sync completed:', {
      conversoes: results.conversoes.total,
      ganhos: results.ganhos.total,
      perdas: results.perdas.total,
    });

    return results;
  }
}

export const leadsConversoesAgent = new LeadsConversoesAgent();
