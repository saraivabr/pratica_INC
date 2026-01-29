import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { TabelaTemplate, SimulacaoTemplate, BookTemplate } from '@/components/pdf-templates';
import { dbQuery } from '@/lib/db';
import { getUserById } from '@/lib/supabase';
import { sendTextMessage, sendDocument, sendActionButtons } from '@/lib/zapi';
import { createElement } from 'react';
import { randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

type MaterialType = 'tabela' | 'simulacao' | 'book';

interface EmpreendimentoData {
  id: string;
  nome: string;
  cidade?: string;
  bairro?: string;
  construtora?: string;
  previsaoEntrega?: string;
  tipo?: string;
  descricao?: string;
  diferenciais?: string[];
  imagemPrincipal?: string;
  precoMinimo?: number;
  precoMaximo?: number;
}

interface UnidadeData {
  id: string;
  tipo: string;
  metragem: number;
  valor: number;
  status: string;
  quartos: number;
  vagas: number;
  andar?: number;
  final?: string;
}

interface RequestBody {
  userId: string;
  type: MaterialType;
  empreendimento: EmpreendimentoData;
  unidades: UnidadeData[];
  simulacao?: {
    valorImovel: number;
    entrada: number;
    percentualEntrada: number;
    valorFinanciado: number;
    prazoMeses: number;
    taxaAnual: number;
    parcelaMensal: number;
    totalPago: number;
    totalJuros: number;
  };
  unidade?: {
    numero: string;
    tipo: string;
  };
}

function formatCurrency(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { userId, type, empreendimento, unidades, simulacao, unidade } = body;

    // Validação
    if (!userId || !type || !empreendimento) {
      return NextResponse.json(
        { success: false, error: 'userId, type e empreendimento são obrigatórios' },
        { status: 400 }
      );
    }

    if (type === 'simulacao' && !simulacao) {
      return NextResponse.json(
        { success: false, error: 'Dados de simulação são obrigatórios para tipo simulacao' },
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

    if (!user.telefone) {
      return NextResponse.json(
        { success: false, error: 'Usuário não possui telefone cadastrado' },
        { status: 400 }
      );
    }

    // Gerar PDF
    let pdfBuffer: Buffer;
    let fileName: string;
    let messageText: string;

    const corretor = {
      nome: user.nome,
      telefone: user.telefone,
    };
    const precoMinimoText = empreendimento.precoMinimo ? formatCurrency(empreendimento.precoMinimo) : "Consulte valores";

    if (type === 'tabela') {
      pdfBuffer = await renderToBuffer(
        createElement(TabelaTemplate, {
          empreendimento: {
            nome: empreendimento.nome,
            cidade: empreendimento.cidade,
            bairro: empreendimento.bairro,
            precoMinimo: empreendimento.precoMinimo,
            precoMaximo: empreendimento.precoMaximo,
          },
          unidades: unidades.map((u) => ({
            id: u.id,
            tipo: u.tipo,
            metragem: u.metragem,
            valor: u.valor,
            status: u.status as 'disponivel' | 'reservado' | 'vendido',
            quartos: u.quartos,
            vagas: u.vagas,
            andar: u.andar,
            final: u.final,
          })),
          corretor,
        }) as any
      );

      fileName = `tabela-${empreendimento.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      messageText = `Oi ${user.nome}! 📊

Aqui está a tabela de unidades do *${empreendimento.nome}*.

A partir de ${precoMinimoText}.

Clique no botão abaixo para ver online com todas as fotos e detalhes!`;

    } else if (type === 'simulacao' && simulacao) {
      pdfBuffer = await renderToBuffer(
        createElement(SimulacaoTemplate, {
          empreendimento: {
            nome: empreendimento.nome,
          },
          unidade,
          simulacao,
          corretor,
        }) as any
      );

      fileName = `simulacao-${empreendimento.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      messageText = `Oi ${user.nome}! 💰

Segue a simulação de financiamento do *${empreendimento.nome}*.

Valor: ${formatCurrency(simulacao.valorImovel)}
Entrada: ${formatCurrency(simulacao.entrada)} (${simulacao.percentualEntrada}%)
Parcela: ${formatCurrency(simulacao.parcelaMensal)}/mês

Prazo: ${simulacao.prazoMeses} meses`;

    } else if (type === 'book') {
      const disponiveisCount = unidades.filter((u) => u.status === 'disponivel').length;

      pdfBuffer = await renderToBuffer(
        createElement(BookTemplate, {
          empreendimento: {
            nome: empreendimento.nome,
            cidade: empreendimento.cidade,
            bairro: empreendimento.bairro,
            construtora: empreendimento.construtora,
            previsaoEntrega: empreendimento.previsaoEntrega,
            tipo: empreendimento.tipo,
            descricao: empreendimento.descricao,
            diferenciais: empreendimento.diferenciais || [],
            imagemPrincipal: empreendimento.imagemPrincipal,
            precoMinimo: empreendimento.precoMinimo,
            precoMaximo: empreendimento.precoMaximo,
          },
          unidades: unidades.map((u) => ({
            id: u.id,
            tipo: u.tipo,
            metragem: u.metragem,
            valor: u.valor,
            status: u.status as 'disponivel' | 'reservado' | 'vendido',
            quartos: u.quartos,
            vagas: u.vagas,
            andar: u.andar,
            final: u.final,
          })),
          corretor,
        }) as any
      );

      fileName = `book-${empreendimento.nome.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      messageText = `Oi ${user.nome}! 📚

Aqui está o book completo do *${empreendimento.nome}*.

📍 ${[empreendimento.bairro, empreendimento.cidade].filter(Boolean).join(", ")}
💰 A partir de ${precoMinimoText}
🏠 ${disponiveisCount} unidades disponíveis

Veja todas as fotos, diferenciais e tabela de unidades!`;

    } else {
      return NextResponse.json(
        { success: false, error: 'Tipo de material não suportado' },
        { status: 400 }
      );
    }

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await dbQuery(
      `insert into materials (token, user_id, type, file_name, content_type, content, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [token, userId, type, fileName, 'application/pdf', pdfBuffer, expiresAt]
    );

    const origin = new URL(request.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
    const pdfUrl = `${baseUrl}/api/materials/${token}`;

    // Gerar link da landing page
    const landingUrl = `${baseUrl}/share/${empreendimento.id}?ref=${userId}`;

    // Enviar mensagem de texto
    const textResult = await sendTextMessage(user.telefone, messageText);
    if (textResult.error) {
      console.error('Erro ao enviar texto:', textResult.error);
    }

    // Enviar PDF
    const typeLabels: Record<MaterialType, string> = {
      tabela: 'Tabela de Unidades',
      simulacao: 'Simulação de Financiamento',
      book: 'Book Completo',
    };
    const docResult = await sendDocument(
      user.telefone,
      pdfUrl,
      fileName,
      `${empreendimento.nome} - ${typeLabels[type]}`
    );
    if (docResult.error) {
      console.error('Erro ao enviar documento:', docResult.error);
    }

    // Enviar botão com link da landing page
    const buttonResult = await sendActionButtons(
      user.telefone,
      'Veja todas as fotos e detalhes online:',
      [
        {
          type: 'URL',
          url: landingUrl,
          label: '🏠 Ver Online',
        },
      ],
      {
        footer: 'Pratica Incorporadora',
      }
    );
    if (buttonResult.error) {
      console.error('Erro ao enviar botão:', buttonResult.error);
    }

    // Registrar envio (silently fail if table doesn't exist)
    try {
      await dbQuery(
        `insert into material_sends (user_id, empreendimento_id, type, pdf_url, landing_url)
         values ($1, $2, $3, $4, $5)`,
        [userId, empreendimento.id, type, pdfUrl, landingUrl]
      );
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      success: true,
      data: {
        pdfUrl,
        landingUrl,
        sentTo: user.telefone,
      },
    });
  } catch (error) {
    console.error('Erro ao enviar material:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar material' },
      { status: 500 }
    );
  }
}
