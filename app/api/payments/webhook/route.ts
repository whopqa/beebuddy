import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/server/auth-proxy";

// Public relay for PayOS. Authentication is the HMAC signature verified by the backend.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const upstream = await fetch(`${backendApiUrl()}/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: rawBody,
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({
      success: false,
      error: `The backend returned invalid data (HTTP ${upstream.status})`,
    }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to connect to the BeeBuddy API" }, { status: 503 });
  }
}
