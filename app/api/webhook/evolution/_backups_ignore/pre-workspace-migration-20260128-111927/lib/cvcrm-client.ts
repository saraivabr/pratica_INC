/**
 * Cliente para comunicação com as APIs do CV CRM
 * Tokens validados e funcionando
 */

import dotenv from 'dotenv';
import path from 'path';
import { comparePhones, phonesMatch } from './phone-utils';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

interface CVCRMResponse<T> {
    codigo?: number;
    total?: number;
    data?: T;
    [key: string]: unknown;
}

async function fetchCVCRM<T>(
    endpoint: string,
    token: string,
    init?: RequestInit
): Promise<CVCRMResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`[CVCRM] Fetching ${url} with email ${EMAIL} and token ${token ? '[REDACTED]' : 'MISSING'}`);
    
    const response = await fetch(url, {
        ...init,
        headers: {
            'accept': 'application/json',
            'email': EMAIL,
            'token': token,
            ...init?.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`[CVCRM] Error ${response.status} on ${endpoint}: ${text.slice(0, 200)}`);
        throw new Error(`CV CRM API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Busca lista de empreendimentos do CV CRM
 */
export async function getEmpreendimentosCVCRM() {
    const token = process.env.CVCRM_TOKEN_EMPREENDIMENTO || '';
    const data = await fetchCVCRM('/api/v1/cadastros/empreendimentos', token);
    return data;
}

/**
 * Busca lista de corretores do CV CRM
 */
export async function getCorretoresCVCRM() {
    const token = process.env.CVCRM_TOKEN_CORRETOR || '';
    const data = await fetchCVCRM('/api/v1/cadastros/corretores', token);
    // console.log('[CVCRM] getCorretoresCVCRM response keys:', Object.keys(data));
    return data;
}

/**
 * Busca unidades do CV CRM (API legada CVIO)
 */
export async function getUnidadesCVCRM(filters: Record<string, any> = {}) {
    const token = process.env.CVCRM_TOKEN_UNIDADE || '';
    const data = await fetchCVCRM('/api/cvio/unidade', token, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
    });
    return data;
}

/**
 * Busca situações das unidades (status)
 */
export async function getUnidadesSituacaoCVCRM() {
    const token = process.env.CVCRM_TOKEN_UNIDADE || '';
    // Endpoint conforme documentação "unidadessituacao" - Requires POST
    const data = await fetchCVCRM('/api/cvio/unidade/situacao', token, {
        method: 'POST'
    });
    return data;
}

/**
 * Busca séries/tabelas de preço do CV CRM (API legada CVIO)
 */
export async function getSeriesCVCRM() {
    const token = process.env.CVCRM_TOKEN_SERIE || '';
    const data = await fetchCVCRM('/api/cvio/serie', token);
    return data;
}

/**
 * Busca leads do CV CRM
 * @param params.idcorretor - Filtrar por corretor específico
 */
export async function getLeadsCVCRM(params?: { limit?: number; offset?: number; idcorretor?: number }) {
    const token = process.env.CVCRM_TOKEN_LEAD || '';
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.offset) queryParams.set('offset', String(params.offset));
    if (params?.idcorretor) queryParams.set('idcorretor', String(params.idcorretor));

    const endpoint = `/api/v1/comercial/leads${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const data = await fetchCVCRM(endpoint, token);
    return data;
}

/**
 * Busca lista de imobiliárias do CV CRM
 */
export async function getImobiliariasCVCRM() {
    const token = process.env.CVCRM_TOKEN_IMOBILIARIA || '';
    const data = await fetchCVCRM('/api/v1/cadastros/imobiliarias', token);
    return data;
}

/**
 * Busca uma imobiliária específica por ID do CV CRM
 */
export async function getImobiliariaCVCRM(id: number) {
    const token = process.env.CVCRM_TOKEN_IMOBILIARIA || '';
    const data = await fetchCVCRM(`/api/v1/cadastros/imobiliarias/${id}`, token);
    return data;
}

/**
 * Busca um corretor específico por ID do CV CRM
 */
export async function getCorretorCVCRM(id: number) {
    const token = process.env.CVCRM_TOKEN_CORRETOR || '';
    const data = await fetchCVCRM(`/api/v1/cadastros/corretores/${id}`, token);
    return data;
}

/**
 * Busca corretor por telefone no CV CRM
 * Retorna dados do corretor se encontrado
 */
export async function findCorretorByPhone(phone: string): Promise<{
    found: boolean;
    nome?: string;
    imobiliaria?: string;
    imobiliariaId?: string;
    email?: string;
    idcorretor?: number;
    matchConfidence?: string;
}> {
    try {
        const token = process.env.CVCRM_TOKEN_CORRETOR || '';
        const data = await fetchCVCRM<any>('/api/v1/cadastros/corretores', token);

        // Buscar na lista de corretores usando comparacao robusta de telefones
        const corretores = Array.isArray(data) ? data : (data.data || data.corretores || []);

        // Buscar melhor match
        let bestMatch: { corretor: any; confidence: string } | null = null;

        for (const corretor of corretores) {
            const corretorPhone = String(corretor.celular || corretor.telefone || '');
            const matchResult = comparePhones(phone, corretorPhone);

            if (matchResult.matched) {
                // Escolher match com maior confianca
                if (!bestMatch ||
                    (matchResult.confidence === 'exact') ||
                    (matchResult.confidence === 'high' && bestMatch.confidence !== 'exact')) {
                    bestMatch = { corretor, confidence: matchResult.confidence };
                }

                // Match exato - parar de procurar
                if (matchResult.confidence === 'exact') {
                    break;
                }
            }
        }

        if (bestMatch) {
            return {
                found: true,
                nome: bestMatch.corretor.nome || bestMatch.corretor.nomecorretor,
                imobiliaria: bestMatch.corretor.imobiliaria?.nome || bestMatch.corretor.nomefantasia,
                imobiliariaId: bestMatch.corretor.imobiliaria?.id || bestMatch.corretor.idimobiliaria,
                email: bestMatch.corretor.email,
                idcorretor: bestMatch.corretor.idcorretor || bestMatch.corretor.id,
                matchConfidence: bestMatch.confidence,
            };
        }

        return { found: false };
    } catch (error) {
        console.error('Erro ao buscar corretor no CV CRM:', error);
        return { found: false };
    }
}

export type { CVCRMResponse };
