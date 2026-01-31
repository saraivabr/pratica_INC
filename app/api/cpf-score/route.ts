import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/rate-limit-helper';
import { validateRequest, CpfScoreSchema } from '@/lib/validation-schemas';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const rateLimited = await applyRateLimit(request as NextRequest, 'CPF_SCORE');
    if (rateLimited) return rateLimited;

    const ctx = await requireWorkspaceContext(request as NextRequest);
    if (ctx.error) return ctx.error;

    const validation = await validateRequest(request, CpfScoreSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const cpfLimpo = validation.data.cpf;

    // Controller para timeout de 120 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const token = process.env.CPF_SCORE_API_TOKEN;
      if (!token) {
        return NextResponse.json(
          { error: 'CPF Score API não configurada' },
          { status: 503 }
        );
      }

      console.log(`[Score API] Consultando CPF: ${cpfLimpo}`);

      const response = await fetch('https://gateway.apibrasil.io/api/v2/consulta/cpf/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cpf: cpfLimpo,
          tipo: 'serasa-score-pf',
          homolog: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      console.log('[Score API] Response status:', response.status);

      if (!response.ok) {
        console.error('[Score API] Erro na resposta:', data);
        return NextResponse.json(
          { error: 'Erro na consulta do CPF', details: data },
          { status: response.status }
        );
      }

      // Extração e mapeamento dos dados conforme estrutura de resposta verificada
      const resultData = data.data?.pendSPCSerasaPF;

      if (!resultData) {
        return NextResponse.json(
          { error: 'Dados não encontrados na resposta da API', details: data },
          { status: 404 }
        );
      }

      const scoreValue = resultData.score?.score || 0;
      const probInadimplencia = resultData.score?.probabilidadeInadimplencia;

      // Cálculo da faixa de risco baseado no score real
      let risco = 'Desconhecido';
      if (scoreValue <= 300) risco = 'Ruim';
      else if (scoreValue <= 500) risco = 'Regular';
      else if (scoreValue <= 700) risco = 'Bom';
      else risco = 'Excelente';

      const mappedResponse = {
        cpf: resultData.dadosCadastrais?.cpf || cpfLimpo,
        nome: resultData.dadosCadastrais?.nome,
        dataNascimento: resultData.dadosCadastrais?.dataNascimento,
        protocolo: resultData.dadosCadastrais?.protocolo,
        score: scoreValue,
        risco: risco,
        probabilidade: probInadimplencia ? `${probInadimplencia}%` : undefined,
        dataConsulta: resultData.dadosCadastrais?.dataConsulta || new Date().toISOString()
      };

      return NextResponse.json(mappedResponse);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Timeout na requisição. A consulta excedeu 120 segundos.' },
          { status: 504 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Erro na API cpf-score:', error);

    return NextResponse.json(
      { error: 'Erro interno do servidor', message: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}