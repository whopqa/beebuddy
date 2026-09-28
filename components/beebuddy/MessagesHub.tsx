"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, LoaderCircle, MessageCircle, RefreshCw, Search, Send, Users, X } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { conversationsApi, type ConversationListItem, type ConversationRealtimeEvent, type Message } from "@/lib/conversations-client";
import { uploadImage } from "@/lib/media-client";

const fallbackAvatar = "/assets/home/avatar-01.png";

function relativeTime(value?: string | null) {
  if (!value) return "";
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function conversationIdentity(item: ConversationListItem, userId: string) {
  if (item.conversation.type === "GROUP") return { name: item.conversation.title || "Nhóm BeeBuddy", avatar: fallbackAvatar, subtitle: `${item.conversation.members.length} thành viên` };
  const other = item.conversation.members.find((member) => member.userId !== userId)?.user;
  return { name: other?.profile?.fullName || "Thành viên BeeBuddy", avatar: other?.profile?.avatarUrl || fallbackAvatar, subtitle: other?.profile?.username ? `@${other.profile.username}` : "Kết nối BeeBuddy" };
}

function lastMessagePreview(message: Message | undefined, fallback: string) {
  if (!message) return fallback;
  if (message.body) return message.body;
  if (message.type === "IMAGE") return "Đã gửi ảnh";
  return `[${message.type}]`;
}

export default function MessagesHub({ initialUserId, initialConversationId }: { initialUserId?: string; initialConversationId?: string }) {
  const [user, setUser] = useState<WebUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<"CONNECTING" | "CONNECTED" | "RECONNECTING">("CONNECTING");
  const endRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(initialConversationId || null);
  const openedInitialUser = useRef(false);
  const pendingPreviews = useMemo(() => pendingImages.map((file) => URL.createObjectURL(file)), [pendingImages]);

  useEffect(() => () => pendingPreviews.forEach((url) => URL.revokeObjectURL(url)), [pendingPreviews]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const loadList = useCallback(async () => {
    const page = await conversationsApi.list();
    setItems(page.items);
    setSelectedId((current) => current || page.items[0]?.conversationId || null);
    return page.items;
  }, []);

  useEffect(() => {
    let active = true;
    webAuth.me().then(async (currentUser) => {
      if (!active) return;
      setUser(currentUser);
      try {
        let list = await loadList();
        if (initialUserId && !openedInitialUser.current) {
          openedInitialUser.current = true;
          const opened = await conversationsApi.openDirect(initialUserId);
          list = await loadList();
          setSelectedId(opened.id);
        } else if (initialConversationId && list.some((item) => item.conversationId === initialConversationId)) {
          setSelectedId(initialConversationId);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Không thể tải hộp thư");
      } finally {
        if (active) { setLoading(false); setAuthResolved(true); }
      }
    }).catch(() => { if (active) { setUser(null); setLoading(false); setAuthResolved(true); } });
    return () => { active = false; };
  }, [initialConversationId, initialUserId, loadList]);

  const loadMessages = useCallback(async (conversationId: string, quiet = false) => {
    if (!quiet) setMessageLoading(true);
    try {
      const page = await conversationsApi.messages(conversationId);
      setMessages([...page.items].reverse());
      const newest = page.items[0];
      if (newest) {
        void conversationsApi.markRead(conversationId, newest.id).catch(() => undefined);
        setItems((current) => current.map((item) => item.conversationId === conversationId ? { ...item, unreadCount: 0 } : item));
      }
    } catch (cause) {
      if (!quiet) setError(cause instanceof Error ? cause.message : "Không thể tải tin nhắn");
    } finally {
      if (!quiet) setMessageLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    setError("");
    setPendingImages([]);
    void loadMessages(selectedId);
    const timer = window.setInterval(() => void loadMessages(selectedId, true), 30000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!user) return;
    setRealtimeStatus("CONNECTING");
    const source = new EventSource("/api/conversations/events");
    source.onopen = () => setRealtimeStatus("CONNECTED");
    source.onerror = () => setRealtimeStatus("RECONNECTING");
    source.onmessage = (event) => {
      let payload: ConversationRealtimeEvent;
      try { payload = JSON.parse(event.data) as ConversationRealtimeEvent; }
      catch { return; }
      if (payload.type === "connected") { setRealtimeStatus("CONNECTED"); return; }
      if (payload.type === "message.created") {
        if (payload.conversationId === selectedIdRef.current) {
          setMessages((current) => {
            const withoutDuplicate = current.filter((message) => message.id !== payload.message.id);
            return [...withoutDuplicate, payload.message].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          });
          if (payload.message.senderUserId && payload.message.senderUserId !== user.id) {
            void conversationsApi.markRead(payload.conversationId, payload.message.id).catch(() => undefined);
          }
        }
        void loadList().catch(() => undefined);
        return;
      }
      if (payload.type === "message.read" && payload.conversationId === selectedIdRef.current && payload.userId !== user.id) {
        const readThrough = new Date(payload.readThroughCreatedAt).getTime();
        setMessages((current) => current.map((message) => {
          if (message.senderUserId !== user.id || new Date(message.createdAt).getTime() > readThrough) return message;
          return { ...message, readByUserIds: Array.from(new Set([...(message.readByUserIds || []), payload.userId])) };
        }));
      }
    };
    return () => source.close();
  }, [loadList, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const selected = items.find((item) => item.conversationId === selectedId) || null;
  const identity = selected && user ? conversationIdentity(selected, user.id) : null;
  const filtered = useMemo(() => {
    if (!user) return items;
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (!keyword) return items;
    return items.filter((item) => conversationIdentity(item, user.id).name.toLocaleLowerCase("vi").includes(keyword));
  }, [items, query, user]);

  const chooseImages = (files: File[]) => {
    const next = files.slice(0, 4);
    if (next.some((file) => !file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
      setError("Mỗi file phải là ảnh JPEG/PNG/WebP/GIF và không vượt quá 5 MB.");
      return;
    }
    setError("");
    setPendingImages(next);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || (!draft.trim() && pendingImages.length === 0) || sending) return;
    setSending(true);
    setError("");
    try {
      let created: Message;
      if (pendingImages.length) {
        const uploaded = await Promise.all(pendingImages.map((file) => uploadImage(file, "message")));
        created = await conversationsApi.sendImages(selectedId, uploaded.map((asset) => asset.id), draft);
      } else {
        created = await conversationsApi.send(selectedId, draft.trim());
      }
      setMessages((current) => [...current.filter((message) => message.id !== created.id), created].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setDraft("");
      setPendingImages([]);
      await loadList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  if (!authResolved) return <div className="bb-message-page-state"><LoaderCircle className="bb-spin" size={28} /> Đang mở hộp thư...</div>;
  if (!user) return <main className="bb-message-guest"><MessageCircle size={42} /><h1>Tin nhắn BeeBuddy</h1><p>Đăng nhập để trò chuyện với những người bạn đã kết nối.</p><Link href="/login">Đăng nhập</Link></main>;

  return (
    <main className="bb-message-page">
      <section className="bb-message-shell">
        <aside className={`bb-message-sidebar ${selected ? "has-mobile-selection" : ""}`}>
          <header><div><span>BeeBuddy</span><h1>Tin nhắn</h1></div><button title="Làm mới" onClick={() => void loadList()}><RefreshCw size={18} /></button></header>
          <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm cuộc trò chuyện..." /></label>
          {loading ? <div className="bb-message-list-state"><LoaderCircle className="bb-spin" size={22} /></div> : filtered.length === 0 ? <div className="bb-message-list-state"><Users size={27} /><span>Chưa có cuộc trò chuyện.</span><Link href="/discover">Tìm người kết nối</Link></div> : <div className="bb-message-conversation-list">{filtered.map((item) => { const info = conversationIdentity(item, user.id); const last = item.conversation.messages[0]; return <button key={item.id} className={item.conversationId === selectedId ? "is-active" : ""} onClick={() => setSelectedId(item.conversationId)}><img src={info.avatar} alt="" /><div><strong>{info.name}</strong><span>{lastMessagePreview(last, info.subtitle)}</span></div><aside><time>{relativeTime(last?.createdAt || item.conversation.lastMessageAt)}</time>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</aside></button>; })}</div>}
        </aside>

        <section className={`bb-message-thread ${selected ? "has-selection" : ""}`}>
          {!selected || !identity ? (
            <div className="bb-message-empty-thread"><MessageCircle size={43} /><h2>Chọn một cuộc trò chuyện</h2><p>Tin nhắn chỉ khả dụng giữa những người đã kết nối.</p></div>
          ) : (
            <>
              <header><button className="bb-message-mobile-back" onClick={() => setSelectedId(null)}><ArrowLeft size={19} /></button><img src={identity.avatar} alt="" /><div><strong>{identity.name}</strong><span>{identity.subtitle}</span></div><span className={`bb-message-live-status is-${realtimeStatus.toLowerCase()}`}><i />{realtimeStatus === "CONNECTED" ? "Realtime" : realtimeStatus === "RECONNECTING" ? "Đang kết nối lại" : "Đang kết nối"}</span></header>
              {error && <div className="bb-message-error" role="alert">{error}</div>}
              {selected.canMessage === false && (
                <div className="bb-message-restriction" role="status">
                  <Users size={16} />
                  <span>{selected.messagingRestriction === "BLOCKED" ? "Không thể tiếp tục trò chuyện do trạng thái chặn giữa hai tài khoản." : "Hai bạn cần kết nối lại và chấp nhận lời mời trước khi tiếp tục trò chuyện."}</span>
                </div>
              )}
              <div className="bb-message-scroll">
                {messageLoading ? <div className="bb-message-list-state"><LoaderCircle className="bb-spin" size={23} /> Đang tải tin nhắn...</div> : messages.length === 0 ? <div className="bb-message-empty-thread"><MessageCircle size={34} /><h2>Bắt đầu một lời chào</h2><p>Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.</p></div> : messages.map((message) => {
                  const mine = message.senderUserId === user.id;
                  const readByOthers = (message.readByUserIds || []).filter((userId) => userId !== user.id);
                  return (
                    <div key={message.id} className={`bb-message-bubble-row ${mine ? "is-mine" : ""}`}>
                      {!mine && <img src={message.senderUser?.profile?.avatarUrl || identity.avatar} alt="" />}
                      <div>
                        {message.attachments?.length ? <div className="bb-message-attachments">{message.attachments.map((attachment) => attachment.mediaAsset.sourceUrl ? <img key={attachment.id} src={attachment.mediaAsset.sourceUrl} alt="Ảnh trong tin nhắn" /> : null)}</div> : null}
                        {message.body && <p>{message.body}</p>}
                        <time>{relativeTime(message.createdAt)}{mine ? readByOthers.length ? ` · Đã xem${selected.conversation.type === "GROUP" ? ` (${readByOthers.length})` : ""}` : " · Đã gửi" : ""}</time>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {selected.canMessage !== false && <form className="bb-message-composer" onSubmit={send}>
                {pendingPreviews.length > 0 && <div className="bb-message-pending-images">{pendingPreviews.map((url, index) => <div key={url}><img src={url} alt={`Ảnh chờ gửi ${index + 1}`} /><button type="button" onClick={() => setPendingImages((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Bỏ ảnh"><X size={14} /></button></div>)}</div>}
                <div className="bb-message-compose-row">
                  <label className="bb-message-image-picker" title="Gửi ảnh"><ImagePlus size={20} /><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => chooseImages(Array.from(event.target.files || []))} /></label>
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={10000} rows={1} placeholder={pendingImages.length ? "Thêm lời nhắn..." : "Viết tin nhắn..."} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
                  <button disabled={(!draft.trim() && pendingImages.length === 0) || sending}>{sending ? <LoaderCircle className="bb-spin" size={18} /> : <Send size={18} />}</button>
                </div>
              </form>}
            </>
          )}
        </section>
      </section>
    </main>
  );
}
