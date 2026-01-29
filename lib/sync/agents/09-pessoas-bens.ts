/**
 * Agent 09: Pessoas Bens
 * Synchronizes person business assets from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMPessoaBemData {
  id: number;
  pessoa_id: number;
  tipo_bem?: string;
  descricao?: string;
  valor?: number;
  empresa?: string;
  cnpj?: string;
  [key: string]: unknown;
}

interface DBPessoaBemData {
  cvcrm_id: number;
  pessoa_id: number;
  tipo_bem?: string;
  descricao?: string;
  valor?: number;
  empresa?: string;
  cnpj?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class PessoasBensAgent extends BaseSyncAgent<CVCRMPessoaBemData, DBPessoaBemData> {
  constructor() {
    const config: AgentConfig = {
      name: 'pessoas-bens',
      description: 'Syncs person business assets',
      tables: ['cvcrm_pessoas_bens_empresa'],
      endpoints: [
        {
          path: '/api/v1/cadastros/pessoas_bens_empresa',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: ['pessoas-core'],
      priority: 3,
    };

    super(config);
  }

  transformData(cvcrmData: CVCRMPessoaBemData): DBPessoaBemData {
    return {
      cvcrm_id: cvcrmData.id,
      pessoa_id: cvcrmData.pessoa_id,
      tipo_bem: cvcrmData.tipo_bem,
      descricao: cvcrmData.descricao,
      valor: cvcrmData.valor,
      empresa: cvcrmData.empresa,
      cnpj: cvcrmData.cnpj,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, pessoa_id, tipo_bem, descricao, valor, empresa, cnpj,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        pessoa_id = EXCLUDED.pessoa_id,
        tipo_bem = EXCLUDED.tipo_bem,
        descricao = EXCLUDED.descricao,
        valor = EXCLUDED.valor,
        empresa = EXCLUDED.empresa,
        cnpj = EXCLUDED.cnpj,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBPessoaBemData) => [
      data.cvcrm_id, data.pessoa_id, data.tipo_bem, data.descricao,
      data.valor, data.empresa, data.cnpj, data.cvcrm_data, data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[PessoasBensAgent] Starting assets sync...');

    const results = await this.syncTable(
      'cvcrm_pessoas_bens_empresa',
      '/api/v1/cadastros/pessoas_bens_empresa',
      'CVCRM_TOKEN_PESSOA',
      { fullSync, batchSize: 100 }
    );

    console.log('[PessoasBensAgent] Sync completed:', {
      total: results.total,
    });

    return results;
  }
}

export const pessoasBensAgent = new PessoasBensAgent();
