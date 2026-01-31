import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cpf } = body;

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      );
    }

    // Limpa o CPF removendo caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve conter 11 dígitos' },
        { status: 400 }
      );
    }

    // Controller para timeout de 120 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      // Token fornecido pelo usuário
      const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL2xvZ2luIiwiaWF0IjoxNzY4NzYyNzgwLCJleHAiOjE4MDAyOTg3ODAsIm5iZiI6MTc2ODc2Mjc4MCwianRpIjoiOWFTRjl5cVRucHBndk5vQiIsInN1YiI6IjEwODYzIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.RVk4-5N_lw3aB60Coa9VOl6tGqu5WRQS_EmnBE_ZVYA";

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
        cpf: resultData.dadosCadastrais?.cpf || cpf,
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