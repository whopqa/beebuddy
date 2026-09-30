import type { ApiEnvelope } from "./auth-types";

export type AccountProfile = {
  id: string;
  userId: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  aboutMe?: string | null;
  personalityType?: string | null;
  lifestyle?: string | null;
  hobbies: string[];
  skills: string[];
  favoriteColors: string[];
  socialLinks: string[];
  galleryMediaIds: string[];
  gallery: { id: string; url: string }[];
  gender?: string | null;
  dateOfBirth?: string | null;
  location?: string | null;
  interests: string[];
  habits: string[];
  connectionGoal?: string | null;
  occupation?: string | null;
  user: {
    id: string;
    email: string;
    role: string;
    tier: "FREE" | "VIP" | "PRO";
    tierExpiresAt?: string | null;
    createdAt: string;
  };
};

export type AccountSettings = {
  profileVisibility: "PUBLIC" | "CONNECTIONS" | "ONLY_ME";
  emailNotification: boolean;
  language: string;
  theme: string;
  travelStyles: string[];
};

export type ProfileVisibilityRule = {
  section: "BASIC" | "BIO" | "AGE" | "OCCUPATION" | "INTERESTS" | "HABITS" | "PLACES" | "GOALS" | "INTRO_MEDIA";
  audience: "PUBLIC" | "CONNECTIONS" | "ONLY_ME";
};

export type AccountSession = {
  id: string;
  deviceName?: string | null;
  platform?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  lastUsedAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  isCurrent: boolean;
  isActive: boolean;
};

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`/api/account/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error || body.message || "Yêu cầu không thành công");
  }
  return body.data;
}

export const accountApi = {
  profile: () => request<AccountProfile>("profile"),
  updateProfile: (data: Partial<Omit<AccountProfile, "id" | "userId" | "user" | "gallery">> & { avatarMediaAssetId?: string | null }) =>
    request<AccountProfile>("profile", { method: "PUT", body: JSON.stringify(data) }),
  setAvatar: (mediaAssetId: string | null) =>
    request<AccountProfile>("avatar", { method: "PUT", body: JSON.stringify({ mediaAssetId }) }),
  settings: () => request<AccountSettings>("settings"),
  updateSettings: (data: Partial<AccountSettings>) =>
    request<AccountSettings>("settings", { method: "PUT", body: JSON.stringify(data) }),
  profilePrivacy: () => request<ProfileVisibilityRule[]>("privacy"),
  updateProfilePrivacy: (rules: ProfileVisibilityRule[]) =>
    request<ProfileVisibilityRule[]>("privacy", { method: "PUT", body: JSON.stringify({ rules }) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<null>("password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
  sessions: () => request<AccountSession[]>("sessions"),
  revokeOtherSessions: () => request<{ revokedCount: number }>("sessions", { method: "DELETE" }),
  revokeSession: (id: string) => request<{ revoked: boolean }>(`sessions/${id}`, { method: "DELETE" }),
};
