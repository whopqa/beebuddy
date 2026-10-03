import type { ApiEnvelope } from "./auth-types";

export type NotificationType = "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED" | "COMMUNITY_INVITE" | "COMMUNITY_JOIN_APPROVED" | "MESSAGE" | "SYSTEM";

export const NOTIFICATION_PREFERENCES_CHANGED_EVENT = "beebuddy:notification-preferences-changed";

export type NotificationPreference = {
  type: NotificationType;
  channel: "IN_APP" | "PUSH" | "EMAIL";
  enabled: boolean;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  entityType?: string | null;
  entityId?: string | null;
  payload: Record<string, unknown>;
  readAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    profile?: {
      fullName: string;
      username?: string | null;
      avatarUrl?: string | null;
    } | null;
  } | null;
};

export type NotificationPage = {
  items: AppNotification[];
  unreadCount: number;
  nextCursor: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/notifications${path}`, {
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

export const notificationsApi = {
  preferences: () => request<NotificationPreference[]>("/preferences"),
  setPreference: (type: NotificationType, enabled: boolean) =>
    request<NotificationPreference>("/preferences", { method: "PUT", body: JSON.stringify({ type, channel: "IN_APP", enabled }) }),
  list: (cursor?: string, limit = 30, unreadOnly = false) => {
    const query = new URLSearchParams({ limit: String(limit), unreadOnly: String(unreadOnly) });
    if (cursor) query.set("cursor", cursor);
    return request<NotificationPage>(`?${query.toString()}`);
  },
  markRead: (notificationId: string) => request<{ read: true }>(`/${encodeURIComponent(notificationId)}/read`, { method: "POST", body: "{}" }),
  markAllRead: () => request<{ updated: number }>("/read-all", { method: "POST", body: "{}" }),
};
