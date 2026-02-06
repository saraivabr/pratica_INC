/**
 * Full-text search in WhatsApp messages via Elasticsearch.
 *
 * GET /api/whatsapp/search?q=apartamento+3+quartos&phone=5511&type=conversation&from=2025-01-01&page=1&limit=20
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { getElasticsearch, ES_INDEX } from "@/lib/elasticsearch";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const tenant = await findUserWorkspace(user);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Empresa não configurada" },
        { status: 400 }
      );
    }

    const workspaceId = tenant.id;
    const params = request.nextUrl.searchParams;
    const q = params.get("q")?.trim();
    const phone = params.get("phone");
    const from = params.get("from");
    const to = params.get("to");
    const page = Math.max(1, parseInt(params.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") || "20")));

    if (!q || q.length < 2) {
      return NextResponse.json(
        { success: false, error: "Query deve ter pelo menos 2 caracteres" },
        { status: 400 }
      );
    }

    const es = getElasticsearch();

    // Build filters
    const must: any[] = [
      { term: { workspace_id: workspaceId } },
      {
        multi_match: {
          query: q,
          fields: ["message_text^3", "contact_name^2"],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      },
    ];

    if (phone) {
      must.push({ wildcard: { phone_number: `*${phone}*` } });
    }

    if (from || to) {
      const range: any = {};
      if (from) range.gte = from;
      if (to) range.lte = to;
      must.push({ range: { timestamp: range } });
    }

    const result = await es.search({
      index: ES_INDEX,
      body: {
        from: (page - 1) * limit,
        size: limit,
        query: { bool: { must } },
        highlight: {
          fields: {
            message_text: { pre_tags: ["<mark>"], post_tags: ["</mark>"] },
            contact_name: { pre_tags: ["<mark>"], post_tags: ["</mark>"] },
          },
        },
        sort: [{ _score: "desc" }, { timestamp: "desc" }],
      },
    });

    const hits = (result as any).hits;
    const total =
      typeof hits.total === "number" ? hits.total : hits.total?.value || 0;

    const results = hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
      highlight: hit.highlight || {},
    }));

    return NextResponse.json({
      success: true,
      data: results,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error("[Search] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
