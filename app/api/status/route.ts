import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { dbQuery } from '@/lib/db';
import { fetchInstances } from '@/lib/evolution-api';

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

interface InfrastructureStatus {
    name: string;
    status: 'ok' | 'error' | 'not_configured';
    responseTime?: number;
    message?: string;
    details?: string;
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

async function testPostgreSQL(): Promise<InfrastructureStatus> {
    const startTime = Date.now();

    try {
        await dbQuery('SELECT 1');
        const responseTime = Date.now() - startTime;

        return {
            name: 'PostgreSQL',
            status: 'ok',
            responseTime,
            details: process.env.DATABASE_URL?.includes('localhost') ? 'localhost:5432' : 'Remote',
        };
    } catch (error) {
        return {
            name: 'PostgreSQL',
            status: 'error',
            responseTime: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

async function testRedis(): Promise<InfrastructureStatus> {
    const startTime = Date.now();

    try {
        const redis = getRedis();

        if (!redis) {
            return {
                name: 'Redis',
                status: 'not_configured',
                message: 'SCALINGO_REDIS_URL não configurada',
            };
        }

        // Connect if not connected yet
        if (redis.status !== 'ready') {
            await redis.connect();
        }

        await redis.ping();
        const responseTime = Date.now() - startTime;

        return {
            name: 'Redis',
            status: 'ok',
            responseTime,
            details: 'Cache distribuído',
        };
    } catch (error) {
        return {
            name: 'Redis',
            status: 'error',
            responseTime: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

async function testEvolutionAPI(): Promise<InfrastructureStatus> {
    const startTime = Date.now();

    const apiKey = process.env.EVOLUTION_API_KEY;
    const apiUrl = process.env.EVOLUTION_BASE_URL;

    if (!apiKey) {
        return {
            name: 'Evolution API',
            status: 'not_configured',
            message: 'EVOLUTION_API_KEY não configurada',
        };
    }

    try {
        const instances = await fetchInstances();
        const responseTime = Date.now() - startTime;

        return {
            name: 'Evolution API',
            status: 'ok',
            responseTime,
            details: `${instances.length} instâncias`,
        };
    } catch (error) {
        return {
            name: 'Evolution API',
            status: 'error',
            responseTime: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
        };
    }
}

export async function GET() {
    // Test infrastructure in parallel
    const [postgresStatus, redisStatus, evolutionStatus] = await Promise.all([
        testPostgreSQL(),
        testRedis(),
        testEvolutionAPI(),
    ]);

    const infrastructure = [postgresStatus, redisStatus, evolutionStatus];

    const infrastructureSummary = {
        total: infrastructure.length,
        ok: infrastructure.filter(r => r.status === 'ok').length,
        error: infrastructure.filter(r => r.status === 'error').length,
        notConfigured: infrastructure.filter(r => r.status === 'not_configured').length,
    };

    // Test CV CRM endpoints
    const endpoints = [
        { name: 'Empreendimentos', endpoint: '/api/v1/cadastros/empreendimentos', token: 'CVCRM_TOKEN_EMPREENDIMENTO' },
        { name: 'Corretores', endpoint: '/api/v1/cadastros/corretores', token: 'CVCRM_TOKEN_CORRETOR' },
        { name: 'Leads', endpoint: '/api/v1/comercial/leads?limit=10', token: 'CVCRM_TOKEN_LEAD' },
        { name: 'Reservas', endpoint: '/api/v1/comercial/reservas?limit=10', token: 'CVCRM_TOKEN_RESERVA' },
        { name: 'Unidades (CVIO)', endpoint: '/api/cvio/unidade', token: 'CVCRM_TOKEN_UNIDADE' },
        { name: 'Séries (CVIO)', endpoint: '/api/cvio/serie', token: 'CVCRM_TOKEN_SERIE' },
        // Note: Imobiliárias endpoint (/api/v1/cadastros/imobiliarias) returns 405 Method Not Allowed
        // The CVCRM_TOKEN_IMOBILIARIA token does not have a working GET endpoint for listing all imobiliarias
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
        infrastructure,
        infrastructureSummary,
        summary,
        endpoints: results
    });
}
