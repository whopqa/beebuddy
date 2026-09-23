import type { ApiEnvelope, AuthPayload, WebUser } from "./auth-types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy kiểm tra backend đang chạy.");
  }

  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Yêu cầu không thành công");
  }
  return body.data;
}

export const webAuth = {
  login: (email: string, password: string) =>
    request<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (
    fullName: string,
    email: string,
    password: string,
    consent: { acceptTerms: boolean; acceptPrivacy: boolean; consentSessionId?: string }
  ) =>
    request<AuthPayload>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, ...consent }),
    }),
  me: () => request<WebUser>("/api/auth/me"),
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
  },
};
