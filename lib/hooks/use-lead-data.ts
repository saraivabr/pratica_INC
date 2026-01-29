'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================
// Types
// ============================================

interface CVCRMLead {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  origem?: string;
  midia?: string;
  gestor?: string;
  imobiliaria?: string;
  corretor?: string;
  data_cadastro?: string;
  empreendimento?: string;
  situacao?: string;
  [key: string]: unknown;
}

interface WhatsAppContact {
  id: string;
  phone: string;
  name?: string;
  push_name?: string;
  profile_picture_url?: string;
  last_message_at?: string;
  created_at?: string;
  updated_at?: string;
  workspace_id?: string;
  user_id?: string;
  [key: string]: unknown;
}

interface LeadData {
  lead: CVCRMLead | null;
  contact: WhatsAppContact | null;
  found: boolean;
  source: 'cvcrm' | 'whatsapp' | 'both' | 'none';
}

interface UseLeadDataReturn {
  lead: CVCRMLead | null;
  contact: WhatsAppContact | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  source: LeadData['source'];
}

// ============================================
// Query Key
// ============================================

export const leadDataQueryKey = (phone: string | null) =>
  phone ? ['lead-data', phone] : ['lead-data'];

// ============================================
// Fetcher
// ============================================

async function fetchLeadData(phone: string): Promise<LeadData> {
  const res = await fetch(`/api/leads/by-phone?phone=${encodeURIComponent(phone)}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'Erro ao buscar dados do lead');
  }

  const data = await res.json();

  return {
    lead: data.lead || null,
    contact: data.contact || null,
    found: data.found ?? (!!data.lead || !!data.contact),
    source: data.source || determineSource(data.lead, data.contact),
  };
}

function determineSource(lead: CVCRMLead | null, contact: WhatsAppContact | null): LeadData['source'] {
  if (lead && contact) return 'both';
  if (lead) return 'cvcrm';
  if (contact) return 'whatsapp';
  return 'none';
}

// ============================================
// Hook
// ============================================

/**
 * Hook para buscar dados de lead combinando CV CRM + WhatsApp
 *
 * @param phone - Telefone do lead (formato: apenas numeros ou com DDI)
 * @returns Dados do lead, contato WhatsApp, estados de loading/erro e funcao refetch
 *
 * @example
 * ```tsx
 * const { lead, contact, loading, error, refetch } = useLeadData('5511999999999');
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <div>
 *     <h1>{lead?.nome || contact?.push_name || 'Desconhecido'}</h1>
 *     <p>{lead?.email}</p>
 *   </div>
 * );
 * ```
 */
export function useLeadData(phone: string | null): UseLeadDataReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch: queryRefetch } = useQuery({
    queryKey: leadDataQueryKey(phone),
    queryFn: () => fetchLeadData(phone!),
    enabled: !!phone && phone.length >= 8, // Minimo de 8 digitos para um telefone valido
    staleTime: 2 * 60 * 1000, // 2 minutos - dados dinamicos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });

  const refetch = () => {
    if (phone) {
      // Invalida a query e refaz o fetch
      queryClient.invalidateQueries({ queryKey: leadDataQueryKey(phone) });
      queryRefetch();
    }
  };

  return {
    lead: data?.lead ?? null,
    contact: data?.contact ?? null,
    loading: isLoading,
    error: error as Error | null,
    refetch,
    source: data?.source ?? 'none',
  };
}

export default useLeadData;
