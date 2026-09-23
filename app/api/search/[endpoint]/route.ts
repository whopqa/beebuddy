import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/server/auth-proxy";

const allowed = new Set(["preview", "popular"]);

export async function GET(request: NextRequest, { params }: { params: { endpoint: string } }) {
  if (!allowed.has(params.endpoint)) {
    return NextResponse.json({ success: false, error: "Search endpoint không tồn tại" }, { status: 404 });
  }

  try {
    const query = request.nextUrl.searchParams.toString();
    const upstream = await fetch(`${backendApiUrl()}/search/${params.endpoint}${query ? `?${query}` : ""}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({ success: false, error: "Backend trả về dữ liệu không hợp lệ" }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ success: false, error: "Không thể kết nối BeeBuddy API" }, { status: 503 });
  }
}
