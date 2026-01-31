/**
 * Agent 08: Pessoas Financeiro
 * Synchronizes person financial, banking and asset data from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMPessoaFinanceiroData {
  id: number;
  pessoa_id: number;
  tipo?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  valor?: number;
  descricao?: string;
  [key: string]: unknown;
}

interface DBPessoaFinanceiroData {
  cvcrm_id: number;
  pessoa_id: number;
  tipo?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  valor?: number;
  descricao?: string;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class PessoasFinanceiroAgent extends BaseSyncAgent<CVCRMPessoaFinanceiroData, DBPessoaFinanceiroData> {
  constructor() {
    const config: AgentConfig = {
      name: 'pessoas-financeiro',
      description: 'Syncs person financial, banking and asset data',
      tables: ['cvcrm_pessoas_bancarios', 'cvcrm_pessoas_financeiros', 'cvcrm_pessoas_patrimoniais'],
      endpoints: [
        {
          path: '/api/v1/cadastros/pessoas_bancarios',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/cadastros/pessoas_financeiros',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
        {
          path: '/api/v1/cadastros/pessoas_patrimoniais',
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

  transformData(cvcrmData: CVCRMPessoaFinanceiroData): DBPessoaFinanceiroData {
    return {
      cvcrm_id: cvcrmData.id,
      pessoa_id: cvcrmData.pessoa_id,
      tipo: cvcrmData.tipo,
      banco: cvcrmData.banco,
      agencia: cvcrmData.agencia,
      conta: cvcrmData.conta,
      valor: cvcrmData.valor,
      descricao: cvcrmData.descricao,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, pessoa_id, tipo, banco, agencia, conta, valor, descricao,
        cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        pessoa_id = EXCLUDED.pessoa_id,
        tipo = EXCLUDED.tipo,
        banco = EXCLUDED.banco,
        agencia = EXCLUDED.agencia,
        conta = EXCLUDED.conta,
        valor = EXCLUDED.valor,
        descricao = EXCLUDED.descricao,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBPessoaFinanceiroData) => [
      data.cvcrm_id, data.pessoa_id, data.tipo, data.banco, data.agencia,
      data.conta, data.valor, data.descricao, data.cvcrm_data, data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[PessoasFinanceiroAgent] Starting financial sync...');

    const results = {
      bancarios: await this.syncTable(
        'cvcrm_pessoas_bancarios',
        '/api/v1/cadastros/pessoas_bancarios',
        'CVCRM_TOKEN_PESSOA',
        { fullSync, batchSize: 100 }
      ),
      financeiros: await this.syncTable(
        'cvcrm_pessoas_financeiros',
        '/api/v1/cadastros/pessoas_financeiros',
        'CVCRM_TOKEN_PESSOA',
        { fullSync, batchSize: 100 }
      ),
      patrimoniais: await this.syncTable(
        'cvcrm_pessoas_patrimoniais',
        '/api/v1/cadastros/pessoas_patrimoniais',
        'CVCRM_TOKEN_PESSOA',
        { fullSync, batchSize: 100 }
      ),
    };

    console.log('[PessoasFinanceiroAgent] Sync completed:', {
      bancarios: results.bancarios.total,
      financeiros: results.financeiros.total,
      patrimoniais: results.patrimoniais.total,
    });

    return results;
  }
}

export const pessoasFinanceiroAgent = new PessoasFinanceiroAgent();
