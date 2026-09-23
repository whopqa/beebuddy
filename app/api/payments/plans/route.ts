import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/server/auth-proxy";

export async function GET() {
  try {
    const upstream = await fetch(`${backendApiUrl()}/payments/plans`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({ success: false, error: "Backend trả về dữ liệu không hợp lệ" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: "Không thể kết nối BeeBuddy API" }, { status: 503 });
  }
}
