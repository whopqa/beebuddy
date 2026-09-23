import type { ApiEnvelope } from "./auth-types";

export type SearchPreviewUser = {
  id: string;
  maskedName: string;
  avatarUrl?: string | null;
  location: string;
  matchingInterests: string[];
  connectionGoal: string;
};

export type SearchPreviewResult = {
  query: string;
  totalMatches: number;
  previewLimit?: number;
  previewUsers: SearchPreviewUser[];
  limitNotice: string;
  downloadAppUrl?: string;
};

async function request<T>(path: string) {
  const response = await fetch(`/api/search${path}`, { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Không thể tìm kiếm lúc này");
  }
  return body.data;
}

export const searchApi = {
  preview: (query: string) => request<SearchPreviewResult>(`/preview?q=${encodeURIComponent(query)}`),
  popular: () => request<string[]>("/popular"),
};
