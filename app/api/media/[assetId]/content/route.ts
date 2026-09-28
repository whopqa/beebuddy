import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, forwardOptionalAuthenticatedBinary, setAuthCookies } from "@/lib/server/auth-proxy";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { assetId: string } }) {
  const result = await forwardOptionalAuthenticatedBinary(`/media/${encodeURIComponent(params.assetId)}/content`);
  if (!result.upstream) {
    return NextResponse.json({ success: false, error: "Không thể kết nối BeeBuddy API" }, { status: 503 });
  }

  const response = new NextResponse(result.upstream.body, {
    status: result.upstream.status,
    headers: {
      "Content-Type": result.upstream.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": result.upstream.headers.get("cache-control") || "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.upstream.status === 401) clearAuthCookies(response);
  return response;
}
