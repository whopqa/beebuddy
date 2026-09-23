import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  forwardOptionalAuthenticatedRequest,
  setAuthCookies,
} from "@/lib/server/auth-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const result = await forwardOptionalAuthenticatedRequest(`/posts${query ? `?${query}` : ""}`);
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}
