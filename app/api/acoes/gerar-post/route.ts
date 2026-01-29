import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imovel_nome = 'Imóvel',
      imovel_preco,
      imovel_quartos,
      imovel_bairro,
      tipo = 'instagram',
    } = body;

    const precoFormatado = imovel_preco
      ? `R$ ${imovel_preco.toLocaleString('pt-BR')}`
      : 'Consulte';

    const templates: Record<string, any> = {
      instagram: {
        heading: `🏠 ${imovel_nome}`,
        descricao: `${imovel_quartos ? `${imovel_quartos} quartos` : 'Amplo'} ${imovel_bairro ? `em ${imovel_bairro}` : ''}\n\n` +
          `✨ Acabamento de alto padrão\n` +
          `🚗 Vaga de garagem\n` +
          `Sua nova casa te espera! 🔑`,
        cta: '💬 Mande uma mensagem!',
        hashtags: ['#ImoveisSP', '#ApartamentoVenda', '#PraticaIncorporadora'],
        preco_display: `💰 ${precoFormatado}`,
      },
    };

    const template = templates[tipo] || templates.instagram;

    return NextResponse.json({
      success: true,
      post: {
        tipo,
        ...template,
        texto_completo: `${template.heading}\n\n${template.descricao}\n\n${template.preco_display}\n\n${template.cta}\n\n${template.hashtags.join(' ')}`,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/acoes/gerar-post] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar post', details: error.message },
      { status: 500 }
    );
  }
}
