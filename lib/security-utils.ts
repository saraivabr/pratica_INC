import "server-only";
import { timingSafeEqual } from 'crypto';

/**
 * Utilitários de segurança para o sistema Prática
 */

// ============================================
// CONSTANTES DE SEGURANÇA
// ============================================

/**
 * Lista de ranges de IP privados que devem ser bloqueados em requisições SSRF
 */
const PRIVATE_IP_RANGES = [
  /^127\./,                          // Localhost
  /^10\./,                           // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B
  /^192\.168\./,                     // Private Class C
  /^169\.254\./,                     // Link-local
  /^0\./,                            // Reserved
  /^localhost$/i,                    // localhost hostname
  /^::1$/,                           // IPv6 localhost
  /^fc00:/i,                         // IPv6 private
  /^fe80:/i,                         // IPv6 link-local
];

/**
 * Lista de domínios permitidos para fetch de mídia (whitelist)
 */
const ALLOWED_MEDIA_DOMAINS = [
  'mmg.whatsapp.net',
  'web.whatsapp.com',
  'z-api.io',
  'zapsterapi.io',
  'evolution-api.com',
  'wa.me',
];

// ============================================
// PROTEÇÃO SSRF
// ============================================

/**
 * Verifica se uma URL é segura para fetch (proteção contra SSRF)
 * @param urlString - URL a ser verificada
 * @returns boolean indicando se a URL é segura
 */
export function isUrlSafeForFetch(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Apenas HTTPS é permitido
    if (url.protocol !== 'https:') {
      console.warn(`[Security] URL bloqueada - protocolo não-HTTPS: ${url.protocol}`);
      return false;
    }

    const hostname = url.hostname.toLowerCase();

    // Bloquear IPs privados
    for (const pattern of PRIVATE_IP_RANGES) {
      if (pattern.test(hostname)) {
        console.warn(`[Security] URL bloqueada - IP privado: ${hostname}`);
        return false;
      }
    }

    // Bloquear metadados de cloud providers
    if (hostname.includes('metadata') ||
        hostname.includes('169.254.169.254') ||
        hostname.includes('instance-data')) {
      console.warn(`[Security] URL bloqueada - metadata endpoint: ${hostname}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[Security] URL inválida: ${urlString}`);
    return false;
  }
}

/**
 * Verifica se uma URL é de um domínio de mídia permitido (whitelist mais restritiva)
 * @param urlString - URL a ser verificada
 * @returns boolean indicando se o domínio é permitido
 */
export function isAllowedMediaDomain(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Verificar whitelist de domínios
    return ALLOWED_MEDIA_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Fetch seguro com proteção SSRF
 * @param url - URL a ser acessada
 * @param options - Opções do fetch
 * @returns Response ou null se URL não for segura
 */
export async function secureFetch(
  url: string,
  options?: RequestInit
): Promise<Response | null> {
  if (!isUrlSafeForFetch(url)) {
    console.error(`[Security] Fetch bloqueado por SSRF protection: ${url}`);
    return null;
  }

  try {
    const response = await fetch(url, {
      ...options,
      // Timeout de 30 segundos para evitar ataques de slow loris
      signal: AbortSignal.timeout(30000),
    });
    return response;
  } catch (error) {
    console.error(`[Security] Erro no secureFetch:`, error);
    return null;
  }
}

// ============================================
// COMPARAÇÃO TIMING-SAFE
// ============================================

/**
 * Compara dois strings de forma segura contra timing attacks
 * @param a - Primeiro string
 * @param b - Segundo string
 * @returns boolean indicando se são iguais
 */
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    // Se tamanhos diferentes, ainda faz a comparação para evitar timing leak
    if (bufA.length !== bufB.length) {
      // Compara com ele mesmo para manter timing constante
      timingSafeEqual(bufA, bufA);
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// ============================================
// SANITIZAÇÃO DE ERROS
// ============================================

/**
 * Lista de patterns que indicam informação sensível em mensagens de erro
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /connection.*string/i,
  /database.*url/i,
  /postgres/i,
  /mysql/i,
  /redis/i,
  /mongodb/i,
  /at\s+.*\.ts:\d+/,  // Stack traces
  /at\s+.*\.js:\d+/,
  /node_modules/,
  /\/var\/www/,
  /\/home\//,
  /\.[a-z]+:\d+:\d+/,  // File:line:column
];

/**
 * Sanitiza mensagem de erro removendo informações sensíveis
 * @param error - Erro original
 * @returns Mensagem de erro segura para retorno ao cliente
 */
export function sanitizeErrorMessage(error: unknown): string {
  const defaultMessage = 'Ocorreu um erro interno. Tente novamente.';

  if (!error) return defaultMessage;

  const message = error instanceof Error ? error.message : String(error);

  // Verificar patterns sensíveis
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(message)) {
      return defaultMessage;
    }
  }

  // Limitar tamanho da mensagem
  if (message.length > 200) {
    return defaultMessage;
  }

  // Se chegou aqui, a mensagem parece segura
  // Mas ainda removemos qualquer coisa que pareça um path ou URL
  const cleanMessage = message
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    .replace(/\/[a-zA-Z0-9_\-\/\.]+/g, '[path]')
    .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[IP]');

  return cleanMessage;
}

/**
 * Cria uma resposta de erro segura para APIs
 * @param error - Erro original
 * @param statusCode - Código HTTP de status
 * @returns Objeto seguro para resposta JSON
 */
export function createSafeErrorResponse(
  error: unknown,
  statusCode: number = 500
): { error: string; code: number } {
  // Log completo do erro no servidor
  console.error('[API Error]', error);

  return {
    error: sanitizeErrorMessage(error),
    code: statusCode,
  };
}

// ============================================
// REDAÇÃO DE PII EM LOGS
// ============================================

/**
 * Redige informações pessoais identificáveis em strings para logging
 * @param text - Texto a ser redacted
 * @returns Texto com PII redacted
 */
export function redactPII(text: string): string {
  if (!text) return text;

  return text
    // Telefones brasileiros
    .replace(/\+?55\s?\d{2}\s?\d{4,5}[-\s]?\d{4}/g, '[PHONE]')
    .replace(/\(\d{2}\)\s?\d{4,5}[-\s]?\d{4}/g, '[PHONE]')
    // CPF
    .replace(/\d{3}\.\d{3}\.\d{3}[-]?\d{2}/g, '[CPF]')
    .replace(/\d{11}/g, (match) => match.length === 11 ? '[CPF]' : match)
    // Email
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    // Tokens/API Keys (strings longas alfanuméricas)
    .replace(/[a-zA-Z0-9_-]{32,}/g, '[TOKEN]');
}

/**
 * Cria um logger que automaticamente redige PII
 */
export function createSecureLogger(prefix: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => {
      const safeData = data ? JSON.stringify(data, (key, value) =>
        typeof value === 'string' ? redactPII(value) : value
      ) : '';
      console.log(`[${prefix}] ${redactPII(message)}`, safeData);
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      const safeData = data ? JSON.stringify(data, (key, value) =>
        typeof value === 'string' ? redactPII(value) : value
      ) : '';
      console.warn(`[${prefix}] ${redactPII(message)}`, safeData);
    },
    error: (message: string, data?: Record<string, unknown>) => {
      const safeData = data ? JSON.stringify(data, (key, value) =>
        typeof value === 'string' ? redactPII(value) : value
      ) : '';
      console.error(`[${prefix}] ${redactPII(message)}`, safeData);
    },
  };
}

// ============================================
// VALIDAÇÃO DE ENTRADA
// ============================================

/**
 * Whitelist de nomes de tabelas permitidas para queries dinâmicas
 */
const ALLOWED_TABLES = new Set([
  'users',
  'leads',
  'cvcrm_leads',
  'eventos',
  'evento_convidados',
  'empreendimentos',
  'unidades',
  'reservas',
  'comissao_vendas',
  'comissao_corretores',
  'comissao_matriz',
  'comissao_parcelas',
  'sessions',
  'notificacoes',
  'whatsapp_messages',
  'whatsapp_contacts',
  'workspaces',
  'imobiliarias',
  'inbound_messages',
  'conversation_locks',
]);

/**
 * Valida se um nome de tabela é permitido (proteção SQL injection)
 * @param tableName - Nome da tabela
 * @returns boolean indicando se é permitido
 */
export function isAllowedTable(tableName: string): boolean {
  return ALLOWED_TABLES.has(tableName.toLowerCase());
}

/**
 * Whitelist de nomes de colunas permitidas para ordenação
 */
const ALLOWED_ORDER_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'nome',
  'data',
  'data_inicio',
  'data_fim',
  'valor',
  'status',
  'telefone',
  'email',
]);

/**
 * Valida se um nome de coluna é permitido para ORDER BY
 * @param columnName - Nome da coluna
 * @returns boolean indicando se é permitido
 */
export function isAllowedOrderColumn(columnName: string): boolean {
  return ALLOWED_ORDER_COLUMNS.has(columnName.toLowerCase());
}

// ============================================
// CSRF PROTECTION
// ============================================

/**
 * Gera um token CSRF
 * @returns Token CSRF seguro
 */
export function generateCSRFToken(): string {
  const { randomBytes } = require('crypto');
  return randomBytes(32).toString('hex');
}

/**
 * Valida um token CSRF
 * @param token - Token a ser validado
 * @param storedToken - Token armazenado para comparação
 * @returns boolean indicando se o token é válido
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  return timingSafeCompare(token, storedToken);
}

// ============================================
// RATE LIMITING HELPERS
// ============================================

/**
 * Calcula o tempo de espera com exponential backoff
 * @param attempts - Número de tentativas
 * @param baseDelay - Delay base em ms
 * @param maxDelay - Delay máximo em ms
 * @returns Tempo de espera em ms
 */
export function calculateBackoffDelay(
  attempts: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  // Adiciona jitter para evitar thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

// ============================================
// WEBHOOK SECURITY
// ============================================

/**
 * Valida assinatura HMAC de webhook
 * @param payload - Payload do webhook
 * @param signature - Assinatura recebida
 * @param secret - Secret para validação
 * @param algorithm - Algoritmo de hash (padrão: sha256)
 * @returns boolean indicando se a assinatura é válida
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const { createHmac } = require('crypto');

  try {
    const expectedSignature = createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');

    // Normalizar formato da assinatura (alguns providers usam prefixo sha256=)
    const normalizedSignature = signature.replace(/^sha256=/, '');

    return timingSafeCompare(normalizedSignature, expectedSignature);
  } catch {
    return false;
  }
}

/**
 * Verifica se um timestamp de webhook não é muito antigo (replay protection)
 * @param timestamp - Timestamp do webhook (em segundos ou ms)
 * @param maxAgeSeconds - Idade máxima permitida em segundos
 * @returns boolean indicando se o timestamp é válido
 */
export function isWebhookTimestampValid(
  timestamp: number,
  maxAgeSeconds: number = 300
): boolean {
  const now = Date.now();
  // Se timestamp está em segundos, converter para ms
  const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;

  const age = (now - timestampMs) / 1000;
  return age >= 0 && age <= maxAgeSeconds;
}
