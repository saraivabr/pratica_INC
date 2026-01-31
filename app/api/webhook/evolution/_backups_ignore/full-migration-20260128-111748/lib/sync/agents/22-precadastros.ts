/**
 * Agent 22: Pré-cadastros
 * Synchronizes pre-registrations and workflow from CV CRM
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

export class PrecadastrosAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'precadastros',
      description: 'Syncs pre-registrations and workflow',
      tables: ['cvcrm_precadastros', 'cvcrm_precadastro_historico_situacoes', 'cvcrm_precadastro_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/precadastros',
          tokenEnvVar: 'CVCRM_TOKEN_PRECADASTRO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/precadastro_historico_situacoes',
          tokenEnvVar: 'CVCRM_TOKEN_PRECADASTRO',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/precadastro_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_PRECADASTRO',
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
    console.log('[PrecadastrosAgent] Starting sync...');

    const results = {
      precadastros: await this.syncTable(
        'cvcrm_precadastros',
        '/api/v1/comercial/precadastros',
        'CVCRM_TOKEN_PRECADASTRO',
        { fullSync, batchSize: 100 }
      ),
      precadastrohistoricosituacoes: await this.syncTable(
        'cvcrm_precadastro_historico_situacoes',
        '/api/v1/comercial/precadastro_historico_situacoes',
        'CVCRM_TOKEN_PRECADASTRO',
        { fullSync, batchSize: 100 }
      ),
      precadastroworkflowtempo: await this.syncTable(
        'cvcrm_precadastro_workflow_tempo',
        '/api/v1/comercial/precadastro_workflow_tempo',
        'CVCRM_TOKEN_PRECADASTRO',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[PrecadastrosAgent] Sync completed:', {
      precadastros: results.precadastros.total,
      precadastrohistoricosituacoes: results.precadastrohistoricosituacoes.total,
      precadastroworkflowtempo: results.precadastroworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const precadastrosAgent = new PrecadastrosAgent();
