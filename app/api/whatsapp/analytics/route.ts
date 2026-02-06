/**
 * WhatsApp Analytics — aggregated stats from MongoDB.
 *
 * GET /api/whatsapp/analytics?period=7d
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { findUserWorkspace } from "@/lib/tenant-context";
import { getMongoDb } from "@/lib/mongodb";

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
    const period = request.nextUrl.searchParams.get("period") || "7d";

    // Calculate date range
    const days = period === "30d" ? 30 : period === "14d" ? 14 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const db = getMongoDb();

    // Messages per day
    const messagesPerDay = await db
      .collection("messages")
      .aggregate([
        {
          $match: {
            workspace_id: workspaceId,
            timestamp: { $gte: since },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$timestamp",
                },
              },
              direction: {
                $cond: ["$is_from_me", "sent", "received"],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ])
      .toArray();

    // Format messages per day
    const dailyStats: Record<string, { sent: number; received: number }> = {};
    for (const entry of messagesPerDay) {
      const date = entry._id.date;
      if (!dailyStats[date]) dailyStats[date] = { sent: 0, received: 0 };
      dailyStats[date][entry._id.direction as "sent" | "received"] =
        entry.count;
    }

    // Sentiment distribution from conversations with AI analysis
    const sentimentDist = await db
      .collection("conversations")
      .aggregate([
        {
          $match: {
            workspace_id: workspaceId,
            "ai_analysis.sentiment": { $exists: true },
          },
        },
        {
          $group: {
            _id: "$ai_analysis.sentiment",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Top topics
    const topTopics = await db
      .collection("conversations")
      .aggregate([
        {
          $match: {
            workspace_id: workspaceId,
            "ai_analysis.topics": { $exists: true },
          },
        },
        { $unwind: "$ai_analysis.topics" },
        {
          $group: {
            _id: "$ai_analysis.topics",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    // Hot leads without recent reply
    const hotLeadsNoReply = await db
      .collection("conversations")
      .find({
        workspace_id: workspaceId,
        "ai_analysis.temperature": "quente",
        last_message_from_me: false,
        last_message_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      .sort({ last_message_at: -1 })
      .limit(10)
      .project({
        phone_number: 1,
        contact_name: 1,
        last_message_text: 1,
        last_message_at: 1,
        "ai_analysis.summary": 1,
        "ai_analysis.urgency": 1,
      })
      .toArray();

    // Totals
    const totalMessages = await db
      .collection("messages")
      .countDocuments({ workspace_id: workspaceId });
    const totalConversations = await db
      .collection("conversations")
      .countDocuments({ workspace_id: workspaceId });
    const totalContacts = await db
      .collection("contacts")
      .countDocuments({ workspace_id: workspaceId });

    // Common objections
    const objections = await db
      .collection("conversations")
      .aggregate([
        {
          $match: {
            workspace_id: workspaceId,
            "ai_analysis.extracted.objections": { $exists: true, $ne: [] },
          },
        },
        { $unwind: "$ai_analysis.extracted.objections" },
        {
          $group: {
            _id: "$ai_analysis.extracted.objections",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        period: { days, since: since.toISOString() },
        totals: {
          messages: totalMessages,
          conversations: totalConversations,
          contacts: totalContacts,
        },
        messages_per_day: dailyStats,
        sentiment_distribution: sentimentDist.map((s) => ({
          sentiment: s._id,
          count: s.count,
        })),
        top_topics: topTopics.map((t) => ({
          topic: t._id,
          count: t.count,
        })),
        hot_leads_no_reply: hotLeadsNoReply,
        common_objections: objections.map((o) => ({
          objection: o._id,
          count: o.count,
        })),
      },
    });
  } catch (error: any) {
    console.error("[Analytics] Error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
