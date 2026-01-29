/**
 * Evolution API Client
 *
 * Complete WhatsApp integration for multi-tenant system
 * Docs: https://doc.evolution-api.com
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Detailed error handling
 * - Request timeout
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || 'https://pratica-evolution-api.robuvi.easypanel.host';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

if (!EVOLUTION_API_KEY) {
  console.warn('[Evolution API] EVOLUTION_API_KEY not configured in environment');
}

interface EvolutionResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
  [key: string]: any;
}

/**
 * Custom error class for Evolution API errors
 */
export class EvolutionAPIError extends Error {
  public statusCode: number;
  public endpoint: string;
  public retryable: boolean;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = 'EvolutionAPIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    // Erros 5xx e alguns 4xx são retentáveis
    this.retryable = statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }
}

/**
 * Sleep helper for retry delay
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse error response from Evolution API
 */
async function parseErrorResponse(response: Response): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.message || json.error || json.detail || text;
    } catch {
      return text || `HTTP ${response.status}`;
    }
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * Base fetch for Evolution API with retry logic
 */
async function evolutionFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<T> {
  const url = `${EVOLUTION_BASE_URL}${endpoint}`;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(
        url,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY || '',
            ...options.headers,
          },
        },
        DEFAULT_TIMEOUT
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        const error = new EvolutionAPIError(errorMessage, response.status, endpoint);

        // Se não é retentável, lança imediatamente
        if (!error.retryable || attempt === retries) {
          throw error;
        }

        lastError = error;
      } else {
        // Sucesso - retorna os dados
        const data = await response.json();
        return data;
      }
    } catch (error: any) {
      // Timeout ou erro de rede
      if (error.name === 'AbortError') {
        lastError = new EvolutionAPIError('Request timeout', 408, endpoint);
      } else if (error instanceof EvolutionAPIError) {
        lastError = error;
        if (!error.retryable) throw error;
      } else {
        lastError = new EvolutionAPIError(
          error.message || 'Network error',
          0,
          endpoint
        );
      }

      // Se é a última tentativa, lança o erro
      if (attempt === retries) {
        throw lastError;
      }
    }

    // Exponential backoff: 1s, 2s, 4s...
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    console.log(`[Evolution API] Retry ${attempt + 1}/${retries} for ${endpoint} in ${delay}ms`);
    await sleep(delay);
    attempt++;
  }

  throw lastError || new Error('Unknown error');
}

// ============================================================================
// INSTANCE MANAGEMENT
// ============================================================================

export interface InstanceConfig {
  instanceName: string;
  token?: string;
  number?: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
  reject_call?: boolean;
  msg_call?: string;
  groups_ignore?: boolean;
  always_online?: boolean;
  read_messages?: boolean;
  read_status?: boolean;
  sync_full_history?: boolean;
  webhook?: WebhookConfig;
}

export interface InstanceData {
  instance: {
    instanceName: string;
    status: string;
  };
  hash?: {
    apikey: string;
  };
  webhook?: any;
  settings?: any;
  // Campos adicionais retornados por fetchInstances
  id?: string;
  name?: string;
  connectionStatus?: 'open' | 'close' | 'connecting';
  ownerJid?: string | null;
  profileName?: string | null;
  profilePicUrl?: string | null;
  number?: string | null;
  disconnectionReasonCode?: number | null;
  disconnectionObject?: string | null;
  disconnectionAt?: string | null;
}

export interface QRCodeData {
  code?: string;
  base64?: string;
  count?: number;
  pairingCode?: string;
}

export interface ConnectionStatus {
  instance: string;
  state: 'open' | 'close' | 'connecting';
}

/**
 * Create a new WhatsApp instance
 * Se passar number, habilita pairing code automático
 */
export async function createInstance(config: InstanceConfig): Promise<InstanceData> {
  // Formatar número se fornecido (para pairing code)
  let formattedNumber: string | undefined;
  if (config.number) {
    const digits = config.number.replace(/\D/g, '');
    formattedNumber = digits.startsWith('55') ? digits : `55${digits}`;
  }

  return evolutionFetch<InstanceData>('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: config.instanceName,
      token: config.token,
      number: formattedNumber, // Número para pairing code
      qrcode: config.qrcode ?? true,
      integration: config.integration || 'WHATSAPP-BAILEYS',
      reject_call: config.reject_call ?? false,
      msg_call: config.msg_call,
      groups_ignore: config.groups_ignore ?? true,
      always_online: config.always_online ?? false,
      read_messages: config.read_messages ?? false,
      read_status: config.read_status ?? false,
      sync_full_history: config.sync_full_history ?? false,
      webhook: config.webhook,
    }),
  });
}

/**
 * Get QR Code for instance connection
 */
export async function getQRCode(instanceName: string): Promise<QRCodeData> {
  return evolutionFetch<QRCodeData>(`/instance/connect/${instanceName}`);
}

/**
 * Get Pairing Code for instance connection (8-digit code)
 * This allows users to connect by entering a code directly in WhatsApp
 * instead of scanning a QR code - much more convenient for mobile users
 *
 * Evolution API v2 requires the number in the request BODY with pairing: true
 * Docs: https://github.com/EvolutionAPI/evolution-api/issues/2197
 */
export async function getPairingCode(instanceName: string, phoneNumber: string): Promise<{ code: string; pairingCode: string }> {
  // Evolution API v2.3.7: GET /instance/connect returns both QR and pairingCode
  return evolutionFetch<{ code: string; pairingCode: string }>(
    `/instance/connect/${instanceName}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Get instance connection status
 */
export async function getConnectionStatus(instanceName: string): Promise<ConnectionStatus> {
  return evolutionFetch<ConnectionStatus>(`/instance/connectionState/${instanceName}`);
}

/**
 * Fetch all instances
 */
export async function fetchInstances(): Promise<InstanceData[]> {
  return evolutionFetch<InstanceData[]>('/instance/fetchInstances', {
    method: 'GET',
  });
}

/**
 * Delete instance
 */
export async function deleteInstance(instanceName: string): Promise<{ status: string }> {
  return evolutionFetch(`/instance/delete/${instanceName}`, {
    method: 'DELETE',
  });
}

/**
 * Logout instance (disconnect WhatsApp)
 */
export async function logoutInstance(instanceName: string): Promise<{ status: string }> {
  return evolutionFetch(`/instance/logout/${instanceName}`, {
    method: 'DELETE',
  });
}

/**
 * Restart instance
 */
export async function restartInstance(instanceName: string): Promise<{ status: string }> {
  return evolutionFetch(`/instance/restart/${instanceName}`, {
    method: 'PUT',
  });
}

// ============================================================================
// WEBHOOKS
// ============================================================================

export interface WebhookConfig {
  url: string;
  webhook_by_events?: boolean;
  webhook_base64?: boolean;
  events?: string[];
  headers?: Record<string, string>;
}

/**
 * Set webhook for instance
 *
 * Evolution API v2 requires the webhook config wrapped in a "webhook" object
 * with "enabled: true". The old flat structure no longer works.
 *
 * @see https://doc.evolution-api.com/v2/api-reference/webhooks
 */
export async function setWebhook(
  instanceName: string,
  config: WebhookConfig
): Promise<{ webhook: WebhookConfig }> {
  return evolutionFetch(`/webhook/set/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: config.url,
        webhookByEvents: config.webhook_by_events ?? false,
        webhookBase64: config.webhook_base64 ?? false,
        events: config.events || [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
        // Note: Evolution API v2 does not support custom headers for webhooks
        // Authentication must be done via URL path or query params
      },
    }),
  });
}

/**
 * Get webhook config
 */
export async function getWebhook(instanceName: string): Promise<WebhookConfig> {
  return evolutionFetch(`/webhook/find/${instanceName}`);
}

// ============================================================================
// MESSAGING
// ============================================================================

export interface SendMessageData {
  number: string; // phone number with country code (5511999999999)
  text?: string;
  media?: {
    mediaUrl: string;
    fileName?: string;
    caption?: string;
  };
  delay?: number;
}

/**
 * Send text message
 */
export async function sendTextMessage(
  instanceName: string,
  data: SendMessageData
): Promise<{ key: { id: string; remoteJid: string } }> {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: data.number,
      text: data.text,
      delay: data.delay || 0,
    }),
  });
}

/**
 * Send media message (image, video, audio, document)
 */
export async function sendMediaMessage(
  instanceName: string,
  data: SendMessageData & { mediaType?: 'image' | 'video' | 'audio' | 'document' }
): Promise<{ key: { id: string } }> {
  return evolutionFetch(`/message/sendMedia/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: data.number,
      mediatype: data.mediaType || 'document',
      media: data.media?.mediaUrl,
      fileName: data.media?.fileName,
      caption: data.media?.caption,
      delay: data.delay || 0,
    }),
  });
}

/**
 * Send presence update (typing, recording, paused)
 * Docs: https://doc.evolution-api.com/api-reference/chat/update-presence
 */
export async function sendPresence(
  instanceName: string,
  number: string,
  presence: 'composing' | 'recording' | 'paused'
): Promise<{ status: string }> {
  return evolutionFetch(`/chat/updatePresence/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: formatPhoneNumber(number),
      presence,
    }),
  });
}

/**
 * Send "typing..." indicator
 * Automatically sends "paused" after duration
 */
export async function sendTyping(
  instanceName: string,
  number: string,
  durationMs = 3000
): Promise<void> {
  await sendPresence(instanceName, number, 'composing');

  // Auto-pause after duration
  setTimeout(async () => {
    try {
      await sendPresence(instanceName, number, 'paused');
    } catch {
      // Ignore errors on pause
    }
  }, durationMs);
}

/**
 * Send "recording audio..." indicator
 */
export async function sendRecording(
  instanceName: string,
  number: string
): Promise<{ status: string }> {
  return sendPresence(instanceName, number, 'recording');
}

/**
 * Mark messages as read in Evolution API
 */
export async function markAsRead(
  instanceName: string,
  number: string,
  messageIds: string[]
): Promise<{ status: string }> {
  return evolutionFetch(`/chat/markMessageAsRead/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      readMessages: messageIds.map(id => ({
        remoteJid: `${formatPhoneNumber(number)}@s.whatsapp.net`,
        id,
      })),
    }),
  });
}

// ============================================================================
// CONTACTS & PROFILE
// ============================================================================

/**
 * Get contact info
 */
export async function getContact(
  instanceName: string,
  number: string
): Promise<any> {
  return evolutionFetch(`/chat/findContact/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ number }),
  });
}

/**
 * Get profile picture
 */
export async function getProfilePicture(
  instanceName: string,
  number: string
): Promise<{ profilePictureUrl: string }> {
  return evolutionFetch(`/chat/getProfilePicUrl/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ number }),
  });
}

/**
 * Update profile name
 */
export async function updateProfileName(
  instanceName: string,
  name: string
): Promise<{ status: string }> {
  return evolutionFetch(`/chat/updateProfileName/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Update profile status
 */
export async function updateProfileStatus(
  instanceName: string,
  status: string
): Promise<{ status: string }> {
  return evolutionFetch(`/chat/updateProfileStatus/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

// ============================================================================
// GROUPS (opcional, para depois)
// ============================================================================

/**
 * Fetch groups
 */
export async function fetchGroups(instanceName: string): Promise<any[]> {
  return evolutionFetch(`/group/fetchAllGroups/${instanceName}`, {
    method: 'GET',
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format phone number for Evolution API
 * Input: (11) 99999-9999 or 11999999999 or +5511999999999
 * Output: 5511999999999
 *
 * Brazilian mobile format: 55 + DDD(2) + 9XXXXXXXX(9) = 13 digits
 */
export function formatPhoneNumber(phone: string, countryCode = '55'): string {
  // Remove tudo exceto números
  let digits = phone.replace(/\D/g, '');

  // Se já tem código do país
  if (digits.startsWith(countryCode)) {
    // Validar comprimento: 55 + DDD(2) + número(9) = 13 dígitos
    if (digits.length === 13) {
      return digits;
    }

    // Se tem 14 dígitos e o 5º é '1' duplicado (ex: 55351910526575)
    // Alguns sistemas guardam com '1' extra antes do 9
    if (digits.length === 14) {
      const ddd = digits.slice(2, 4);
      const rest = digits.slice(4);
      // Se o número começa com 19 ou 1 duplicado, pode ser erro de dados
      if (rest.startsWith('19') || rest.startsWith('1')) {
        // Tentar remover o 1 extra: 55351910526575 -> 5535910526575
        const fixed = countryCode + ddd + rest.slice(1);
        if (fixed.length === 13) {
          console.warn(`[Evolution API] Corrigindo telefone: ${digits} -> ${fixed}`);
          return fixed;
        }
      }
    }

    // Se tem 12 dígitos, adicionar o 9º dígito
    if (digits.length === 12) {
      const ddd = digits.slice(2, 4);
      const number = digits.slice(4);
      const fixed = countryCode + ddd + '9' + number;
      console.warn(`[Evolution API] Adicionando 9º dígito: ${digits} -> ${fixed}`);
      return fixed;
    }

    // Número com formato inválido, retornar mesmo assim (API vai rejeitar)
    if (digits.length !== 13) {
      console.warn(`[Evolution API] Telefone com formato inválido (${digits.length} dígitos): ${digits}`);
    }

    return digits;
  }

  // Adiciona código do país
  const withCountry = countryCode + digits;

  // Se ficou com 12 dígitos (sem o 9), adicionar
  if (withCountry.length === 12) {
    const ddd = withCountry.slice(2, 4);
    const number = withCountry.slice(4);
    return countryCode + ddd + '9' + number;
  }

  return withCountry;
}

/**
 * Check if phone numbers exist on WhatsApp
 * Returns array of numbers with their WhatsApp status
 */
export async function checkWhatsAppNumbers(
  instanceName: string,
  numbers: string[]
): Promise<Array<{ number: string; exists: boolean; jid?: string }>> {
  try {
    const formattedNumbers = numbers.map(n => formatPhoneNumber(n));

    const response = await evolutionFetch<Array<{ jid: string; exists: boolean; number: string }>>(
      `/chat/whatsappNumbers/${instanceName}`,
      {
        method: 'POST',
        body: JSON.stringify({ numbers: formattedNumbers }),
      }
    );

    return response.map(r => ({
      number: r.number,
      exists: r.exists,
      jid: r.jid,
    }));
  } catch (error) {
    console.error('[Evolution API] Erro ao verificar números:', error);
    // Em caso de erro, assumir que todos existem para não bloquear envio
    return numbers.map(n => ({ number: n, exists: true }));
  }
}

/**
 * Check if a single phone number exists on WhatsApp
 */
export async function isWhatsAppNumber(
  instanceName: string,
  phone: string
): Promise<boolean> {
  const results = await checkWhatsAppNumbers(instanceName, [phone]);
  return results[0]?.exists ?? true;
}

/**
 * Check if instance is connected
 */
export async function isInstanceConnected(instanceName: string): Promise<boolean> {
  try {
    const status = await getConnectionStatus(instanceName);
    return status.state === 'open';
  } catch {
    return false;
  }
}

/**
 * Wait for instance to connect (polling)
 */
export async function waitForConnection(
  instanceName: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const connected = await isInstanceConnected(instanceName);
    if (connected) return true;

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return false;
}
