import type { ApiEnvelope } from "./auth-types";

export type AdminMetrics = {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    subscribers: { vip: number; pro: number; total: number };
    revenue: { totalAmountVND: number; successfulCount: number; totalOrders: number };
    moderation: { pendingReports: number; flaggedComments: number };
  };
  recentPayments: AdminPayment[];
};

export type AdminUser = {
  id: string;
  email: string;
  role: "GUEST" | "USER" | "ADMIN";
  tier: "FREE" | "VIP" | "PRO";
  tierExpiresAt?: string | null;
  isBanned: boolean;
  banReason?: string | null;
  isVerified: boolean;
  createdAt: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  stats: { postsCount: number; commentsCount: number; connectionsCount: number; paymentsCount: number };
};

export type AdminPayment = {
  id: string;
  orderCode: number;
  tier: "FREE" | "VIP" | "PRO";
  durationMonths: number;
  amount: string | number;
  currency: string;
  paymentMethod: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
  user?: { email: string; profile?: { fullName: string } | null };
};

export type FlaggedComment = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  author: { email: string; profile?: { fullName: string; avatarUrl?: string | null } | null };
  post: { id: string; content: string };
  reports: Array<{ id: string; reason: string; reasonCode?: string | null; details?: string | null }>;
};

export type FlaggedPost = {
  id: string;
  content: string;
  status: string;
  audience: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  mediaUrls: string[];
  commentsCount: number;
  reactionsCount: number;
  author: { email: string; profile?: { fullName: string; avatarUrl?: string | null } | null };
  reports: Array<{ id: string; source: string; reason: string; reasonCode?: string | null; status: string; createdAt: string; reporter?: { email: string; profile?: { fullName: string } | null } | null }>;
};

export type AdminReport = {
  id: string;
  source: string;
  reason: string;
  reasonCode?: string | null;
  details?: string | null;
  status: "OPEN" | "TRIAGED" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolvedAt?: string | null;
  reporter?: { email: string; profile?: { fullName: string } | null } | null;
  targetUser?: { email: string; profile?: { fullName: string } | null } | null;
  post?: { id: string; content: string; status: string; author: { email: string; profile?: { fullName: string } | null } } | null;
  comment?: { id: string; content: string; status: string; author: { email: string; profile?: { fullName: string } | null } } | null;
  moderationCase?: { id: string; caseType: string; priority: string; status: string } | null;
};

export type AuditLogEntry = {
  id: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  createdAt: string;
  actorUser?: { email: string; profile?: { fullName: string } | null } | null;
};

export type BadWord = { id: string; pattern: string; category: string; isActive: boolean; createdAt: string };
export type PageResult<T, K extends string> = { total: number; page: number; limit: number; totalPages: number } & Record<K, T[]>;

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Không thể tải dữ liệu quản trị");
  }
  return body.data;
}

export const adminApi = {
  metrics: () => request<AdminMetrics>("metrics"),
  users: (query = "") => request<PageResult<AdminUser, "users">>(`users${query ? `?${query}` : ""}`),
  banUser: (id: string, reason: string) => request<AdminUser>(`users/${id}/ban`, { method: "PUT", body: JSON.stringify({ reason }) }),
  unbanUser: (id: string) => request<AdminUser>(`users/${id}/unban`, { method: "PUT", body: "{}" }),
  updateTier: (id: string, tier: AdminUser["tier"], durationMonths = 1) => request<AdminUser>(`users/${id}/tier`, { method: "PUT", body: JSON.stringify({ tier, durationMonths }) }),
  payments: (query = "") => request<PageResult<AdminPayment, "payments">>(`payments${query ? `?${query}` : ""}`),
  comments: () => request<PageResult<FlaggedComment, "comments">>("moderation/comments?limit=50"),
  moderateComment: (id: string, action: "APPROVE" | "HIDE") => request<FlaggedComment>(`moderation/comments/${id}`, { method: "PUT", body: JSON.stringify({ action }) }),
  posts: () => request<PageResult<FlaggedPost, "posts">>("moderation/posts?limit=50"),
  moderatePost: (id: string, action: "APPROVE" | "HIDE") => request<FlaggedPost>(`moderation/posts/${id}`, { method: "PUT", body: JSON.stringify({ action }) }),
  reports: (status = "OPEN") => request<PageResult<AdminReport, "reports">>(`moderation/reports?limit=100&status=${encodeURIComponent(status)}`),
  resolveReport: (id: string, action: "RESOLVE" | "DISMISS", note?: string) => request<AdminReport>(`moderation/reports/${id}`, { method: "PUT", body: JSON.stringify({ action, note }) }),
  auditLogs: (query = "") => request<PageResult<AuditLogEntry, "logs">>(`audit-logs${query ? `?${query}` : ""}`),
  badwords: () => request<BadWord[]>("badwords"),
  addBadword: (pattern: string, category: string) => request<BadWord>("badwords", { method: "POST", body: JSON.stringify({ pattern, category }) }),
  deleteBadword: (id: string) => request<null>(`badwords/${id}`, { method: "DELETE" }),
};
