import { NextRequest, NextResponse } from "next/server";
import type { AuthPayload } from "@/lib/auth-types";
import { forwardAuthRequest, setAuthCookies } from "@/lib/server/auth-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: "Invalid verification code" }, { status: 400 });
  const { upstream, payload } = await forwardAuthRequest("/auth/email-verification/confirm", body);
  const response = NextResponse.json(payload, { status: upstream?.status ?? 503 });
  if (upstream?.ok && payload?.data) setAuthCookies(response, payload.data as AuthPayload);
  return response;
}
