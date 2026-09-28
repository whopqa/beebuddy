import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, forwardAuthenticatedRequest, setAuthCookies } from "@/lib/server/auth-proxy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const purpose = request.nextUrl.searchParams.get("purpose") || "post";
  const contentType = request.headers.get("content-type") || "application/octet-stream";
  const result = await forwardAuthenticatedRequest(`/media/images?purpose=${encodeURIComponent(purpose)}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: await request.arrayBuffer(),
  });
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}
