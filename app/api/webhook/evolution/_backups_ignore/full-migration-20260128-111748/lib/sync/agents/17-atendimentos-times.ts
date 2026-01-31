/**
 * Agent 17: Atendimentos Times
 * Synchronizes service teams and members from CV CRM
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

export class AtendimentosTimesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'atendimentos-times',
      description: 'Syncs service teams and members',
      tables: ['cvcrm_atendimentos_times', 'cvcrm_atendimentos_times_integrantes'],
      endpoints: [
        {
          path: '/api/v1/comercial/atendimentos_times',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/atendimentos_times_integrantes',
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
    console.log('[AtendimentosTimesAgent] Starting sync...');

    const results = {
      atendimentostimes: await this.syncTable(
        'cvcrm_atendimentos_times',
        '/api/v1/comercial/atendimentos_times',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
      atendimentostimesintegrantes: await this.syncTable(
        'cvcrm_atendimentos_times_integrantes',
        '/api/v1/comercial/atendimentos_times_integrantes',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AtendimentosTimesAgent] Sync completed:', {
      atendimentostimes: results.atendimentostimes.total,
      atendimentostimesintegrantes: results.atendimentostimesintegrantes.total,
    });

    return results;
  }
}

// Export singleton
export const atendimentosTimesAgent = new AtendimentosTimesAgent();
