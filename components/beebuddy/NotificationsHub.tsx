"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck, LoaderCircle, MessageCircle, UserRoundPlus, Users } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import { notificationsApi, type AppNotification } from "@/lib/notifications-client";

const fallbackAvatar = "/assets/home/avatar-01.png";

function relativeTime(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(elapsed / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function notificationCopy(item: AppNotification) {
  const actor = item.actor?.profile?.fullName || "BeeBuddy";
  switch (item.type) {
    case "CONNECTION_REQUEST": return { title: `${actor} muốn kết nối với bạn`, detail: "Xem lời mời và phản hồi khi bạn sẵn sàng.", href: "/discover" };
    case "CONNECTION_ACCEPTED": return { title: `${actor} đã chấp nhận lời mời kết nối`, detail: "Hai bạn có thể bắt đầu trò chuyện.", href: "/discover" };
    case "COMMUNITY_INVITE": return { title: `${actor} đã mời bạn vào một cộng đồng`, detail: "Mở cộng đồng để xem thông tin lời mời.", href: "/community" };
    case "COMMUNITY_JOIN_APPROVED": return { title: "Yêu cầu tham gia cộng đồng đã được duyệt", detail: "Bạn có thể đăng bài và tham gia thảo luận ngay bây giờ.", href: "/community" };
    case "MESSAGE": {
      const conversationId = typeof item.payload.conversationId === "string" ? item.payload.conversationId : "";
      return { title: `${actor} đã gửi cho bạn một tin nhắn`, detail: "Mở hộp thư để xem cuộc trò chuyện.", href: conversationId ? `/messages?conversation=${encodeURIComponent(conversationId)}` : "/messages" };
    }
    default: return { title: "Thông báo từ BeeBuddy", detail: "Có một cập nhật mới dành cho tài khoản của bạn.", href: "/notifications" };
  }
}

function NotificationIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "MESSAGE") return <MessageCircle size={20} />;
  if (type === "CONNECTION_REQUEST" || type === "CONNECTION_ACCEPTED") return <UserRoundPlus size={20} />;
  if (type === "COMMUNITY_INVITE" || type === "COMMUNITY_JOIN_APPROVED") return <Users size={20} />;
  return <Bell size={20} />;
}

export default function NotificationsHub() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (onlyUnread: boolean, cursor?: string) => {
    cursor ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const page = await notificationsApi.list(cursor, 20, onlyUnread);
      setItems((current) => cursor ? [...current, ...page.items] : page.items);
      setUnreadCount(page.unreadCount);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải thông báo");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    webAuth.me().then(() => {
      if (!active) return;
      setAuthenticated(true);
      void load(unreadOnly);
    }).catch(() => {
      if (!active) return;
      setAuthenticated(false);
      setLoading(false);
    });
    return () => { active = false; };
  }, [load, unreadOnly]);

  const chooseFilter = (next: boolean) => {
    setItems([]);
    setNextCursor(null);
    setUnreadOnly(next);
  };

  const markRead = async (item: AppNotification) => {
    if (item.readAt) return;
    try {
      await notificationsApi.markRead(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch { /* Navigation is still useful if read tracking temporarily fails. */ }
  };

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setItems((current) => unreadOnly ? [] : current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đánh dấu đã đọc");
    }
  };

  if (authenticated === null) return <div className="bb-live-notif-state"><LoaderCircle className="bb-spin" size={28} /> Đang tải thông báo...</div>;
  if (!authenticated) return <main className="bb-live-notif-guest"><Bell size={40} /><h1>Thông báo của bạn</h1><p>Đăng nhập để xem lời mời kết nối, tin nhắn và cập nhật cộng đồng.</p><Link href="/login">Đăng nhập</Link></main>;

  return (
    <main className="bb-live-notif-page">
      <section className="bb-live-notif-shell">
        <header className="bb-live-notif-header"><div><span>Hoạt động gần đây</span><h1>Thông báo</h1><p>{unreadCount ? `Bạn có ${unreadCount} thông báo chưa đọc.` : "Bạn đã xem hết các thông báo mới."}</p></div>{unreadCount > 0 && <button type="button" onClick={() => void markAllRead()}><CheckCheck size={17} /> Đánh dấu tất cả đã đọc</button>}</header>
        <div className="bb-live-notif-tabs"><button className={!unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(false)}>Tất cả</button><button className={unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(true)}>Chưa đọc {unreadCount > 0 && <span>{unreadCount}</span>}</button></div>
        {error && <div className="bb-match-alert is-error">{error}</div>}
        {loading ? <div className="bb-live-notif-state"><LoaderCircle className="bb-spin" size={26} /> Đang tải...</div> : items.length === 0 ? <div className="bb-live-notif-state"><Bell size={34} /><strong>{unreadOnly ? "Không còn thông báo chưa đọc" : "Chưa có thông báo nào"}</strong><span>Các hoạt động mới sẽ xuất hiện tại đây.</span></div> : <div className="bb-live-notif-list">{items.map((item) => { const copy = notificationCopy(item); return <Link key={item.id} href={copy.href} className={`bb-live-notif-row ${!item.readAt ? "is-unread" : ""}`} onClick={() => void markRead(item)}><div className="bb-live-notif-avatar">{item.actor?.profile?.avatarUrl ? <img src={item.actor.profile.avatarUrl} alt="" /> : <NotificationIcon type={item.type} />}</div><div><strong>{copy.title}</strong><p>{copy.detail}</p><time>{relativeTime(item.createdAt)}</time></div>{!item.readAt && <i aria-label="Chưa đọc" />}</Link>; })}</div>}
        {nextCursor && <button className="bb-live-notif-more" disabled={loadingMore} onClick={() => void load(unreadOnly, nextCursor)}>{loadingMore ? <LoaderCircle className="bb-spin" size={17} /> : null} Xem thêm</button>}
      </section>
    </main>
  );
}
