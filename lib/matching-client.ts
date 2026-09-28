import type { ApiEnvelope } from "./auth-types";

export type MatchFeedbackType = "LIKE" | "PASS" | "CONNECT" | "BLOCK" | "REPORT";

export type MatchingPreference = {
  id?: string;
  userId?: string;
  enabled: boolean;
  minAge?: number | null;
  maxAge?: number | null;
  maxDistanceKm?: number | null;
  preferredGoals: string[];
  weights?: Record<string, number> | null;
};

export type MatchReason = {
  code: "SHARED_INTERESTS" | "SHARED_HABITS" | "MATCHED_GOALS" | string;
  count: number;
};

export type MatchPerson = {
  id: string;
  tier: "FREE" | "VIP" | "PRO";
  profile?: {
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
  } | null;
};

export type MatchRecommendation = {
  id: string;
  candidateUserId: string;
  score: number | string;
  reasons: MatchReason[] | unknown;
  status: "PENDING" | "VIEWED" | "ACCEPTED" | "DISMISSED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  candidateUser: MatchPerson;
};

export type MatchRefreshResult = {
  batchId: string;
  items: MatchRecommendation[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/matching${path}`, {
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

export const matchingApi = {
  preference: () => request<MatchingPreference | null>("/preferences"),
  savePreference: (preference: MatchingPreference) =>
    request<MatchingPreference>("/preferences", { method: "PUT", body: JSON.stringify(preference) }),
  recommendations: (limit = 20) => request<MatchRecommendation[]>(`/recommendations?limit=${limit}`),
  refresh: (limit = 20) => request<MatchRefreshResult>("/recommendations/refresh", { method: "POST", body: JSON.stringify({ limit }) }),
  feedback: (recommendationId: string, type: MatchFeedbackType, reasons?: Record<string, unknown>) =>
    request<unknown>(`/recommendations/${encodeURIComponent(recommendationId)}/feedback`, {
      method: "POST",
      body: JSON.stringify({ type, ...(reasons ? { reasons } : {}) }),
    }),
};
