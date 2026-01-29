import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { createTestDatabase, type TestDatabase } from '../../utils/test-database'
import { startMockWorker, type MockWorkerServer } from '../../utils/mock-worker-server'

describe('WhatsApp Connection Flow Integration', () => {
  let testDb: TestDatabase
  let mockWorker: MockWorkerServer

  beforeAll(async () => {
    testDb = createTestDatabase()
    mockWorker = await startMockWorker(3006) // Use different port to avoid conflicts
  })

  afterAll(async () => {
    await testDb.close()
    await mockWorker.stop()
  })

  beforeEach(async () => {
    await testDb.beginTransaction()
  })

  afterEach(async () => {
    await testDb.rollback()
    mockWorker.clearSessions()
  })

  describe('Start connection flow', () => {
    test('creates database record when starting connection', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Simulate start request to mock worker
      const response = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('connecting')
      expect(data.channelId).toBeDefined()
    })

    test('returns channel ID for SSE streaming', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      const response = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })

      const data = await response.json()

      expect(data.channelId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    })
  })

  describe('QR code generation flow', () => {
    test('mock worker can simulate QR code generation', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Start connection
      await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })

      // Simulate QR generation
      mockWorker.simulateQR(tenant.id, user.id, 'mock-qr-code-data')

      // Check status
      const statusResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/status`)
      const statusData = await statusResponse.json()

      expect(statusData.status).toBe('qr')
      expect(statusData.qr).toBe('mock-qr-code-data')
    })
  })

  describe('Connection ready flow', () => {
    test('mock worker can simulate successful connection', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Start connection
      await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })

      // Simulate connection
      mockWorker.simulateConnected(tenant.id, user.id, '5511999999999', 'Test Device')

      // Check status
      const statusResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/status`)
      const statusData = await statusResponse.json()

      expect(statusData.status).toBe('ready')
      expect(statusData.pairedPhone).toBe('5511999999999')
      expect(statusData.deviceName).toBe('Test Device')
    })
  })

  describe('Message sending flow', () => {
    test('can send message when session is ready', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Start and connect
      await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })
      mockWorker.simulateConnected(tenant.id, user.id, '5511999999999')

      // Send message
      const sendResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '5511988887777',
          message: 'Test message'
        })
      })

      const sendData = await sendResponse.json()

      expect(sendResponse.status).toBe(200)
      expect(sendData.ok).toBe(true)
      expect(sendData.messageId).toBeDefined()
    })

    test('fails to send message when session not ready', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Try to send without connecting
      const sendResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '5511988887777',
          message: 'Test message'
        })
      })

      expect(sendResponse.status).toBe(500)
    })
  })

  describe('Logout flow', () => {
    test('can logout and disconnect session', async () => {
      const tenant = await testDb.createTenant('Test Tenant')
      const user = await testDb.createUser({ tenantId: tenant.id })

      // Start and connect
      await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/start`, {
        method: 'POST'
      })
      mockWorker.simulateConnected(tenant.id, user.id, '5511999999999')

      // Logout
      const logoutResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/logout`, {
        method: 'POST'
      })

      const logoutData = await logoutResponse.json()

      expect(logoutResponse.status).toBe(200)
      expect(logoutData.ok).toBe(true)

      // Verify session is disconnected
      const statusResponse = await fetch(`http://localhost:3006/api/whatsapp/${tenant.id}/${user.id}/status`)
      const statusData = await statusResponse.json()

      expect(statusData.status).toBe('disconnected')
      expect(statusData.pairedPhone).toBeUndefined()
    })
  })

  describe('Multi-tenant isolation', () => {
    test('sessions for different tenants are isolated', async () => {
      const tenantA = await testDb.createTenant('Tenant A')
      const tenantB = await testDb.createTenant('Tenant B')
      const userA = await testDb.createUser({ tenantId: tenantA.id })
      const userB = await testDb.createUser({ tenantId: tenantB.id })

      // Start connections for both
      await fetch(`http://localhost:3006/api/whatsapp/${tenantA.id}/${userA.id}/start`, {
        method: 'POST'
      })
      await fetch(`http://localhost:3006/api/whatsapp/${tenantB.id}/${userB.id}/start`, {
        method: 'POST'
      })

      // Connect both
      mockWorker.simulateConnected(tenantA.id, userA.id, '5511111111111', 'Device A')
      mockWorker.simulateConnected(tenantB.id, userB.id, '5511222222222', 'Device B')

      // Check status for tenant A
      const statusA = await fetch(`http://localhost:3006/api/whatsapp/${tenantA.id}/${userA.id}/status`)
      const dataA = await statusA.json()

      // Check status for tenant B
      const statusB = await fetch(`http://localhost:3006/api/whatsapp/${tenantB.id}/${userB.id}/status`)
      const dataB = await statusB.json()

      expect(dataA.pairedPhone).toBe('5511111111111')
      expect(dataB.pairedPhone).toBe('5511222222222')
      expect(dataA.pairedPhone).not.toBe(dataB.pairedPhone)
    })
  })
})
