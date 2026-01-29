import { Pool, type PoolClient } from 'pg'
import { randomUUID } from 'crypto'

export interface Imobiliaria {
  id: string
  nome: string
  cnpj: string
  created_at?: Date
}

export interface User {
  id: string
  telefone: string
  nome: string
  role: string
  imobiliaria_id: string | null
  is_active: boolean
  created_at?: Date
}

export interface WhatsAppSession {
  id: string
  user_id: string
  imobiliaria_id: string | null
  status: string
  paired_phone: string | null
  device_name: string | null
  session_data: string | null
  last_qr: string | null
  last_qr_at: Date | null
  last_seen_at: Date | null
  error_log: string | null
  created_at: Date
  updated_at: Date
}

export class TestDatabase {
  private pool: Pool
  private client: PoolClient | null = null

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    })
  }

  async connect(): Promise<void> {
    this.client = await this.pool.connect()
  }

  async beginTransaction(): Promise<void> {
    if (!this.client) await this.connect()
    await this.client!.query('BEGIN')
  }

  async rollback(): Promise<void> {
    if (this.client) {
      await this.client.query('ROLLBACK')
      this.client.release()
      this.client = null
    }
  }

  async commit(): Promise<void> {
    if (this.client) {
      await this.client.query('COMMIT')
      this.client.release()
      this.client = null
    }
  }

  async createTenant(name: string): Promise<Imobiliaria> {
    const cnpj = `${Math.random()}`.slice(2, 16).padStart(14, '0')
    const { rows } = await this.query(
      `INSERT INTO imobiliarias (nome, cnpj, is_active)
       VALUES ($1, $2, true) RETURNING *`,
      [name, cnpj]
    )
    return rows[0]
  }

  async createUser(opts: {
    tenantId: string
    phone?: string
    role?: 'corretor' | 'gerente' | 'admin'
    name?: string
  }): Promise<User> {
    const phone = opts.phone || `+5511${Math.floor(Math.random() * 900000000 + 100000000)}`
    const name = opts.name || `Test User ${phone.slice(-4)}`
    const { rows } = await this.query(
      `INSERT INTO users (telefone, nome, role, imobiliaria_id, is_active)
       VALUES ($1, $2, $3, $4, true) RETURNING *`,
      [phone, name, opts.role || 'corretor', opts.tenantId]
    )
    return rows[0]
  }

  async createWhatsAppSession(
    userId: string,
    data: Partial<WhatsAppSession> = {}
  ): Promise<WhatsAppSession> {
    const { rows } = await this.query(
      `INSERT INTO whatsapp_sessions
       (user_id, imobiliaria_id, status, paired_phone, device_name, session_data, last_qr, error_log)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.imobiliaria_id || null,
        data.status || 'disconnected',
        data.paired_phone || null,
        data.device_name || null,
        data.session_data || null,
        data.last_qr || null,
        data.error_log || null
      ]
    )
    return rows[0]
  }

  async getWhatsAppSession(userId: string): Promise<WhatsAppSession | null> {
    const { rows } = await this.query(
      'SELECT * FROM whatsapp_sessions WHERE user_id = $1',
      [userId]
    )
    return rows[0] || null
  }

  async updateWhatsAppSession(
    userId: string,
    data: Partial<WhatsAppSession>
  ): Promise<WhatsAppSession | null> {
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'user_id' && key !== 'id' && key !== 'created_at') {
        updates.push(`${key} = $${paramCount}`)
        values.push(value)
        paramCount++
      }
    })

    if (updates.length === 0) return null

    updates.push('updated_at = NOW()')
    values.push(userId)

    const { rows } = await this.query(
      `UPDATE whatsapp_sessions SET ${updates.join(', ')}
       WHERE user_id = $${paramCount} RETURNING *`,
      values
    )
    return rows[0] || null
  }

  async getUserById(userId: string): Promise<User | null> {
    const { rows } = await this.query('SELECT * FROM users WHERE id = $1', [userId])
    return rows[0] || null
  }

  async getTenantById(tenantId: string): Promise<Imobiliaria | null> {
    const { rows } = await this.query('SELECT * FROM imobiliarias WHERE id = $1', [tenantId])
    return rows[0] || null
  }

  async deleteWhatsAppSession(userId: string): Promise<void> {
    await this.query('DELETE FROM whatsapp_sessions WHERE user_id = $1', [userId])
  }

  async deleteUser(userId: string): Promise<void> {
    await this.query('DELETE FROM users WHERE id = $1', [userId])
  }

  async deleteTenant(tenantId: string): Promise<void> {
    await this.query('DELETE FROM imobiliarias WHERE id = $1', [tenantId])
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (this.client) {
      return this.client.query(text, params)
    }
    return this.pool.query(text, params)
  }

  async cleanup(): Promise<void> {
    // Clean up test data in reverse order of dependencies
    await this.query('TRUNCATE whatsapp_sessions CASCADE')
    await this.query('TRUNCATE users CASCADE')
    await this.query('TRUNCATE imobiliarias CASCADE')
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.release()
      this.client = null
    }
    await this.pool.end()
  }
}

// Helper to create test database instance
export function createTestDatabase(): TestDatabase {
  return new TestDatabase()
}

// Helper to generate random Brazilian phone number
export function generateBrazilianPhone(): string {
  const ddd = Math.floor(Math.random() * 20 + 11).toString().padStart(2, '0')
  const number = Math.floor(Math.random() * 900000000 + 100000000)
  return `+55${ddd}${number}`
}

// Helper to create authentication session cookie value
export function createAuthSession(user: User): string {
  const session = {
    userId: user.id,
    phone: user.telefone,
    role: user.role,
    tenantId: user.imobiliaria_id
  }
  return Buffer.from(JSON.stringify(session)).toString('base64')
}
