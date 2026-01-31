import { NextRequest, NextResponse } from 'next/server';
import { validateRequest, SimularSchema } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
    try {
        const validation = await validateRequest(request, SimularSchema);
        if (!validation.success) {
            return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
        }
        const { valorImovel, percentualEntrada, prazoMeses, taxaAnual } = validation.data;

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
