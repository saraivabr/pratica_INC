import { test, expect } from '@playwright/test'

test.describe('Admin flows', () => {
  // ───────────────────────────────────────────────
  // Page-level: auth redirects
  // ───────────────────────────────────────────────

  test('redirects to login when accessing /admin without auth', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
    // Middleware adds error=admin_required param
    expect(page.url()).toContain('admin_required')
  })

  test('redirects to login when accessing / without auth', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  // ───────────────────────────────────────────────
  // API: public endpoints
  // ───────────────────────────────────────────────

  test('health endpoint returns JSON with status field', async ({ request }) => {
    const response = await request.get('/api/health')
    // May return 200 (healthy) or 503 (degraded) depending on CV CRM
    expect([200, 503]).toContain(response.status())
    const body = await response.json()
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('checks')
    expect(body.checks).toHaveProperty('timestamp')
  })

  test('status endpoint returns JSON with summary', async ({ request }) => {
    const response = await request.get('/api/status')
    // May return 200 regardless of individual endpoint status
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('summary')
    expect(body).toHaveProperty('endpoints')
    expect(body.summary).toHaveProperty('total')
  })

  // ───────────────────────────────────────────────
  // API: protected endpoints return 401 without auth
  // ───────────────────────────────────────────────

  test('admin users API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/admin/users')
    expect(response.status()).toBe(401)
  })

  test('chat API returns 401/429 without auth', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { text: 'test' },
    })
    // May return 401 (unauthorized) or 429 (rate limited)
    expect([401, 429]).toContain(response.status())
  })

  test('cpf-score API returns 401/429 without auth', async ({ request }) => {
    const response = await request.post('/api/cpf-score', {
      data: { cpf: '12345678900' },
    })
    expect([401, 429]).toContain(response.status())
  })

  // ───────────────────────────────────────────────
  // API: validation (400 on bad input)
  // ───────────────────────────────────────────────

  test('register with empty body returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('simular with empty body returns 400', async ({ request }) => {
    const response = await request.post('/api/simular', {
      data: {},
    })
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body).toHaveProperty('error')
  })

  test('simular with valid data returns simulation result', async ({ request }) => {
    const response = await request.post('/api/simular', {
      data: {
        valorImovel: 500000,
        percentualEntrada: 20,
        prazoMeses: 360,
        taxaAnual: 10.5,
      },
    })
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('parcelaMensal')
    expect(body.data).toHaveProperty('valorFinanciado')
    expect(body.data.valorFinanciado).toBe(400000)
  })
})
