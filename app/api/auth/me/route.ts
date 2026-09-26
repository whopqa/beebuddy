import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ApiEnvelope, WebUser } from "@/lib/auth-types";
import { ACCESS_COOKIE, REFRESH_COOKIE, backendApiUrl, clearAuthCookies, setAuthCookies } from "@/lib/server/auth-proxy";

export const dynamic = "force-dynamic";

async function fetchMe(accessToken: string) {
  return fetch(`${backendApiUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
}

export async function GET() {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    let meResponse = accessToken ? await fetchMe(accessToken) : null;
    let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

    if ((!meResponse || meResponse.status === 401) && refreshToken) {
      const refreshResponse = await fetch(`${backendApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Platform": "web",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      const refreshBody = await refreshResponse.json().catch(() => null);
      if (refreshResponse.ok && refreshBody?.data) {
        refreshedTokens = refreshBody.data;
        meResponse = await fetchMe(refreshedTokens!.accessToken);
      }
    }

    if (!meResponse) throw new Error("Không có phiên đăng nhập");
    const body = (await meResponse.json().catch(() => ({ success: false, error: "Phản hồi không hợp lệ" }))) as ApiEnvelope<WebUser>;
    const response = NextResponse.json(body, { status: meResponse.status });

    if (meResponse.ok && refreshedTokens) setAuthCookies(response, refreshedTokens);
    if (!meResponse.ok) clearAuthCookies(response);
    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Không thể kết nối BeeBuddy API" }, { status: 503 });
  }
}
