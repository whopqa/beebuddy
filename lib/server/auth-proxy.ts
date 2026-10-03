import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "beebuddy_access";
export const REFRESH_COOKIE = "beebuddy_refresh";

export const backendApiUrl = () =>
  `${(process.env.BACKEND_API_URL || "http://localhost:5000").replace(/\/+$/, "")}/api/v1`;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...cookieBase, maxAge: 60 * 60 * 24 });
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...cookieBase, maxAge: 60 * 60 * 24 * 7 });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieBase, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

export async function forwardAuthRequest(endpoint: string, body: unknown) {
  try {
    const upstream = await fetch(`${backendApiUrl()}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Platform": "web",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({
      success: false,
      error: `The backend returned invalid data (HTTP ${upstream.status})`,
    }));
    return { upstream, payload };
  } catch {
    return {
      upstream: null,
      payload: {
        success: false,
        message: "The backend is not running or BACKEND_API_URL is incorrect.",
        error: "Unable to connect to the BeeBuddy API",
      },
    };
  }
}

export async function forwardAuthenticatedRequest(endpoint: string, init: RequestInit = {}) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

  if (!accessToken && !refreshToken) {
    return { status: 401, payload: { success: false, error: "Not signed in" }, refreshedTokens };
  }

  const call = (token: string) =>
    fetch(`${backendApiUrl()}${endpoint}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });

  try {
    let upstream = accessToken ? await call(accessToken) : null;
    if ((!upstream || upstream.status === 401) && refreshToken) {
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
        accessToken = refreshedTokens!.accessToken;
        upstream = await call(accessToken!);
      }
    }

    if (!upstream) return { status: 401, payload: { success: false, error: "Invalid sign-in session" }, refreshedTokens };
    const payload = await upstream.json().catch(() => ({ success: false, error: "The backend returned invalid data" }));
    return { status: upstream.status, payload, refreshedTokens };
  } catch {
    return { status: 503, payload: { success: false, error: "Unable to connect to the BeeBuddy API" }, refreshedTokens };
  }
}

export async function forwardAuthenticatedStream(endpoint: string) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

  const call = (token: string) => fetch(`${backendApiUrl()}${endpoint}`, {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  try {
    let upstream = accessToken ? await call(accessToken) : null;
    if ((!upstream || upstream.status === 401) && refreshToken) {
      const refreshResponse = await fetch(`${backendApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Platform": "web" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      const refreshBody = await refreshResponse.json().catch(() => null);
      if (refreshResponse.ok && refreshBody?.data) {
        refreshedTokens = refreshBody.data;
        accessToken = refreshedTokens!.accessToken;
        upstream = await call(accessToken!);
      }
    }
    if (!upstream) return { status: 401, upstream: null, refreshedTokens };
    return { status: upstream.status, upstream, refreshedTokens };
  } catch {
    return { status: 503, upstream: null, refreshedTokens };
  }
}

/**
 * Forward a read request that may be made by either a guest or a signed-in user.
 *
 * A valid access token is forwarded so the backend can include connection-only
 * content. When no session exists the same endpoint is called as a guest. An
 * expired access token is refreshed once; invalid sessions are not silently
 * downgraded to guest access.
 */
export async function forwardOptionalAuthenticatedRequest(endpoint: string, init: RequestInit = {}) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

  const call = (token?: string) =>
    fetch(`${backendApiUrl()}${endpoint}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });

  try {
    let upstream = await call(accessToken);
    if (upstream.status === 401 && refreshToken) {
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
        accessToken = refreshedTokens!.accessToken;
        upstream = await call(accessToken);
      }
    }

    const payload = await upstream.json().catch(() => ({
      success: false,
      error: "The backend returned invalid data",
    }));
    return { status: upstream.status, payload, refreshedTokens };
  } catch {
    return {
      status: 503,
      payload: { success: false, error: "Unable to connect to the BeeBuddy API" },
      refreshedTokens,
    };
  }
}

export async function forwardOptionalAuthenticatedBinary(endpoint: string) {
  const cookieStore = cookies();
  let accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  let refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

  const call = (token?: string) => fetch(`${backendApiUrl()}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  try {
    let upstream = await call(accessToken);
    if (upstream.status === 401 && refreshToken) {
      const refreshResponse = await fetch(`${backendApiUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Platform": "web" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
      const refreshBody = await refreshResponse.json().catch(() => null);
      if (refreshResponse.ok && refreshBody?.data) {
        refreshedTokens = refreshBody.data;
        accessToken = refreshedTokens!.accessToken;
        upstream = await call(accessToken);
      }
    }
    return { upstream, refreshedTokens };
  } catch {
    return { upstream: null, refreshedTokens };
  }
}
