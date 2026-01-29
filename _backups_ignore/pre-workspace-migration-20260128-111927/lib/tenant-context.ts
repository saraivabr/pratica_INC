/**
 * Multi-Tenant Context Management
 *
 * Provides utilities for working with tenant-scoped data
 * Uses Row Level Security (RLS) with PostgreSQL
 */

import { Pool, PoolClient } from 'pg';
import pool from './db';

export interface Tenant {
  id: number;
  slug: string;
  name: string;
  cvcrm_config: {
    base_url: string;
    email: string;
    tokens: {
      lead?: string;
      pessoa?: string;
      reserva?: string;
      atendimento?: string;
      [key: string]: string | undefined;
    };
  };
  status: 'active' | 'suspended' | 'cancelled';
  plan: string;
  max_leads?: number;
  max_users?: number;
  max_whatsapp_instances?: number;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
  evolution_instances?: Array<{
    instance_name: string;
    qr_code?: string;
    status: string;
  }>;
  created_at: Date;
  updated_at: Date;
}

/**
 * Get tenant by ID
 */
export async function getTenant(tenantId: number): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE id = $1',
    [tenantId]
  );

  return result.rows[0] || null;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE slug = $1',
    [slug]
  );

  return result.rows[0] || null;
}

/**
 * List all active tenants
 */
export async function listTenants(status = 'active'): Promise<Tenant[]> {
  const result = await pool.query(
    'SELECT * FROM tenants WHERE status = $1 ORDER BY name ASC',
    [status]
  );

  return result.rows;
}

/**
 * Create a new tenant
 */
export async function createTenant(data: {
  slug: string;
  name: string;
  cvcrm_config: Tenant['cvcrm_config'];
  plan?: string;
  metadata?: Record<string, any>;
}): Promise<Tenant> {
  const result = await pool.query(
    `INSERT INTO tenants (slug, name, cvcrm_config, plan, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.slug,
      data.name,
      JSON.stringify(data.cvcrm_config),
      data.plan || 'free',
      JSON.stringify(data.metadata || {})
    ]
  );

  return result.rows[0];
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: number,
  data: Partial<Omit<Tenant, 'id' | 'created_at' | 'updated_at'>>
): Promise<Tenant> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    values.push(data.name);
  }

  if (data.cvcrm_config !== undefined) {
    updates.push(`cvcrm_config = $${paramCount++}`);
    values.push(JSON.stringify(data.cvcrm_config));
  }

  if (data.status !== undefined) {
    updates.push(`status = $${paramCount++}`);
    values.push(data.status);
  }

  if (data.plan !== undefined) {
    updates.push(`plan = $${paramCount++}`);
    values.push(data.plan);
  }

  if (data.metadata !== undefined) {
    updates.push(`metadata = $${paramCount++}`);
    values.push(JSON.stringify(data.metadata));
  }

  if (data.settings !== undefined) {
    updates.push(`settings = $${paramCount++}`);
    values.push(JSON.stringify(data.settings));
  }

  if (data.evolution_instances !== undefined) {
    updates.push(`evolution_instances = $${paramCount++}`);
    values.push(JSON.stringify(data.evolution_instances));
  }

  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(tenantId);

  const result = await pool.query(
    `UPDATE tenants SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${paramCount}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  return result.rows[0];
}

/**
 * Set current tenant for PostgreSQL session (RLS)
 * This enables Row Level Security policies
 */
export async function setTenantContext(
  client: PoolClient,
  tenantId: number
): Promise<void> {
  await client.query(
    `SELECT set_config('app.current_tenant_id', $1::TEXT, false)`,
    [tenantId]
  );
}

/**
 * Execute query with tenant context
 * Automatically sets RLS tenant_id before running the query
 *
 * @example
 * const leads = await withTenant(42, async (client) => {
 *   return client.query('SELECT * FROM cvcrm_leads LIMIT 10');
 * });
 */
export async function withTenant<T>(
  tenantId: number,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    // Set tenant context for RLS
    await setTenantContext(client, tenantId);

    // Execute callback
    return await callback(client);
  } finally {
    // Always release client back to pool
    client.release();
  }
}

/**
 * Get tenant from request (Next.js middleware/API)
 * Priority: query param > header > cookie > subdomain
 */
export function getTenantFromRequest(req: {
  query?: { tenant?: string };
  headers?: { 'x-tenant-id'?: string };
  cookies?: { tenant_id?: string };
  hostname?: string;
}): string | null {
  // 1. Query param (for testing/admin)
  if (req.query?.tenant) {
    return req.query.tenant;
  }

  // 2. Header (for API calls)
  if (req.headers?.['x-tenant-id']) {
    return req.headers['x-tenant-id'];
  }

  // 3. Cookie (for web app)
  if (req.cookies?.tenant_id) {
    return req.cookies.tenant_id;
  }

  // 4. Subdomain (empresa-abc.seuapp.com -> empresa-abc)
  if (req.hostname) {
    const subdomain = req.hostname.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      return subdomain;
    }
  }

  return null;
}

/**
 * Tenant-scoped query helper
 * Automatically adds tenant_id to WHERE clause
 */
export class TenantQuery {
  constructor(private tenantId: number) {}

  /**
   * Build WHERE clause with tenant_id
   */
  where(conditions: Record<string, any> = {}): { clause: string; values: any[] } {
    const allConditions = { tenant_id: this.tenantId, ...conditions };
    const keys = Object.keys(allConditions);

    const clause = keys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');

    const values = keys.map((key) => (allConditions as Record<string, any>)[key]);

    return { clause, values };
  }

  /**
   * SELECT query
   */
  async select<T = any>(
    table: string,
    conditions: Record<string, any> = {},
    columns = '*'
  ): Promise<T[]> {
    const { clause, values } = this.where(conditions);

    const result = await pool.query(
      `SELECT ${columns} FROM ${table} WHERE ${clause}`,
      values
    );

    return result.rows;
  }

  /**
   * INSERT query (automatically adds tenant_id)
   */
  async insert<T = any>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    const dataWithTenant: Record<string, any> = { tenant_id: this.tenantId, ...data };
    const keys = Object.keys(dataWithTenant);

    const columns = keys.join(', ');
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const values = keys.map((key) => dataWithTenant[key]);

    const result = await pool.query(
      `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * UPDATE query (scoped to tenant)
   */
  async update<T = any>(
    table: string,
    conditions: Record<string, any>,
    data: Record<string, any>
  ): Promise<T[]> {
    // Build SET clause first
    const dataKeys = Object.keys(data);
    const setClause = dataKeys
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    const setValues = dataKeys.map((key) => data[key]);

    // Build WHERE clause with offset for placeholders
    const whereConditions = { tenant_id: this.tenantId, ...conditions };
    const whereKeys = Object.keys(whereConditions);
    const offset = dataKeys.length;

    const whereClause = whereKeys
      .map((key, index) => `${key} = $${offset + index + 1}`)
      .join(' AND ');
    const whereValues = whereKeys.map((key) => (whereConditions as Record<string, any>)[key]);

    const allValues = [...setValues, ...whereValues];

    const result = await pool.query(
      `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`,
      allValues
    );

    return result.rows;
  }

  /**
   * DELETE query (scoped to tenant)
   */
  async delete(
    table: string,
    conditions: Record<string, any> = {}
  ): Promise<number> {
    const { clause, values } = this.where(conditions);

    const result = await pool.query(
      `DELETE FROM ${table} WHERE ${clause}`,
      values
    );

    return result.rowCount || 0;
  }
}

/**
 * Create tenant-scoped query helper
 */
export function tenantQuery(tenantId: number): TenantQuery {
  return new TenantQuery(tenantId);
}

/**
 * Find tenant for a user
 *
 * Prioridade:
 * 1. user.tenant_id (direto, mais rapido)
 * 2. user.imobiliaria_id -> imobiliarias.tenant_id
 *
 * @param user - User object with tenant_id or imobiliaria_id
 * @returns Tenant or null if user has no tenant configured
 */
export async function findUserTenant(user: {
  tenant_id?: number;
  imobiliaria_id?: string | number;
  imobiliarias?: { id?: string | number };
}): Promise<Tenant | null> {
  // Prioridade 1: tenant_id direto no usuario (mais rapido)
  if (user.tenant_id) {
    const tenant = await getTenant(user.tenant_id);
    if (tenant) {
      return tenant;
    }
    console.log(`[Tenant] tenant_id ${user.tenant_id} do usuario nao encontrado no banco`);
  }

  // Prioridade 2: via imobiliaria
  const imobiliariaId = user.imobiliaria_id || user.imobiliarias?.id;

  if (!imobiliariaId) {
    console.log(`[Tenant] Usuario nao tem tenant_id nem imobiliaria_id configurado`);
    return null;
  }

  // Buscar tenant_id atraves da imobiliaria
  try {
    const imobResult = await pool.query(
      'SELECT tenant_id FROM imobiliarias WHERE id = $1',
      [imobiliariaId]
    );

    if (!imobResult.rows[0]?.tenant_id) {
      console.log(`[Tenant] Imobiliaria ${imobiliariaId} nao tem tenant_id configurado`);
      return null;
    }

    const tenantId = imobResult.rows[0].tenant_id;
    const tenant = await getTenant(tenantId);

    if (!tenant) {
      console.log(`[Tenant] Tenant ID ${tenantId} nao encontrado no banco`);
    }

    return tenant;
  } catch (error: any) {
    // Se a coluna tenant_id nao existir, logar erro claro
    if (error.message?.includes('column') && error.message?.includes('tenant_id')) {
      console.error(`[Tenant] ERRO: Coluna tenant_id nao existe na tabela imobiliarias. Execute a migration 013.`);
    } else {
      console.error(`[Tenant] Erro ao buscar tenant:`, error.message);
    }
    return null;
  }
}
