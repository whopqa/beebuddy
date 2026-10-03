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
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function notificationCopy(item: AppNotification) {
  const actor = item.actor?.profile?.fullName || "BeeBuddy";
  switch (item.type) {
    case "CONNECTION_REQUEST": return { title: `${actor} wants to connect with you`, detail: "View the request and respond when you're ready.", href: "/discover" };
    case "CONNECTION_ACCEPTED": return { title: `${actor} accepted your connection request`, detail: "You can start chatting now.", href: "/discover" };
    case "COMMUNITY_INVITE": return { title: `${actor} invited you to a community`, detail: "Open the community to view the invitation.", href: "/community" };
    case "COMMUNITY_JOIN_APPROVED": return { title: "Your community join request was approved", detail: "You can now post and join discussions.", href: "/community" };
    case "MESSAGE": {
      const conversationId = typeof item.payload.conversationId === "string" ? item.payload.conversationId : "";
      return { title: `${actor} sent you a message`, detail: "Open messages to view the conversation.", href: conversationId ? `/messages?conversation=${encodeURIComponent(conversationId)}` : "/messages" };
    }
    default: return { title: "BeeBuddy notification", detail: "There's a new update for your account.", href: "/notifications" };
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
      setError(cause instanceof Error ? cause.message : "Unable to load notifications");
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
      setError(cause instanceof Error ? cause.message : "Unable to mark as read");
    }
  };

  if (authenticated === null) return <div className="bb-live-notif-state"><LoaderCircle className="bb-spin" size={28} /> Loading notifications...</div>;
  if (!authenticated) return <main className="bb-live-notif-guest"><Bell size={40} /><h1>Your notifications</h1><p>Sign in to see connection requests, messages, and community updates.</p><Link href="/login">Sign in</Link></main>;

  return (
    <main className="bb-live-notif-page">
      <section className="bb-live-notif-shell">
        <header className="bb-live-notif-header"><div><span>Recent activity</span><h1>Notifications</h1><p>{unreadCount ? `You have ${unreadCount} unread notifications.` : "You're all caught up."}</p></div>{unreadCount > 0 && <button type="button" onClick={() => void markAllRead()}><CheckCheck size={17} /> Mark all as read</button>}</header>
        <div className="bb-live-notif-tabs"><button className={!unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(false)}>All</button><button className={unreadOnly ? "is-active" : ""} onClick={() => chooseFilter(true)}>Unread {unreadCount > 0 && <span>{unreadCount}</span>}</button></div>
        {error && <div className="bb-match-alert is-error">{error}</div>}
        {loading ? <div className="bb-live-notif-state"><LoaderCircle className="bb-spin" size={26} /> Loading...</div> : items.length === 0 ? <div className="bb-live-notif-state"><Bell size={34} /><strong>{unreadOnly ? "No unread notifications" : "No notifications yet"}</strong><span>New activity will appear here.</span></div> : <div className="bb-live-notif-list">{items.map((item) => { const copy = notificationCopy(item); return <Link key={item.id} href={copy.href} className={`bb-live-notif-row ${!item.readAt ? "is-unread" : ""}`} onClick={() => void markRead(item)}><div className="bb-live-notif-avatar">{item.actor?.profile?.avatarUrl ? <img src={item.actor.profile.avatarUrl} alt="" /> : <NotificationIcon type={item.type} />}</div><div><strong>{copy.title}</strong><p>{copy.detail}</p><time>{relativeTime(item.createdAt)}</time></div>{!item.readAt && <i aria-label="Unread" />}</Link>; })}</div>}
        {nextCursor && <button className="bb-live-notif-more" disabled={loadingMore} onClick={() => void load(unreadOnly, nextCursor)}>{loadingMore ? <LoaderCircle className="bb-spin" size={17} /> : null} View more</button>}
      </section>
    </main>
  );
}
