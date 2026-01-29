/**
 * Agent 14: Reservas Integrações
 * Synchronizes external integrations for reservations from CV CRM
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

export class ReservasIntegracoesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'reservas-integracoes',
      description: 'Syncs external integrations for reservations',
      tables: ['cvcrm_reservas_registros_flags', 'cvcrm_reservas_sienge'],
      endpoints: [
        {
          path: '/api/v1/comercial/reservas_registros_flags',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_sienge',
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
    console.log('[ReservasIntegracoesAgent] Starting sync...');

    const results = {
      reservasregistrosflags: await this.syncTable(
        'cvcrm_reservas_registros_flags',
        '/api/v1/comercial/reservas_registros_flags',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      reservassienge: await this.syncTable(
        'cvcrm_reservas_sienge',
        '/api/v1/comercial/reservas_sienge',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ReservasIntegracoesAgent] Sync completed:', {
      reservasregistrosflags: results.reservasregistrosflags.total,
      reservassienge: results.reservassienge.total,
    });

    return results;
  }
}

// Export singleton
export const reservasIntegracoesAgent = new ReservasIntegracoesAgent();
