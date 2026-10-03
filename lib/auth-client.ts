import type { ApiEnvelope, AuthPayload, AuthRequestResult, RegisterPayload, WebUser } from "./auth-types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new Error("Unable to connect to the server. Check that the backend is running.");
  }

  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Request failed");
  }
  return body.data;
}

export const webAuth = {
  login: (email: string, password: string) =>
    request<AuthPayload>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  googleSignIn: (
    credential: string,
    consent: { acceptTerms: boolean; acceptPrivacy: boolean; consentSessionId?: string }
  ) =>
    request<AuthPayload>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential, ...consent }),
    }),
  register: (
    fullName: string,
    email: string,
    password: string,
    consent: { acceptTerms: boolean; acceptPrivacy: boolean; consentSessionId?: string }
  ) =>
    request<RegisterPayload>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password, ...consent }),
    }),
  requestEmailVerification: (email: string) =>
    request<AuthRequestResult>("/api/auth/email-verification/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmEmailVerification: (email: string, code: string) =>
    request<AuthPayload>("/api/auth/email-verification/confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  requestPasswordReset: (email: string) =>
    request<AuthRequestResult>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    request<{ passwordReset: boolean; sessionsRevoked: boolean }>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
  me: () => request<WebUser>("/api/auth/me"),
  logout: async () => {
    const response = await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    if (!response.ok) throw new Error("Unable to sign out. Please try again.");
  },
};
