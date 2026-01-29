// CataVendas TypeScript Interfaces

export interface Corretor {
  id: string;
  name: string;
  nome: string;
  telefone: string;
  phone: string;
  evolution_instance_name: string;
  workspace_id?: number;
  role?: string;
  cvcrm_id?: string;
}

export interface Lead {
  nome: string;
  telefone: string;
  celular: string;
  situacao_nome: string;
  empreendimentos: string;
  valor_negocio: number;
  data_cad: string;
  corretor_id?: number;
  corretor_nome?: string;
}

export interface ColdLead extends Lead {
  phone_number: string;
  contact_name: string;
  last_message: string;
  last_message_date: string;
  is_from_me: boolean;
  days_since_contact: number;
  lead_name: string;
}

export interface Property {
  nome: string;
  cidade: string;
  uf: string;
  status: string;
  disponiveis: number;
  total_unidades: number;
}

export interface PipelineStatus {
  situacao_nome: string;
  total: number;
}

export interface ConversationMessage {
  message_text: string;
  timestamp: string;
  is_from_me: boolean;
  contact_name: string;
}

export interface CataVendasContext {
  corretor: Corretor;
  workspaceId: number;
  instanceName: string;
  userMessage: string;
  intent?: string;
  data?: {
    leads?: Lead[];
    coldLeads?: ColdLead[];
    properties?: Property[];
    pipeline?: PipelineStatus[];
    conversations?: ConversationMessage[];
    leadDetail?: Lead & { conversations: ConversationMessage[] };
  };
}

export interface ActionResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export type CataVendasIntent = 
  | 'catavendas_scan'
  | 'list_properties'
  | 'my_leads'
  | 'generate_followup'
  | 'pipeline_status'
  | 'lead_detail'
  | 'general_help';

export interface FollowUpRequest {
  leadName?: string;
  leadPhone?: string;
  suggestedMessage?: string;
  confirmed?: boolean;
}