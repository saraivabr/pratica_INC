import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
      ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID ? "SET" : "MISSING",
      ZAPI_TOKEN: process.env.ZAPI_TOKEN ? "SET" : "MISSING",
      ZAPI_CLIENT_TOKEN: process.env.ZAPI_CLIENT_TOKEN ? "SET" : "MISSING",
    },
  };

  // Test database
  try {
    const { rows } = await dbQuery("SELECT COUNT(*) as count FROM users");
    checks.database = { ok: true, userCount: rows[0]?.count };
  } catch (e: any) {
    checks.database = { ok: false, error: e.message };
  }

  // Test user lookup
  try {
    const { rows } = await dbQuery(
      "SELECT id, nome, role FROM users WHERE telefone = $1",
      ["+5511991143605"]
    );
    checks.userLookup = { ok: true, found: rows.length > 0, user: rows[0] };
  } catch (e: any) {
    checks.userLookup = { ok: false, error: e.message };
  }

  return NextResponse.json(checks);
}
