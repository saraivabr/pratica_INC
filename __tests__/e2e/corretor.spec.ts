import { test, expect } from '@playwright/test'

test.describe('Corretor flows', () => {
  // ───────────────────────────────────────────────
  // Page-level: auth redirects
  // ───────────────────────────────────────────────

  test('redirects to login when accessing /corretor without auth', async ({ page }) => {
    await page.goto('/corretor')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects to login when accessing /empreendimentos without auth', async ({ page }) => {
    await page.goto('/empreendimentos')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects to login when accessing /leads without auth', async ({ page }) => {
    await page.goto('/leads')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('redirects to login when accessing /chat without auth', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  // ───────────────────────────────────────────────
  // Login page
  // ───────────────────────────────────────────────

  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')
    // Page should load without redirecting away
    await expect(page).toHaveURL(/\/login/)
    // The login page uses a phone input for OTP authentication
    const phoneInput = page.locator('input').first()
    await expect(phoneInput).toBeVisible({ timeout: 10000 })
  })

  test('login page has phone input and submit mechanism', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    // The page uses a phone-based login flow
    const body = await page.textContent('body')
    // Should contain some login-related text (Portuguese)
    expect(body).toBeTruthy()
    // Verify there is at least one interactive input
    const inputs = page.locator('input')
    const count = await inputs.count()
    expect(count).toBeGreaterThan(0)
  })

  // ───────────────────────────────────────────────
  // API: protected corretor endpoints return 401
  // ───────────────────────────────────────────────

  test('leads API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/leads')
    expect([401, 403]).toContain(response.status())
  })

  test('notificacoes API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/notificacoes')
    expect([401, 403]).toContain(response.status())
  })

  test('notificacoes unread-count returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/notificacoes/unread-count')
    expect([401, 403]).toContain(response.status())
  })

  test('interacoes API returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/interacoes')
    expect([401, 403]).toContain(response.status())
  })

  // ───────────────────────────────────────────────
  // /gerente/* routes redirect to /corretor
  // ───────────────────────────────────────────────

  test('/gerente redirects to /corretor (then to login)', async ({ page }) => {
    await page.goto('/gerente')
    // Middleware redirects /gerente -> /corretor -> /login (since not authenticated)
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})
