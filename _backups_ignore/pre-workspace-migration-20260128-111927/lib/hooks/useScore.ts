"use client";

import { useState } from "react";

interface ScoreData {
  cpf: string;
  nome?: string;
  dataNascimento?: string;
  protocolo?: string;
  score: number;
  risco: string;
  probabilidade?: string;
  dataConsulta: string;
  [key: string]: unknown;
}

interface UseScoreState {
  score: ScoreData | null;
  loading: boolean;
  error: string | null;
}

interface UseScoreReturn extends UseScoreState {
  consultarScore: (cpf: string) => Promise<ScoreData>;
  limparScore: () => void;
}

function useScore(): UseScoreReturn {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const consultarScore = async (cpf: string): Promise<ScoreData> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cpf-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cpf }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao consultar score");
      }

      const data: ScoreData = await response.json();
      setScore(data);
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const limparScore = (): void => {
    setScore(null);
    setLoading(false);
    setError(null);
  };

  return {
    score,
    loading,
    error,
    consultarScore,
    limparScore,
  };
}

export default useScore;
