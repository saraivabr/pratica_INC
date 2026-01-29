import { NextResponse } from "next/server";

export async function GET() {
  try {
    const models = [
      // 💰 Econômicos (default)
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        provider: "OpenAI",
        available: !!process.env.OPENAI_API_KEY,
        icon: "brain",
        tier: "economy",
        price: "$0.15/1M tokens",
        description: "Rápido e econômico — 30x mais barato que GPT-4",
      },
      {
        id: "gemini-2.0-flash",
        name: "Gemini Flash",
        provider: "Google",
        available: !!process.env.GOOGLE_AI_API_KEY,
        icon: "sparkles",
        tier: "economy",
        price: "Grátis até 15 req/min",
        description: "Tier gratuito generoso do Google",
      },
      {
        id: "claude-haiku",
        name: "Claude Haiku",
        provider: "Anthropic",
        available: !!process.env.ANTHROPIC_API_KEY,
        icon: "message-circle",
        tier: "economy",
        price: "$0.25/1M tokens",
        description: "Mais rápido e barato da Anthropic",
      },
      // 🚀 Premium (opcional)
      {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "OpenAI",
        available: !!process.env.OPENAI_API_KEY,
        icon: "brain",
        tier: "premium",
        price: "$5.00/1M tokens",
        description: "Modelo flagship da OpenAI",
      },
      {
        id: "gemini-pro",
        name: "Gemini Pro",
        provider: "Google",
        available: !!process.env.GOOGLE_AI_API_KEY,
        icon: "sparkles",
        tier: "premium",
        price: "$1.25/1M tokens",
        description: "Mais capaz do Google para tarefas complexas",
      },
      {
        id: "claude-sonnet",
        name: "Claude Sonnet",
        provider: "Anthropic",
        available: !!process.env.ANTHROPIC_API_KEY,
        icon: "message-circle",
        tier: "premium",
        price: "$3.00/1M tokens",
        description: "Melhor equilíbrio custo-qualidade da Anthropic",
      },
    ];

    return NextResponse.json({ success: true, models });
  } catch (error: any) {
    console.error("Error listing AI models:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
