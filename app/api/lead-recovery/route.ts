import { NextRequest, NextResponse } from "next/server";
import {
  listActiveCorretores,
  runLeadRecoveryForUser,
} from "@/lib/lead-recovery";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.LEAD_RECOVERY_TOKEN;
  if (!secret) return true;

  const header = req.headers.get("authorization");
  if (!header) return false;
  const [type, token] = header.split(" ");
  return type?.toLowerCase() === "bearer" && token === secret;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : 5;
  const dryRun = searchParams.get("dryRun") === "true";
  const leadId = searchParams.get("leadId") || undefined;

  const users = userId
    ? [{ id: userId, nome: "corretor" }]
    : await listActiveCorretores();

  const runs = [];
  let totalSent = 0;

  for (const user of users) {
    const results = await runLeadRecoveryForUser(user, {
      limit,
      dryRun,
      leadId,
    });
    const sent = results.filter((r) => r.status === "sent").length;
    totalSent += sent;
    runs.push({
      userId: user.id,
      nome: user.nome,
      sent,
      total: results.length,
      results,
    });
  }

  return NextResponse.json({
    ok: true,
    totalSent,
    users: runs.length,
    runs,
  });
}

export async function POST(req: NextRequest) {
  try {
    return await handler(req);
  } catch (error) {
    console.error("Erro no lead-recovery:", error);
    return NextResponse.json(
      { error: "Lead recovery failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handler(req);
  } catch (error) {
    console.error("Erro no lead-recovery:", error);
    return NextResponse.json(
      { error: "Lead recovery failed" },
      { status: 500 }
    );
  }
}
