'use client';

import { useState } from 'react';

interface SimulacaoParams {
    valorImovel: number;
    percentualEntrada: number;
    prazoMeses: number;
    taxaAnual: number;
}

interface SimulacaoResult {
    valorImovel: number;
    entrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    taxaMensal: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
}

interface UseSimulacaoResult {
    resultado: SimulacaoResult | null;
    loading: boolean;
    error: string | null;
    simular: (params: SimulacaoParams) => Promise<void>;
    limpar: () => void;
}

/**
 * Hook para realizar simulações financeiras via API
 */
export function useSimulacao(): UseSimulacaoResult {
    const [resultado, setResultado] = useState<SimulacaoResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const simular = async (params: SimulacaoParams) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/simular', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error('Falha na simulação');
            }

            const result = await response.json();

            if (result.success) {
                setResultado(result.data);
            } else {
                throw new Error(result.error || 'Erro desconhecido');
            }
        } catch (err) {
            console.error('Erro na simulação:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido');

            // Fallback: cálculo local
            const { valorImovel, percentualEntrada, prazoMeses, taxaAnual } = params;
            const entrada = valorImovel * (percentualEntrada / 100);
            const valorFinanciado = valorImovel - entrada;
            const taxaMensal = taxaAnual / 12 / 100;

            const parcela = valorFinanciado *
                (taxaMensal * Math.pow(1 + taxaMensal, prazoMeses)) /
                (Math.pow(1 + taxaMensal, prazoMeses) - 1);

            const totalPago = entrada + (parcela * prazoMeses);
            const totalJuros = totalPago - valorImovel;

            setResultado({
                valorImovel,
                entrada: Math.round(entrada * 100) / 100,
                valorFinanciado: Math.round(valorFinanciado * 100) / 100,
                prazoMeses,
                taxaAnual,
                taxaMensal: Math.round(taxaMensal * 10000) / 100,
                parcelaMensal: Math.round(parcela * 100) / 100,
                totalPago: Math.round(totalPago * 100) / 100,
                totalJuros: Math.round(totalJuros * 100) / 100,
            });
        } finally {
            setLoading(false);
        }
    };

    const limpar = () => {
        setResultado(null);
        setError(null);
    };

    return {
        resultado,
        loading,
        error,
        simular,
        limpar,
    };
}

export type { SimulacaoParams, SimulacaoResult };
