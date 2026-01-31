/**
 * Types for CV CRM Sync System
 */

// Sync Status
export type SyncStatus = 'pending' | 'running' | 'completed' | 'error' | 'partial';

// Sync Operation Types
export type SyncOperation = 'created' | 'updated' | 'skipped' | 'error';

// Base Sync Result
export interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  id?: string | number;
  cvcrmId?: number;
  error?: string;
  data?: Record<string, unknown>;
}

// Batch Sync Result
export interface BatchSyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  results: SyncResult[];
  duration: number;
  startedAt: Date;
  completedAt: Date;
}

// Sync Log Entry
export interface SyncLog {
  id: string;
  agentName: string;
  tableName: string;
  syncType: 'full' | 'incremental';
  status: SyncStatus;
  startedAt: Date;
  completedAt?: Date;
  totalItems: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ id: number; error: string }>;
  cursor?: string;
  metadata?: Record<string, unknown>;
}

// Cursor State
export interface CursorState {
  agentName: string;
  tableName: string;
  lastSyncAt: Date;
  lastId?: number;
  lastOffset?: number;
  metadata?: Record<string, unknown>;
}

// Rate Limiter Config
export interface RateLimiterConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerSecond: number;
  burstLimit: number;
  retryAfterMs: number;
}

// API Endpoint Config
export interface EndpointConfig {
  path: string;
  tokenEnvVar: string;
  method: 'GET' | 'POST';
  supportsIncremental: boolean;
  paginationType: 'offset' | 'cursor' | 'page' | 'none';
  pageSize: number;
}

// Agent Configuration
export interface AgentConfig {
  name: string;
  description: string;
  tables: string[];
  endpoints: EndpointConfig[];
  dependencies: string[];
  priority: number;
  rateLimiter?: RateLimiterConfig;
}

// CV CRM API Response
export interface CVCRMApiResponse<T = unknown> {
  codigo?: number;
  total?: number;
  data?: T[];
  leads?: T[];
  registros?: T[];
  [key: string]: unknown;
}

// CV CRM Lead Types
export interface CVCRMLeadCore {
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
    email?: string;
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
  empreendimento?: Array<{
    id: number;
    nome: string;
    etapa?: string;
  }>;
  interacao?: Array<{
    id: number;
    descricao: string;
    data_cad: string;
    tipo?: string;
    usuario?: string;
  }>;
  campos_adicionais?: Record<string, unknown>;
  [key: string]: unknown;
}

// CV CRM Lead Conversion
export interface CVCRMLeadConversao {
  idlead: number;
  tipo: 'ganho' | 'perdido';
  motivo_perda?: {
    id: number;
    nome: string;
  };
  data_conversao?: string;
  valor_reserva?: number;
  unidade_reservada?: {
    id: number;
    nome: string;
    empreendimento_id: number;
  };
  [key: string]: unknown;
}

// CV CRM Lead Interaction
export interface CVCRMLeadInteracao {
  id: number;
  idlead: number;
  tipo: string;
  descricao: string;
  data_cad: string;
  usuario?: {
    id: number;
    nome: string;
  };
  anexos?: Array<{
    id: number;
    nome: string;
    url: string;
  }>;
  [key: string]: unknown;
}

// CV CRM Lead Task
export interface CVCRMLeadTarefa {
  id: number;
  idlead: number;
  titulo: string;
  descricao?: string;
  tipo: string;
  status: string;
  prioridade?: string;
  data_agendamento: string;
  data_conclusao?: string;
  responsavel?: {
    id: number;
    nome: string;
  };
  [key: string]: unknown;
}

// CV CRM Lead Visit
export interface CVCRMLeadVisita {
  id: number;
  idlead: number;
  empreendimento_id: number;
  data_agendamento: string;
  data_realizacao?: string;
  status: string;
  observacoes?: string;
  corretor?: {
    id: number;
    nome: string;
  };
  [key: string]: unknown;
}

// CV CRM Lead History
export interface CVCRMLeadHistorico {
  id: number;
  idlead: number;
  tipo: string;
  campo?: string;
  valor_anterior?: string;
  valor_novo?: string;
  data_alteracao: string;
  usuario?: {
    id: number;
    nome: string;
  };
  [key: string]: unknown;
}

// Database Entity Types
export interface DBLeadCore {
  id: string;
  cvcrm_id: number;
  nome: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  data_cadastro_cvcrm: Date;
  data_atualizacao_cvcrm?: Date;
  origem?: string;
  midia_principal?: string;
  sub_midia?: string;
  campanha?: string;
  score?: number;
  tipo_lead?: string;
  classificacao?: string;
  corretor_id?: string;
  cvcrm_corretor_id?: number;
  imobiliaria_id?: string;
  cvcrm_imobiliaria_id?: number;
  situacao_id?: number;
  situacao_nome?: string;
  situacao_cor?: string;
  cvcrm_data: Record<string, unknown>;
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}
