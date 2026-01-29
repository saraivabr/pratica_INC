import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";

function getWorkerUrl() {
  const base = process.env.WHATSAPP_WORKER_URL;
  if (!base) {
    throw new Error("WHATSAPP_WORKER_URL is required");
  }
  return base.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tenant = await findUserTenant(user);
    if (!tenant) {
      return NextResponse.json({ error: "Empresa não configurada" }, { status: 400 });
    }

    const payload = await request.json();

    const workerUrl = `${getWorkerUrl()}/api/whatsapp/${tenant.id}/${user.id}/send`;
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
  }
}
