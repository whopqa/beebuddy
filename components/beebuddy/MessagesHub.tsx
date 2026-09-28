"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageCircle, RefreshCw, Search, Send, Users } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { conversationsApi, type ConversationListItem, type Message } from "@/lib/conversations-client";

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

export default function MessagesHub({ initialUserId, initialConversationId }: { initialUserId?: string; initialConversationId?: string }) {
  const [user, setUser] = useState<WebUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const openedInitialUser = useRef(false);

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
    void loadMessages(selectedId);
    const timer = window.setInterval(() => void loadMessages(selectedId, true), 10000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selectedId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const selected = items.find((item) => item.conversationId === selectedId) || null;
  const identity = selected && user ? conversationIdentity(selected, user.id) : null;
  const filtered = useMemo(() => {
    if (!user) return items;
    const keyword = query.trim().toLocaleLowerCase("vi");
    if (!keyword) return items;
    return items.filter((item) => conversationIdentity(item, user.id).name.toLocaleLowerCase("vi").includes(keyword));
  }, [items, query, user]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      await conversationsApi.send(selectedId, draft.trim());
      setDraft("");
      await Promise.all([loadMessages(selectedId), loadList()]);
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
          {loading ? <div className="bb-message-list-state"><LoaderCircle className="bb-spin" size={22} /></div> : filtered.length === 0 ? <div className="bb-message-list-state"><Users size={27} /><span>Chưa có cuộc trò chuyện.</span><Link href="/discover">Tìm người kết nối</Link></div> : <div className="bb-message-conversation-list">{filtered.map((item) => { const info = conversationIdentity(item, user.id); const last = item.conversation.messages[0]; return <button key={item.id} className={item.conversationId === selectedId ? "is-active" : ""} onClick={() => setSelectedId(item.conversationId)}><img src={info.avatar} alt="" /><div><strong>{info.name}</strong><span>{last?.body || info.subtitle}</span></div><aside><time>{relativeTime(last?.createdAt || item.conversation.lastMessageAt)}</time>{item.unreadCount > 0 && <b>{item.unreadCount}</b>}</aside></button>; })}</div>}
        </aside>

        <section className={`bb-message-thread ${selected ? "has-selection" : ""}`}>
          {!selected || !identity ? <div className="bb-message-empty-thread"><MessageCircle size={43} /><h2>Chọn một cuộc trò chuyện</h2><p>Tin nhắn chỉ khả dụng giữa những người đã kết nối.</p></div> : <><header><button className="bb-message-mobile-back" onClick={() => setSelectedId(null)}><ArrowLeft size={19} /></button><img src={identity.avatar} alt="" /><div><strong>{identity.name}</strong><span>{identity.subtitle}</span></div></header>{error && <div className="bb-message-error">{error}</div>}<div className="bb-message-scroll">{messageLoading ? <div className="bb-message-list-state"><LoaderCircle className="bb-spin" size={23} /> Đang tải tin nhắn...</div> : messages.length === 0 ? <div className="bb-message-empty-thread"><MessageCircle size={34} /><h2>Bắt đầu một lời chào</h2><p>Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện.</p></div> : messages.map((message) => { const mine = message.senderUserId === user.id; return <div key={message.id} className={`bb-message-bubble-row ${mine ? "is-mine" : ""}`}>{!mine && <img src={message.senderUser?.profile?.avatarUrl || identity.avatar} alt="" />}<div><p>{message.body || `[${message.type}]`}</p><time>{relativeTime(message.createdAt)}</time></div></div>; })}<div ref={endRef} /></div><form onSubmit={send}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={10000} rows={1} placeholder="Viết tin nhắn..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} /><button disabled={!draft.trim() || sending}>{sending ? <LoaderCircle className="bb-spin" size={18} /> : <Send size={18} />}</button></form></>}
        </section>
      </section>
    </main>
  );
}
