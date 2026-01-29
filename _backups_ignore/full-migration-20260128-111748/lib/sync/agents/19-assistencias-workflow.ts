/**
 * Agent 19: Assistências Workflow
 * Synchronizes maintenance workflow timing from CV CRM
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

export class AssistenciasWorkflowAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'assistencias-workflow',
      description: 'Syncs maintenance workflow timing',
      tables: ['cvcrm_assistencias_itens_workflow_tempo', 'cvcrm_assistencias_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/assistencias_itens_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_ASSISTENCIA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/assistencias_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_ASSISTENCIA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['assistencias'],
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
    console.log('[AssistenciasWorkflowAgent] Starting sync...');

    const results = {
      assistenciasitensworkflowtempo: await this.syncTable(
        'cvcrm_assistencias_itens_workflow_tempo',
        '/api/v1/comercial/assistencias_itens_workflow_tempo',
        'CVCRM_TOKEN_ASSISTENCIA',
        { fullSync, batchSize: 100 }
      ),
      assistenciasworkflowtempo: await this.syncTable(
        'cvcrm_assistencias_workflow_tempo',
        '/api/v1/comercial/assistencias_workflow_tempo',
        'CVCRM_TOKEN_ASSISTENCIA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AssistenciasWorkflowAgent] Sync completed:', {
      assistenciasitensworkflowtempo: results.assistenciasitensworkflowtempo.total,
      assistenciasworkflowtempo: results.assistenciasworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const assistenciasWorkflowAgent = new AssistenciasWorkflowAgent();
