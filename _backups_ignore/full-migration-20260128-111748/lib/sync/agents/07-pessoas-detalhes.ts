/**
 * Agent 07: Pessoas Detalhes
 * Synchronizes person contacts and professional data from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMPessoaDetalheData {
  id: number;
  pessoa_id: number;
  tipo?: string;
  valor?: string;
  descricao?: string;
  principal?: boolean;
  [key: string]: unknown;
}

interface DBPessoaDetalheData {
  cvcrm_id: number;
  pessoa_id: number;
  tipo?: string;
  valor?: string;
  descricao?: string;
  principal?: boolean;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class PessoasDetalhesAgent extends BaseSyncAgent<CVCRMPessoaDetalheData, DBPessoaDetalheData> {
  constructor() {
    const config: AgentConfig = {
      name: 'pessoas-detalhes',
      description: 'Syncs person contacts and professional data',
      tables: ['cvcrm_pessoas_contatos', 'cvcrm_pessoas_profissional'],
      endpoints: [
        {
          path: '/api/v1/cadastros/pessoas_contatos',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/cadastros/pessoas_profissional',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
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

  transformData(cvcrmData: CVCRMPessoaDetalheData): DBPessoaDetalheData {
    return {
      cvcrm_id: cvcrmData.id,
      pessoa_id: cvcrmData.pessoa_id,
      tipo: cvcrmData.tipo,
      valor: cvcrmData.valor,
      descricao: cvcrmData.descricao,
      principal: cvcrmData.principal,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, pessoa_id, tipo, valor, descricao, principal,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        pessoa_id = EXCLUDED.pessoa_id,
        tipo = EXCLUDED.tipo,
        valor = EXCLUDED.valor,
        descricao = EXCLUDED.descricao,
        principal = EXCLUDED.principal,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBPessoaDetalheData) => [
      data.cvcrm_id, data.pessoa_id, data.tipo, data.valor,
      data.descricao, data.principal, data.cvcrm_data, data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[PessoasDetalhesAgent] Starting details sync...');

    const results = {
      contatos: await this.syncTable(
        'cvcrm_pessoas_contatos',
        '/api/v1/cadastros/pessoas_contatos',
        'CVCRM_TOKEN_PESSOA',
        { fullSync, batchSize: 100 }
      ),
      profissional: await this.syncTable(
        'cvcrm_pessoas_profissional',
        '/api/v1/cadastros/pessoas_profissional',
        'CVCRM_TOKEN_PESSOA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[PessoasDetalhesAgent] Sync completed:', {
      contatos: results.contatos.total,
      profissional: results.profissional.total,
    });

    return results;
  }
}

export const pessoasDetalhesAgent = new PessoasDetalhesAgent();
