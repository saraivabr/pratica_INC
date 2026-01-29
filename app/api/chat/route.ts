import { NextResponse } from "next/server";
import { getLeadInsight } from "@/lib/cvcrm-insight";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const phoneMatch = text.match(/55\d{10}/);
    if (!phoneMatch) {
      return NextResponse.json({
        reply:
          "Informe o telefone (ex: 5511940716662) que você quer consultar e entrego o resumo do CVCRM.",
      });
    }
    const phone = phoneMatch[0];
    const insight = await getLeadInsight(phone);
    if (!insight) {
      return NextResponse.json({
        reply: `Não encontrei dados diretos para ${phone}. Posso buscar empreendimentos ou unidades específicos também.`,
      });
    }
    return NextResponse.json({
      reply: insight.summary + "\n" + insight.detail,
    });
  } catch (error) {
    console.error("API chat error", error);
    return NextResponse.json({
      reply: "Desculpe, não consegui processar. Tente novamente.",
    });
  }
}
