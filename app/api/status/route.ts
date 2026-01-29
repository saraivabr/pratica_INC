import { NextResponse } from 'next/server';

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

interface EndpointStatus {
    name: string;
    endpoint: string;
    token: string;
    status: 'ok' | 'error' | 'no_token';
    statusCode?: number;
    message?: string;
    recordCount?: number;
    responseTime?: number;
}

async function testEndpoint(
    name: string,
    endpoint: string,
    tokenEnvName: string
): Promise<EndpointStatus> {
    const token = process.env[tokenEnvName] || '';

    if (!token) {
        return {
            name,
            endpoint,
            token: tokenEnvName,
            status: 'no_token',
            message: 'Token não configurado'
        };
    }

    const startTime = Date.now();

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'accept': 'application/json',
                'email': EMAIL,
                'token': token,
            },
            cache: 'no-store'
        });

        const responseTime = Date.now() - startTime;
        const text = await response.text();

        if (!response.ok) {
            return {
                name,
                endpoint,
                token: tokenEnvName,
                status: 'error',
                statusCode: response.status,
                message: `HTTP ${response.status}`,
                responseTime
            };
        }

        let recordCount = 0;
        if (text && text.trim()) {
            try {
                const data = JSON.parse(text);
                // Tenta extrair contagem de diferentes formatos
                recordCount = data.total || data.data?.length || (Array.isArray(data) ? data.length : 0);
            } catch {
                // JSON inválido
            }
        }

        return {
            name,
            endpoint,
            token: tokenEnvName,
            status: 'ok',
            statusCode: response.status,
            recordCount,
            responseTime
        };
    } catch (error) {
        return {
            name,
            endpoint,
            token: tokenEnvName,
            status: 'error',
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            responseTime: Date.now() - startTime
        };
    }
}

export async function GET() {
    const endpoints = [
        { name: 'Empreendimentos', endpoint: '/api/v1/cadastros/empreendimentos', token: 'CVCRM_TOKEN_EMPREENDIMENTO' },
        { name: 'Corretores', endpoint: '/api/v1/cadastros/corretores', token: 'CVCRM_TOKEN_CORRETOR' },
        { name: 'Leads', endpoint: '/api/v1/comercial/leads?limit=10', token: 'CVCRM_TOKEN_LEAD' },
        { name: 'Reservas', endpoint: '/api/v1/comercial/reservas?limit=10', token: 'CVCRM_TOKEN_RESERVA' },
        { name: 'Unidades (CVIO)', endpoint: '/api/cvio/unidade', token: 'CVCRM_TOKEN_UNIDADE' },
        { name: 'Séries (CVIO)', endpoint: '/api/cvio/serie', token: 'CVCRM_TOKEN_SERIE' },
        { name: 'Imobiliárias', endpoint: '/api/v1/cadastros/imobiliarias', token: 'CVCRM_TOKEN_IMOBILIARIA' },
    ];

    const results = await Promise.all(
        endpoints.map(ep => testEndpoint(ep.name, ep.endpoint, ep.token))
    );

    const summary = {
        total: results.length,
        ok: results.filter(r => r.status === 'ok').length,
        error: results.filter(r => r.status === 'error').length,
        noToken: results.filter(r => r.status === 'no_token').length,
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        email: EMAIL ? `${EMAIL.substring(0, 3)}...` : 'não configurado'
    };

    return NextResponse.json({
        summary,
        endpoints: results
    });
}
