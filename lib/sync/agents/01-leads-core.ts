/**
 * Agent 01: Leads Core
 * Synchronizes main lead data from CV CRM
 */

import { BaseSyncAgent } from '../base-agent';
import { CVCRMLeadCore, DBLeadCore, AgentConfig } from '../types';

interface CVCRMLeadData {
  idlead: number;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  data_cad: string;
  data_atualizacao?: string;
  origem?: string;
  midia_principal?: string;
  sub_midia?: string;
  campanha?: string;
  score?: number;
  tipo_lead?: string;
  classificacao?: string;
  corretor?: {
    id: number;
    nome: string;
  };
  imobiliaria?: {
    id: number;
    nome: string;
  };
  situacao?: {
    id: number;
    nome: string;
    cor?: string;
  };
  empreendimentos?: Array<{
    id: number;
    nome: string;
  }>;
  campos_adicionais?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DBLeadData {
  cvcrm_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  score?: number;
  origem?: string;
  midia_principal?: string;
  corretor_id?: number;
  corretor_nome?: string;
  imobiliaria_id?: number;
  imobiliaria_nome?: string;
  situacao_id?: number;
  situacao_nome?: string;
  situacao_cor?: string;
  data_cadastro_cvcrm: Date;
  campos_adicionais: string;
  cvcrm_data: string;
  synced_at: Date;
}

export class LeadsCoreAgent extends BaseSyncAgent<CVCRMLeadData, DBLeadData> {
  constructor() {
    const config: AgentConfig = {
      name: 'leads-core',
      description: 'Syncs main lead data from CV CRM',
      tables: ['cvcrm_leads'],
      endpoints: [
        {
          path: '/api/v1/comercial/leads',
          tokenEnvVar: 'CVCRM_TOKEN_LEAD',
          method: 'GET',
          supportsIncremental: true,
          paginationType: 'offset',
          pageSize: 100,
        },
      ],
      dependencies: [],
      priority: 1,
      rateLimiter: {
        maxRequestsPerMinute: 60,
        maxRequestsPerSecond: 3,
        burstLimit: 10,
        retryAfterMs: 1000,
      },
    };

    super(config);
  }

  /**
   * Transform CV CRM lead data to database format
   */
  transformData(cvcrmData: CVCRMLeadData): DBLeadData {
    return {
      cvcrm_id: cvcrmData.idlead,
      nome: cvcrmData.nome,
      email: cvcrmData.email,
      telefone: cvcrmData.telefone || cvcrmData.celular,
      score: cvcrmData.score,
      origem: cvcrmData.origem,
      midia_principal: cvcrmData.midia_principal,
      corretor_id: cvcrmData.corretor?.id,
      corretor_nome: cvcrmData.corretor?.nome,
      imobiliaria_id: cvcrmData.imobiliaria?.id,
      imobiliaria_nome: cvcrmData.imobiliaria?.nome,
      situacao_id: cvcrmData.situacao?.id,
      situacao_nome: cvcrmData.situacao?.nome,
      situacao_cor: cvcrmData.situacao?.cor,
      data_cadastro_cvcrm: new Date(cvcrmData.data_cad),
      campos_adicionais: JSON.stringify(cvcrmData.campos_adicionais || {}),
      cvcrm_data: JSON.stringify(cvcrmData),
      synced_at: new Date(),
    };
  }

  /**
   * Get upsert query for leads table
   */
  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        cvcrm_id, nome, email, telefone,
        score, origem, midia_principal,
        corretor_id, corretor_nome,
        imobiliaria_id, imobiliaria_nome,
        situacao_id, situacao_nome, situacao_cor,
        data_cadastro_cvcrm, campos_adicionais, cvcrm_data, synced_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18
      )
      ON CONFLICT (cvcrm_id)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        score = EXCLUDED.score,
        origem = EXCLUDED.origem,
        midia_principal = EXCLUDED.midia_principal,
        corretor_id = EXCLUDED.corretor_id,
        corretor_nome = EXCLUDED.corretor_nome,
        imobiliaria_id = EXCLUDED.imobiliaria_id,
        imobiliaria_nome = EXCLUDED.imobiliaria_nome,
        situacao_id = EXCLUDED.situacao_id,
        situacao_nome = EXCLUDED.situacao_nome,
        situacao_cor = EXCLUDED.situacao_cor,
        data_cadastro_cvcrm = EXCLUDED.data_cadastro_cvcrm,
        campos_adicionais = EXCLUDED.campos_adicionais,
        cvcrm_data = EXCLUDED.cvcrm_data,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBLeadData) => [
      data.cvcrm_id,
      data.nome,
      data.email,
      data.telefone,
      data.score,
      data.origem,
      data.midia_principal,
      data.corretor_id,
      data.corretor_nome,
      data.imobiliaria_id,
      data.imobiliaria_nome,
      data.situacao_id,
      data.situacao_nome,
      data.situacao_cor,
      data.data_cadastro_cvcrm,
      data.campos_adicionais,
      data.cvcrm_data,
      data.synced_at,
    ];

    return { sql, getParams };
  }

  /**
   * Run full sync of leads
   */
  async sync(fullSync = false) {
    console.log('[LeadsCoreAgent] Starting leads sync...');

    const results = await this.syncTable(
      'cvcrm_leads',
      '/api/v1/comercial/leads',
      'CVCRM_TOKEN_LEAD',
      { fullSync, batchSize: 100 }
    );

    console.log('[LeadsCoreAgent] Sync completed:', {
      total: results.total,
      created: results.created,
      updated: results.updated,
      errors: results.errors,
      duration: `${(results.duration / 1000).toFixed(2)}s`,
    });

    return results;
  }
}

// Export singleton instance
export const leadsCoreAgent = new LeadsCoreAgent();
