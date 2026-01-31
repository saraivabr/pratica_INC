/**
 * Agent 23: Repasses
 * Synchronizes transfers and workflow from CV CRM
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

export class RepassesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'repasses',
      description: 'Syncs transfers and workflow',
      tables: ['cvcrm_repasses', 'cvcrm_repasses_historico_situacoes', 'cvcrm_repasses_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/repasses',
          tokenEnvVar: 'CVCRM_TOKEN_REPASSE',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/repasses_historico_situacoes',
          tokenEnvVar: 'CVCRM_TOKEN_REPASSE',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/repasses_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_REPASSE',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['comissoes'],
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
    console.log('[RepassesAgent] Starting sync...');

    const results = {
      repasses: await this.syncTable(
        'cvcrm_repasses',
        '/api/v1/comercial/repasses',
        'CVCRM_TOKEN_REPASSE',
        { fullSync, batchSize: 100 }
      ),
      repasseshistoricosituacoes: await this.syncTable(
        'cvcrm_repasses_historico_situacoes',
        '/api/v1/comercial/repasses_historico_situacoes',
        'CVCRM_TOKEN_REPASSE',
        { fullSync, batchSize: 100 }
      ),
      repassesworkflowtempo: await this.syncTable(
        'cvcrm_repasses_workflow_tempo',
        '/api/v1/comercial/repasses_workflow_tempo',
        'CVCRM_TOKEN_REPASSE',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[RepassesAgent] Sync completed:', {
      repasses: results.repasses.total,
      repasseshistoricosituacoes: results.repasseshistoricosituacoes.total,
      repassesworkflowtempo: results.repassesworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const repassesAgent = new RepassesAgent();
