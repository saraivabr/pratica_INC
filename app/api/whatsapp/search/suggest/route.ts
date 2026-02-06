/**
 * Search-as-you-type suggestions via Elasticsearch autocomplete analyzer.
 *
 * GET /api/whatsapp/search/suggest?q=joa
 * Returns top 10 contact matches + recent message matches.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { getElasticsearch, ES_INDEX } from "@/lib/elasticsearch";
import { canAccessInstance } from "@/lib/whatsapp-access";

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
    const userInstanceName = user.evolution_instance_name;
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const instanceParam = request.nextUrl.searchParams.get("instance")?.trim() || null;

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const effectiveInstance = instanceParam || userInstanceName || null;

    // If user has no instance connected, return empty
    if (!effectiveInstance) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Validate instance access
    if (!(await canAccessInstance(user, workspaceId, effectiveInstance))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const es = getElasticsearch();

    // Search contacts (autocomplete on name) — deduplicate by phone
    // Filtered by instance_name for corretor isolation
    const contactResult = await es.search({
      index: ES_INDEX,
      body: {
        size: 0,
        query: {
          bool: {
            must: [
              { term: { workspace_id: workspaceId } },
              { term: { instance_name: effectiveInstance } },
              {
                bool: {
                  should: [
                    {
                      match: {
                        "contact_name.autocomplete": {
                          query: q,
                          operator: "and",
                        },
                      },
                    },
                    { wildcard: { phone_number: `*${q}*` } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        aggs: {
          unique_contacts: {
            terms: {
              field: "phone_number",
              size: 10,
              order: { latest: "desc" },
            },
            aggs: {
              latest: { max: { field: "timestamp" } },
              contact_info: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: "desc" }],
                  _source: [
                    "phone_number",
                    "contact_name",
                    "message_text",
                    "timestamp",
                    "is_from_me",
                  ],
                },
              },
            },
          },
        },
      },
    });

    const buckets =
      (contactResult as any).aggregations?.unique_contacts?.buckets || [];

    const suggestions = buckets.map((bucket: any) => {
      const hit = bucket.contact_info?.hits?.hits?.[0]?._source || {};
      return {
        phone_number: bucket.key,
        contact_name: hit.contact_name || bucket.key,
        last_message: hit.message_text,
        last_message_time: hit.timestamp,
        is_from_me: hit.is_from_me,
      };
    });

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error: any) {
    console.error("[Suggest] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
