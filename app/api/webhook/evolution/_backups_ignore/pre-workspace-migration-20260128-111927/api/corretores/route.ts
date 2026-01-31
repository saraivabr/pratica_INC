import { NextRequest, NextResponse } from 'next/server';
import { requireTenantContext } from '@/lib/api-helpers';
import { getCorretoresCVCRM } from '@/lib/cvcrm-client';

export async function GET(request: NextRequest) {
    try {
        // Verificar autenticação e obter contexto do tenant
        const ctx = await requireTenantContext(request);
        if (ctx.error) return ctx.error;
        // tenantId disponível para uso futuro quando houver corretores locais por tenant

        const response = await getCorretoresCVCRM();

        const corretores = (response.corretores || response.data || []) as Record<string, unknown>[];

        return NextResponse.json({
            success: true,
            data: corretores,
            total: corretores.length,
            source: 'cvcrm'
        });
    } catch (error) {
        console.error('Erro ao buscar corretores do CV CRM:', error);

        return NextResponse.json(
            { success: false, error: 'Erro ao buscar corretores' },
            { status: 500 }
        );
    }
}
