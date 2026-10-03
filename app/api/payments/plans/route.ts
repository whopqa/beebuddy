import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/server/auth-proxy";

export async function GET() {
  try {
    const upstream = await fetch(`${backendApiUrl()}/payments/plans`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({ success: false, error: "The backend returned invalid data" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to connect to the BeeBuddy API" }, { status: 503 });
  }
}
