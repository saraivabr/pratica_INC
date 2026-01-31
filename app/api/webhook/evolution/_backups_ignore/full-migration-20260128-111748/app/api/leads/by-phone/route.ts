import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import pool from '@/lib/db';

/**
 * Helper para limpar formatação de telefone
 * Remove tudo que não for dígito
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza telefone para múltiplos formatos de busca
 * Ex: 5511999999999 pode estar salvo como:
 * - 5511999999999 (completo com DDI)
 * - 11999999999 (sem DDI)
 * - 999999999 (sem DDD)
 * - +5511999999999 (com +)
 */
function getPhoneVariants(phone: string): string[] {
  const clean = cleanPhoneNumber(phone);
  const variants = new Set<string>();

  variants.add(clean);

  // Se começar com 55 (Brasil), adicionar versão sem DDI
  if (clean.startsWith('55') && clean.length >= 12) {
    variants.add(clean.substring(2)); // Sem DDI
  }

  // Se tiver 11 dígitos (DDD + celular), adicionar com DDI
  if (clean.length === 11) {
    variants.add('55' + clean);
  }

  // Se tiver 9 dígitos (só celular), provavelmente inválido mas adicionar
  if (clean.length === 9) {
    variants.add(clean);
  }

  return Array.from(variants);
}

interface LeadResult {
  idlead: number;
  nome: string;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cpf: string | null;
  origem: string | null;
  midia_principal: string | null;
  situacao: any;
  situacao_id: number | null;
  corretor: any;
  corretor_id: number | null;
  empreendimento: any;
  imobiliaria: any;
  score: number | null;
  valor_negocio: number | null;
  renda_familiar: number | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  tags: any;
  data_cad: string | null;
  ultima_data_conversao: string | null;
  cvcrm_data: any;
}

interface WhatsAppContact {
  id: number;
  phone_number: string;
  name: string | null;
  profile_picture_url: string | null;
  is_business: boolean;
  is_group: boolean;
  lead_id: number | null;
  total_messages_received: number;
  total_messages_sent: number;
  last_message_at: string | null;
  last_interaction_at: string | null;
}

interface Interacao {
  id: string;
  cvcrm_id: number;
  tipo: string | null;
  descricao: string | null;
  data_cadastro: string | null;
  usuario_nome: string | null;
}

/**
 * GET /api/leads/by-phone?phone=5511999999999
 *
 * Busca lead por telefone e enriquece com dados de WhatsApp e interações.
 *
 * Response:
 * {
 *   source: "cvcrm" | "whatsapp" | "both" | "none",
 *   lead: { ... } | null,
 *   whatsapp_contact: { ... } | null,
 *   pipeline_stage: string | null,
 *   interacoes: [...],
 *   tags: [...]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Autenticação e contexto do tenant
    const ctx = await requireTenantContext(request);
    if (ctx.error) return ctx.error;

    const { tenantId } = ctx;

    // Obter e validar parâmetro phone
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Parâmetro phone é obrigatório' },
        { status: 400 }
      );
    }

    const cleanPhone = cleanPhoneNumber(phone);
    if (cleanPhone.length < 8) {
      return NextResponse.json(
        { error: 'Telefone inválido. Mínimo 8 dígitos.' },
        { status: 400 }
      );
    }

    const phoneVariants = getPhoneVariants(cleanPhone);

    // Buscar lead no cvcrm_leads
    // Usar LIKE para comparar versões limpas do telefone
    const leadQuery = `
      SELECT
        idlead, nome, email, telefone, celular, cpf,
        origem, midia_principal, situacao, situacao_id,
        corretor, corretor_id, empreendimento, imobiliaria,
        score, valor_negocio, renda_familiar,
        cidade, estado, bairro, tags,
        data_cad, ultima_data_conversao, cvcrm_data
      FROM cvcrm_leads
      WHERE tenant_id = $1
        AND (
          REGEXP_REPLACE(COALESCE(telefone, ''), '[^0-9]', '', 'g') = ANY($2::text[])
          OR REGEXP_REPLACE(COALESCE(celular, ''), '[^0-9]', '', 'g') = ANY($2::text[])
        )
      ORDER BY data_cad DESC NULLS LAST
      LIMIT 1
    `;

    const leadResult = await pool.query<LeadResult>(leadQuery, [tenantId, phoneVariants]);
    const lead = leadResult.rows[0] || null;

    // Buscar contato WhatsApp
    const whatsappQuery = `
      SELECT
        id, phone_number, name, profile_picture_url,
        is_business, is_group, lead_id,
        total_messages_received, total_messages_sent,
        last_message_at, last_interaction_at
      FROM whatsapp_contacts
      WHERE tenant_id = $1
        AND REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g') = ANY($2::text[])
      LIMIT 1
    `;

    const whatsappResult = await pool.query<WhatsAppContact>(whatsappQuery, [tenantId, phoneVariants]);
    const whatsappContact = whatsappResult.rows[0] || null;

    // Determinar source
    let source: 'cvcrm' | 'whatsapp' | 'both' | 'none';
    if (lead && whatsappContact) {
      source = 'both';
    } else if (lead) {
      source = 'cvcrm';
    } else if (whatsappContact) {
      source = 'whatsapp';
    } else {
      source = 'none';
    }

    // Buscar interações se tiver lead
    let interacoes: Interacao[] = [];
    if (lead) {
      const interacoesQuery = `
        SELECT
          id, cvcrm_id, tipo, descricao, data_cadastro, usuario_nome
        FROM cvcrm_lead_interacoes
        WHERE tenant_id = $1 AND cvcrm_lead_id = $2
        ORDER BY data_cadastro DESC
        LIMIT 10
      `;
      const interacoesResult = await pool.query<Interacao>(interacoesQuery, [tenantId, lead.idlead]);
      interacoes = interacoesResult.rows;
    }

    // Extrair tags e pipeline_stage
    let tags: string[] = [];
    let pipelineStage: string | null = null;

    if (lead) {
      // Parse tags
      if (lead.tags) {
        try {
          tags = typeof lead.tags === 'string' ? JSON.parse(lead.tags) : lead.tags;
        } catch {
          tags = [];
        }
      }

      // Pipeline stage baseado na situação
      if (lead.situacao) {
        try {
          const situacaoObj = typeof lead.situacao === 'string'
            ? JSON.parse(lead.situacao)
            : lead.situacao;
          pipelineStage = situacaoObj?.nome || null;
        } catch {
          pipelineStage = null;
        }
      }
    }

    // Normalizar dados do lead
    let normalizedLead = null;
    if (lead) {
      const parseJsonField = (field: any) => {
        if (!field) return null;
        try {
          return typeof field === 'string' ? JSON.parse(field) : field;
        } catch {
          return null;
        }
      };

      normalizedLead = {
        id: lead.idlead,
        nome: lead.nome || 'Sem nome',
        email: lead.email,
        telefone: lead.telefone || lead.celular,
        cpf: lead.cpf,
        origem: lead.origem || lead.midia_principal,
        situacao: parseJsonField(lead.situacao),
        situacao_id: lead.situacao_id,
        corretor: parseJsonField(lead.corretor),
        corretor_id: lead.corretor_id,
        empreendimento: parseJsonField(lead.empreendimento),
        imobiliaria: parseJsonField(lead.imobiliaria),
        score: lead.score,
        valor_negocio: lead.valor_negocio,
        renda_familiar: lead.renda_familiar,
        cidade: lead.cidade,
        estado: lead.estado,
        bairro: lead.bairro,
        data_cadastro: lead.data_cad,
        ultima_conversao: lead.ultima_data_conversao,
      };
    }

    // Normalizar dados do WhatsApp contact
    let normalizedWhatsappContact = null;
    if (whatsappContact) {
      normalizedWhatsappContact = {
        id: whatsappContact.id,
        phone_number: whatsappContact.phone_number,
        name: whatsappContact.name,
        profile_picture_url: whatsappContact.profile_picture_url,
        is_business: whatsappContact.is_business,
        is_group: whatsappContact.is_group,
        lead_id: whatsappContact.lead_id,
        total_messages: whatsappContact.total_messages_received + whatsappContact.total_messages_sent,
        messages_received: whatsappContact.total_messages_received,
        messages_sent: whatsappContact.total_messages_sent,
        last_message_at: whatsappContact.last_message_at,
        last_interaction_at: whatsappContact.last_interaction_at,
      };
    }

    return NextResponse.json({
      source,
      lead: normalizedLead,
      whatsapp_contact: normalizedWhatsappContact,
      pipeline_stage: pipelineStage,
      interacoes: interacoes.map(i => ({
        id: i.id,
        cvcrm_id: i.cvcrm_id,
        tipo: i.tipo,
        descricao: i.descricao,
        data: i.data_cadastro,
        usuario: i.usuario_nome,
      })),
      tags,
    });

  } catch (error) {
    console.error('Erro ao buscar lead por telefone:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar lead', details: String(error) },
      { status: 500 }
    );
  }
}
