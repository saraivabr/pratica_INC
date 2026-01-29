import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { TabelaTemplate } from '@/components/pdf-templates';
import { getEmpreendimentosCVCRM, getUnidadesCVCRM } from '@/lib/cvcrm-client';
import { getUserById } from '@/lib/supabase';
import { createElement } from 'react';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface RequestBody {
  empreendimentoId: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { empreendimentoId, userId } = body;

    if (!empreendimentoId || !userId) {
      return NextResponse.json(
        { success: false, error: 'empreendimentoId e userId são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar usuário
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const empResponse = await getEmpreendimentosCVCRM();
    const empResponseAny = empResponse as any;
    const empList = Array.isArray(empResponse)
      ? empResponse
      : (empResponseAny.empreendimentos || empResponseAny.data || []);
    const empreendimento = empList.find(
      (emp: any) => String(emp.idempreendimento || emp.id) === empreendimentoId
    );

    if (!empreendimento) {
      return NextResponse.json(
        { success: false, error: 'Empreendimento não encontrado' },
        { status: 404 }
      );
    }

    const unidadesResponse = await getUnidadesCVCRM();
    const unidadesRaw = Array.isArray(unidadesResponse)
      ? unidadesResponse
      : (unidadesResponse as any).data || (unidadesResponse as any).unidades || [];

    const unidades = unidadesRaw
      .filter((u: any) => String(u.idempreendimento) === empreendimentoId)
      .sort((a: any, b: any) => Number(a.andar || 0) - Number(b.andar || 0));

    // Gerar PDF
    const pdfBuffer = await renderToBuffer(
      createElement(TabelaTemplate, {
        empreendimento: {
          nome: empreendimento.nome || empreendimento.empreendimento,
          cidade: empreendimento.cidade?.nome || empreendimento.cidade || empreendimento.municipio,
          bairro: empreendimento.bairro?.nome || empreendimento.bairro,
          precoMinimo: empreendimento.preco_minimo || empreendimento.precoMinimo || undefined,
          precoMaximo: empreendimento.preco_maximo || empreendimento.precoMaximo || undefined,
        },
        unidades: (unidades || []).map((u: any) => {
          const situacao = String(u.situacao || u.idunidadesituacao || "").toUpperCase();
          const status =
            ["V", "VENDIDA", "VENDIDO"].includes(situacao)
              ? "vendido"
              : ["R", "RESERVADA", "RESERVADO", "B", "BLOQUEADA"].includes(situacao)
                ? "reservado"
                : "disponivel";

          return {
            id: String(u.idunidade),
            tipo: String(u.tipo || u.tipologia || u.descricao || ''),
            metragem: Number(u.area_privativa || u.area_total || 0),
            valor: Number(u.valor_venda || u.valor_tabela || u.preco || 0),
            status,
            quartos: Number(u.quartos || 0),
            vagas: Number(u.vagas || 0),
            andar: Number(u.andar || 0),
            final: String(u.nome || u.numero || ''),
          };
        }),
        corretor: {
          nome: user.nome,
          telefone: user.telefone,
        },
      }) as any
    );

    // Retornar PDF diretamente
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tabela-${empreendimento.nome.replace(/\s+/g, '-')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Erro ao gerar PDF de tabela:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar PDF' },
      { status: 500 }
    );
  }
}
