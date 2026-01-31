/**
 * Agent 10: Reservas Core
 * Synchronizes reservations and associated persons from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMReservaData {
  id: number;
  numero?: string;
  unidade_id?: number;
  empreendimento_id?: number;
  pessoa_id?: number;
  corretor_id?: number;
  valor_total?: number;
  data_reserva?: string;
  situacao?: string;
  [key: string]: unknown;
}

interface DBReservaData {
  cvcrm_id: number;
  numero?: string;
  unidade_id?: number;
  empreendimento_id?: number;
  pessoa_id?: number;
  corretor_id?: number;
  valor_total?: number;
  data_reserva?: Date;
  situacao?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class ReservasCoreAgent extends BaseSyncAgent<CVCRMReservaData, DBReservaData> {
  constructor() {
    const config: AgentConfig = {
      name: 'reservas-core',
      description: 'Syncs reservations and associated persons',
      tables: ['cvcrm_reservas', 'cvcrm_reservas_associados'],
      endpoints: [
        {
          path: '/api/v1/comercial/reservas',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/reservas_associados',
          tokenEnvVar: 'CVCRM_TOKEN_RESERVA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['pessoas-core'],
      priority: 1,
    };

    super(config);
  }

  transformData(cvcrmData: CVCRMReservaData): DBReservaData {
    return {
      cvcrm_id: cvcrmData.id,
      numero: cvcrmData.numero,
      unidade_id: cvcrmData.unidade_id,
      empreendimento_id: cvcrmData.empreendimento_id,
      pessoa_id: cvcrmData.pessoa_id,
      corretor_id: cvcrmData.corretor_id,
      valor_total: cvcrmData.valor_total,
      data_reserva: cvcrmData.data_reserva ? new Date(cvcrmData.data_reserva) : undefined,
      situacao: cvcrmData.situacao,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, numero, unidade_id, empreendimento_id, pessoa_id,
        corretor_id, valor_total, data_reserva, situacao,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        numero = EXCLUDED.numero,
        unidade_id = EXCLUDED.unidade_id,
        empreendimento_id = EXCLUDED.empreendimento_id,
        pessoa_id = EXCLUDED.pessoa_id,
        corretor_id = EXCLUDED.corretor_id,
        valor_total = EXCLUDED.valor_total,
        data_reserva = EXCLUDED.data_reserva,
        situacao = EXCLUDED.situacao,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBReservaData) => [
      data.cvcrm_id, data.numero, data.unidade_id, data.empreendimento_id,
      data.pessoa_id, data.corretor_id, data.valor_total, data.data_reserva,
      data.situacao, data.cvcrm_data, data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[ReservasCoreAgent] Starting reservations sync...');

    const results = {
      reservas: await this.syncTable(
        'cvcrm_reservas',
        '/api/v1/comercial/reservas',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
      associados: await this.syncTable(
        'cvcrm_reservas_associados',
        '/api/v1/comercial/reservas_associados',
        'CVCRM_TOKEN_RESERVA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[ReservasCoreAgent] Sync completed:', {
      reservas: results.reservas.total,
      associados: results.associados.total,
    });

    return results;
  }
}

export const reservasCoreAgent = new ReservasCoreAgent();
