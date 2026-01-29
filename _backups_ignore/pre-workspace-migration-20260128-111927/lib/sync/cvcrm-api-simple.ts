/**
 * CV CRM API Client (Simplified for 5 Working Endpoints)
 *
 * Based on real API testing 2026-01-17
 * Uses API Comercial paths that actually work
 */

import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

// Rate limiting: 200 req/min for API Comercial
const RATE_LIMIT_DELAY = 350; // ms between requests (171 req/min max)

interface PaginationOptions {
  limit?: number;
  offset?: number;
  pagina?: number;
}

interface ApiResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
  nextPage?: number;
}

/**
 * Base fetch with headers and error handling
 */
async function fetchFromCVCRM<T>(
  endpoint: string,
  token: string,
  params: Record<string, any> = {}
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);

  // Add query params
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, String(params[key]));
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'email': EMAIL,
      'token': token,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  if (response.status === 204) {
    return { data: [], total: 0 } as any;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`CV CRM API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Sleep for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * ==================================================================
 * LEADS CORE
 * Endpoint: /api/v1/comercial/leads
 * Total: 19.642 registros
 * ==================================================================
 */
export async function getLeads(options: PaginationOptions = {}): Promise<ApiResponse<any>> {
  const token = process.env.CVCRM_TOKEN_LEAD!;
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetchFromCVCRM<any>(
    '/api/v1/comercial/leads',
    token,
    { limit, offset }
  );

  // Formato: { codigo, total, limit, offset, totalConteudo, leads: [...] }
  return {
    data: response.leads || [],
    total: response.total || 0,
    hasMore: (offset + limit) < (response.total || 0),
    nextOffset: offset + limit
  };
}

/**
 * ==================================================================
 * LEADS INTERAÇÕES
 * Endpoint: /api/v1/cv/leads_interacoes
 * Total: 35.305 registros
 * ==================================================================
 */
export async function getLeadsInteracoes(options: PaginationOptions = {}): Promise<ApiResponse<any>> {
  const token = process.env.CVCRM_TOKEN_LEAD!;
  const pagina = options.pagina || 1;

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetchFromCVCRM<any>(
    '/api/v1/cv/leads_interacoes',
    token,
    { pagina }
  );

  // Formato: { pagina, registros, total_de_registros, total_de_paginas, dados: [...] }
  return {
    data: response.dados || [],
    total: response.total_de_registros || 0,
    hasMore: pagina < (response.total_de_paginas || 0),
    nextPage: pagina + 1
  };
}

/**
 * ==================================================================
 * LEADS TAREFAS
 * Endpoint: /api/v1/comercial/leads/tarefas
 * Total: 8.182 registros
 * ==================================================================
 */
export async function getLeadsTarefas(options: PaginationOptions = {}): Promise<ApiResponse<any>> {
  const token = process.env.CVCRM_TOKEN_LEAD!;
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetchFromCVCRM<any>(
    '/api/v1/comercial/leads/tarefas',
    token,
    { limit, offset }
  );

  // Formato: { codigo, total, limit, offset, totalConteudo, tarefas: [...] }
  return {
    data: response.tarefas || [],
    total: response.total || 0,
    hasMore: (offset + limit) < (response.total || 0),
    nextOffset: offset + limit
  };
}

/**
 * ==================================================================
 * ATENDIMENTOS
 * Endpoint: /api/v1/relacionamento/atendimentos
 * Total: 1.558 registros
 * ==================================================================
 */
export async function getAtendimentos(options: PaginationOptions = {}): Promise<ApiResponse<any>> {
  const token = process.env.CVCRM_TOKEN_LEAD!;
  const pagina = options.pagina || 1;
  const quantidade = options.limit || 100;

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetchFromCVCRM<any>(
    '/api/v1/relacionamento/atendimentos',
    token,
    { pagina, quantidade }
  );

  // Formato: { total, paginas, quantidade, pagina, dados: [...] }
  return {
    data: response.dados || [],
    total: response.total || 0,
    hasMore: pagina < (response.paginas || 0),
    nextPage: pagina + 1
  };
}

/**
 * ==================================================================
 * ASSISTÊNCIAS
 * Endpoint: /api/v1/relacionamento/assistencias
 * Total: 1 registro
 * ==================================================================
 */
export async function getAssistencias(options: PaginationOptions = {}): Promise<ApiResponse<any>> {
  const token = process.env.CVCRM_TOKEN_LEAD!;
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  await sleep(RATE_LIMIT_DELAY);

  const response = await fetchFromCVCRM<any>(
    '/api/v1/relacionamento/assistencias',
    token,
    { limit, offset }
  );

  // Formato: { total, offset, limit, assistencias: [...] }
  return {
    data: response.assistencias || [],
    total: response.total || 0,
    hasMore: (offset + limit) < (response.total || 0),
    nextOffset: offset + limit
  };
}

/**
 * ==================================================================
 * HELPER: Get all records with pagination
 * ==================================================================
 */
export async function getAllRecords<T>(
  fetchFn: (options: PaginationOptions) => Promise<ApiResponse<T>>,
  onProgress?: (current: number, total: number) => void
): Promise<T[]> {
  const allRecords: T[] = [];
  let hasMore = true;
  let offset = 0;
  let pagina = 1;

  while (hasMore) {
    const response = await fetchFn({ offset, pagina, limit: 100 });

    allRecords.push(...response.data);

    if (onProgress) {
      onProgress(allRecords.length, response.total);
    }

    hasMore = response.hasMore;
    offset = response.nextOffset || 0;
    pagina = response.nextPage || 1;

    // Safety: prevent infinite loops
    if (allRecords.length >= 100000) {
      console.warn('⚠️  Reached safety limit of 100k records');
      break;
    }
  }

  return allRecords;
}
