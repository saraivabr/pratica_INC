/**
 * WhatsApp Transport Abstraction
 *
 * Re-exports all functions from lib/zapi.ts with the SAME signatures,
 * but routes internally to Evolution API when withProvider('evolution') is active.
 *
 * Usage:
 *   - Without context → default Z-API (backward compatible, zero breaking changes)
 *   - withProvider('evolution', instanceName, fn) → routes to Evolution API
 *
 * This solves the "provider mixing" bug where Sofia responds via Z-API (system number)
 * even when the message arrived via Evolution (corretor's number).
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import * as zapi from './zapi';
import * as evolution from './evolution-api';

// Re-export types from zapi so consumers don't need to change type imports
export type { QuickReplyButton, ListSection, ActionButton, ZapiSendResult, ZapiSendError, ZapiErrorCode } from './zapi';

// ============================================
// ASYNC CONTEXT
// ============================================

interface ProviderContext {
  provider: 'evolution' | 'zapi';
  instanceName: string; // Evolution instance name
}

const providerStore = new AsyncLocalStorage<ProviderContext>();

/**
 * Run a function within a provider context.
 * All whatsapp-sender calls inside `fn` will route to the specified provider.
 *
 * @example
 * await withProvider('evolution', 'corretor-123-1700000', async () => {
 *   await sendTextMessage(phone, 'Hello'); // → Evolution API
 * });
 */
export function withProvider<T>(
  provider: 'evolution' | 'zapi',
  instanceName: string,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return providerStore.run({ provider, instanceName }, fn);
}

/**
 * Get current provider context (for debugging/logging).
 */
export function getCurrentProvider(): ProviderContext | undefined {
  return providerStore.getStore();
}

// ============================================
// HELPERS
// ============================================

function getContext(): ProviderContext | undefined {
  return providerStore.getStore();
}

function isEvolution(): boolean {
  return getContext()?.provider === 'evolution';
}

function getInstance(): string {
  const ctx = getContext();
  if (!ctx || ctx.provider !== 'evolution') {
    throw new Error('[whatsapp-sender] getInstance() called outside Evolution context');
  }
  return ctx.instanceName;
}

/**
 * Normalize phone for Evolution API format (5511999999999).
 */
function normalizePhoneForEvolution(phone: string): string {
  return evolution.formatPhoneNumber(phone);
}

/**
 * Build a numbered text fallback for interactive messages (buttons/lists)
 * that Evolution API doesn't support natively.
 */
function buttonsToText(
  message: string,
  buttons: Array<{ id?: string; label: string }>,
  options?: { title?: string; footer?: string },
): string {
  const parts: string[] = [];
  if (options?.title) parts.push(`*${options.title}*\n`);
  parts.push(message);
  parts.push('');
  buttons.forEach((b, i) => {
    parts.push(`${i + 1}. ${b.label}`);
  });
  parts.push('\n_Responda com o número da opção._');
  if (options?.footer) parts.push(`_${options.footer}_`);
  return parts.join('\n');
}

function listSectionsToText(
  message: string,
  sections: zapi.ListSection[],
  options?: { title?: string; footer?: string },
): string {
  const parts: string[] = [];
  if (options?.title) parts.push(`*${options.title}*\n`);
  parts.push(message);
  parts.push('');
  let idx = 1;
  for (const section of sections) {
    parts.push(`*${section.title}*`);
    for (const row of section.rows) {
      parts.push(`${idx}. ${row.title}${row.description ? ` - ${row.description}` : ''}`);
      idx++;
    }
    parts.push('');
  }
  parts.push('_Responda com o número da opção._');
  if (options?.footer) parts.push(`_${options.footer}_`);
  return parts.join('\n');
}

/**
 * Wrap Evolution send result to match Z-API response shape.
 */
function evoToZapiResponse(result: any): any {
  return {
    zapiMessageId: result?.key?.id,
    messageId: result?.key?.id,
  };
}

// ============================================
// MENSAGENS BÁSICAS
// ============================================

export async function sendTextMessage(
  phone: string,
  message: string,
  options?: { delayTyping?: number },
): Promise<any> {
  if (isEvolution()) {
    const instance = getInstance();
    const number = normalizePhoneForEvolution(phone);
    if (options?.delayTyping) {
      await evolution.sendTyping(instance, number, options.delayTyping);
    }
    const result = await evolution.sendTextMessage(instance, { number, text: message });
    return evoToZapiResponse(result);
  }
  return zapi.sendTextMessage(phone, message, options);
}

export async function sendReaction(
  phone: string,
  messageId: string,
  reaction: string,
  options?: { delayMessage?: number },
): Promise<any> {
  if (isEvolution()) {
    // Evolution API doesn't have a direct reaction endpoint in the current client.
    // Fall back to no-op silently (reactions are non-critical).
    console.log('[whatsapp-sender] sendReaction skipped on Evolution (not supported)');
    return {};
  }
  return zapi.sendReaction(phone, messageId, reaction, options);
}

// ============================================
// MENSAGENS INTERATIVAS (fallback to text on Evolution)
// ============================================

export async function sendQuickButtons(
  phone: string,
  message: string,
  buttons: zapi.QuickReplyButton[],
  options?: { title?: string; footer?: string },
): Promise<any> {
  if (isEvolution()) {
    const text = buttonsToText(message, buttons, options);
    return sendTextMessage(phone, text);
  }
  return zapi.sendQuickButtons(phone, message, buttons, options);
}

export async function sendOptionList(
  phone: string,
  message: string,
  buttonText: string,
  sections: zapi.ListSection[],
  options?: { title?: string; footer?: string },
): Promise<any> {
  if (isEvolution()) {
    const text = listSectionsToText(message, sections, options);
    return sendTextMessage(phone, text);
  }
  return zapi.sendOptionList(phone, message, buttonText, sections, options);
}

export async function sendActionButtons(
  phone: string,
  message: string,
  buttons: zapi.ActionButton[],
  options?: { title?: string; footer?: string },
): Promise<any> {
  if (isEvolution()) {
    // For action buttons, include URLs inline in the text
    const parts: string[] = [];
    if (options?.title) parts.push(`*${options.title}*\n`);
    parts.push(message);
    parts.push('');
    for (const b of buttons) {
      if (b.type === 'URL' && b.url) {
        parts.push(`${b.label}: ${b.url}`);
      } else if (b.type === 'CALL' && b.phone) {
        parts.push(`${b.label}: ${b.phone}`);
      } else {
        parts.push(`• ${b.label}`);
      }
    }
    if (options?.footer) parts.push(`\n_${options.footer}_`);
    return sendTextMessage(phone, parts.join('\n'));
  }
  return zapi.sendActionButtons(phone, message, buttons, options);
}

// ============================================
// ATALHOS PRÁTICOS
// ============================================

export async function askYesNo(
  phone: string,
  question: string,
  context?: string,
): Promise<any> {
  return sendQuickButtons(phone, question, [
    { id: `${context || 'q'}_sim`, label: '✅ Sim' },
    { id: `${context || 'q'}_nao`, label: '❌ Não' },
  ]);
}

export async function askAction(
  phone: string,
  message: string,
  actions: Array<{ id: string; emoji?: string; label: string }>,
): Promise<any> {
  return sendQuickButtons(
    phone,
    message,
    actions.slice(0, 3).map(a => ({
      id: a.id,
      label: a.emoji ? `${a.emoji} ${a.label}` : a.label,
    })),
  );
}

export async function sendEmpreendimentosMenu(
  phone: string,
  empreendimentos: Array<{ id: string; nome: string; cidade: string; disponiveis: number }>,
): Promise<any> {
  return sendOptionList(
    phone,
    'Escolha um empreendimento para ver mais detalhes:',
    '🏢 Ver Empreendimentos',
    [{
      title: 'Empreendimentos Disponíveis',
      rows: empreendimentos.map(e => ({
        id: `emp_${e.id}`,
        title: e.nome,
        description: `${e.cidade} • ${e.disponiveis} disponíveis`,
      })),
    }],
    { footer: 'Pratica Incorporadora' },
  );
}

export async function sendBairrosMenu(
  phone: string,
  sections: Array<{
    bairro: string;
    empreendimentos: Array<{ id: string; nome: string; disponiveis: number }>;
  }>,
): Promise<any> {
  const rows: zapi.ListSection[] = [];
  let totalRows = 0;

  for (const section of sections) {
    if (totalRows >= 10) break;
    const available = section.empreendimentos.slice(0, 10 - totalRows);
    if (available.length === 0) continue;

    rows.push({
      title: section.bairro,
      rows: available.map(emp => ({
        id: `emp_${emp.id}`,
        title: emp.nome,
        description: emp.disponiveis ? `${emp.disponiveis} disponíveis` : undefined,
      })),
    });

    totalRows += available.length;
  }

  return sendOptionList(
    phone,
    'Imoveis da Pratica por bairro. Escolhe um:',
    '📍 Bairros',
    rows,
    { footer: 'Pratica Incorporadora' },
  );
}

export async function sendUnidadesMenu(
  phone: string,
  empreendimento: string,
  unidades: Array<{ id: string; numero: string; tipo: string; valor: number }>,
): Promise<any> {
  const formatPrice = (v: number) => `R$ ${(v / 1000).toFixed(0)}mil`;

  return sendOptionList(
    phone,
    `Unidades disponíveis no *${empreendimento}*:`,
    '🏠 Ver Unidades',
    [{
      title: 'Unidades Disponíveis',
      rows: unidades.slice(0, 10).map(u => ({
        id: `unit_${u.id}`,
        title: `Unidade ${u.numero}`,
        description: `${u.tipo} • ${formatPrice(u.valor)}`,
      })),
    }],
    { footer: 'Toque para ver detalhes' },
  );
}

export async function sendUnitActions(
  phone: string,
  unidade: string,
  valor: number,
): Promise<any> {
  return askAction(phone, `O que você quer fazer com a unidade *${unidade}*?`, [
    { id: 'simular', emoji: '💰', label: 'Simular' },
    { id: 'tabela', emoji: '📊', label: 'Tabela' },
    { id: 'material', emoji: '📱', label: 'Material' },
  ]);
}

export async function askEntrada(
  phone: string,
  valor: number,
): Promise<any> {
  const formatPrice = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  return sendQuickButtons(
    phone,
    `Valor: *${formatPrice(valor)}*\n\nQual entrada você quer simular?`,
    [
      { id: 'entrada_10', label: '10% entrada' },
      { id: 'entrada_20', label: '20% entrada' },
      { id: 'entrada_30', label: '30% entrada' },
    ],
    { footer: 'Ou digite um valor específico' },
  );
}

export async function askPostSimulacao(phone: string): Promise<any> {
  return askAction(phone, 'O que você quer fazer agora?', [
    { id: 'outra_entrada', emoji: '🔄', label: 'Outra entrada' },
    { id: 'enviar_cliente', emoji: '📤', label: 'Enviar p/ cliente' },
    { id: 'ver_outras', emoji: '🏠', label: 'Ver outras' },
  ]);
}

// ============================================
// MÍDIA
// ============================================

export async function sendImage(
  phone: string,
  imageUrl: string,
  caption?: string,
): Promise<any> {
  if (isEvolution()) {
    const instance = getInstance();
    const number = normalizePhoneForEvolution(phone);
    const result = await evolution.sendMediaMessage(instance, {
      number,
      mediaType: 'image',
      media: { mediaUrl: imageUrl, caption },
    });
    return evoToZapiResponse(result);
  }
  return zapi.sendImage(phone, imageUrl, caption);
}

export async function sendDocument(
  phone: string,
  documentUrl: string,
  fileName: string,
  caption?: string,
): Promise<any> {
  if (isEvolution()) {
    const instance = getInstance();
    const number = normalizePhoneForEvolution(phone);
    const result = await evolution.sendMediaMessage(instance, {
      number,
      mediaType: 'document',
      media: { mediaUrl: documentUrl, fileName, caption },
    });
    return evoToZapiResponse(result);
  }
  return zapi.sendDocument(phone, documentUrl, fileName, caption);
}

export async function sendLocation(
  phone: string,
  location: {
    title: string;
    address: string;
    latitude: string | number;
    longitude: string | number;
    messageId?: string;
    delayMessage?: number;
  },
): Promise<any> {
  if (isEvolution()) {
    // Evolution API doesn't have a location endpoint in the current client.
    // Fall back to text with Google Maps link.
    const mapsUrl = `https://maps.google.com/?q=${location.latitude},${location.longitude}`;
    const text = `📍 *${location.title}*\n${location.address}\n\n${mapsUrl}`;
    return sendTextMessage(phone, text);
  }
  return zapi.sendLocation(phone, location);
}

// ============================================
// LEGADAS (mantidas para compatibilidade)
// ============================================

/** @deprecated Use sendQuickButtons */
export async function sendButtonMessage(
  phone: string,
  message: string,
  buttons: Array<{ id: string; label: string }>,
): Promise<any> {
  return sendQuickButtons(phone, message, buttons);
}

/** @deprecated Use sendActionButtons */
export async function sendButtonActions(
  phone: string,
  message: string,
  buttonActions: zapi.ActionButton[],
  options?: { title?: string; footer?: string },
): Promise<any> {
  return sendActionButtons(phone, message, buttonActions, options);
}
