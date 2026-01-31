import { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const tenant = await findUserTenant(user);
  if (!tenant) {
    return new Response("Empresa não configurada", { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");
  if (!channel) {
    return new Response("Canal não especificado", { status: 400 });
  }

  const workerUrl = `${getWorkerUrl()}/api/whatsapp/${tenant.id}/${user.id}/stream?channel=${encodeURIComponent(channel)}`;
  const workerResponse = await fetch(workerUrl, {
    headers: { Accept: "text/event-stream" },
  });

  return new Response(workerResponse.body, {
    status: workerResponse.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
