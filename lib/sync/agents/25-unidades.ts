/**
 * Agent 25: Unidades
 * Synchronizes real estate units and pricing from CV CRM
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

export class UnidadesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'unidades',
      description: 'Syncs real estate units and pricing',
      tables: ['cvcrm_unidades', 'cvcrm_unidades_precos'],
      endpoints: [
        {
          path: '/api/v1/comercial/unidades',
          tokenEnvVar: 'CVCRM_TOKEN_UNIDADE',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/unidades_precos',
          tokenEnvVar: 'CVCRM_TOKEN_UNIDADE',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['empreendimentos'],
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
    console.log('[UnidadesAgent] Starting sync...');

    const results = {
      unidades: await this.syncTable(
        'cvcrm_unidades',
        '/api/v1/comercial/unidades',
        'CVCRM_TOKEN_UNIDADE',
        { fullSync, batchSize: 100 }
      ),
      unidadesprecos: await this.syncTable(
        'cvcrm_unidades_precos',
        '/api/v1/comercial/unidades_precos',
        'CVCRM_TOKEN_UNIDADE',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[UnidadesAgent] Sync completed:', {
      unidades: results.unidades.total,
      unidadesprecos: results.unidadesprecos.total,
    });

    return results;
  }
}

// Export singleton
export const unidadesAgent = new UnidadesAgent();
