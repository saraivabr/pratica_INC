import { NextRequest, NextResponse } from "next/server"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCGWRrjSlc44uxrsrKBq6YYC1Ls_TGAYT8"
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatRequest {
  messages: Message[]
  context?: {
    preReserva?: {
      cliente: string
      empreendimento: string
      unidade: string
      valorTotal: number
      status: string
    }
    unidade?: {
      numero: string
      area: number
      dormitorios: number
      valorTotal: number
    }
  }
}

const SYSTEM_PROMPT = `Você é o Assistente Prática, um especialista em vendas imobiliárias da Prática Incorporadora.

SOBRE A PRÁTICA INCORPORADORA:
- Incorporadora líder na Zona Leste de São Paulo
- Especializada em empreendimentos residenciais de qualidade
- Foco em apartamentos de 2 e 3 dormitórios
- Financiamento facilitado: FGTS, Caixa, Banco do Brasil, MCMV

SUA FUNÇÃO:
- Ajudar corretores a fechar vendas
- Responder dúvidas sobre financiamento
- Sugerir argumentos de venda persuasivos
- Ajudar na negociação com clientes
- Calcular simulações de pagamento
- Esclarecer sobre documentação necessária

ESTILO DE COMUNICAÇÃO:
- Seja direto e prático
- Use linguagem profissional mas amigável
- Foque em soluções
- Forneça informações precisas sobre valores e condições
- Sugira próximos passos claros

INFORMAÇÕES IMPORTANTES SOBRE FINANCIAMENTO:
- ATO: Geralmente 10% do valor (pagamento na assinatura)
- Mensais: 3 parcelas durante obra (geralmente 20% do total)
- Financiamento: 70% restante na entrega das chaves (via banco)
- FGTS pode ser usado no ATO ou para amortizar
- Subsídio MCMV para renda até R$ 8.000

Sempre termine com uma sugestão de ação ou próximo passo para o corretor.`

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, context } = body

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Mensagens são obrigatórias" }, { status: 400 })
    }

    // Build context string
    let contextString = ""
    if (context?.preReserva) {
      const pr = context.preReserva
      contextString = `\n\nCONTEXTO ATUAL - PRÉ-RESERVA:
- Cliente: ${pr.cliente}
- Empreendimento: ${pr.empreendimento}
- Unidade: ${pr.unidade}
- Valor Total: R$ ${pr.valorTotal.toLocaleString('pt-BR')}
- Status: ${pr.status}`
    }
    if (context?.unidade) {
      const u = context.unidade
      contextString = `\n\nCONTEXTO ATUAL - UNIDADE:
- Unidade: ${u.numero}
- Área: ${u.area}m²
- Dormitórios: ${u.dormitorios}
- Valor Total: R$ ${u.valorTotal.toLocaleString('pt-BR')}`
    }

    // Convert messages to Gemini format
    const geminiContents = [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT + contextString }]
      },
      {
        role: "model",
        parts: [{ text: "Entendido! Sou o Assistente Prática, pronto para ajudar você a fechar mais vendas. Como posso ajudar?" }]
      },
      ...messages.map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }]
      }))
    ]

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Gemini API error:", error)
      return NextResponse.json({ error: "Erro ao processar com IA" }, { status: 500 })
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua mensagem."

    return NextResponse.json({
      message: aiResponse,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0
      }
    })
  } catch (error) {
    console.error("AI Chat error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
