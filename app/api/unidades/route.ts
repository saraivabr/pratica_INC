import { NextResponse } from "next/server";
import { getEmpreendimentoById, getUnidadesByEmpreendimentoId } from "@/lib/empreendimentos-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get("empreendimento_id");

    if (!empreendimentoId) {
      return NextResponse.json({ error: "Empreendimento ID required" }, { status: 400 });
    }

    const id = Number(empreendimentoId);
    const empreendimento = getEmpreendimentoById(id);

    if (!empreendimento) {
      return NextResponse.json({ error: "Empreendimento not found" }, { status: 404 });
    }

    const unidades = getUnidadesByEmpreendimentoId(id);

    // Mapear para o formato esperado pelo frontend
    const mappedUnits = unidades.map(u => ({
      id: u.id,
      tipo: u.tipologia,
      metragem: u.area,
      valor: u.valor,
      status: u.status,
      quartos: u.quartos,
      vagas: u.vagas || 1,
      andar: u.andar || 0,
      final: u.numero.slice(-2),
      bloco: "",
      unidade: u.numero,
      nome: `Unidade ${u.numero} - ${u.tipologia}`,
    }));

    return NextResponse.json(mappedUnits);
  } catch (error) {
    console.error("Erro ao buscar unidades:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
