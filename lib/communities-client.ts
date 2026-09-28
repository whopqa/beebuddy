import type { ApiEnvelope, WebUser } from "./auth-types";
import type { FeedPage, FeedPost } from "./posts-client";

export type CommunityVisibility = "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
export type CommunityJoinPolicy = "OPEN" | "APPROVAL" | "INVITE_ONLY";
export type CommunityMemberRole = "OWNER" | "MODERATOR" | "MEMBER";
export type CommunityMemberStatus = "ACTIVE" | "LEFT" | "BANNED";

export type CommunityMembership = {
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
};

export type CommunitySummary = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
  membersCount: number;
  createdAt: string;
  owner: {
    id: string;
    profile?: Pick<NonNullable<WebUser["profile"]>, "fullName" | "avatarUrl"> | null;
  };
  avatarMedia?: { sourceUrl: string } | null;
  members?: CommunityMembership[];
};

export type CommunityMember = CommunityMembership & {
  id: string;
  userId: string;
  joinedAt: string;
  user: {
    id: string;
    profile?: WebUser["profile"] | null;
  };
};

export type CommunityDetail = Omit<CommunitySummary, "members"> & {
  coverMedia?: { sourceUrl: string } | null;
  members: CommunityMember[];
};

export type CommunityPage = {
  items: CommunitySummary[];
  nextCursor: string | null;
};

export type CommunityJoinResult = {
  id: string;
  communityId: string;
  requesterId?: string;
  userId?: string;
  role?: CommunityMemberRole;
  status: CommunityMemberStatus | "PENDING" | "APPROVED" | "REJECTED";
};

export type CreateCommunityInput = {
  name: string;
  description?: string;
  visibility: CommunityVisibility;
  joinPolicy: CommunityJoinPolicy;
};

export type CreatedCommunity = Pick<CommunitySummary, "id" | "ownerId" | "name" | "slug" | "description" | "visibility" | "joinPolicy" | "membersCount" | "createdAt">;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/communities${path}`, {
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

export const communitiesApi = {
  list: (cursor?: string, limit = 12) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return request<CommunityPage>(`?${query.toString()}`);
  },
  detail: (slug: string) => request<CommunityDetail>(`/slug/${encodeURIComponent(slug)}`),
  create: (input: CreateCommunityInput) =>
    request<CreatedCommunity>("", { method: "POST", body: JSON.stringify(input) }),
  join: (communityId: string, message?: string) =>
    request<CommunityJoinResult>(`/${encodeURIComponent(communityId)}/join`, {
      method: "POST",
      body: JSON.stringify(message ? { message } : {}),
    }),
  leave: (communityId: string) =>
    request<CommunityJoinResult>(`/${encodeURIComponent(communityId)}/leave`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  feed: (communityId: string, page = 1, limit = 10) =>
    request<FeedPage>(`/${encodeURIComponent(communityId)}/posts?page=${page}&limit=${limit}`),
  createPost: (communityId: string, content: string) =>
    request<{ post: FeedPost; warning?: string | null }>(`/${encodeURIComponent(communityId)}/posts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};
