import { NextRequest, NextResponse } from "next/server";
import { forwardAuthRequest } from "@/lib/server/auth-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: "Invalid sign-up data" }, { status: 400 });

  const { upstream, payload } = await forwardAuthRequest("/auth/register", body);
  return NextResponse.json(payload, { status: upstream?.status ?? 503 });
}
