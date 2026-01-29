/**
 * Agent 21: Corretores
 * Synchronizes brokers and real estate agencies from CV CRM
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

export class CorretoresAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'corretores',
      description: 'Syncs brokers and real estate agencies',
      tables: ['cvcrm_corretores', 'cvcrm_corretores_profissional', 'cvcrm_imobiliarias'],
      endpoints: [
        {
          path: '/api/v1/comercial/corretores',
          tokenEnvVar: 'CVCRM_TOKEN_CORRETOR',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/corretores_profissional',
          tokenEnvVar: 'CVCRM_TOKEN_CORRETOR',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/imobiliarias',
          tokenEnvVar: 'CVCRM_TOKEN_CORRETOR',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['pessoas-core'],
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
    console.log('[CorretoresAgent] Starting sync...');

    const results = {
      corretores: await this.syncTable(
        'cvcrm_corretores',
        '/api/v1/comercial/corretores',
        'CVCRM_TOKEN_CORRETOR',
        { fullSync, batchSize: 100 }
      ),
      corretoresprofissional: await this.syncTable(
        'cvcrm_corretores_profissional',
        '/api/v1/comercial/corretores_profissional',
        'CVCRM_TOKEN_CORRETOR',
        { fullSync, batchSize: 100 }
      ),
      imobiliarias: await this.syncTable(
        'cvcrm_imobiliarias',
        '/api/v1/comercial/imobiliarias',
        'CVCRM_TOKEN_CORRETOR',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[CorretoresAgent] Sync completed:', {
      corretores: results.corretores.total,
      corretoresprofissional: results.corretoresprofissional.total,
      imobiliarias: results.imobiliarias.total,
    });

    return results;
  }
}

// Export singleton
export const corretoresAgent = new CorretoresAgent();
