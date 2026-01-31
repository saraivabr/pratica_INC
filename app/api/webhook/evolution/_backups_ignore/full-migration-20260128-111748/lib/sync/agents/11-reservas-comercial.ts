/**
 * Agent 11: Reservas Comercial
 * Synchronizes commissions and coordinators for reservations
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface GenericData {
  id: number;
  reserva_id?: number;
  [key: string]: unknown;
}

interface DBGenericData {
  cvcrm_id: number;
  reserva_id?: number;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class ReservasComercialAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'reservas-comercial',
      description: 'Syncs reservation commissions and coordinators',
      tables: ['cvcrm_reservas_comissoes', 'cvcrm_reservas_comissoes_programacao', 'cvcrm_reservas_coordenador'],
      endpoints: [
        { path: '/api/v1/comercial/reservas_comissoes', tokenEnvVar: 'CVCRM_TOKEN_RESERVA', method: 'GET', supportsIncremental: true, paginationType: 'offset', pageSize: 100 },
        { path: '/api/v1/comercial/reservas_comissoes_programacao', tokenEnvVar: 'CVCRM_TOKEN_RESERVA', method: 'GET', supportsIncremental: true, paginationType: 'offset', pageSize: 100 },
        { path: '/api/v1/comercial/reservas_coordenador', tokenEnvVar: 'CVCRM_TOKEN_RESERVA', method: 'GET', supportsIncremental: true, paginationType: 'offset', pageSize: 100 },
      ],
      dependencies: ['reservas-core'],
      priority: 2,
    };
    super(config);
  }

  transformData(cvcrmData: GenericData): DBGenericData {
    return {
      cvcrm_id: cvcrmData.id,
      reserva_id: cvcrmData.reserva_id,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `INSERT INTO ${tableName} (cvcrm_id, reserva_id, cvcrm_data, synced_at) VALUES ($1, $2, $3, $4) ON CONFLICT (cvcrm_id) DO UPDATE SET reserva_id = EXCLUDED.reserva_id, cvcrm_data = EXCLUDED.cvcrm_data, synced_at = EXCLUDED.synced_at, updated_at = NOW()`;
    const getParams = (data: DBGenericData) => [data.cvcrm_id, data.reserva_id, data.cvcrm_data, data.synced_at];
    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[ReservasComercialAgent] Starting commercial sync...');
    const results = {
      comissoes: await this.syncTable('cvcrm_reservas_comissoes', '/api/v1/comercial/reservas_comissoes', 'CVCRM_TOKEN_RESERVA', { fullSync, batchSize: 100 }),
      programacao: await this.syncTable('cvcrm_reservas_comissoes_programacao', '/api/v1/comercial/reservas_comissoes_programacao', 'CVCRM_TOKEN_RESERVA', { fullSync, batchSize: 100 }),
      coordenador: await this.syncTable('cvcrm_reservas_coordenador', '/api/v1/comercial/reservas_coordenador', 'CVCRM_TOKEN_RESERVA', { fullSync, batchSize: 100 }),
    };
    console.log('[ReservasComercialAgent] Sync completed:', { comissoes: results.comissoes.total, programacao: results.programacao.total, coordenador: results.coordenador.total });
    return results;
  }
}

export const reservasComercialAgent = new ReservasComercialAgent();
