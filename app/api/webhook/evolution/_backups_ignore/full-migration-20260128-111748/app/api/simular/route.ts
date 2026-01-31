import { NextRequest, NextResponse } from 'next/server';

interface SimulacaoRequest {
    valorImovel: number;
    percentualEntrada: number;
    prazoMeses: number;
    taxaAnual: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: SimulacaoRequest = await request.json();

        const { valorImovel, percentualEntrada, prazoMeses, taxaAnual } = body;

        if (!valorImovel || !percentualEntrada || !prazoMeses || !taxaAnual) {
            return NextResponse.json(
                { success: false, error: 'Parâmetros obrigatórios ausentes' },
                { status: 400 }
            );
        }

        const entrada = valorImovel * (percentualEntrada / 100);
        const valorFinanciado = valorImovel - entrada;
        const taxaMensal = taxaAnual / 12 / 100;

        // Fórmula Price para cálculo de parcela
        const parcela = valorFinanciado *
            (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
            (Math.pow(1 + taxaMensal, prazoMeses) - 1);

        const totalPago = entrada + (parcela * prazoMeses);
        const totalJuros = totalPago - valorImovel;

        return NextResponse.json({
            success: true,
            data: {
                valorImovel,
                entrada: Math.round(entrada * 100) / 100,
                valorFinanciado: Math.round(valorFinanciado * 100) / 100,
                prazoMeses,
                taxaAnual,
                taxaMensal: Math.round(taxaMensal * 10000) / 100,
                parcelaMensal: Math.round(parcela * 100) / 100,
                totalPago: Math.round(totalPago * 100) / 100,
                totalJuros: Math.round(totalJuros * 100) / 100,
            }
        });
    } catch (error) {
        console.error('Erro na simulação:', error);

        return NextResponse.json(
            { success: false, error: 'Erro ao processar simulação' },
            { status: 500 }
        );
    }
}
