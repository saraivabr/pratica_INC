import { dbQuery } from "@/lib/db";
import { normalizePhone } from "@/lib/supabase";

type LeadSnapshot = {
  idlead?: number;
  nome?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  situacao?: { nome?: string };
  gestor?: string;
  corretor?: { nome?: string } | string;
  origem?: string;
  midia?: string;
  empreendimento?: Array<{ id?: number; nome?: string }>;
  interacao?: Array<{ descricao?: string; data_cad?: string }>;
};

export async function getLeadInsight(phone: string) {
  const normalized = normalizePhone(phone);
  const { rows } = await dbQuery(
    `select leads, empreendimentos, unidades, created_at
     from cvcrm_snapshots
     order by created_at desc
     limit 1`
  );
  if (!rows[0]) return null;
  const leads: LeadSnapshot[] = rows[0].leads || [];
  const unidades: any[] = rows[0].unidades || [];
  const empreendimentos: any[] = rows[0].empreendimentos || [];

  const matches = leads.filter((lead) => {
    const phones = [
      lead.telefone,
      lead.celular,
      lead.email,
      "",
    ]
      .filter(Boolean)
      .map((value) => normalizePhone(String(value)))
      .filter(Boolean);
    return phones.includes(normalized);
  });
  if (matches.length === 0) return null;

  const lead = matches[0];
  const lastInteraction = lead.interacao?.slice(-1)[0];
  const summary = [
    `Lead: ${lead.nome || "Sem nome"}`,
    `Telefone: ${lead.telefone || lead.celular || "Não disponível"}`,
    `Origem: ${lead.origem || lead.midia || "Não informado"}`,
    `Status: ${(lead.situacao?.nome || "Sem situação").toUpperCase()}`,
    `Corretor: ${
      typeof lead.corretor === "object"
        ? lead.corretor?.nome
        : typeof lead.corretor === "string"
        ? lead.corretor
        : lead.gestor || "N/D"
    }`,
    `Interesse: ${lead.empreendimento?.[0]?.nome || "Não informado"}`,
  ].join("\n");

  const detailLines = [
    `Última interação: ${
      lastInteraction?.descricao || "Sem interação registrada"
    } em ${lastInteraction?.data_cad || "desconhecido"}`,
    `Registros encontrados: ${matches.length}`,
  ];

  const matchedUnits = unidades.filter((unit) => {
    const empId = String(unit.idempreendimento || unit.empreendimento_id || "");
    const interestedId = String(lead.empreendimento?.[0]?.id || "");
    return empId && interestedId && empId === interestedId;
  });

  if (matchedUnits.length > 0) {
    detailLines.push(
      `Unidades relacionadas: ${matchedUnits.length} (disponíveis: ${matchedUnits.filter(
        (u) =>
          ["D", "DISPONIVEL", "DISPONÍVEL", "A", "ATIVO"].includes(
            String(u.situacao || u.idunidadesituacao || "").toUpperCase()
          )
      ).length})`
    );
  }

  const detail = detailLines.join("\n");
  return { summary, detail };
}

export async function saveLeadInsight(phone: string, summary: string, detail: string) {
  const slug = Math.random().toString(36).slice(2, 12);
  await dbQuery(
    `insert into lead_insights (slug, phone, summary, detail)
     values ($1, $2, $3, $4)`,
    [slug, phone, summary, detail]
  );
  return slug;
}

export async function getInsightBySlug(slug: string) {
  const { rows } = await dbQuery(`select * from lead_insights where slug = $1`, [slug]);
  return rows[0] || null;
}
