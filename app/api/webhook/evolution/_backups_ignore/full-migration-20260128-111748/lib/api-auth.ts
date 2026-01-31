import { NextRequest } from "next/server";
import { getUserById, type User } from "@/lib/supabase";

type SessionCookie = {
  userId: string;
  phone: string;
};

function parseSessionCookie(raw: string | undefined): SessionCookie | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const data = JSON.parse(decoded);
    if (!data?.userId || !data?.phone) return null;
    return { userId: data.userId, phone: data.phone };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<User | null> {
  const raw = request.cookies.get("pratica-session")?.value;
  const session = parseSessionCookie(raw);
  if (!session) return null;
  return getUserById(session.userId);
}
