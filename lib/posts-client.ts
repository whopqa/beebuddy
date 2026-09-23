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
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: FeedAuthor;
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
  feed: (page = 1, limit = 10) => request<FeedPage>(`?page=${page}&limit=${limit}`),
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
