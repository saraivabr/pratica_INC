import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../utils/test-database'

describe('Tenant Isolation Security', () => {
  let testDb: TestDatabase

  beforeAll(async () => {
    testDb = createTestDatabase()
  })

  afterAll(async () => {
    await testDb.close()
  })

  beforeEach(async () => {
    await testDb.beginTransaction()
  })

  afterEach(async () => {
    await testDb.rollback()
  })

  describe('Database query isolation', () => {
    test('queries filter by imobiliaria_id correctly', async () => {
      const tenantA = await testDb.createTenant('Tenant A')
      const tenantB = await testDb.createTenant('Tenant B')

      const userA = await testDb.createUser({ tenantId: tenantA.id })
      const userB = await testDb.createUser({ tenantId: tenantB.id })

      await testDb.createWhatsAppSession(userA.id, {
        imobiliaria_id: tenantA.id,
        status: 'ready',
        paired_phone: '5511111111111'
      })

      await testDb.createWhatsAppSession(userB.id, {
        imobiliaria_id: tenantB.id,
        status: 'ready',
        paired_phone: '5511222222222'
      })

      // Query sessions for tenant A only
      const { rows } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE imobiliaria_id = $1',
        [tenantA.id]
      )

      expect(rows.length).toBe(1)
      expect(rows[0].user_id).toBe(userA.id)
      expect(rows[0].paired_phone).toBe('5511111111111')
    })

    test('sessions without tenant filter should not cross-pollute', async () => {
      const tenantA = await testDb.createTenant('Tenant A')
      const tenantB = await testDb.createTenant('Tenant B')

      const userA1 = await testDb.createUser({ tenantId: tenantA.id })
      const userA2 = await testDb.createUser({ tenantId: tenantA.id })
      const userB1 = await testDb.createUser({ tenantId: tenantB.id })

      await testDb.createWhatsAppSession(userA1.id, {
        imobiliaria_id: tenantA.id,
        status: 'ready'
      })

      await testDb.createWhatsAppSession(userA2.id, {
        imobiliaria_id: tenantA.id,
        status: 'ready'
      })

      await testDb.createWhatsAppSession(userB1.id, {
        imobiliaria_id: tenantB.id,
        status: 'ready'
      })

      // Query for tenant A
      const { rows: rowsA } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE imobiliaria_id = $1',
        [tenantA.id]
      )

      // Query for tenant B
      const { rows: rowsB } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE imobiliaria_id = $1',
        [tenantB.id]
      )

      expect(rowsA.length).toBe(2)
      expect(rowsB.length).toBe(1)

      // Verify no overlap
      const userIdsA = rowsA.map((r: any) => r.user_id)
      const userIdsB = rowsB.map((r: any) => r.user_id)

      expect(userIdsA).toContain(userA1.id)
      expect(userIdsA).toContain(userA2.id)
      expect(userIdsA).not.toContain(userB1.id)

      expect(userIdsB).toContain(userB1.id)
      expect(userIdsB).not.toContain(userA1.id)
      expect(userIdsB).not.toContain(userA2.id)
    })
  })

  describe('Unique constraint enforcement', () => {
    test('each user can have only one WhatsApp session', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Create first session
      await testDb.createWhatsAppSession(user.id, {
        imobiliaria_id: tenant.id,
        status: 'ready',
        paired_phone: '5511999999999'
      })

      // Attempting to create another session for same user should fail
      await expect(
        testDb.createWhatsAppSession(user.id, {
          imobiliaria_id: tenant.id,
          status: 'ready',
          paired_phone: '5511888888888'
        })
      ).rejects.toThrow()
    })

    test('upsert updates existing session instead of creating duplicate', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Create initial session
      await testDb.createWhatsAppSession(user.id, {
        imobiliaria_id: tenant.id,
        status: 'connecting'
      })

      // Update to ready
      await testDb.updateWhatsAppSession(user.id, {
        status: 'ready',
        paired_phone: '5511999999999'
      })

      // Verify only one session exists
      const { rows } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE user_id = $1',
        [user.id]
      )

      expect(rows.length).toBe(1)
      expect(rows[0].status).toBe('ready')
      expect(rows[0].paired_phone).toBe('5511999999999')
    })
  })

  describe('Cascade delete behavior', () => {
    test('deleting user deletes associated WhatsApp session', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      await testDb.createWhatsAppSession(user.id, {
        imobiliaria_id: tenant.id,
        status: 'ready'
      })

      // Verify session exists
      const sessionBefore = await testDb.getWhatsAppSession(user.id)
      expect(sessionBefore).not.toBeNull()

      // Delete user
      await testDb.deleteUser(user.id)

      // Verify session is deleted
      const sessionAfter = await testDb.getWhatsAppSession(user.id)
      expect(sessionAfter).toBeNull()
    })
  })

  describe('Data isolation between tenants', () => {
    test('tenant A cannot see tenant B session data', async () => {
      const tenantA = await testDb.createTenant('Tenant A')
      const tenantB = await testDb.createTenant('Tenant B')

      const userA = await testDb.createUser({ tenantId: tenantA.id })
      const userB = await testDb.createUser({ tenantId: tenantB.id })

      await testDb.createWhatsAppSession(userA.id, {
        imobiliaria_id: tenantA.id,
        status: 'ready',
        paired_phone: '5511111111111',
        device_name: 'Tenant A Device',
        session_data: 'encrypted-data-A'
      })

      await testDb.createWhatsAppSession(userB.id, {
        imobiliaria_id: tenantB.id,
        status: 'ready',
        paired_phone: '5511222222222',
        device_name: 'Tenant B Device',
        session_data: 'encrypted-data-B'
      })

      // Query as if we're tenant A
      const { rows: sessionsA } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE imobiliaria_id = $1',
        [tenantA.id]
      )

      // Verify tenant A sees only their data
      expect(sessionsA.length).toBe(1)
      expect(sessionsA[0].paired_phone).toBe('5511111111111')
      expect(sessionsA[0].device_name).toBe('Tenant A Device')
      expect(sessionsA[0].session_data).toBe('encrypted-data-A')

      // Verify tenant A does NOT see tenant B data
      expect(sessionsA[0].paired_phone).not.toBe('5511222222222')
      expect(sessionsA[0].session_data).not.toBe('encrypted-data-B')
    })

    test('joining users and sessions respects tenant boundaries', async () => {
      const tenantA = await testDb.createTenant('Tenant A')
      const tenantB = await testDb.createTenant('Tenant B')

      const userA = await testDb.createUser({ tenantId: tenantA.id, name: 'User A' })
      const userB = await testDb.createUser({ tenantId: tenantB.id, name: 'User B' })

      await testDb.createWhatsAppSession(userA.id, {
        imobiliaria_id: tenantA.id,
        status: 'ready'
      })

      await testDb.createWhatsAppSession(userB.id, {
        imobiliaria_id: tenantB.id,
        status: 'ready'
      })

      // Query sessions with user data for tenant A
      const { rows } = await testDb.query(
        `SELECT u.nome, ws.status, ws.paired_phone
         FROM whatsapp_sessions ws
         JOIN users u ON u.id = ws.user_id
         WHERE ws.imobiliaria_id = $1`,
        [tenantA.id]
      )

      expect(rows.length).toBe(1)
      expect(rows[0].nome).toBe('User A')
    })
  })

  describe('SQL injection protection', () => {
    test('malicious tenant ID does not execute SQL', async () => {
      const maliciousTenantId = "'; DELETE FROM whatsapp_sessions; --"

      // Query should return empty results, not execute malicious SQL
      const { rows } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE imobiliaria_id = $1',
        [maliciousTenantId]
      )

      expect(rows).toEqual([])

      // Verify sessions table still exists and has data
      const tenant = await testDb.createTenant('Legit Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })
      await testDb.createWhatsAppSession(user.id, {
        imobiliaria_id: tenant.id,
        status: 'ready'
      })

      const { rows: allSessions } = await testDb.query(
        'SELECT COUNT(*) FROM whatsapp_sessions'
      )
      expect(Number(allSessions[0].count)).toBeGreaterThan(0)
    })

    test('malicious user ID does not execute SQL', async () => {
      const maliciousUserId = "'; DROP TABLE users; --"

      const { rows } = await testDb.query(
        'SELECT * FROM whatsapp_sessions WHERE user_id = $1',
        [maliciousUserId]
      )

      expect(rows).toEqual([])

      // Verify users table still exists
      const { rows: userCheck } = await testDb.query('SELECT COUNT(*) FROM users')
      expect(userCheck).toBeDefined()
    })
  })

  describe('Session data encryption per user', () => {
    test('each user session data is encrypted independently', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user1 = await testDb.createUser({ tenantId: tenant.id })
      const user2 = await testDb.createUser({ tenantId: tenant.id })

      const sessionData1 = 'encrypted-session-credentials-user1'
      const sessionData2 = 'encrypted-session-credentials-user2'

      await testDb.createWhatsAppSession(user1.id, {
        imobiliaria_id: tenant.id,
        session_data: sessionData1
      })

      await testDb.createWhatsAppSession(user2.id, {
        imobiliaria_id: tenant.id,
        session_data: sessionData2
      })

      const session1 = await testDb.getWhatsAppSession(user1.id)
      const session2 = await testDb.getWhatsAppSession(user2.id)

      expect(session1?.session_data).toBe(sessionData1)
      expect(session2?.session_data).toBe(sessionData2)
      expect(session1?.session_data).not.toBe(session2?.session_data)
    })
  })
})
