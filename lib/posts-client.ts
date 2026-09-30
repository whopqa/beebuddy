import type { ApiEnvelope } from "./auth-types";

export type PostVisibility = "PUBLIC" | "CONNECTIONS" | "SELECTED" | "PRIVATE";
export type CommentStatus = "APPROVED" | "FLAGGED" | "REJECTED";

export type FeedAuthor = {
  id: string;
  fullName: string;
  username: string;
  avatarUrl?: string | null;
  location?: string | null;
  tier: "FREE" | "VIP" | "PRO";
};

export type FeedPost = {
  id: string;
  content: string;
  mediaUrls: string[];
  mediaAssets: Array<{ id: string; sourceUrl?: string | null }>;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  likedByCurrentUser: boolean;
  canEdit: boolean;
  selectedUserIds: string[];
  createdAt: string;
  author: FeedAuthor;
};

export type PostMutationInput = {
  content: string;
  visibility: PostVisibility;
  mediaAssetIds?: string[];
  selectedUserIds?: string[];
};

export type FeedPage = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  posts: FeedPost[];
};

export type PostComment = {
  id: string;
  postId: string;
  content: string;
  status: CommentStatus;
  flagReason?: string | null;
  createdAt: string;
  author: FeedAuthor;
};

export type CreateCommentResult = {
  comment: PostComment;
  warning?: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/posts${path}`, {
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

export const postsApi = {
  feed: (page = 1, limit = 10, postId?: string) => request<FeedPage>(`?page=${page}&limit=${limit}${postId ? `&postId=${encodeURIComponent(postId)}` : ""}`),
  create: (input: PostMutationInput) => request<{ postId: string; warning?: string | null }>("", {
    method: "POST",
    body: JSON.stringify(input),
  }),
  update: (postId: string, input: PostMutationInput) => request<{ postId: string; warning?: string | null }>(`/${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  }),
  remove: (postId: string) => request<{ id: string; deletedAt: string }>(`/${encodeURIComponent(postId)}`, { method: "DELETE" }),
  setLike: (postId: string, liked: boolean) => request<{ liked: boolean; likesCount: number }>(`/${encodeURIComponent(postId)}/like`, { method: liked ? "PUT" : "DELETE" }),
  reportPost: (postId: string, reason: string) => request<unknown>(`/${encodeURIComponent(postId)}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  comments: (postId: string) => request<PostComment[]>(`/${encodeURIComponent(postId)}/comments`),
  createComment: (postId: string, content: string) =>
    request<CreateCommentResult>(`/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  reportComment: (commentId: string, reason: string) =>
    request<unknown>(`/comments/${encodeURIComponent(commentId)}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
