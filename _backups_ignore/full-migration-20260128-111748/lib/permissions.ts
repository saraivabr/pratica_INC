import { dbQuery } from "@/lib/db";

// Types
export interface Hierarquia {
  id: number;
  slug: string;
  nome: string;
  nivel: number;
  descricao?: string;
}

export interface Feature {
  id: number;
  slug: string;
  nome: string;
  descricao?: string;
  icone?: string;
  rota_base?: string;
  is_active: boolean;
}

export interface UserFeatureAccess {
  feature_slug: string;
  feature_nome: string;
  feature_icone?: string;
  rota_base?: string;
  enabled: boolean;
  is_override: boolean;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  hierarquia_nome?: string;
  feature_nome?: string;
}

// Mensagem padrão quando feature está bloqueada
const BLOCKED_MESSAGE = "Fale com o administrador para liberar este recurso";

/**
 * Verifica se um usuário tem acesso a uma feature específica
 */
export async function canAccessFeature(
  userId: string,
  featureSlug: string
): Promise<FeatureAccessResult> {
  const { rows } = await dbQuery(
    `SELECT * FROM check_feature_access($1, $2)`,
    [userId, featureSlug]
  );

  if (!rows[0]) {
    return {
      allowed: false,
      reason: "Feature não encontrada",
    };
  }

  const { allowed, is_override, hierarquia_nome, feature_nome } = rows[0];

  return {
    allowed: allowed === true,
    reason: allowed ? undefined : BLOCKED_MESSAGE,
    hierarquia_nome,
    feature_nome,
  };
}

/**
 * Retorna todas as features de um usuário com status de acesso
 */
export async function getUserFeatures(userId: string): Promise<UserFeatureAccess[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM get_user_features($1)`,
    [userId]
  );

  return rows.map((row: any) => ({
    feature_slug: row.feature_slug,
    feature_nome: row.feature_nome,
    feature_icone: row.feature_icone,
    rota_base: row.rota_base,
    enabled: row.enabled === true,
    is_override: row.is_override === true,
  }));
}

/**
 * Retorna todas as hierarquias disponíveis
 */
export async function getHierarquias(): Promise<Hierarquia[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM hierarquias ORDER BY nivel ASC`
  );
  return rows as Hierarquia[];
}

/**
 * Retorna todas as features ativas do sistema
 */
export async function getFeatures(): Promise<Feature[]> {
  const { rows } = await dbQuery(
    `SELECT * FROM features WHERE is_active = true ORDER BY id ASC`
  );
  return rows as Feature[];
}

/**
 * Retorna as features padrão de uma hierarquia
 */
export async function getHierarquiaFeatures(hierarquiaId: number): Promise<{
  feature_id: number;
  feature_slug: string;
  feature_nome: string;
  enabled: boolean;
}[]> {
  const { rows } = await dbQuery(
    `SELECT
      f.id as feature_id,
      f.slug as feature_slug,
      f.nome as feature_nome,
      COALESCE(hf.enabled, false) as enabled
    FROM features f
    LEFT JOIN hierarquia_features hf ON hf.feature_id = f.id AND hf.hierarquia_id = $1
    WHERE f.is_active = true
    ORDER BY f.id ASC`,
    [hierarquiaId]
  );
  return rows.map((row: any) => ({
    feature_id: row.feature_id,
    feature_slug: row.feature_slug,
    feature_nome: row.feature_nome,
    enabled: row.enabled === true,
  }));
}

/**
 * Atualiza a permissão padrão de uma feature para uma hierarquia
 */
export async function updateHierarquiaFeature(
  hierarquiaId: number,
  featureId: number,
  enabled: boolean
): Promise<void> {
  await dbQuery(
    `INSERT INTO hierarquia_features (hierarquia_id, feature_id, enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (hierarquia_id, feature_id)
     DO UPDATE SET enabled = $3`,
    [hierarquiaId, featureId, enabled]
  );
}

/**
 * Define um override individual de feature para um usuário
 */
export async function setUserFeatureOverride(
  userId: string,
  featureId: number,
  enabled: boolean,
  updatedBy?: string
): Promise<void> {
  await dbQuery(
    `INSERT INTO user_features (user_id, feature_id, enabled, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, feature_id)
     DO UPDATE SET enabled = $3, updated_by = $4, updated_at = NOW()`,
    [userId, featureId, enabled, updatedBy || null]
  );
}

/**
 * Remove um override individual (volta a usar padrão do nível)
 */
export async function removeUserFeatureOverride(
  userId: string,
  featureId: number
): Promise<void> {
  await dbQuery(
    `DELETE FROM user_features WHERE user_id = $1 AND feature_id = $2`,
    [userId, featureId]
  );
}

/**
 * Atualiza a hierarquia de um usuário
 */
export async function updateUserHierarquia(
  userId: string,
  hierarquiaId: number
): Promise<void> {
  await dbQuery(
    `UPDATE users SET hierarquia_id = $1 WHERE id = $2`,
    [hierarquiaId, userId]
  );
}

/**
 * Retorna usuários com suas hierarquias e features
 */
export async function getUsersWithPermissions(filters?: {
  hierarquiaId?: number;
  imobiliariaId?: string;
  search?: string;
}): Promise<{
  id: string;
  telefone: string;
  nome: string;
  hierarquia_id: number;
  hierarquia_slug: string;
  hierarquia_nome: string;
  hierarquia_nivel: number;
  imobiliaria_id?: string;
  imobiliaria_nome?: string;
  features: UserFeatureAccess[];
}[]> {
  let query = `
    SELECT
      u.id,
      u.telefone,
      u.nome,
      u.imobiliaria_id,
      i.nome as imobiliaria_nome,
      h.id as hierarquia_id,
      h.slug as hierarquia_slug,
      h.nome as hierarquia_nome,
      h.nivel as hierarquia_nivel
    FROM users u
    LEFT JOIN hierarquias h ON h.id = u.hierarquia_id
    LEFT JOIN imobiliarias i ON i.id = u.imobiliaria_id
    WHERE u.is_active = true
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (filters?.hierarquiaId) {
    query += ` AND u.hierarquia_id = $${paramIndex}`;
    params.push(filters.hierarquiaId);
    paramIndex++;
  }

  if (filters?.imobiliariaId) {
    query += ` AND u.imobiliaria_id = $${paramIndex}`;
    params.push(filters.imobiliariaId);
    paramIndex++;
  }

  if (filters?.search) {
    query += ` AND (u.nome ILIKE $${paramIndex} OR u.telefone ILIKE $${paramIndex})`;
    params.push(`%${filters.search}%`);
    paramIndex++;
  }

  query += ` ORDER BY h.nivel ASC, u.nome ASC`;

  const { rows: users } = await dbQuery(query, params);

  // Buscar features para cada usuário
  const result = await Promise.all(
    users.map(async (user: any) => {
      const features = await getUserFeatures(user.id);
      return {
        id: user.id,
        telefone: user.telefone,
        nome: user.nome,
        hierarquia_id: user.hierarquia_id,
        hierarquia_slug: user.hierarquia_slug,
        hierarquia_nome: user.hierarquia_nome,
        hierarquia_nivel: user.hierarquia_nivel,
        imobiliaria_id: user.imobiliaria_id,
        imobiliaria_nome: user.imobiliaria_nome,
        features,
      };
    })
  );

  return result;
}

/**
 * Verifica se um usuário tem nível hierárquico suficiente para uma ação
 * Níveis menores = mais poder (1=master, 6=assistente)
 */
export async function hasHierarchyLevel(
  userId: string,
  requiredLevel: number
): Promise<boolean> {
  const { rows } = await dbQuery(
    `SELECT h.nivel
     FROM users u
     JOIN hierarquias h ON h.id = u.hierarquia_id
     WHERE u.id = $1`,
    [userId]
  );

  if (!rows[0]) return false;
  return rows[0].nivel <= requiredLevel;
}

/**
 * Verifica se o usuário é master
 */
export async function isMaster(userId: string): Promise<boolean> {
  return hasHierarchyLevel(userId, 1);
}

/**
 * Verifica se o usuário é diretor ou superior
 */
export async function isDiretorOrAbove(userId: string): Promise<boolean> {
  return hasHierarchyLevel(userId, 2);
}

/**
 * Verifica se o usuário é gerente ou superior
 */
export async function isGerenteOrAbove(userId: string): Promise<boolean> {
  return hasHierarchyLevel(userId, 3);
}

/**
 * Retorna a hierarquia de um usuário
 */
export async function getUserHierarquia(userId: string): Promise<Hierarquia | null> {
  const { rows } = await dbQuery<Hierarquia>(
    `SELECT h.*
     FROM users u
     JOIN hierarquias h ON h.id = u.hierarquia_id
     WHERE u.id = $1`,
    [userId]
  );

  return (rows[0] as Hierarquia) || null;
}

/**
 * Mapeia role antigo para hierarquia (para compatibilidade)
 */
export function roleToHierarquiaSlug(role: string): string {
  switch (role) {
    case "admin":
      return "diretor";
    case "gerente":
      return "gerente";
    case "corretor":
    default:
      return "corretor";
  }
}

/**
 * Mapeia hierarquia para role antigo (para compatibilidade)
 */
export function hierarquiaSlugToRole(slug: string): "admin" | "gerente" | "corretor" {
  switch (slug) {
    case "master":
    case "diretor":
      return "admin";
    case "gerente":
      return "gerente";
    case "parcerias":
    case "corretor":
    case "assistente":
    default:
      return "corretor";
  }
}
