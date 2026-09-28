import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, forwardAuthenticatedRequest, setAuthCookies } from "@/lib/server/auth-proxy";

const allowed = new Set(["profile", "avatar", "settings", "password", "sessions"]);

async function handle(request: NextRequest, { params }: { params: { path: string[] } }) {
  const endpoint = params.path.join("/");
  const isAllowed = allowed.has(endpoint) || (params.path.length === 2 && params.path[0] === "sessions");
  if (!isAllowed) {
    return NextResponse.json({ success: false, error: "Account endpoint không tồn tại" }, { status: 404 });
  }

  const body = request.method === "GET" ? undefined : await request.text();
  const result = await forwardAuthenticatedRequest(`/account/${endpoint}`, {
    method: request.method,
    body,
  });
  const response = NextResponse.json(result.payload, { status: result.status });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  if (result.status === 401) clearAuthCookies(response);
  return response;
}

export const GET = handle;
export const PUT = handle;
export const DELETE = handle;
