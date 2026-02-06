import OpenAI from "openai";
import { dbQuery } from "@/lib/db";
import { normalizePhone } from "@/lib/supabase";
import { sendToClient } from "@/lib/evolution-helpers";
import { getLeadsCVCRM } from "@/lib/cvcrm-client";

type SituacaoLead = "IRREGULAR" | "PERDIDO";

export interface LeadRecoveryCandidate {
  atendimentoId: string;
  clienteNome: string;
  corretorId: string;
  corretorNome: string;
  phone: string;
  situacao: SituacaoLead;
  dataCriacao?: string;
  interesse?: {
    tipoImovel?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    campanha?: string | null;
    formulario?: string | null;
    empreendimentoNome?: string | null;
  };
  interacoes?: Array<{ descricao?: string; data_cad?: string }>;
}

export interface LeadRecoveryResult {
  atendimentoId: string;
  phone: string;
  status: "sent" | "skipped" | "error";
  reason?: string;
  message?: string;
  situacao: SituacaoLead;
}

interface AtendimentoInteresse {
  tipoImovel?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  campanha?: string | null;
  formulario?: string | null;
  empreendimentoNome?: string | null;
}

// Lazy initialization to avoid build-time errors
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
    });
  }
  return _openai;
}

function addNinthDigit(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("55")) {
    return `${digits.slice(0, 4)}9${digits.slice(4)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 2)}9${digits.slice(2)}`;
  }

  return raw;
}

function normalizeString(input?: string | null): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchCorretor(candidateName?: string | null, userName?: string | null) {
  if (!candidateName || !userName) return true;
  const a = normalizeString(candidateName);
  const b = normalizeString(userName);
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

async function alreadySentToday(atendimentoId: string): Promise<boolean> {
  try {
    const { rows } = await dbQuery(
      `select 1
         from lead_recovery_logs
        where atendimento_id = $1
          and status = 'sent'
          and created_at >= (now() - interval '24 hours')
        limit 1`,
      [atendimentoId]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Erro ao verificar lead_recovery_logs:", error);
    return false;
  }
}

async function logRecovery(result: {
  atendimentoId: string;
  corretorId?: string;
  phone: string;
  clienteNome?: string;
  situacao: SituacaoLead;
  status: "sent" | "skipped" | "error";
  reason?: string;
  message?: string;
  response?: unknown;
}) {
  try {
    await dbQuery(
      `insert into lead_recovery_logs
        (atendimento_id, corretor_id, phone, cliente_nome, situacao, status, reason, message, response)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        result.atendimentoId,
        result.corretorId || null,
        result.phone,
        result.clienteNome || null,
        result.situacao,
        result.status,
        result.reason || null,
        result.message || null,
        result.response || null,
      ]
    );
  } catch (error) {
    console.error("Erro ao registrar lead recovery:", error);
  }
}

function buildHistoricoFromInteracoes(
  interacoes?: Array<{ descricao?: string; data_cad?: string }>
): string {
  if (!interacoes || interacoes.length === 0) return "";
  const parts = interacoes
    .map((i) => {
      const data = i.data_cad ? new Date(i.data_cad).toISOString() : "";
      return `${data} | ${i.descricao || ""}`.trim();
    })
    .filter(Boolean);
  return parts.join("\n---\n");
}

async function fetchHistorico(atendimentoId: string): Promise<string> {
  const query = `
    SELECT STRING_AGG(
      FORMAT(
        '%s | %s | %s | %s',
        TO_CHAR(av.data_criacao, 'DD/MM/YYYY HH24:MI'),
        CASE av.tipo_atendimento_evento
          WHEN 1 THEN 'Whatsapp'
          WHEN 2 THEN 'Ligação'
          WHEN 3 THEN 'Email'
          WHEN 4 THEN 'Parceria'
          WHEN 5 THEN 'Pessoal'
          WHEN 6 THEN 'Sistema'
          WHEN 7 THEN 'Desistência'
          WHEN 8 THEN 'Reunião'
          WHEN 9 THEN 'SMS'
          WHEN 10 THEN 'Nota'
          WHEN 11 THEN 'Apresentação'
          WHEN 12 THEN 'Imóvel'
          WHEN 13 THEN 'Termômetro'
          WHEN 14 THEN 'Atribuição'
          WHEN 15 THEN 'Proposta'
          WHEN 16 THEN 'Salva Leads'
          ELSE 'Indefinido'
        END,
        COALESCE(us.full_name, 'Sistema'),
        av.descricao
      ),
      E'\\n---\\n'
      ORDER BY av.data_criacao
    ) AS historico
    FROM atendimento_evento av
      LEFT JOIN asp_net_users us ON av.user_id = us.id
    WHERE av.atendimento_id = $1
      AND av.descricao IS NOT NULL
      AND LOWER(av.descricao) NOT LIKE '%redistrib%';
  `;

  try {
    const { rows } = await dbQuery<{ historico: string }>(query, [
      atendimentoId,
    ]);
    return rows[0]?.historico || "";
  } catch (error) {
    console.error("Erro ao buscar histórico do atendimento:", error);
    return "";
  }
}

async function classifyRecoveryPotential(input: {
  historico: string;
  interesse: AtendimentoInteresse;
}): Promise<{ status: "tem_potencial" | "encerrada"; reason: string }> {
  const prompt = `
Classifique se este atendimento tem potencial de recuperação.
Responda em JSON com as chaves "status" (tem_potencial|encerrada) e "reason".

Interesse:
- Imóvel: ${input.interesse.tipoImovel || "n/d"}
- Bairro: ${input.interesse.bairro || "n/d"}
- Cidade: ${input.interesse.cidade || "n/d"}
- Campanha: ${input.interesse.campanha || "n/d"}

Histórico:
${input.historico || "Sem histórico."}
`;

  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_RECOVERY_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Você é um analista de engajamento. Marque 'tem_potencial' quando houver chance de retomada ou quando o motivo da perda não for definitivo.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(content);
    if (parsed.status === "tem_potencial" || parsed.status === "encerrada") {
      return parsed;
    }
  } catch (error) {
    console.warn("Não consegui parsear resposta de classificação:", content);
  }

  return { status: "tem_potencial", reason: "Fallback: assumir recuperável" };
}

async function draftRecoveryMessage(input: {
  corretorNome: string;
  clienteNome: string;
  interesse: AtendimentoInteresse;
  historico: string;
}): Promise<string> {
  const prompt = `
Você é um agente de vendas tentando recuperar um lead perdido.
Escreva uma mensagem curta (máx 3 linhas) em tom humano e direto para retomar contato.

Dados:
- Corretor: ${input.corretorNome || "Equipe"}
- Lead: ${input.clienteNome || "Cliente"}
- Interesse: ${[
    input.interesse.tipoImovel,
    input.interesse.bairro,
    input.interesse.cidade,
  ]
    .filter(Boolean)
    .join(" | ") || "não informado"}

Histórico recente:
${input.historico || "sem histórico"}

Regras:
- Não use emojis.
- Não peça permissão para enviar opções, seja direto.
- Se não houver interesse claro, ofereça ajuda para entender o que o cliente busca.
- Use quebra de linha apenas onde natural, sem bullets.
`;

  const response = await getOpenAI().chat.completions.create({
    model: process.env.OPENAI_RECOVERY_MODEL || "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Responda apenas com a mensagem a ser enviada via WhatsApp.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
  });

  return response.choices[0]?.message?.content?.trim() || "";
}

async function fetchIrregulares(userId: string): Promise<LeadRecoveryCandidate[]> {
  const query = `
    WITH config_irregular AS (
        SELECT 
            cse.empresa_id,
            cse.number_value as dias_irregular
        FROM configuracoes_sistema cs
        INNER JOIN configuracoes_sistema_empresa cse ON cse.configuracoes_sistema_id = cs.id
        WHERE cs.descricao = 'DIAS_ATENDIMENTO_IRREGULAR'
    ),
    atendimentos_base AS (
        SELECT DISTINCT ON (
            ps.nome, 
            (SELECT '+' || tp.ddi || tp.numero as numero from pessoa_telefone tp 
             WHERE tp.pessoa_id = ps.id 
             AND tp.tipo = 2
             ORDER BY tp.principal
             LIMIT 1)
        )
            config.dias_irregular as dias_tolerancia,
            'IRREGULAR' situacao,
            CASE 
                WHEN ultimo_evento.max_proximo_contato IS NULL THEN 
                    'IRREGULAR (SEM EVENTO)'
                WHEN ultimo_evento.max_proximo_contato + (config.dias_irregular || ' days')::INTERVAL < CURRENT_DATE THEN 
                    'IRREGULAR (ATRASADO)'
                ELSE 'REGULAR'
            END as status,
            CASE 
                WHEN ultimo_evento.max_proximo_contato IS NULL THEN 
                    0
                WHEN ultimo_evento.max_proximo_contato + (config.dias_irregular || ' days')::INTERVAL < CURRENT_DATE THEN 
                    EXTRACT(DAYS FROM (CURRENT_DATE - (ultimo_evento.max_proximo_contato + (config.dias_irregular || ' days')::INTERVAL)))
                ELSE 
                    0
            END as dias_em_irregularidade,
            atd.data_criacao,
            atd.id,
            ps.nome nome_cliente,
            cr.nome nome_corretor,
            (SELECT '+' || tp.ddi || tp.numero as numero from pessoa_telefone tp 
             WHERE tp.pessoa_id = ps.id 
             AND tp.tipo = 2
             ORDER BY tp.principal
             LIMIT 1) fone_cliente
        FROM atendimento atd
        INNER JOIN config_irregular config ON config.empresa_id = atd.empresa_id
        INNER JOIN pessoa ps on atd.cliente_id = ps.id
        INNER JOIN pessoa cr on atd.corretor_id = cr.id
        LEFT JOIN LATERAL (
            SELECT MAX(ae.proximo_contato) as max_proximo_contato
            FROM atendimento_evento ae
            WHERE ae.atendimento_id = atd.id
                AND ae.excluido = FALSE 
                AND ae.proximo_contato IS NOT NULL
        ) ultimo_evento ON TRUE
        WHERE atd.excluido = false
        AND EXISTS (SELECT ae.id FROM atendimento_evento ae where ae.atendimento_id = atd.id)
        AND NOT EXISTS (SELECT ae.id FROM atendimento_evento ae where ae.atendimento_id = atd.id and ae.tipo_atendimento_evento = 16)
        AND atd.status in (4, 8, 2, 9)
        AND atd.corretor_id = $1
        AND (
            ultimo_evento.max_proximo_contato IS NULL 
            OR ultimo_evento.max_proximo_contato + (config.dias_irregular || ' days')::INTERVAL < CURRENT_DATE
        )
        ORDER BY 
            ps.nome, 
            fone_cliente,  
            atd.data_criacao DESC  
    )
    (
        SELECT *, 'MAIS_RECENTES' as tipo 
        FROM atendimentos_base 
        WHERE fone_cliente is not null
        ORDER BY dias_em_irregularidade DESC 
        LIMIT 2
    )
    UNION ALL
    (
        SELECT *, 'MAIS_ANTIGOS' as tipo 
        FROM atendimentos_base 
        WHERE fone_cliente is not null
        ORDER BY dias_em_irregularidade ASC 
        LIMIT 3
    )
    ORDER BY tipo DESC;
  `;

  try {
    const { rows } = await dbQuery<{
      id: string;
      nome_cliente: string;
      nome_corretor: string;
      fone_cliente: string;
      data_criacao?: string;
    }>(query, [userId]);

    return rows
      .filter((row) => row.fone_cliente)
      .map((row) => ({
        atendimentoId: row.id,
        clienteNome: row.nome_cliente,
        corretorId: userId,
        corretorNome: row.nome_corretor,
        phone: row.fone_cliente,
        situacao: "IRREGULAR" as SituacaoLead,
        dataCriacao: row.data_criacao,
      }));
  } catch (error) {
    console.error("Erro ao buscar atendimentos irregulares:", error);
    return [];
  }
}

async function fetchPerdidos(userId: string): Promise<LeadRecoveryCandidate[]> {
  const query = `
    WITH atendimentos_base AS (
        SELECT DISTINCT ON (
            ps.nome, 
            (SELECT '+' || tp.ddi || tp.numero as numero from pessoa_telefone tp 
             WHERE tp.pessoa_id = ps.id 
             AND tp.tipo = 2
             ORDER BY tp.principal
             LIMIT 1)
        )
            'PERDIDO' situacao,
            atd.data_criacao,
            atd.id,
            ps.nome nome_cliente,
            cr.nome nome_corretor,
            (SELECT '+' || tp.ddi || tp.numero as numero from pessoa_telefone tp 
             WHERE tp.pessoa_id = ps.id 
             AND tp.tipo = 2
             ORDER BY tp.principal
             LIMIT 1) fone_cliente
        FROM atendimento atd
        INNER JOIN pessoa ps on atd.cliente_id = ps.id
        INNER JOIN pessoa cr on atd.corretor_id = cr.id
        LEFT JOIN LATERAL (
            SELECT MAX(ae.proximo_contato) as max_proximo_contato
            FROM atendimento_evento ae
            WHERE ae.atendimento_id = atd.id
                AND ae.excluido = FALSE 
                AND ae.proximo_contato IS NOT NULL
        ) ultimo_evento ON TRUE
        WHERE atd.excluido = false
        AND EXISTS (SELECT ae.id FROM atendimento_evento ae where ae.atendimento_id = atd.id)
        AND NOT EXISTS (SELECT ae.id FROM atendimento_evento ae where ae.atendimento_id = atd.id and ae.tipo_atendimento_evento = 16)
        AND atd.status = 3
        AND atd.corretor_id = $1
        ORDER BY 
            ps.nome, 
            fone_cliente,  
            atd.data_criacao DESC  
    )
    (
        SELECT *, 'MAIS_RECENTES' as tipo 
        FROM atendimentos_base
        WHERE fone_cliente is not null
        ORDER BY data_criacao DESC 
        LIMIT 2
    )
    UNION ALL
    (
        SELECT *, 'MAIS_ANTIGOS' as tipo 
        FROM atendimentos_base 
        WHERE fone_cliente is not null
        ORDER BY data_criacao ASC 
        LIMIT 3
    )
    ORDER BY tipo DESC;
  `;

  try {
    const { rows } = await dbQuery<{
      id: string;
      nome_cliente: string;
      nome_corretor: string;
      fone_cliente: string;
      data_criacao?: string;
    }>(query, [userId]);

    return rows
      .filter((row) => row.fone_cliente)
      .map((row) => ({
        atendimentoId: row.id,
        clienteNome: row.nome_cliente,
        corretorId: userId,
        corretorNome: row.nome_corretor,
        phone: row.fone_cliente,
        situacao: "PERDIDO" as SituacaoLead,
        dataCriacao: row.data_criacao,
      }));
  } catch (error) {
    console.error("Erro ao buscar atendimentos perdidos:", error);
    return [];
  }
}

async function fetchCvcrmLeadCandidates(
  user: { id: string; nome?: string },
  limit = 5,
  leadId?: string
): Promise<LeadRecoveryCandidate[]> {
  try {
    const response = await getLeadsCVCRM({ limit: 200, offset: 0 });
    const leads = (response as any).leads || (response as any).data || [];

    const now = Date.now();
    const IRREGULAR_DIAS = 7;

    const candidates: LeadRecoveryCandidate[] = [];

    for (const lead of leads) {
      const thisId = String(lead.idlead || lead.id || "");
      if (leadId && thisId !== leadId) continue;

      const phone = lead.telefone || lead.celular || "";
      if (!phone) continue;

      const interacoes: Array<{ descricao?: string; data_cad?: string }> =
        lead.interacao || [];

      const lastInteractionMs = interacoes
        .map((i: any) => (i?.data_cad ? Date.parse(i.data_cad) : 0))
        .reduce((max, cur) => (cur > max ? cur : max), 0);

      let situacao: SituacaoLead = "IRREGULAR";
      const situacaoNome = String(lead.situacao?.nome || "").toLowerCase();
      if (situacaoNome.includes("perd")) {
        situacao = "PERDIDO";
      } else if (
        lastInteractionMs &&
        now - lastInteractionMs > IRREGULAR_DIAS * 24 * 60 * 60 * 1000
      ) {
        situacao = "IRREGULAR";
      }

      const empreendimento = Array.isArray(lead.empreendimento)
        ? lead.empreendimento[0]
        : null;

      const interesse: AtendimentoInteresse = {
        tipoImovel: empreendimento?.nome || null,
        bairro: empreendimento?.bairro || null,
        cidade: empreendimento?.cidade || null,
        campanha: lead.campanha || null,
        formulario: lead.formulario || null,
        empreendimentoNome: empreendimento?.nome || null,
      };

      const corretorNome = lead.corretor?.nome || "";

      if (!matchCorretor(corretorNome, user.nome)) {
        continue;
      }

      candidates.push({
        atendimentoId: String(lead.idlead || lead.id || phone),
        clienteNome: lead.nome || "Cliente",
        corretorId: user.id,
        corretorNome: corretorNome || user.nome || "Equipe",
        phone,
        situacao,
        dataCriacao: lead.data_cad,
        interesse,
        interacoes,
      });
    }

    const seen = new Set<string>();
    const deduped: LeadRecoveryCandidate[] = [];
    for (const c of candidates) {
      const key = c.phone.replace(/\D/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(c);
      if (deduped.length >= limit) break;
    }

    return deduped;
  } catch (error) {
    console.error("Erro ao buscar leads no CVCRM:", error);
    return [];
  }
}

export async function fetchLeadRecoveryCandidates(
  userId: string,
  limit = 5,
  userName?: string,
  leadId?: string
): Promise<LeadRecoveryCandidate[]> {
  const cvcrm = await fetchCvcrmLeadCandidates({ id: userId, nome: userName }, limit, leadId);
  if (cvcrm.length > 0) return cvcrm;

  const [irregulares, perdidos] = await Promise.all([
    fetchIrregulares(userId),
    fetchPerdidos(userId),
  ]);

  const merged = [...irregulares, ...perdidos];
  merged.sort((a, b) => {
    const da = a.dataCriacao ? new Date(a.dataCriacao).getTime() : 0;
    const db = b.dataCriacao ? new Date(b.dataCriacao).getTime() : 0;
    return db - da;
  });

  const seenPhones = new Set<string>();
  const deduped: LeadRecoveryCandidate[] = [];

  for (const item of merged) {
    const cleanPhone = item.phone || "";
    if (!cleanPhone) continue;
    const key = cleanPhone.replace(/\D/g, "");
    if (seenPhones.has(key)) continue;
    seenPhones.add(key);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

async function sendRecoveryMessage(input: {
  candidate: LeadRecoveryCandidate;
  message: string;
}): Promise<LeadRecoveryResult> {
  const phoneWithNinth = addNinthDigit(input.candidate.phone);
  const normalized = normalizePhone(phoneWithNinth);

  if (!normalized) {
    return {
      atendimentoId: input.candidate.atendimentoId,
      phone: input.candidate.phone,
      status: "skipped",
      situacao: input.candidate.situacao,
      reason: "telefone inválido",
    };
  }

  try {
    const sent = await sendToClient(normalized, input.message, input.candidate.corretorId);
    await logRecovery({
      atendimentoId: input.candidate.atendimentoId,
      corretorId: input.candidate.corretorId,
      phone: normalized,
      clienteNome: input.candidate.clienteNome,
      situacao: input.candidate.situacao,
      status: sent ? "sent" : "skipped",
      reason: sent ? undefined : "corretor sem Evolution conectado",
      message: input.message,
    });
    return {
      atendimentoId: input.candidate.atendimentoId,
      phone: normalized,
      status: sent ? "sent" : "skipped",
      situacao: input.candidate.situacao,
      message: input.message,
      reason: sent ? undefined : "corretor sem Evolution conectado",
    };
  } catch (error) {
    await logRecovery({
      atendimentoId: input.candidate.atendimentoId,
      corretorId: input.candidate.corretorId,
      phone: normalized,
      clienteNome: input.candidate.clienteNome,
      situacao: input.candidate.situacao,
      status: "error",
      reason: (error as Error).message,
      message: input.message,
    });
    return {
      atendimentoId: input.candidate.atendimentoId,
      phone: normalized,
      status: "error",
      situacao: input.candidate.situacao,
      reason: (error as Error).message,
    };
  }
}

export async function runLeadRecoveryForUser(
  user: { id: string; nome?: string },
  options?: { limit?: number; dryRun?: boolean; leadId?: string }
): Promise<LeadRecoveryResult[]> {
  const limit = options?.limit || 5;
  const candidates = await fetchLeadRecoveryCandidates(
    user.id,
    limit,
    user.nome,
    options?.leadId
  );
  const results: LeadRecoveryResult[] = [];

  for (const candidate of candidates) {
    if (!options?.dryRun) {
      if (await alreadySentToday(candidate.atendimentoId)) {
        results.push({
          atendimentoId: candidate.atendimentoId,
          phone: candidate.phone,
          status: "skipped",
          situacao: candidate.situacao,
          reason: "já enviado nas últimas 24h",
        });
        continue;
      }
    }

    const historico =
      buildHistoricoFromInteracoes(candidate.interacoes) ||
      (await fetchHistorico(candidate.atendimentoId));

    const classificacao = await classifyRecoveryPotential({
      historico,
      interesse: candidate.interesse || {},
    });

    if (classificacao.status !== "tem_potencial") {
      if (!options?.dryRun) {
        await logRecovery({
          atendimentoId: candidate.atendimentoId,
          corretorId: candidate.corretorId,
          phone: candidate.phone,
          clienteNome: candidate.clienteNome,
          situacao: candidate.situacao,
          status: "skipped",
          reason: classificacao.reason || "irrecuperável",
        });
      }

      results.push({
        atendimentoId: candidate.atendimentoId,
        phone: candidate.phone,
        status: "skipped",
        situacao: candidate.situacao,
        reason: classificacao.reason || "irrecuperável",
      });
      continue;
    }

    const message = await draftRecoveryMessage({
      corretorNome: candidate.corretorNome,
      clienteNome: candidate.clienteNome,
      interesse: candidate.interesse || {},
      historico,
    });

    if (!message) {
      results.push({
        atendimentoId: candidate.atendimentoId,
        phone: candidate.phone,
        status: "skipped",
        situacao: candidate.situacao,
        reason: "mensagem vazia",
      });
      continue;
    }

    if (options?.dryRun) {
      results.push({
        atendimentoId: candidate.atendimentoId,
        phone: candidate.phone,
        status: "skipped",
        situacao: candidate.situacao,
        reason: "dry-run",
        message,
      });
      continue;
    }

    const sent = await sendRecoveryMessage({
      candidate,
      message,
    });

    results.push(sent);
  }

  return results;
}

export async function listActiveCorretores(): Promise<
  Array<{ id: string; nome?: string }>
> {
  try {
    const { rows } = await dbQuery<{ id: string; nome?: string }>(
      `select id, nome
         from users
        where is_active = true
          and role in ('corretor', 'gerente')
        order by nome asc`
    );
    return rows;
  } catch (error) {
    console.error("Erro ao listar corretores:", error);
    return [];
  }
}
