import type { ApiEnvelope } from "./auth-types";

export type SearchPreviewUser = {
  id: string;
  userId: string;
  maskedName: string;
  avatarUrl?: string | null;
  location: string;
  matchingInterests: string[];
  connectionGoal: string;
  role?: string;
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
  preview: (query: string, filters: { interests?: string[]; skills?: string[]; availability?: string[] } = {}) => {
    const params = new URLSearchParams({ q: query });
    for (const [name, values] of Object.entries(filters)) {
      if (values?.length) params.set(name, values.join(","));
    }
    return request<SearchPreviewResult>(`/preview?${params.toString()}`);
  },
  popular: () => request<string[]>("/popular"),
};
