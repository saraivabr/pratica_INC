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

// Adjusted to match existing cvcrm_leads table schema
interface DBLeadData {
  idlead: number;
  nome: string;
  email?: string;
  telefone?: string;
  score?: number;
  origem?: string;
  midia_principal?: string;
  corretor_id?: number;
  imobiliaria_id?: number;
  situacao_id?: number;
  data_cad: Date;
  campos_adicionais: string; // JSON string
  synced_at: Date;
  // We can add more if needed, but these exist in the table
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
      idlead: cvcrmData.idlead,
      nome: cvcrmData.nome,
      email: cvcrmData.email,
      telefone: cvcrmData.telefone || cvcrmData.celular,
      score: cvcrmData.score,
      origem: cvcrmData.origem,
      midia_principal: cvcrmData.midia_principal,
      corretor_id: cvcrmData.corretor?.id,
      imobiliaria_id: cvcrmData.imobiliaria?.id,
      situacao_id: cvcrmData.situacao?.id,
      data_cad: new Date(cvcrmData.data_cad),
      campos_adicionais: JSON.stringify(cvcrmData.campos_adicionais || {}),
      synced_at: new Date(),
    };
  }

  /**
   * Get upsert query for leads table
   */
  getUpsertQuery(tableName: string) {
    const sql = `
      INSERT INTO ${tableName} (
        idlead, nome, email, telefone, 
        score, origem, midia_principal,
        corretor_id, imobiliaria_id, situacao_id,
        data_cad, campos_adicionais, synced_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13
      )
      ON CONFLICT (idlead)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        telefone = EXCLUDED.telefone,
        score = EXCLUDED.score,
        origem = EXCLUDED.origem,
        midia_principal = EXCLUDED.midia_principal,
        corretor_id = EXCLUDED.corretor_id,
        imobiliaria_id = EXCLUDED.imobiliaria_id,
        situacao_id = EXCLUDED.situacao_id,
        data_cad = EXCLUDED.data_cad,
        campos_adicionais = EXCLUDED.campos_adicionais,
        synced_at = EXCLUDED.synced_at,
        updated_at = NOW()
    `;

    const getParams = (data: DBLeadData) => [
      data.idlead,
      data.nome,
      data.email,
      data.telefone,
      data.score,
      data.origem,
      data.midia_principal,
      data.corretor_id,
      data.imobiliaria_id,
      data.situacao_id,
      data.data_cad,
      data.campos_adicionais,
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