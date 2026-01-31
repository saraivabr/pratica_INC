/**
 * Agent 16: Atendimentos Tarefas
 * Synchronizes service tasks and workflow from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface GenericData {
  id: number;
  [key: string]: unknown;
}

interface DBGenericData {
  cvcrm_id: number;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class AtendimentosTarefasAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'atendimentos-tarefas',
      description: 'Syncs service tasks and workflow',
      tables: ['cvcrm_atendimentos_respostas', 'cvcrm_atendimentos_tarefas', 'cvcrm_atendimentos_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/atendimentos_respostas',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/atendimentos_tarefas',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/atendimentos_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['atendimentos-core'],
      priority: 2,
    };

    super(config);
  }

  transformData(cvcrmData: GenericData): DBGenericData {
    return {
      cvcrm_id: cvcrmData.id,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (cvcrm_id, cvcrm_data, synced_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBGenericData) => [
      data.cvcrm_id,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[AtendimentosTarefasAgent] Starting sync...');

    const results = {
      atendimentosrespostas: await this.syncTable(
        'cvcrm_atendimentos_respostas',
        '/api/v1/comercial/atendimentos_respostas',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
      atendimentostarefas: await this.syncTable(
        'cvcrm_atendimentos_tarefas',
        '/api/v1/comercial/atendimentos_tarefas',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
      atendimentosworkflowtempo: await this.syncTable(
        'cvcrm_atendimentos_workflow_tempo',
        '/api/v1/comercial/atendimentos_workflow_tempo',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AtendimentosTarefasAgent] Sync completed:', {
      atendimentosrespostas: results.atendimentosrespostas.total,
      atendimentostarefas: results.atendimentostarefas.total,
      atendimentosworkflowtempo: results.atendimentosworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const atendimentosTarefasAgent = new AtendimentosTarefasAgent();
