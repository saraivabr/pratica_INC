/**
 * Agent 20: Comissões
 * Synchronizes commissions and payments from CV CRM
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

export class ComissoesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'comissoes',
      description: 'Syncs commissions and payments',
      tables: ['cvcrm_comissoes', 'cvcrm_comissoes_pagamentos', 'cvcrm_comissoes_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/comissoes',
          tokenEnvVar: 'CVCRM_TOKEN_COMISSAO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/comissoes_pagamentos',
          tokenEnvVar: 'CVCRM_TOKEN_COMISSAO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/comissoes_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_COMISSAO',
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
    console.log('[ComissoesAgent] Starting sync...');

    const results = {
      comissoes: await this.syncTable(
        'cvcrm_comissoes',
        '/api/v1/comercial/comissoes',
        'CVCRM_TOKEN_COMISSAO',
        { fullSync, batchSize: 100 }
      ),
      comissoespagamentos: await this.syncTable(
        'cvcrm_comissoes_pagamentos',
        '/api/v1/comercial/comissoes_pagamentos',
        'CVCRM_TOKEN_COMISSAO',
        { fullSync, batchSize: 100 }
      ),
      comissoesworkflowtempo: await this.syncTable(
        'cvcrm_comissoes_workflow_tempo',
        '/api/v1/comercial/comissoes_workflow_tempo',
        'CVCRM_TOKEN_COMISSAO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ComissoesAgent] Sync completed:', {
      comissoes: results.comissoes.total,
      comissoespagamentos: results.comissoespagamentos.total,
      comissoesworkflowtempo: results.comissoesworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const comissoesAgent = new ComissoesAgent();
