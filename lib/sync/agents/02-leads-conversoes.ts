/**
 * Agent 02: Leads Conversões
 * Synchronizes lead conversions, wins and losses from CV CRM
 *
 * NOTE: The endpoints /api/v1/comercial/leads/conversoes, leads/ganhos, leads/perdas
 * return 405 (Method Not Allowed) - these endpoints don't exist in CV CRM API.
 * This agent is disabled until the correct endpoints are identified.
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
      description: 'Syncs lead conversions, wins and losses (DISABLED - endpoints not available)',
      tables: ['cvcrm_leads_conversoes', 'cvcrm_leads_ganhos', 'cvcrm_leads_perdas'],
      endpoints: [],
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
    console.log('[LeadsConversoesAgent] SKIPPED - endpoints not available in CV CRM API');
    return {
      conversoes: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [], duration: 0, startedAt: new Date(), completedAt: new Date() },
      ganhos: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [], duration: 0, startedAt: new Date(), completedAt: new Date() },
      perdas: { total: 0, created: 0, updated: 0, skipped: 0, errors: 0, results: [], duration: 0, startedAt: new Date(), completedAt: new Date() },
    };
  }
}

export const leadsConversoesAgent = new LeadsConversoesAgent();
