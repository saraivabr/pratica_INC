/**
 * Agent 12: Reservas Detalhes
 * Synchronizes reservation details and contracts from CV CRM
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

export class ReservasDetalhesAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'reservas-detalhes',
      description: 'Syncs reservation details and contracts',
      tables: ['cvcrm_reservas_campos_adicionais', 'cvcrm_reservas_condicoes', 'cvcrm_reservas_contratos'],
      endpoints: [
        {
          path: '/api/v1/comercial/reservas_campos_adicionais',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_condicoes',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_contratos',
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
    console.log('[ReservasDetalhesAgent] Starting sync...');

    const results = {
      reservascamposadicionais: await this.syncTable(
        'cvcrm_reservas_campos_adicionais',
        '/api/v1/comercial/reservas_campos_adicionais',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      reservascondicoes: await this.syncTable(
        'cvcrm_reservas_condicoes',
        '/api/v1/comercial/reservas_condicoes',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      reservascontratos: await this.syncTable(
        'cvcrm_reservas_contratos',
        '/api/v1/comercial/reservas_contratos',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ReservasDetalhesAgent] Sync completed:', {
      reservascamposadicionais: results.reservascamposadicionais.total,
      reservascondicoes: results.reservascondicoes.total,
      reservascontratos: results.reservascontratos.total,
    });

    return results;
  }
}

// Export singleton
export const reservasDetalhesAgent = new ReservasDetalhesAgent();
