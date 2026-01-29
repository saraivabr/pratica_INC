/**
 * Agent 04: Leads Tarefas
 * Synchronizes lead tasks, visits and workflow timing from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMTarefaData {
  id: number;
  idlead: number;
  tipo: string;
  titulo: string;
  descricao?: string;
  data_inicio?: string;
  data_fim?: string;
  data_conclusao?: string;
  status: string;
  prioridade?: string;
  usuario_id?: number;
  usuario_nome?: string;
  [key: string]: unknown;
}

interface DBTarefaData {
  cvcrm_id: number;
  lead_id: number;
  tipo: string;
  titulo: string;
  descricao?: string;
  data_inicio?: Date;
  data_fim?: Date;
  data_conclusao?: Date;
  status: string;
  prioridade?: string;
  usuario_id?: number;
  usuario_nome?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class LeadsTarefasAgent extends BaseSyncAgent<CVCRMTarefaData, DBTarefaData> {
  constructor() {
    const config: AgentConfig = {
      name: 'leads-tarefas',
      description: 'Syncs lead tasks, visits and workflow timing',
      tables: ['cvcrm_leads_tarefas', 'cvcrm_leads_visitas', 'cvcrm_leads_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/leads_tarefas',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads_visitas',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/leads_workflow_tempo',
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

  transformData(cvcrmData: CVCRMTarefaData): DBTarefaData {
    return {
      cvcrm_id: cvcrmData.id,
      lead_id: cvcrmData.idlead,
      tipo: cvcrmData.tipo,
      titulo: cvcrmData.titulo,
      descricao: cvcrmData.descricao,
      data_inicio: cvcrmData.data_inicio ? new Date(cvcrmData.data_inicio) : undefined,
      data_fim: cvcrmData.data_fim ? new Date(cvcrmData.data_fim) : undefined,
      data_conclusao: cvcrmData.data_conclusao ? new Date(cvcrmData.data_conclusao) : undefined,
      status: cvcrmData.status,
      prioridade: cvcrmData.prioridade,
      usuario_id: cvcrmData.usuario_id,
      usuario_nome: cvcrmData.usuario_nome,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, lead_id, tipo, titulo, descricao,
        data_inicio, data_fim, data_conclusao,
        status, prioridade, usuario_id, usuario_nome,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        lead_id = EXCLUDED.lead_id,
        tipo = EXCLUDED.tipo,
        titulo = EXCLUDED.titulo,
        descricao = EXCLUDED.descricao,
        data_inicio = EXCLUDED.data_inicio,
        data_fim = EXCLUDED.data_fim,
        data_conclusao = EXCLUDED.data_conclusao,
        status = EXCLUDED.status,
        prioridade = EXCLUDED.prioridade,
        usuario_id = EXCLUDED.usuario_id,
        usuario_nome = EXCLUDED.usuario_nome,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBTarefaData) => [
      data.cvcrm_id,
      data.lead_id,
      data.tipo,
      data.titulo,
      data.descricao,
      data.data_inicio,
      data.data_fim,
      data.data_conclusao,
      data.status,
      data.prioridade,
      data.usuario_id,
      data.usuario_nome,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[LeadsTarefasAgent] Starting tasks sync...');

    const results = {
      tarefas: await this.syncTable(
        'cvcrm_leads_tarefas',
        '/api/v1/comercial/leads_tarefas',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
      visitas: await this.syncTable(
        'cvcrm_leads_visitas',
        '/api/v1/comercial/leads_visitas',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
      workflow_tempo: await this.syncTable(
        'cvcrm_leads_workflow_tempo',
        '/api/v1/comercial/leads_workflow_tempo',
        'CVCRM_TOKEN_LEAD',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[LeadsTarefasAgent] Sync completed:', {
      tarefas: results.tarefas.total,
      visitas: results.visitas.total,
      workflow_tempo: results.workflow_tempo.total,
    });

    return results;
  }
}

export const leadsTarefasAgent = new LeadsTarefasAgent();
