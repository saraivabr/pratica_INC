import { NextRequest, NextResponse } from "next/server";
import { getLeadInsight } from "@/lib/cvcrm-insight";
import { applyRateLimit } from '@/lib/rate-limit-helper';
import { validateRequest, ChatSchema } from '@/lib/validation-schemas';
import { requireWorkspaceContext } from '@/lib/api-helpers';

export async function POST(request: Request) {
  try {
    const rateLimited = await applyRateLimit(request as NextRequest, 'AI_ENDPOINT');
    if (rateLimited) return rateLimited;

    const ctx = await requireWorkspaceContext(request as NextRequest);
    if (ctx.error) return ctx.error;

    const validation = await validateRequest(request, ChatSchema);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 });
    }
    const { text } = validation.data;
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
