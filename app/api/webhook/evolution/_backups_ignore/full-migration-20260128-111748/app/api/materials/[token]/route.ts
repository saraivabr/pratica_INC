import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { token } = await params;

  const { rows } = await dbQuery(
    `select file_name, content_type, content
     from materials
     where token = $1 and expires_at > now()
     limit 1`,
    [token]
  );

  const material = rows[0];
  if (!material) {
    return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
  }

  return new NextResponse(material.content, {
    headers: {
      "Content-Type": material.content_type || "application/pdf",
      "Content-Disposition": `inline; filename="${material.file_name}"`,
    },
  });
}
