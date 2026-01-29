import { beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Global test setup
beforeAll(async () => {
  // Setup test database connection
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ||
    'postgresql://test:test@localhost:5432/test_db'

  // Test encryption key (64 hex chars = 32 bytes)
  process.env.WHATSAPP_SESSION_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

  // Worker URL
  process.env.WHATSAPP_WORKER_URL = 'http://localhost:3005'
})

afterAll(async () => {
  // Cleanup global resources
})

beforeEach(() => {
  // Reset mocks
  vi.clearAllMocks()
})
