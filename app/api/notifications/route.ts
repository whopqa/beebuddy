import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, forwardAuthenticatedRequest, setAuthCookies } from "@/lib/server/auth-proxy";

function toResponse(result: Awaited<ReturnType<typeof forwardAuthenticatedRequest>>) {
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return toResponse(await forwardAuthenticatedRequest(`/notifications${query ? `?${query}` : ""}`));
}
