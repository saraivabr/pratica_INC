import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { sendTextMessage } from '@/lib/zapi';
import { validateRequest, AcaoSimulacaoSchema } from '@/lib/validation-schemas';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequest(request, AcaoSimulacaoSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const {
      lead_id,
      corretor_id,
      valor_imovel,
      entrada: entrada_input,
      entrada_percentual: entrada_perc_input,
      taxa_juros,
      prazo_meses,
      imovel_id,
      imovel_nome,
      enviar_whatsapp,
    } = validation.data;

    const { rows: leadRows } = await dbQuery(
      `SELECT id, name, phone FROM leads WHERE id = $1`,
      [lead_id]
    );

    if (leadRows.length === 0) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const lead = leadRows[0];

    let entrada = entrada_input;
    let entrada_percentual = entrada_perc_input;

    if (entrada_percentual && !entrada) {
      entrada = (valor_imovel * entrada_percentual) / 100;
    } else if (entrada && !entrada_percentual) {
      entrada_percentual = (entrada / valor_imovel) * 100;
    }

    if (!entrada) entrada = 0;
    if (!entrada_percentual) entrada_percentual = 0;

    const valor_financiado = valor_imovel - entrada;
    const taxa_mensal = taxa_juros / 100 / 12;
    const n = prazo_meses;
    const parcela_mensal =
      (valor_financiado * (taxa_mensal * Math.pow(1 + taxa_mensal, n))) /
      (Math.pow(1 + taxa_mensal, n) - 1);
    const valor_total = entrada + parcela_mensal * n;
    const juros_totais = valor_total - valor_imovel;

    const { rows: simulacaoRows } = await dbQuery(
      `
      INSERT INTO simulacoes (
        lead_id, corretor_id, imovel_id, imovel_nome,
        valor_imovel, entrada, entrada_percentual,
        valor_financiado, taxa_juros, prazo_meses,
        parcela_mensal, valor_total, juros_totais
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
      `,
      [
        lead_id, corretor_id, imovel_id || null, imovel_nome || null,
        valor_imovel, entrada, entrada_percentual,
        valor_financiado, taxa_juros, prazo_meses,
        parcela_mensal, valor_total, juros_totais,
      ]
    );

    const simulacao = simulacaoRows[0];
    let whatsapp_enviado = false;

    if (enviar_whatsapp && lead.phone) {
      try {
        const mensagem = `💰 *Simulação Financeira*\n\n` +
          `🏠 Imóvel: ${imovel_nome || 'N/A'}\n` +
          `💵 Valor: R$ ${valor_imovel.toLocaleString('pt-BR')}\n\n` +
          `📊 *Sua Proposta:*\n` +
          `• Entrada: R$ ${entrada.toLocaleString('pt-BR')} (${entrada_percentual.toFixed(1)}%)\n` +
          `• Parcelas: ${prazo_meses}x de R$ ${parcela_mensal.toLocaleString('pt-BR')}\n` +
          `• Taxa: ${taxa_juros}% ao ano\n\n` +
          `Gostou? Vamos agendar uma visita? 🏡`;

        await sendTextMessage(lead.phone, mensagem);
        whatsapp_enviado = true;
        await dbQuery(
          `UPDATE simulacoes SET enviada_whatsapp = TRUE, enviada_em = NOW() WHERE id = $1`,
          [simulacao.id]
        );
      } catch (error: any) {
        console.error('[Simulação] Erro WhatsApp:', error);
      }
    }

    return NextResponse.json({
      success: true,
      simulacao,
      whatsapp_enviado,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/acoes/simulacao] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar simulação', details: error.message },
      { status: 500 }
    );
  }
}
