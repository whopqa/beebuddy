import type { ApiEnvelope } from "./auth-types";

export type ConversationPerson = {
  id: string;
  profile?: {
    fullName: string;
    username?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export type ConversationMember = {
  id: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "ACTIVE" | "LEFT" | "REMOVED";
  user: ConversationPerson;
};

export type Message = {
  id: string;
  conversationId: string;
  senderType: "USER" | "SYSTEM" | "AI";
  senderUserId?: string | null;
  type: "TEXT" | "IMAGE" | "VIDEO" | "VOICE" | "FILE" | "SYSTEM";
  body?: string | null;
  clientMessageId?: string | null;
  createdAt: string;
  editedAt?: string | null;
  readByUserIds?: string[];
  senderUser?: ConversationPerson | null;
  attachments?: Array<{
    id: string;
    sortOrder: number;
    mediaAsset: {
      id: string;
      sourceUrl?: string | null;
      mimeType: string;
      byteSize?: number | string | null;
    };
  }>;
};

export type ConversationRealtimeEvent =
  | { type: "connected"; userId: string; occurredAt: string }
  | { type: "message.created"; conversationId: string; message: Message; occurredAt: string }
  | { type: "message.read"; conversationId: string; userId: string; messageId: string; readAt: string; readThroughCreatedAt: string; occurredAt: string }
  | { type: "conversation.updated"; conversationId: string; occurredAt: string };

export type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP" | "AI";
  title?: string | null;
  lastMessageAt?: string | null;
  members: ConversationMember[];
  messages: Message[];
};

export type ConversationListItem = {
  id: string;
  conversationId: string;
  userId: string;
  unreadCount: number;
  canMessage?: boolean;
  messagingRestriction?: "CONNECTION_REQUIRED" | "BLOCKED" | null;
  conversation: Conversation;
};

export type ConversationPage = {
  items: ConversationListItem[];
  nextCursor: string | null;
};

export type MessagePage = {
  items: Message[];
  nextCursor: string | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/conversations${path}`, {
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

export const conversationsApi = {
  list: (cursor?: string, limit = 30) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return request<ConversationPage>(`?${query.toString()}`);
  },
  openDirect: (userId: string) => request<Conversation>("/direct", { method: "POST", body: JSON.stringify({ userId }) }),
  messages: (conversationId: string, cursor?: string, limit = 50) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    return request<MessagePage>(`/${encodeURIComponent(conversationId)}/messages?${query.toString()}`);
  },
  send: (conversationId: string, body: string) => request<Message>(`/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, clientMessageId: crypto.randomUUID() }),
  }),
  sendImages: (conversationId: string, mediaAssetIds: string[], body?: string) =>
    request<Message>(`/${encodeURIComponent(conversationId)}/messages/media`, {
      method: "POST",
      body: JSON.stringify({
        type: "IMAGE",
        mediaAssetIds,
        body: body?.trim() || undefined,
        clientMessageId: crypto.randomUUID(),
      }),
    }),
  markRead: (conversationId: string, messageId: string) => request<unknown>(`/${encodeURIComponent(conversationId)}/read`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  }),
};
