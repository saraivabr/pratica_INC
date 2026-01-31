/**
 * Agent 15: Atendimentos Core
 * Synchronizes customer service tickets and interactions from CV CRM
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

export class AtendimentosCoreAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'atendimentos-core',
      description: 'Syncs customer service tickets and interactions',
      tables: ['cvcrm_atendimentos', 'cvcrm_atendimentos_interacoes'],
      endpoints: [
        {
          path: '/api/v1/comercial/atendimentos',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/atendimentos_interacoes',
          tokenEnvVar: 'CVCRM_TOKEN_ATENDIMENTO',
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
    console.log('[AtendimentosCoreAgent] Starting sync...');

    const results = {
      atendimentos: await this.syncTable(
        'cvcrm_atendimentos',
        '/api/v1/comercial/atendimentos',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
      atendimentosinteracoes: await this.syncTable(
        'cvcrm_atendimentos_interacoes',
        '/api/v1/comercial/atendimentos_interacoes',
        'CVCRM_TOKEN_ATENDIMENTO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AtendimentosCoreAgent] Sync completed:', {
      atendimentos: results.atendimentos.total,
      atendimentosinteracoes: results.atendimentosinteracoes.total,
    });

    return results;
  }
}

// Export singleton
export const atendimentosCoreAgent = new AtendimentosCoreAgent();
