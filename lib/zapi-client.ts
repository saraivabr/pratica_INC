/**
 * Z-API Client - Retry inteligente + erros humanos (PT-BR)
 *
 * Wrapper robusto para chamadas HTTP ao Z-API com:
 * - Timeout de 15s por tentativa (AbortController)
 * - Retry 2x com backoff (1s, 2s) apenas para erros transientes
 * - Mapeamento de erros para mensagens humanas em PT-BR
 */

// ============================================
// TIPOS
// ============================================

export type ZapiErrorCode =
  | 'ZAPI_DOWN'
  | 'ZAPI_AUTH'
  | 'ZAPI_INVALID_NUMBER'
  | 'ZAPI_RATE_LIMIT'
  | 'ZAPI_MEDIA_TOO_LARGE'
  | 'ZAPI_TIMEOUT'
  | 'ZAPI_UNKNOWN';

export interface ZapiSendError {
  code: ZapiErrorCode;
  message: string; // PT-BR human-friendly
  retryable: boolean;
}

export interface ZapiSendResult {
  ok: boolean;
  messageId?: string;
  error?: ZapiSendError;
  /** Raw Z-API response body for backward compatibility */
  raw?: Record<string, unknown>;
}

// ============================================
// CONSTANTES
// ============================================

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const BACKOFF_MS = [1_000, 2_000]; // 1s, 2s

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 413]);

// ============================================
// MAPEAMENTO DE ERROS
// ============================================

function mapHttpError(status: number, body: Record<string, unknown>): ZapiSendError {
  const bodyError = String(body?.error || body?.message || '').toLowerCase();

  if (status === 401 || status === 403) {
    return {
      code: 'ZAPI_AUTH',
      message: 'Autenticacao Z-API invalida. Verifique as credenciais.',
      retryable: false,
    };
  }

  if (status === 400) {
    if (bodyError.includes('number') || bodyError.includes('phone') || bodyError.includes('invalid')) {
      return {
        code: 'ZAPI_INVALID_NUMBER',
        message: 'Numero de WhatsApp invalido.',
        retryable: false,
      };
    }
    return {
      code: 'ZAPI_UNKNOWN',
      message: 'Erro na requisicao ao Z-API. Verifique os dados enviados.',
      retryable: false,
    };
  }

  if (status === 429) {
    return {
      code: 'ZAPI_RATE_LIMIT',
      message: 'Limite de envios atingido. Aguarde 1 minuto.',
      retryable: true,
    };
  }

  if (status === 413) {
    return {
      code: 'ZAPI_MEDIA_TOO_LARGE',
      message: 'Arquivo muito grande para enviar via WhatsApp.',
      retryable: false,
    };
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      code: 'ZAPI_DOWN',
      message: 'WhatsApp instavel. Tente novamente em 1 minuto.',
      retryable: true,
    };
  }

  return {
    code: 'ZAPI_UNKNOWN',
    message: 'Erro ao enviar mensagem. Tente novamente.',
    retryable: false,
  };
}

function mapNetworkError(err: unknown): ZapiSendError {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return {
      code: 'ZAPI_TIMEOUT',
      message: 'WhatsApp instavel. Tente novamente em 1 minuto.',
      retryable: true,
    };
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
    return {
      code: 'ZAPI_TIMEOUT',
      message: 'WhatsApp instavel. Tente novamente em 1 minuto.',
      retryable: true,
    };
  }

  return {
    code: 'ZAPI_UNKNOWN',
    message: 'Erro ao enviar mensagem. Tente novamente.',
    retryable: true,
  };
}

function isRetryableError(err: ZapiSendError): boolean {
  return err.retryable;
}

// ============================================
// SLEEP
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// CORE REQUEST WITH RETRY
// ============================================

/**
 * Executa uma requisicao POST ao Z-API com timeout, retry e erros humanos.
 *
 * @param url       URL completa do endpoint Z-API
 * @param headers   Headers HTTP (incluindo Client-Token)
 * @param body      Body JSON
 * @returns         ZapiSendResult com ok/messageId/error
 */
export async function zapiRequestWithRetry(
  url: string,
  headers: Record<string, string>,
  body: object,
): Promise<ZapiSendResult> {
  let lastError: ZapiSendError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Backoff before retries (not before first attempt)
    if (attempt > 0) {
      const delay = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      await sleep(delay);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      // Parse body (best effort)
      let responseBody: Record<string, unknown> = {};
      try {
        responseBody = (await response.json()) as Record<string, unknown>;
      } catch {
        // Response might not be JSON
      }

      // Success
      if (response.ok) {
        const messageId =
          (responseBody.zapiMessageId as string) ||
          (responseBody.messageId as string) ||
          (responseBody.id as string) ||
          undefined;

        return {
          ok: true,
          messageId,
          raw: responseBody,
        };
      }

      // HTTP error
      const httpError = mapHttpError(response.status, responseBody);
      lastError = httpError;

      // If non-retryable, bail immediately
      if (!isRetryableError(httpError)) {
        return { ok: false, error: httpError, raw: responseBody };
      }

      // If retryable but out of retries, fall through to return
      if (attempt === MAX_RETRIES) {
        return { ok: false, error: httpError, raw: responseBody };
      }

      // Otherwise, continue to next retry
      console.warn(
        `[zapi-client] Tentativa ${attempt + 1}/${MAX_RETRIES + 1} falhou (HTTP ${response.status}). Retrying...`,
      );

    } catch (err) {
      // Network / timeout errors
      const netError = mapNetworkError(err);
      lastError = netError;

      if (!isRetryableError(netError) || attempt === MAX_RETRIES) {
        return { ok: false, error: netError };
      }

      console.warn(
        `[zapi-client] Tentativa ${attempt + 1}/${MAX_RETRIES + 1} falhou (${netError.code}). Retrying...`,
      );
    }
  }

  // Should not reach here, but just in case
  return {
    ok: false,
    error: lastError || {
      code: 'ZAPI_UNKNOWN',
      message: 'Erro ao enviar mensagem. Tente novamente.',
      retryable: false,
    },
  };
}
