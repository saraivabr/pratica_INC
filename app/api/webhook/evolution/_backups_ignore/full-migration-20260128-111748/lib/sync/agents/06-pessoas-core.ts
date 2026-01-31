/**
 * Agent 06: Pessoas Core
 * Synchronizes main person/customer data from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { AgentConfig } from '../types';

interface CVCRMPessoaData {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  data_nascimento?: string;
  sexo?: string;
  estado_civil?: string;
  nacionalidade?: string;
  profissao?: string;
  renda?: number;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  tipo_pessoa?: string;
  data_cad?: string;
  [key: string]: unknown;
}

interface DBPessoaData {
  cvcrm_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  data_nascimento?: Date;
  sexo?: string;
  estado_civil?: string;
  nacionalidade?: string;
  profissao?: string;
  renda?: number;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  tipo_pessoa?: string;
  data_cadastro_cvcrm?: Date;
  cvcrm_data: unknown;
  synced_at: Date;
}

export class PessoasCoreAgent extends BaseSyncAgent<CVCRMPessoaData, DBPessoaData> {
  constructor() {
    const config: AgentConfig = {
      name: 'pessoas-core',
      description: 'Syncs main person/customer data from CV CRM',
      tables: ['cvcrm_pessoas'],
      endpoints: [
        {
          path: '/api/v1/cadastros/pessoas',
          tokenEnvVar: 'CVCRM_TOKEN_PESSOA',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: [],
      priority: 1,
    };

    super(config);
  }

  transformData(cvcrmData: CVCRMPessoaData): DBPessoaData {
    return {
      cvcrm_id: cvcrmData.id,
      nome: cvcrmData.nome,
      email: cvcrmData.email,
      telefone: cvcrmData.telefone,
      celular: cvcrmData.celular,
      cpf: cvcrmData.cpf,
      cnpj: cvcrmData.cnpj,
      rg: cvcrmData.rg,
      data_nascimento: cvcrmData.data_nascimento ? new Date(cvcrmData.data_nascimento) : undefined,
      sexo: cvcrmData.sexo,
      estado_civil: cvcrmData.estado_civil,
      nacionalidade: cvcrmData.nacionalidade,
      profissao: cvcrmData.profissao,
      renda: cvcrmData.renda,
      cep: cvcrmData.cep,
      endereco: cvcrmData.endereco,
      numero: cvcrmData.numero,
      complemento: cvcrmData.complemento,
      bairro: cvcrmData.bairro,
      cidade: cvcrmData.cidade,
      estado: cvcrmData.estado,
      tipo_pessoa: cvcrmData.tipo_pessoa,
      data_cadastro_cvcrm: cvcrmData.data_cad ? new Date(cvcrmData.data_cad) : undefined,
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, nome, email, telefone, celular, cpf, cnpj, rg,
        data_nascimento, sexo, estado_civil, nacionalidade, profissao,
        renda, cep, endereco, numero, complemento, bairro, cidade, estado,
        tipo_pessoa, data_cadastro_cvcrm, cvcrm_data, synced_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        celular = EXCLUDED.celular,
        cpf = EXCLUDED.cpf,
        cnpj = EXCLUDED.cnpj,
        rg = EXCLUDED.rg,
        data_nascimento = EXCLUDED.data_nascimento,
        sexo = EXCLUDED.sexo,
        estado_civil = EXCLUDED.estado_civil,
        nacionalidade = EXCLUDED.nacionalidade,
        profissao = EXCLUDED.profissao,
        renda = EXCLUDED.renda,
        cep = EXCLUDED.cep,
        endereco = EXCLUDED.endereco,
        numero = EXCLUDED.numero,
        complemento = EXCLUDED.complemento,
        bairro = EXCLUDED.bairro,
        cidade = EXCLUDED.cidade,
        estado = EXCLUDED.estado,
        tipo_pessoa = EXCLUDED.tipo_pessoa,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBPessoaData) => [
      data.cvcrm_id, data.nome, data.email, data.telefone, data.celular,
      data.cpf, data.cnpj, data.rg, data.data_nascimento, data.sexo,
      data.estado_civil, data.nacionalidade, data.profissao, data.renda,
      data.cep, data.endereco, data.numero, data.complemento, data.bairro,
      data.cidade, data.estado, data.tipo_pessoa, data.data_cadastro_cvcrm,
      data.cvcrm_data, data.synced_at,
    ];

    return { sql, getParams };
  }

  async sync(fullSync = false) {
    console.log('[PessoasCoreAgent] Starting pessoas sync...');

    const results = await this.syncTable(
      'cvcrm_pessoas',
      '/api/v1/cadastros/pessoas',
      'CVCRM_TOKEN_PESSOA',
      { fullSync, batchSize: 100 }
    );

    console.log('[PessoasCoreAgent] Sync completed:', {
      total: results.total,
      created: results.created,
      updated: results.updated,
    });

    return results;
  }
}

export const pessoasCoreAgent = new PessoasCoreAgent();
