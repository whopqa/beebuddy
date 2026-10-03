import { NextResponse } from "next/server";
import { clearAuthCookies, forwardAuthenticatedStream, setAuthCookies } from "@/lib/server/auth-proxy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await forwardAuthenticatedStream("/conversations/events");
  if (!result.upstream?.body) {
    const response = NextResponse.json(
      { success: false, error: result.status === 401 ? "Not signed in" : "Unable to open the real-time connection" },
      { status: result.status }
    );
    if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
    if (result.status === 401) clearAuthCookies(response);
    return response;
  }

  const response = new NextResponse(result.upstream.body, {
    status: result.upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
  if (result.refreshedTokens) setAuthCookies(response, result.refreshedTokens);
  return response;
}
