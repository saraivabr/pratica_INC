/**
 * Webropay (WeBroLink) API Client
 *
 * HTTP client for the Webropay pagadoria API.
 * Handles authentication with token caching, retry with exponential backoff,
 * and typed request/response.
 *
 * API docs: /tmp/webropay-openapi.json
 * Sandbox: https://webrolink.dev.webropay.com.br
 */

import 'server-only'

const WEBROPAY_API_URL = process.env.WEBROPAY_API_URL || 'https://webrolink.dev.webropay.com.br'
const WEBROPAY_CNPJ = process.env.WEBROPAY_CNPJ || ''
const WEBROPAY_SENHA = process.env.WEBROPAY_SENHA || ''

const DEFAULT_TIMEOUT = 30_000
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1_000

// ============================================================================
// ERROR CLASS
// ============================================================================

export class WebropayError extends Error {
  public statusCode: number
  public retryable: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'WebropayError'
    this.statusCode = statusCode
    this.retryable = statusCode >= 500 || statusCode === 429 || statusCode === 408
  }
}

// ============================================================================
// TOKEN CACHE
// ============================================================================

let cachedToken: { accessToken: string; expiresAt: number } | null = null

// ============================================================================
// HELPERS
// ============================================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const text = await response.text()
    try {
      const json = JSON.parse(text)
      return json.message || json.error || text
    } catch {
      return text || `HTTP ${response.status}`
    }
  } catch {
    return `HTTP ${response.status}`
  }
}

// ============================================================================
// CORE FETCH WITH RETRY
// ============================================================================

async function webropayFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true,
  retries = MAX_RETRIES
): Promise<T> {
  const url = `${WEBROPAY_API_URL}${endpoint}`
  let lastError: Error | null = null
  let attempt = 0

  while (attempt <= retries) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      }

      if (authenticated) {
        const token = await autenticar()
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetchWithTimeout(
        url,
        { ...options, headers },
        DEFAULT_TIMEOUT
      )

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response)
        const error = new WebropayError(errorMessage, response.status)

        if (!error.retryable || attempt === retries) {
          throw error
        }
        lastError = error
      } else {
        const data = await response.json()
        return data as T
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        lastError = new WebropayError('Request timeout', 408)
      } else if (error instanceof WebropayError) {
        lastError = error
        if (!error.retryable) throw error
      } else {
        lastError = new WebropayError(error.message || 'Network error', 0)
      }

      if (attempt === retries) {
        throw lastError
      }
    }

    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
    console.log(`[Webropay] Retry ${attempt + 1}/${retries} for ${endpoint} in ${delay}ms`)
    await sleep(delay)
    attempt++
  }

  throw lastError || new Error('Unknown Webropay error')
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export async function autenticar(): Promise<string> {
  // Return cached token if still valid (1 min margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.accessToken
  }

  if (!WEBROPAY_CNPJ || !WEBROPAY_SENHA) {
    throw new WebropayError('Credenciais Webropay não configuradas (WEBROPAY_CNPJ, WEBROPAY_SENHA)', 401)
  }

  console.log('[Webropay] Authenticating...')

  const response = await fetchWithTimeout(
    `${WEBROPAY_API_URL}/autenticacao`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj: WEBROPAY_CNPJ, senha: WEBROPAY_SENHA }),
    },
    DEFAULT_TIMEOUT
  )

  if (!response.ok) {
    const msg = await parseErrorResponse(response)
    throw new WebropayError(`Falha na autenticação Webropay: ${msg}`, response.status)
  }

  const data = await response.json()
  const { accessToken, authTimeout } = data

  if (!accessToken) {
    throw new WebropayError('Token não retornado pela Webropay', 500)
  }

  // authTimeout is a unix timestamp in seconds
  cachedToken = {
    accessToken,
    expiresAt: authTimeout ? authTimeout * 1000 : Date.now() + 3600_000,
  }

  console.log('[Webropay] Authenticated successfully')
  return accessToken
}

// ============================================================================
// API METHODS
// ============================================================================

export interface WebropayApiResponse {
  statusCode: number
  message: string
}

export interface WebropayBoletoResponse {
  statusCode: number
  urlBoleto: string
}

/**
 * Cadastra uma venda na Webropay
 */
export async function cadastrarVenda(payload: Record<string, unknown>): Promise<WebropayApiResponse> {
  console.log('[Webropay] Cadastrando venda:', payload.idVenda)
  return webropayFetch<WebropayApiResponse>('/venda', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Libera pagamento de uma venda
 */
export async function liberarPagamento(idVenda: string): Promise<WebropayApiResponse> {
  console.log('[Webropay] Liberando pagamento:', idVenda)
  return webropayFetch<WebropayApiResponse>(
    `/venda/liberar/pagamento?idVenda=${encodeURIComponent(idVenda)}`,
    { method: 'PUT' }
  )
}

/**
 * Distrata uma venda
 */
export async function distratarVenda(idVenda: string, motivo: string): Promise<WebropayApiResponse> {
  console.log('[Webropay] Distratando venda:', idVenda)
  return webropayFetch<WebropayApiResponse>(
    `/venda/distratar?idVenda=${encodeURIComponent(idVenda)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ motivo }),
    }
  )
}

/**
 * Bloqueia uma venda
 */
export async function bloquearVenda(idVenda: string): Promise<WebropayApiResponse> {
  console.log('[Webropay] Bloqueando venda:', idVenda)
  return webropayFetch<WebropayApiResponse>(
    `/venda/bloquear/${encodeURIComponent(idVenda)}`,
    { method: 'PUT' }
  )
}

/**
 * Obtem URL do boleto de uma parcela
 */
export async function obterBoleto(idVenda: string, idParcela: string): Promise<WebropayBoletoResponse> {
  console.log('[Webropay] Obtendo boleto:', idVenda, idParcela)
  return webropayFetch<WebropayBoletoResponse>(
    `/parcelas/boleto?idVenda=${encodeURIComponent(idVenda)}&idParcela=${encodeURIComponent(idParcela)}`,
    { method: 'GET' }
  )
}
