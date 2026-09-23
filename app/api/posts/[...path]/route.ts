import { NextRequest, NextResponse } from "next/server";
import {
  clearAuthCookies,
  forwardAuthenticatedRequest,
  forwardOptionalAuthenticatedRequest,
  setAuthCookies,
} from "@/lib/server/auth-proxy";

function endpoint(params: { path: string[] }) {
  return `/posts/${params.path.map(encodeURIComponent).join("/")}`;
}

function toResponse(result: Awaited<ReturnType<typeof forwardAuthenticatedRequest>>) {
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}

export async function GET(_request: NextRequest, { params }: { params: { path: string[] } }) {
  const result = await forwardOptionalAuthenticatedRequest(endpoint(params));
  return toResponse(result);
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const body = await request.text();
  const result = await forwardAuthenticatedRequest(endpoint(params), { method: "POST", body });
  return toResponse(result);
}
