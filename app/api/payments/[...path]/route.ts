import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, forwardAuthenticatedRequest, setAuthCookies } from "@/lib/server/auth-proxy";

function endpoint(params: { path: string[] }, request?: NextRequest) {
  const query = request?.nextUrl.searchParams.toString();
  const path = `/payments/${params.path.map(encodeURIComponent).join("/")}`;
  return query ? `${path}?${query}` : path;
}
function toResponse(result: Awaited<ReturnType<typeof forwardAuthenticatedRequest>>) {
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return toResponse(await forwardAuthenticatedRequest(endpoint(params, request)));
}
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  return toResponse(await forwardAuthenticatedRequest(endpoint(params), { method: "POST", body: await request.text() }));
}
