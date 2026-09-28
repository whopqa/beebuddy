export type ConversationRealtimeEvent =
  | { type: "connected"; userId: string; occurredAt: string }
  | { type: "message.created"; conversationId: string; message: unknown; occurredAt: string }
  | { type: "message.read"; conversationId: string; userId: string; messageId: string; readAt: string; readThroughCreatedAt: string; occurredAt: string }
  | { type: "conversation.updated"; conversationId: string; occurredAt: string };

type Listener = (event: ConversationRealtimeEvent) => void;

/**
 * Process-local realtime fan-out used by the SSE endpoint. This is deliberately
 * isolated so it can later be replaced by Redis pub/sub without changing the
 * conversation API or browser event contract.
 */
export class ConversationEventsService {
  private static readonly listeners = new Map<string, Set<Listener>>();

  public static subscribe(userId: string, listener: Listener) {
    const userListeners = this.listeners.get(userId) ?? new Set<Listener>();
    userListeners.add(listener);
    this.listeners.set(userId, userListeners);
    return () => {
      userListeners.delete(listener);
      if (!userListeners.size) this.listeners.delete(userId);
    };
  }

  public static publish(userIds: string[], event: ConversationRealtimeEvent) {
    for (const userId of new Set(userIds)) {
      for (const listener of this.listeners.get(userId) ?? []) listener(event);
    }
  }
}
