import { NextResponse } from 'next/server';

const BASE_URL = process.env.CVCRM_BASE_URL || 'https://pratica.cvcrm.com.br';
const EMAIL = process.env.CVCRM_EMAIL || '';

export async function GET(request: Request) {
    try {
        const token = process.env.CVCRM_TOKEN_RESERVA || '';

        if (!token) {
            return NextResponse.json({ data: [], total: 0, message: 'Token de reservas não configurado' });
        }

        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') || '30';
        const offset = searchParams.get('offset') || '0';

        const response = await fetch(
            `${BASE_URL}/api/v1/comercial/reservas?limit=${limit}&offset=${offset}`,
            {
                headers: {
                    'accept': 'application/json',
                    'email': EMAIL,
                    'token': token,
                },
                next: { revalidate: 300 }
            }
        );

        // Se não for ok, retorna array vazio
        if (!response.ok) {
            console.error(`CV CRM Reservas API error: ${response.status}`);
            return NextResponse.json({ data: [], total: 0, error: `API error: ${response.status}` });
        }

        // Verifica se há conteúdo antes de parsear
        const text = await response.text();
        if (!text || text.trim() === '') {
            return NextResponse.json({ data: [], total: 0 });
        }

        try {
            const data = JSON.parse(text);
            return NextResponse.json(data);
        } catch {
            console.error('Erro ao parsear resposta de reservas:', text.substring(0, 100));
            return NextResponse.json({ data: [], total: 0 });
        }
    } catch (error) {
        console.error('Erro ao buscar reservas:', error);
        return NextResponse.json({ data: [], total: 0, error: 'Erro ao buscar reservas' });
    }
}
