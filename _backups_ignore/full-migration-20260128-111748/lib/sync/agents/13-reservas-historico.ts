/**
 * Agent 13: Reservas Histórico
 * Synchronizes reservation history and workflow from CV CRM
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

export class ReservasHistoricoAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'reservas-historico',
      description: 'Syncs reservation history and workflow',
      tables: ['cvcrm_reservas_historico', 'cvcrm_reservas_historico_situacoes', 'cvcrm_reservas_workflow_tempo'],
      endpoints: [
        {
          path: '/api/v1/comercial/reservas_historico',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_historico_situacoes',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_workflow_tempo',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
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
    console.log('[ReservasHistoricoAgent] Starting sync...');

    const results = {
      reservashistorico: await this.syncTable(
        'cvcrm_reservas_historico',
        '/api/v1/comercial/reservas_historico',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      reservashistoricosituacoes: await this.syncTable(
        'cvcrm_reservas_historico_situacoes',
        '/api/v1/comercial/reservas_historico_situacoes',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      reservasworkflowtempo: await this.syncTable(
        'cvcrm_reservas_workflow_tempo',
        '/api/v1/comercial/reservas_workflow_tempo',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ReservasHistoricoAgent] Sync completed:', {
      reservashistorico: results.reservashistorico.total,
      reservashistoricosituacoes: results.reservashistoricosituacoes.total,
      reservasworkflowtempo: results.reservasworkflowtempo.total,
    });

    return results;
  }
}

// Export singleton
export const reservasHistoricoAgent = new ReservasHistoricoAgent();
