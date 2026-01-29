import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { config, units, flow, totals } = body

    if (!units || units.length === 0) {
      return NextResponse.json({ error: "No units provided" }, { status: 400 })
    }

    const prompt = `
      Você é um especialista em engenharia financeira imobiliária.
      Analise a seguinte proposta de Junção de Unidades:

      RESUMO DA PROPOSTA:
      - Unidades: ${units.map((u: any) => `${u.nome} (${u.metragem}m² - PV: ${u.pvFinal}%)`).join(", ")}
      - Área Total: ${totals.totalArea.toFixed(2)} m²
      - VGV Tabela: R$ ${config.vgvTabela.toLocaleString('pt-BR')}
      - VGV Proposta (Fluxo): R$ ${totals.totalFluxo.toLocaleString('pt-BR')}
      - Target da Proposta: R$ ${config.vgvPropostaTarget.toLocaleString('pt-BR')}
      - Diferença (Target - Fluxo): R$ ${totals.diffTarget.toLocaleString('pt-BR')}
      - Comissão: ${config.comissaoPct}%
      
      FLUXO DE PAGAMENTO PROPOSTO:
      ${flow.map((f: any) => `- ${f.qtd}x ${f.nome}: R$ ${f.valor.toLocaleString('pt-BR')} (Total: R$ ${(f.qtd * f.valor).toLocaleString('pt-BR')})`).join("\n")}

      OBJETIVO:
      Forneça uma análise crítica e sugestões para otimizar a aprovação desta proposta.
      1. A proposta está financeiramente saudável para a incorporadora? (Considere a tabela líquida vs proposta).
      2. O fluxo de pagamento está equilibrado? Sugira melhorias (ex: aumentar entrada, diluir mensais).
      3. O preço por m² médio (R$ ${(totals.totalFluxo / totals.totalArea).toLocaleString('pt-BR')}/m²) está condizente para uma junção deste porte?
      4. Dê um veredito: "Provável Aprovação", "Ajustes Necessários" ou "Arriscado".
      
      Responda de forma direta, profissional e estruturada (use tópicos).
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Você é um assistente especialista em mercado imobiliário e análise financeira de empreendimentos." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    })

    const insight = completion.choices[0].message.content

    return NextResponse.json({ insight })
  } catch (error) {
    console.error("AI Insight Error:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
