/**
 * Agent 27: Vendas
 * Synchronizes sales and simulations from CV CRM
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

export class VendasAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'vendas',
      description: 'Syncs sales and simulations',
      tables: ['cvcrm_vendas', 'cvcrm_simulacoes', 'cvcrm_campanhas_ativacao'],
      endpoints: [
        {
          path: '/api/v1/comercial/vendas',
          tokenEnvVar: 'CVCRM_TOKEN_VENDA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/simulacoes',
          tokenEnvVar: 'CVCRM_TOKEN_VENDA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/campanhas_ativacao',
          tokenEnvVar: 'CVCRM_TOKEN_VENDA',
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
    console.log('[VendasAgent] Starting sync...');

    const results = {
      vendas: await this.syncTable(
        'cvcrm_vendas',
        '/api/v1/comercial/vendas',
        'CVCRM_TOKEN_VENDA',
        { fullSync, batchSize: 100 }
      ),
      simulacoes: await this.syncTable(
        'cvcrm_simulacoes',
        '/api/v1/comercial/simulacoes',
        'CVCRM_TOKEN_VENDA',
        { fullSync, batchSize: 100 }
      ),
      campanhasativacao: await this.syncTable(
        'cvcrm_campanhas_ativacao',
        '/api/v1/comercial/campanhas_ativacao',
        'CVCRM_TOKEN_VENDA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[VendasAgent] Sync completed:', {
      vendas: results.vendas.total,
      simulacoes: results.simulacoes.total,
      campanhasativacao: results.campanhasativacao.total,
    });

    return results;
  }
}

// Export singleton
export const vendasAgent = new VendasAgent();
