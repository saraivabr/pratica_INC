import { NextResponse } from 'next/server';
import { getEmpreendimentosCVCRM, getCorretoresCVCRM } from '@/lib/cvcrm-client';

export async function GET() {
    const checks = {
        empreendimentos: false,
        corretores: false,
        timestamp: new Date().toISOString(),
    };

    try {
        await getEmpreendimentosCVCRM();
        checks.empreendimentos = true;
    } catch {
        checks.empreendimentos = false;
    }

    try {
        await getCorretoresCVCRM();
        checks.corretores = true;
    } catch {
        checks.corretores = false;
    }

    const allOk = checks.empreendimentos && checks.corretores;

    return NextResponse.json(
        {
            status: allOk ? 'healthy' : 'degraded',
            checks,
        },
        { status: allOk ? 200 : 503 }
    );
}
