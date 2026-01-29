import { dbQuery } from "@/lib/db";

// Types for our database
export interface Imobiliaria {
  id: string;
  nome: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  created_at?: string;
}

export interface UserHierarquia {
  id: number;
  slug: string;
  nome: string;
  nivel: number;
}

export interface User {
  id: string;
  telefone: string;
  nome: string;
  role: "corretor" | "gerente" | "admin";
  imobiliaria_id?: string;
  gerente_id?: string;
  avatar_url?: string;
  onboarding_status?: "pending" | "completed" | "invited";
  created_at: string;
  last_login?: string;
  is_active: boolean;
  imobiliarias?: Imobiliaria;
  imobiliaria?: string;
  gerente?: string;
  cvcrm_id?: number;
  email?: string;
  creci?: string;
  tenantId?: number;
  tenant_id?: number;
  // Hierarquia
  hierarquia_id?: number;
  hierarquia?: UserHierarquia;
}

export interface Session {
  id: string;
  user_id: string;
  otp_code?: string | null;
  otp_expires_at?: string;
  is_verified: boolean;
  created_at: string;
  expires_at: string;
}

export interface TrackingEvent {
  id: string;
  user_id: string;
  event_type: string;
  page: string;
  data: Record<string, any>;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Normaliza telefone para formato internacional +55...
 */
export function normalizePhone(phone: string): string {
  const numbers = phone.replace(/\D/g, "");

  if (numbers.startsWith("55") && numbers.length >= 12) {
    return `+${numbers}`;
  }

  const withoutZero = numbers.startsWith("0") ? numbers.slice(1) : numbers;
  return `+55${withoutZero}`;
}

/**
 * Gera OTP com 5 dígitos, sempre contendo dois 8s
 */
export function generateOTP(): string {
  const pos1 = Math.floor(Math.random() * 5);
  let pos2 = Math.floor(Math.random() * 5);
  while (pos2 === pos1) {
    pos2 = Math.floor(Math.random() * 5);
  }

  const digits = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 10).toString()
  );

  digits[pos1] = "8";
  digits[pos2] = "8";

  return digits.join("");
}

function mapUserRow(row: any): User {
  const imobiliaria =
    row.imobiliaria_id && row.imobiliaria_nome
      ? { id: row.imobiliaria_id, nome: row.imobiliaria_nome }
      : undefined;

  const hierarquia =
    row.hierarquia_id && row.hierarquia_slug
      ? {
          id: row.hierarquia_id,
          slug: row.hierarquia_slug,
          nome: row.hierarquia_nome,
          nivel: row.hierarquia_nivel,
        }
      : undefined;

  // Calcula role baseado na hierarquia para compatibilidade
  let role = row.role || "corretor";
  if (hierarquia) {
    if (hierarquia.slug === "master" || hierarquia.slug === "diretor") {
      role = "admin";
    } else if (hierarquia.slug === "gerente") {
      role = "gerente";
    } else {
      role = "corretor";
    }
  }

  return {
    id: row.id,
    telefone: row.telefone,
    nome: row.nome,
    role,
    imobiliaria_id: row.imobiliaria_id,
    gerente_id: row.gerente_id,
    avatar_url: row.avatar_url,
    onboarding_status: row.onboarding_status,
    created_at: row.created_at,
    last_login: row.last_login,
    is_active: row.is_active,
    imobiliarias: imobiliaria,
    imobiliaria: row.imobiliaria_nome,
    cvcrm_id: row.cvcrm_id,
    email: row.email,
    creci: row.creci,
    tenant_id: row.tenant_id,
    hierarquia_id: row.hierarquia_id,
    hierarquia,
  };
}

// User functions
export async function getUserByPhone(telefone: string): Promise<User | null> {
  const normalized = normalizePhone(telefone);
  const { rows } = await dbQuery(
    `select u.*, i.nome as imobiliaria_nome,
            h.id as hierarquia_id, h.slug as hierarquia_slug,
            h.nome as hierarquia_nome, h.nivel as hierarquia_nivel
     from users u
     left join imobiliarias i on i.id = u.imobiliaria_id
     left join hierarquias h on h.id = u.hierarquia_id
     where u.telefone = $1
     limit 1`,
    [normalized]
  );
  if (!rows[0]) return null;
  return mapUserRow(rows[0]);
}

export async function getUserById(userId: string): Promise<User | null> {
  const { rows } = await dbQuery(
    `select u.*, i.nome as imobiliaria_nome,
            h.id as hierarquia_id, h.slug as hierarquia_slug,
            h.nome as hierarquia_nome, h.nivel as hierarquia_nivel
     from users u
     left join imobiliarias i on i.id = u.imobiliaria_id
     left join hierarquias h on h.id = u.hierarquia_id
     where u.id = $1
     limit 1`,
    [userId]
  );
  if (!rows[0]) return null;
  return mapUserRow(rows[0]);
}

export async function createUser(userData: {
  telefone: string;
  nome: string;
  imobiliaria_id?: string;
  gerente_id?: string;
}): Promise<User | null> {
  const normalized = normalizePhone(userData.telefone);
  const { rows } = await dbQuery(
    `insert into users (telefone, nome, imobiliaria_id, gerente_id, is_active)
     values ($1, $2, $3, $4, true)
     returning *`,
    [normalized, userData.nome, userData.imobiliaria_id || null, userData.gerente_id || null]
  );
  if (!rows[0]) return null;
  return mapUserRow(rows[0]);
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  await dbQuery(`update users set last_login = now() where id = $1`, [userId]);
}

// Session functions
export async function createSession(userId: string, otpCode: string): Promise<Session | null> {
  const { rows } = await dbQuery<Session>(
    `insert into sessions (user_id, otp_code, otp_expires_at, is_verified, expires_at)
     values ($1, $2, now() + interval '5 minutes', false, now() + interval '7 days')
     returning *`,
    [userId, otpCode]
  );
  return rows[0] || null;
}

export async function verifyOTP(sessionId: string, otpCode: string): Promise<boolean> {
  const { rows } = await dbQuery(
    `select id from sessions
     where id = $1 and otp_code = $2 and otp_expires_at > now()`,
    [sessionId, otpCode]
  );
  if (!rows[0]) return false;

  await dbQuery(
    `update sessions set is_verified = true, otp_code = null where id = $1`,
    [sessionId]
  );
  return true;
}

export async function getValidSession(sessionId: string): Promise<Session | null> {
  const { rows } = await dbQuery<Session>(
    `select * from sessions
     where id = $1 and is_verified = true and expires_at > now()
     limit 1`,
    [sessionId]
  );
  return rows[0] || null;
}

// Tracking functions
export async function trackEvent(
  userId: string,
  eventType: string,
  page: string,
  data: Record<string, any> = {}
): Promise<void> {
  await dbQuery(
    `insert into tracking_events (user_id, event_type, page, data)
     values ($1, $2, $3, $4)`,
    [userId, eventType, page, data]
  );
}

export async function getUserActivity(userId: string, limit = 50): Promise<TrackingEvent[]> {
  const { rows } = await dbQuery(
    `select * from tracking_events
     where user_id = $1
     order by created_at desc
     limit $2`,
    [userId, limit]
  );
  return rows as TrackingEvent[];
}

// Conversation functions
export async function getOrCreateConversation(userId: string): Promise<Conversation | null> {
  const { rows: existing } = await dbQuery<Conversation>(
    `select * from conversations
     where user_id = $1 and created_at >= date_trunc('day', now())
     order by created_at desc
     limit 1`,
    [userId]
  );

  if (existing[0]) {
    const row = existing[0];
    const messages = typeof row.messages === "string" ? JSON.parse(row.messages) : row.messages;
    const context = typeof row.context === "string" ? JSON.parse(row.context) : row.context;
    return {
      ...row,
      messages: messages || [],
      context: context || {},
    } as Conversation;
  }

  const { rows } = await dbQuery<Conversation>(
    `insert into conversations (user_id, messages, context)
     values ($1, $2, $3)
     returning *`,
    [userId, JSON.stringify([]), JSON.stringify({})]
  );

  return rows[0] || null;
}

export async function addMessageToConversation(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const { rows } = await dbQuery(
    `select messages from conversations where id = $1 limit 1`,
    [conversationId]
  );
  const rawMessages = rows[0]?.messages || [];
  const messages =
    typeof rawMessages === "string" ? JSON.parse(rawMessages) : rawMessages;
  messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });

  await dbQuery(
    `update conversations set messages = $1, updated_at = now() where id = $2`,
    [JSON.stringify(messages), conversationId]
  );
}

// Interacoes (Compartilhamentos) functions
export interface Interacao {
  id: string;
  corretor_id: string;
  empreendimento_id: string;
  empreendimento_nome?: string;
  tipo_material: 'book' | 'condicoes' | 'espelho' | 'simulacao' | 'resumo' | 'unidade' | 'comparacao';
  lead_nome?: string;
  lead_telefone?: string;
  lead_id?: string;
  unidade_id?: string;
  simulacao_data?: Record<string, any>;
  notas_internas?: string;
  mensagem_enviada?: string;
  created_at: string;
}

export async function createInteracao(data: {
  corretor_id: string;
  empreendimento_id: string;
  empreendimento_nome?: string;
  tipo_material: string;
  lead_nome?: string;
  lead_telefone?: string;
  lead_id?: string;
  unidade_id?: string;
  simulacao_data?: Record<string, any>;
  notas_internas?: string;
  mensagem_enviada?: string;
}): Promise<Interacao | null> {
  const { rows } = await dbQuery<Interacao>(
    `insert into interacoes (
      corretor_id, empreendimento_id, empreendimento_nome, tipo_material,
      lead_nome, lead_telefone, lead_id, unidade_id, simulacao_data,
      notas_internas, mensagem_enviada
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    returning *`,
    [
      data.corretor_id,
      data.empreendimento_id,
      data.empreendimento_nome || null,
      data.tipo_material,
      data.lead_nome || null,
      data.lead_telefone || null,
      data.lead_id || null,
      data.unidade_id || null,
      data.simulacao_data ? JSON.stringify(data.simulacao_data) : null,
      data.notas_internas || null,
      data.mensagem_enviada || null,
    ]
  );
  return rows[0] || null;
}

export async function getInteracoesByEmpreendimento(
  empreendimentoId: string,
  limit = 10
): Promise<Interacao[]> {
  const { rows } = await dbQuery(
    `select i.*, u.nome as corretor_nome
     from interacoes i
     left join users u on u.id = i.corretor_id
     where i.empreendimento_id = $1
     order by i.created_at desc
     limit $2`,
    [empreendimentoId, limit]
  );
  return rows as Interacao[];
}

export async function getInteracoesByCorretor(
  corretorId: string,
  limit = 50
): Promise<Interacao[]> {
  const { rows } = await dbQuery(
    `select * from interacoes
     where corretor_id = $1
     order by created_at desc
     limit $2`,
    [corretorId, limit]
  );
  return rows as Interacao[];
}

export async function getInteracoesCountByEmpreendimento(
  empreendimentoId: string
): Promise<number> {
  const { rows } = await dbQuery(
    `select count(*) as total from interacoes
     where empreendimento_id = $1`,
    [empreendimentoId]
  );
  return parseInt(rows[0]?.total || '0', 10);
}
