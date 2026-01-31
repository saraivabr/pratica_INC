/**
 * Agent 24: Pesquisas
 * Synchronizes surveys and responses from CV CRM
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

export class PesquisasAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'pesquisas',
      description: 'Syncs surveys and responses',
      tables: ['cvcrm_pesquisas', 'cvcrm_pesquisas_perguntas', 'cvcrm_pesquisas_respostas'],
      endpoints: [
        {
          path: '/api/v1/comercial/pesquisas',
          tokenEnvVar: 'CVCRM_TOKEN_PESQUISA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/pesquisas_perguntas',
          tokenEnvVar: 'CVCRM_TOKEN_PESQUISA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/pesquisas_respostas',
          tokenEnvVar: 'CVCRM_TOKEN_PESQUISA',
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
    console.log('[PesquisasAgent] Starting sync...');

    const results = {
      pesquisas: await this.syncTable(
        'cvcrm_pesquisas',
        '/api/v1/comercial/pesquisas',
        'CVCRM_TOKEN_PESQUISA',
        { fullSync, batchSize: 100 }
      ),
      pesquisasperguntas: await this.syncTable(
        'cvcrm_pesquisas_perguntas',
        '/api/v1/comercial/pesquisas_perguntas',
        'CVCRM_TOKEN_PESQUISA',
        { fullSync, batchSize: 100 }
      ),
      pesquisasrespostas: await this.syncTable(
        'cvcrm_pesquisas_respostas',
        '/api/v1/comercial/pesquisas_respostas',
        'CVCRM_TOKEN_PESQUISA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[PesquisasAgent] Sync completed:', {
      pesquisas: results.pesquisas.total,
      pesquisasperguntas: results.pesquisasperguntas.total,
      pesquisasrespostas: results.pesquisasrespostas.total,
    });

    return results;
  }
}

// Export singleton
export const pesquisasAgent = new PesquisasAgent();
