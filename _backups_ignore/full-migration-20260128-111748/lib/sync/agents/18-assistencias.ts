/**
 * Agent 18: Assistências
 * Synchronizes maintenance services and items from CV CRM
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

export class AssistenciasAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'assistencias',
      description: 'Syncs maintenance services and items',
      tables: ['cvcrm_assistencias', 'cvcrm_assistencias_itens', 'cvcrm_assistencias_visitas_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/assistencias',
          tokenEnvVar: 'CVCRM_TOKEN_ASSISTENCIA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/assistencias_itens',
          tokenEnvVar: 'CVCRM_TOKEN_ASSISTENCIA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/assistencias_visitas_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_ASSISTENCIA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['reservas-core'],
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
    console.log('[AssistenciasAgent] Starting sync...');

    const results = {
      assistencias: await this.syncTable(
        'cvcrm_assistencias',
        '/api/v1/comercial/assistencias',
        'CVCRM_TOKEN_ASSISTENCIA',
        { fullSync, batchSize: 100 }
      ),
      assistenciasitens: await this.syncTable(
        'cvcrm_assistencias_itens',
        '/api/v1/comercial/assistencias_itens',
        'CVCRM_TOKEN_ASSISTENCIA',
        { fullSync, batchSize: 100 }
      ),
      assistenciasvisitasworkflowtempo: await this.syncTable(
        'cvcrm_assistencias_visitas_workflow_tempo',
        '/api/v1/comercial/assistencias_visitas_workflow_tempo',
        'CVCRM_TOKEN_ASSISTENCIA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AssistenciasAgent] Sync completed:', {
      assistencias: results.assistencias.total,
      assistenciasitens: results.assistenciasitens.total,
      assistenciasvisitasworkflowtempo: results.assistenciasvisitasworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const assistenciasAgent = new AssistenciasAgent();
