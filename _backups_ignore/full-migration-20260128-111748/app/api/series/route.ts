import { NextResponse } from 'next/server';
import { getSeriesCVCRM } from '@/lib/cvcrm-client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const idEmpreendimento = searchParams.get('idempreendimento');

    try {
        const response = await getSeriesCVCRM();

        let series = [];

        // Verifica formato da resposta (pode ser array direto ou objeto com data)
        if (Array.isArray(response)) {
            series = response;
        } else if (response && Array.isArray(response.data)) {
            series = response.data;
        } else if (response && Array.isArray(response.series)) {
            series = response.series;
        }

        // Filtrar por empreendimento se solicitado e se o campo existir
        // A API de série geralmente tem idempreendimento ou id_empreendimento
        if (idEmpreendimento) {
            series = series.filter((s: any) =>
                String(s.idempreendimento) === idEmpreendimento ||
                String(s.id_empreendimento) === idEmpreendimento
            );
        }

        return NextResponse.json({ success: true, data: series });
    } catch (error) {
        console.error('Erro ao buscar séries:', error);
        return NextResponse.json({ error: 'Erro interno ao buscar séries' }, { status: 500 });
    }
}
