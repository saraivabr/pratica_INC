/**
 * Agent 28: Administrativo
 * Synchronizes administrative users and settings from CV CRM
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

export class AdministrativoAgent extends BaseSyncAgent<GenericData, DBGenericData> {
  constructor() {
    const config: AgentConfig = {
      name: 'administrativo',
      description: 'Syncs administrative users and settings',
      tables: ['cvcrm_usuarios_administrativos', 'cvcrm_campos_adicionais', 'cvcrm_agendamentos_vistorias'],
      endpoints: [
        {
          path: '/api/v1/comercial/usuarios_administrativos',
          tokenEnvVar: 'CVCRM_TOKEN_ADMIN',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/campos_adicionais',
          tokenEnvVar: 'CVCRM_TOKEN_ADMIN',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/comercial/agendamentos_vistorias',
          tokenEnvVar: 'CVCRM_TOKEN_ADMIN',
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
    console.log('[AdministrativoAgent] Starting sync...');

    const results = {
      usuariosadministrativos: await this.syncTable(
        'cvcrm_usuarios_administrativos',
        '/api/v1/comercial/usuarios_administrativos',
        'CVCRM_TOKEN_ADMIN',
        { fullSync, batchSize: 100 }
      ),
      camposadicionais: await this.syncTable(
        'cvcrm_campos_adicionais',
        '/api/v1/comercial/campos_adicionais',
        'CVCRM_TOKEN_ADMIN',
        { fullSync, batchSize: 100 }
      ),
      agendamentosvistorias: await this.syncTable(
        'cvcrm_agendamentos_vistorias',
        '/api/v1/comercial/agendamentos_vistorias',
        'CVCRM_TOKEN_ADMIN',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[AdministrativoAgent] Sync completed:', {
      usuariosadministrativos: results.usuariosadministrativos.total,
      camposadicionais: results.camposadicionais.total,
      agendamentosvistorias: results.agendamentosvistorias.total,
    });

    return results;
  }
}

// Export singleton
export const administrativoAgent = new AdministrativoAgent();
