/**
 * Agent 26: Processos
 * Synchronizes processes and demands from CV CRM
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

export class ProcessosAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'processos',
      description: 'Syncs processes and demands',
      tables: ['cvcrm_processos', 'cvcrm_demandas', 'cvcrm_distratos'],
      endpoints: [
        {
          path: '/api/v1/comercial/processos',
          tokenEnvVar: 'CVCRM_TOKEN_PROCESSO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/demandas',
          tokenEnvVar: 'CVCRM_TOKEN_PROCESSO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/distratos',
          tokenEnvVar: 'CVCRM_TOKEN_PROCESSO',
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
    console.log('[ProcessosAgent] Starting sync...');

    const results = {
      processos: await this.syncTable(
        'cvcrm_processos',
        '/api/v1/comercial/processos',
        'CVCRM_TOKEN_PROCESSO',
        { fullSync, batchSize: 100 }
      ),
      demandas: await this.syncTable(
        'cvcrm_demandas',
        '/api/v1/comercial/demandas',
        'CVCRM_TOKEN_PROCESSO',
        { fullSync, batchSize: 100 }
      ),
      distratos: await this.syncTable(
        'cvcrm_distratos',
        '/api/v1/comercial/distratos',
        'CVCRM_TOKEN_PROCESSO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ProcessosAgent] Sync completed:', {
      processos: results.processos.total,
      demandas: results.demandas.total,
      distratos: results.distratos.total,
    });

    return results;
  }
}

// Export singleton
export const processosAgent = new ProcessosAgent();
