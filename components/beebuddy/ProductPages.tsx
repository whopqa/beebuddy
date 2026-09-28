"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import {
  MessageSquare,
  Users,
  MapPin,
  Clock,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ArrowLeft,
  Globe,
  Heart,
  Share2,
  Lock,
  Edit2,
  ExternalLink,
  Shield,
  CreditCard,
  HelpCircle,
  Settings as SettingsIcon,
  Check,
  User as UserIcon,
  Bell,
  Camera,
} from "lucide-react";
import FigmaHeader from "./FigmaHeader";
import FigmaFooter from "./FigmaFooter";
import SimpleFooter from "./SimpleFooter";
import CommentsModal from "./CommentsModal";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { accountApi, type AccountProfile, type AccountSettings, type AccountSession } from "@/lib/account-client";
import { postsApi, type FeedPost } from "@/lib/posts-client";
import {
  cancelCheckout,
  createCheckout,
  getPaymentStatus,
  getSubscriptionPlans,
  type Checkout,
  type PaymentStatus as PaymentStatusRecord,
  type SubscriptionPlan,
} from "@/lib/payments-client";
import { notificationsApi, type AppNotification } from "@/lib/notifications-client";
import { searchApi, type SearchPreviewResult } from "@/lib/search-client";
import { uploadImage } from "@/lib/media-client";

export type ProductView =
  | "get-started"
  | "start-your-journey"
  | "community"
  | "settings"
  | "account"
  | "account-edit"
  | "security"
  | "billing"
  | "help"
  | "notifications";

export default function ProductPage({ view }: { view: ProductView }) {
  // Community uses full mountain footer per Figma 219:5235 / 481:1343
  const isCommunity = view === "community";
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<WebUser | null>(null);

  useEffect(() => {
    let active = true;
    webAuth.me().then((user) => {
      if (!active) return;
      setIsLoggedIn(true);
      setCurrentUser(user);
    }).catch(() => {
      if (!active) return;
      setIsLoggedIn(false);
      setCurrentUser(null);
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="bb-site bb-product-page-root">
      <FigmaHeader authenticated={isLoggedIn} />
      <ProductContent view={view} isLoggedIn={isLoggedIn} currentUser={currentUser} />
      {isCommunity ? <FigmaFooter /> : <SimpleFooter />}
    </div>
  );
}

function ProductContent({ view, isLoggedIn, currentUser }: { view: ProductView; isLoggedIn: boolean; currentUser: WebUser | null }) {
  switch (view) {
    case "get-started":
      return <GetStarted isLoggedIn={isLoggedIn} />;
    case "start-your-journey":
      return <StartYourJourney />;
    case "community":
      return <CommunityDirectory isLoggedIn={isLoggedIn} />;
    case "settings":
      return <Settings isLoggedIn={isLoggedIn} />;
    case "account":
      return <AccountInfo isLoggedIn={isLoggedIn} />;
    case "account-edit":
      return <AccountInfo isLoggedIn={isLoggedIn} editing />;
    case "security":
      return <Security isLoggedIn={isLoggedIn} />;
    case "billing":
      return <Billing isLoggedIn={isLoggedIn} />;
    case "help":
      return <HelpSupport isLoggedIn={isLoggedIn} />;
    case "notifications":
      return <Notifications />;
  }
}

/* ==========================================================================
   SETTINGS / UTILITY SUBNAV BAR (Matches Figma 347:1286 / 515:4234)
   ========================================================================== */
function SettingsNavTabs({ active }: { active: "settings" | "account" | "billing" | "security" | "help" }) {
  const tabs = [
    { key: "settings", label: "Settings", href: "/settings", icon: <SettingsIcon size={16} /> },
    { key: "account", label: "Account Info", href: "/account", icon: <UserIcon size={16} /> },
    { key: "billing", label: "Billing", href: "/billing", icon: <CreditCard size={16} /> },
    { key: "security", label: "Security", href: "/security", icon: <Shield size={16} /> },
    { key: "help", label: "Help & Support", href: "/help", icon: <HelpCircle size={16} /> },
  ];

  return (
    <div className="bb-settings-hero-header">
      {/* Giant faint Beebuddy watermark in background */}
      <div className="bb-settings-giant-watermark" aria-hidden="true">
        Beebuddy
      </div>

      <div className="bb-settings-brand-title-row">
        <img
          src="/assets/buzzy/buzzy_laptop_setting.png"
          alt="Buzzy mascot"
          className="bb-settings-mascot-head"
        />
        <h1 className="bb-settings-page-title">Setting</h1>
      </div>

      <nav className="bb-settings-pill-nav" aria-label="Settings Navigation">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`bb-settings-tab-btn ${isActive ? "is-active" : ""}`}
            >
              <span className="bb-tab-icon">{tab.icon}</span>
              <span className="bb-tab-text">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/* ==========================================================================
   1. GET STARTED (Figma Frame 227:40 & 280:2924)
   ========================================================================== */
function GetStarted({ isLoggedIn }: { isLoggedIn: boolean }) {
  const reducedMotion = useReducedMotion() === true;
  const entrance = (start: number, first = false) => {
    const times = first ? [0, 0.25, 1] : [0, start, start + 0.25, 1];
    const opacity = first ? [0, 1, 1] : [0, 0, 1, 1];
    const y = first ? [24, 0, 0] : [24, 24, 0, 0];
    const ease: Transition["ease"] = first ? [[0.22, 1, 0.36, 1], "linear"] : ["linear", [0.22, 1, 0.36, 1], "linear"];
    return reducedMotion
      ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
      : { initial: { opacity: 0, y: 24 }, animate: { opacity, y }, transition: { opacity: { duration: 2, times, ease }, y: { duration: 2, times, ease } } as Transition };
  };
  const afterSubtitle = (start: number) => start + (isLoggedIn ? 0.02 : 0);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    "Backpack & Trek",
    "Foodie & Cafes",
  ]);

  const travelStyles = [
    "Backpack & Trek",
    "Foodie & Cafes",
    "Slow Explorer",
    "Night owl",
    "Beach Hobo",
    "History buff",
    "Local Gatherings",
  ];

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  return (
    <main className="bb-canvas bb-get-started-canvas">
      {/* 1. Header welcome */}
      <section className="bb-gs-welcome-section">
        <motion.span className="bb-gs-kicker-pill" data-node-id={isLoggedIn ? "280:2973" : "227:63"} {...entrance(0, true)}>● ONBOARDING CENTER</motion.span>
        <motion.h1 className="bb-gs-main-title" data-node-id={isLoggedIn ? "280:2977" : "227:67"} {...entrance(0.04)}>YOUR JOURNEY STARTS HERE</motion.h1>
        {isLoggedIn ? <motion.p className="bb-gs-subtitle" data-node-id="280:2978" {...entrance(0.07)}>
          Welcome to BeeBuddy! Setting up your space takes less than 2 minutes. Follow these simple
          checkpoints to customize your travel style, connect with verified companions, and prepare
          for your next shared adventure.
        </motion.p> : <p className="bb-gs-subtitle">
          Welcome to BeeBuddy! Setting up your space takes less than 2 minutes. Follow these simple
          checkpoints to customize your travel style, connect with verified companions, and prepare
          for your next shared adventure.
        </p>}

        {/* Ready to setup travel passport card */}
        <motion.div className="bb-gs-passport-card" data-node-id={isLoggedIn ? "280:2979" : "227:69"} {...entrance(afterSubtitle(0.09))}>
          <img
            src="/assets/community/alex_rivera.png"
            alt="Traveler avatar"
            className="bb-gs-passport-avatar"
          />
          <div className="bb-gs-passport-info">
            <h3>Ready to setup your travel passport?</h3>
            <p>
              Connect your favorite socials, list your bucket-list spots, and Buzzy will instantly
              match you with active groups traveling nearby.
            </p>
          </div>
          <button
            type="button"
            className="bb-gs-launch-passport-btn"
            onClick={() => document.getElementById("travel-styles")?.scrollIntoView({ behavior: "smooth" })}
          >
            <span>LAUNCH PASSPORT</span>
            <span>💬</span>
          </button>
        </motion.div>
      </section>

      {/* 2. How BeeBuddy Works Walkthrough (4 Staggered Steps) */}
      <section className="bb-gs-walkthrough-section">
        <span className="bb-gs-kicker-pill">● ONBOARDING WALKTHROUGH</span>
        <h2 className="bb-gs-walkthrough-title">HOW BEEBUDDY WORKS</h2>

        <div className="bb-gs-steps-list">
          {/* Step 01 */}
          <div className="bb-gs-step-row">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">01</span>
              <h3>Find Your People</h3>
              <motion.p data-node-id={isLoggedIn ? "280:3000" : "227:91"} {...entrance(afterSubtitle(0.15))}>
                Onboarding starts with self-expression. Share your unique vibe, preferred pace, and
                local exploration bucket lists. Our intelligent matchmaking aligns you with buddies
                traveling with exact-match expectations.
              </motion.p>
              <motion.ul className="bb-gs-step-bullets" data-node-id={isLoggedIn ? "280:3001" : "227:92"} {...entrance(afterSubtitle(0.19))}>
                <li><span className="bb-bullet-dot" /> Social Media Identity Sync</li>
                <li><span className="bb-bullet-dot" /> Vibe & Activity Tags</li>
              </motion.ul>
            </div>
            <motion.div className="bb-gs-step-img-wrap" data-node-id={isLoggedIn ? "280:3008" : "227:99"} {...entrance(afterSubtitle(0.17))}>
              <img src="/assets/home/figma-onboarding-step-1.png" alt="Find your people" className="bb-gs-step-img" />
            </motion.div>
          </div>

          {/* Step 02 (Reversed) */}
          <div className="bb-gs-step-row is-reverse">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">02</span>
              <h3>Shared Adventures</h3>
              <motion.p data-node-id={isLoggedIn ? "280:3015" : "227:107"} {...entrance(afterSubtitle(0.23))}>
                Browse, join, or create micro-events. Whether it is a weekend market run, a local
                foodie crawl, or an intense mountain trek, shared plans build immediate comfort.
                Every event includes real-time group chat before setting out.
              </motion.p>
              <motion.ul className="bb-gs-step-bullets" data-node-id={isLoggedIn ? "280:3016" : "227:108"} {...entrance(afterSubtitle(0.27))}>
                <li><span className="bb-bullet-dot" /> Instant Group Events & Meetups</li>
                <li><span className="bb-bullet-dot" /> Pre-Trip Coordinates & Chats</li>
              </motion.ul>
            </div>
            <motion.div className="bb-gs-step-img-wrap" data-node-id={isLoggedIn ? "280:3011" : "227:102"} {...entrance(afterSubtitle(0.25))}>
              <img src="/assets/home/figma-onboarding-step-2.png" alt="Shared adventures" className="bb-gs-step-img" />
            </motion.div>
          </div>

          {/* Step 03 */}
          <div className="bb-gs-step-row">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">03</span>
              <h3>Stories That Stay</h3>
              <motion.p data-node-id={isLoggedIn ? "280:3026" : "227:119"} {...entrance(afterSubtitle(0.31))}>
                Preserve what matters. Share travel snapshots, pin your favorite local coffee shops,
                and write journal entries directly inside the community log. Let others trace your
                favorite trails and learn from your stories.
              </motion.p>
              <motion.ul className="bb-gs-step-bullets" data-node-id={isLoggedIn ? "280:3027" : "227:120"} {...entrance(afterSubtitle(0.35))}>
                <li><span className="bb-bullet-dot" /> Artisanal Route & Spot Pinning</li>
                <li><span className="bb-bullet-dot" /> Community Scrapbooks & Diaries</li>
              </motion.ul>
            </div>
            <motion.div className="bb-gs-step-img-wrap" data-node-id={isLoggedIn ? "280:3034" : "227:127"} {...entrance(afterSubtitle(0.33))}>
              <img src="/assets/home/figma-onboarding-step-3.png" alt="Stories that stay" className="bb-gs-step-img" />
            </motion.div>
          </div>

          {/* Step 04 (Reversed) */}
          <div className="bb-gs-step-row is-reverse">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">04</span>
              <h3>Build Your Circle</h3>
              <motion.p data-node-id={isLoggedIn ? "280:3041" : "227:135"} {...entrance(afterSubtitle(0.39))}>
                Onboarding finalizes with trust. Turn brief holiday connections into lifelong
                circles. Add travelers to your inner group, stay updated on their next destination
                ideas, and plan recurring reunions across the globe.
              </motion.p>
              <motion.ul className="bb-gs-step-bullets" data-node-id={isLoggedIn ? "280:3042" : "227:136"} {...entrance(afterSubtitle(0.43))}>
                <li><span className="bb-bullet-dot" /> Private Core Member Circles</li>
                <li><span className="bb-bullet-dot" /> Verified Companion Network</li>
              </motion.ul>
            </div>
            <motion.div className="bb-gs-step-img-wrap" data-node-id={isLoggedIn ? "280:3037" : "227:130"} {...entrance(afterSubtitle(0.41))}>
              <img src="/assets/home/figma-onboarding-step-4.png" alt="Build your circle" className="bb-gs-step-img" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Milestone Companion Banner (Figma Brown/Orange banner) */}
      <section className="bb-gs-milestone-banner">
        <div className="bb-gs-milestone-inner">
          <div className="bb-gs-milestone-mascot-wrap">
            <span className="bb-gs-buzzy-speech">● HI, I&apos;M BUZZY!</span>
            <img src="/assets/home/figma-buzzy.png" alt="Buzzy" className="bb-gs-milestone-buzzy-img" />
          </div>
          <div className="bb-gs-milestone-copy">
            <h2>YOUR COMPANION AT EVERY MILESTONE</h2>
            <p>
              I&apos;ll be checking in on you periodically to drop local food recommendations, verify
              reviews left by other group buddies, and guide you away from crowded areas. My only job
              is to ensure you feel secure, welcomed, and excited wherever your feet touch the ground!
            </p>
          </div>
        </div>
      </section>

      {/* 4. Questionnaire: Select Your Travel Style */}
      <section id="travel-styles" className="bb-gs-questionnaire-section">
        <span className="bb-gs-kicker-pill">● QUICK START QUESTIONNAIRE</span>
        <h2 className="bb-gs-styles-title">SELECT YOUR TRAVEL STYLE</h2>
        <p className="bb-gs-styles-sub">
          Check what speaks to your heart. We&apos;ll pre-load your dashboard feed with coordinates
          and buddies that matches these active values.
        </p>

        <div className="bb-gs-styles-chips-row">
          {travelStyles.map((style) => {
            const isSelected = selectedStyles.includes(style);
            return (
              <button
                key={style}
                type="button"
                className={`bb-gs-style-chip ${isSelected ? "is-selected" : ""}`}
                onClick={() => toggleStyle(style)}
              >
                {style}
              </button>
            );
          })}
        </div>

        {/* Unlock Your World + Google Play */}
        <div className="bb-gs-unlock-world-block">
          <h3>UNLOCK YOUR WORLD</h3>
          <Link href="/start-your-journey" className="bb-gs-play-badge">
            <img src="/assets/home/home-18.png" alt="Get it on Google Play" />
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ==========================================================================
   2. START YOUR JOURNEY (Figma Frame 502:3032 & 502:2944)
   ========================================================================== */
function StartYourJourney() {
  return (
    <main className="bb-canvas bb-start-journey-canvas">
      {/* Mountain backdrop fade */}
      <div className="bb-start-journey-backdrop" aria-hidden="true">
        <img
          src="/assets/home/figma-footer-mountains.png"
          alt=""
          className="bb-start-journey-mountains"
        />
      </div>

      <div className="bb-start-journey-box">
        {/* Floating Flying Buzzy */}
        <div className="bb-start-journey-mascot-wrap">
          <img
            src="/assets/buzzy/buzzy_hive_flying.png"
            alt="Flying Buzzy"
            className="bb-start-journey-buzzy-img"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/assets/home/figma-buzzy.png";
            }}
          />
        </div>

        {/* Content */}
        <div className="bb-start-journey-copy">
          <h1 className="bb-start-journey-title">Welcome to the Hive!</h1>
          <p className="bb-start-journey-sub">
            You’re now on the BeeBuddy list. Keep an eye on your inbox for new stories, updates, and community moments
          </p>
          <Link href="/community" className="bb-start-journey-members-btn">
            Members
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   3. NOTIFICATIONS (Figma Frame 436:531, 465:1907, 470:546)
   ========================================================================== */
function Notifications() {
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "mentions">("all");

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileComplete, setProfileComplete] = useState(false);
  useEffect(() => {
    let active = true;
    notificationsApi.list(undefined, 100).then(page => {
      if (active) { setItems(page.items); setUnreadCount(page.unreadCount); }
    }).catch(cause => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    accountApi.profile().then(profile => {
      if (active) setProfileComplete(Boolean(profile.bio && profile.avatarUrl));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const readNotification = async (item: AppNotification) => {
    try {
      if (!item.readAt) {
        await notificationsApi.markRead(item.id);
        setItems(current => current.map(row => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
        setUnreadCount(count => Math.max(0, count - 1));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to mark notification read."); }
  };
  const visibleItems = items.filter(item => activeTab === "unread" ? !item.readAt : activeTab === "mentions" ? item.payload.mention === true : true);

  return (
    <main className="bb-canvas bb-notifications-canvas">
      <div className="bb-notif-container">
        <header className="bb-notif-page-header">
          <h1 className="bb-notif-page-title">Notifications</h1>
          <p className="bb-notif-page-sub">
            {activeTab === "mentions" ? `${visibleItems.length} mentions` : `${unreadCount} unread notifications`}
          </p>
        </header>

        {/* Tabs */}
        <div className="bb-notif-filter-tabs">
          <button
            type="button"
            className={`bb-notif-tab-item ${activeTab === "all" ? "is-active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`bb-notif-tab-item ${activeTab === "unread" ? "is-active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </button>
          <button
            type="button"
            className={`bb-notif-tab-item ${activeTab === "mentions" ? "is-active" : ""}`}
            onClick={() => setActiveTab("mentions")}
          >
            Mentions
          </button>
        </div>

        {/* 1. Onboarding 3-step checklist card (visible in All tab per Figma 436:531) */}
        {activeTab === "all" && (
          <div className="bb-notif-get-started-card">
            <div className="bb-notif-gs-header">
              <div>
                <h3>Get Started</h3>
                <p>Complete your onboarding to unlock full features</p>
              </div>
              <span className="bb-notif-step-badge">3 Steps</span>
            </div>

            <div className="bb-notif-checklist">
              <div className={`bb-notif-check-item ${profileComplete ? "is-checked" : ""}`}>
                <span className={profileComplete ? "bb-check-circle" : "bb-circle-num"}>{profileComplete ? "✓" : "1"}</span>
                <div>
                  <strong>Complete your profile</strong>
                  <p>Add your photo and bio</p>
                </div>
              </div>

              <div className="bb-notif-check-item">
                <span className="bb-circle-num">2</span>
                <div>
                  <strong>Invite friends</strong>
                  <p>Share BeeBuddy with your friends</p>
                </div>
              </div>

              <div className="bb-notif-check-item">
                <span className="bb-circle-num">3</span>
                <div>
                  <strong>Explore your community</strong>
                  <p>Find people who share your interests</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Notifications List Items */}
        <div className="bb-notif-items-card">
          {loading && <p className="bb-notif-row">Loading notifications...</p>}
          {error && <p className="bb-notif-row form-error" role="alert">{error}</p>}
          {!loading && !error && visibleItems.length === 0 && <p className="bb-notif-row">No notifications yet.</p>}
          {visibleItems.map(item => (
            <NotificationItem key={item.id}
              avatar={item.actor?.profile?.avatarUrl || "/assets/home/figma-buzzy.png"}
              title={<span><strong>{item.actor?.profile?.fullName || "BeeBuddy"}</strong> {notificationTitle(item)}</span>}
              desc={String(item.payload.message || item.payload.content || "You have a new update.")}
              time={formatRelativeTime(item.createdAt)} unread={!item.readAt}
              onRead={() => void readNotification(item)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function notificationTitle(item: AppNotification) {
  switch (item.type) {
    case "CONNECTION_REQUEST": return "sent you a connection request";
    case "CONNECTION_ACCEPTED": return "accepted your connection request";
    case "COMMUNITY_INVITE": return "invited you to a community";
    case "COMMUNITY_JOIN_APPROVED": return "approved your community request";
    case "MESSAGE": return "sent you a message";
    default: return "has an update for you";
  }
}

function NotificationItem({
  avatar,
  title,
  desc,
  time,
  unread = false,
  onRead,
}: {
  avatar: string;
  title: React.ReactNode;
  desc: string;
  time: string;
  unread?: boolean;
  onRead?: () => void;
}) {
  return (
    <div className={`bb-notif-row ${unread ? "is-unread" : ""}`} role="button" tabIndex={0} onClick={onRead} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRead?.(); } }}>
      <img src={avatar} alt="" className="bb-notif-row-avatar" />
      <div className="bb-notif-row-body">
        <div className="bb-notif-row-title">{title}</div>
        <p className="bb-notif-row-desc">{desc}</p>
        <span className="bb-notif-row-time">{time}</span>
      </div>
      {unread && <span className="bb-notif-unread-dot" aria-label="Unread notification" />}
    </div>
  );
}

/* ==========================================================================
   4. SETTINGS & PREFERENCES (Figma Frame 347:1286)
   ========================================================================== */
function Settings({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [settings, setSettings] = useState<AccountSettings>({
    profileVisibility: "PUBLIC",
    emailNotification: true,
    language: "vi",
    theme: "system",
  });
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const authenticated = isLoggedIn || Boolean(profile);

  useEffect(() => {
    let active = true;
    Promise.all([accountApi.settings(), accountApi.profile()])
      .then(([nextSettings, nextProfile]) => {
        if (!active) return;
        setSettings(nextSettings);
        setProfile(nextProfile);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [isLoggedIn]);

  const saveSettings = async (next: AccountSettings) => {
    setSettings(next);
    if (!authenticated) return;
    setSaving(true);
    setNotice("");
    try {
      setSettings(await accountApi.updateSettings(next));
      setNotice("Saved");
      window.setTimeout(() => setNotice(""), 1800);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="bb-canvas bb-settings-canvas">
      {/* Floating social rail on left */}
      <aside className="bb-social-rail" aria-label="Social media">
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
          <img src="/assets/ui/facebook.svg" alt="" />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <img src="/assets/ui/instagram.png" alt="" />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
          <img src="/assets/ui/tiktok.svg" alt="" />
        </a>
      </aside>

      <div className="bb-settings-page-content">
        <SettingsNavTabs active="settings" />

        {/* Top Guest Row matching Figma 347:1286 (only shown for guests) */}
        {!authenticated && (
          <div className="bb-settings-guest-row">
            <div className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_browsing.png"
                alt="You're browsing as a guest"
                className="bb-guest-img-cover"
              />
            </div>
            <Link href="/account" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_account.png"
                alt="Account Info"
                className="bb-guest-img-cover"
              />
            </Link>
            <Link href="/billing" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_billing.png"
                alt="Billing"
                className="bb-guest-img-cover"
              />
            </Link>
            <div className="bb-guest-auth-actions">
              <Link href="/login" className="bb-guest-signin-btn">
                Sign in
              </Link>
              <Link href="/signup" className="bb-guest-signup-btn">
                Create account
              </Link>
              <Link href="/billing" className="bb-guest-viewplans-link">
                View plans →
              </Link>
            </div>
          </div>
        )}

        {/* Preferences Box */}
        <div className="bb-settings-preferences-box">
          <div className="bb-pref-box-title-row">
            <SlidersHorizontal size={18} className="text-[#ff7300]" />
            <h2>Preferences</h2>
          </div>

          <div className="bb-pref-items-list">
            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Language</strong>
                <p>Select your preferred language</p>
              </div>
              <select className="bb-pref-select" value={settings.language} onChange={(event) => void saveSettings({ ...settings, language: event.target.value })}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Appearance</strong>
                <p>Choose your preferred theme</p>
              </div>
              <select className="bb-pref-select" value={settings.theme} onChange={(event) => void saveSettings({ ...settings, theme: event.target.value })}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Cookie Preferences</strong>
                <p>Manage your cookie and tracking preferences</p>
              </div>
              <Link href="/cookies" className="bb-pref-btn-action">Manage</Link>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Terms conditions</strong>
                <p>Review the terms for using BeeBuddy services</p>
              </div>
              <Link href="/terms" className="bb-pref-btn-action">View</Link>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Privacy Preferences</strong>
                <p>Manage how your personal data is collected and used</p>
              </div>
              <Link href="/privacy" className="bb-pref-btn-action">Manage</Link>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Help Center</strong>
                <p>Find answers to common questions</p>
              </div>
              <Link href="/help" className="bb-pref-btn-action">Open</Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   5. ACCOUNT INFO (View: Figma 515:4234 / Edit: Figma 407:8037)
   ========================================================================== */
type AccountDraft = {
  fullName: string;
  avatarUrl: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  location: string;
  interests: string;
  habits: string;
  connectionGoal: string;
  occupation: string;
};

const accountDraftFrom = (profile: AccountProfile): AccountDraft => ({
  fullName: profile.fullName || "",
  avatarUrl: profile.avatarUrl || "",
  bio: profile.bio || "",
  gender: profile.gender || "",
  dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : "",
  location: profile.location || "",
  interests: profile.interests.join(", "),
  habits: profile.habits.join(", "),
  connectionGoal: profile.connectionGoal || "",
  occupation: profile.occupation || "",
});

function AccountInfo({ isLoggedIn = false, editing = false }: { isLoggedIn?: boolean; editing?: boolean }) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState("");
  const authenticated = isLoggedIn || Boolean(profile);
  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : null, [avatarFile]);

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  useEffect(() => {
    let active = true;
    accountApi.profile()
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setDraft(accountDraftFrom(data));
      })
      .catch((cause: Error) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const updateDraft = (field: keyof AccountDraft, value: string) => setDraft((current) => current ? { ...current, [field]: value } : current);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      if (avatarFile) {
        const uploadedAvatar = await uploadImage(avatarFile, "avatar");
        await accountApi.setAvatar(uploadedAvatar.id);
      } else if (removeAvatar) {
        await accountApi.setAvatar(null);
      }
      const split = (value: string) => Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
      const updated = await accountApi.updateProfile({
        fullName: draft.fullName.trim(),
        bio: draft.bio.trim(),
        gender: draft.gender.trim(),
        dateOfBirth: draft.dateOfBirth || undefined,
        location: draft.location.trim(),
        interests: split(draft.interests),
        habits: split(draft.habits),
        connectionGoal: draft.connectionGoal.trim(),
        occupation: draft.occupation.trim(),
      });
      setProfile(updated);
      window.location.href = "/account";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save profile");
      setSaving(false);
    }
  };

  const user = { name: draft?.fullName || "", email: profile?.user.email || "", username: profile?.username || "Not set" };

  return (
    <main className="bb-canvas bb-account-canvas">
      {/* Floating social rail on left */}
      <aside className="bb-social-rail" aria-label="Social media">
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
          <img src="/assets/ui/facebook.svg" alt="" />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <img src="/assets/ui/instagram.png" alt="" />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
          <img src="/assets/ui/tiktok.svg" alt="" />
        </a>
      </aside>

      <div className="bb-account-page-content">
        <SettingsNavTabs active="account" />

        {/* Guest Banner Row matching Figma 395:3299 */}
        {loading ? (
          <div className="bb-profile-card">Loading account...</div>
        ) : !authenticated ? (
          <div className="bb-settings-guest-row">
            <div className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_browsing.png"
                alt="You're browsing as a guest"
                className="bb-guest-img-cover"
              />
            </div>
            <Link href="/account" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_account.png"
                alt="Account Info"
                className="bb-guest-img-cover"
              />
            </Link>
            <Link href="/billing" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_billing.png"
                alt="Billing"
                className="bb-guest-img-cover"
              />
            </Link>
            <div className="bb-guest-auth-actions">
              <Link href="/login" className="bb-guest-signin-btn">
                Sign in
              </Link>
              <Link href="/signup" className="bb-guest-signup-btn">
                Create account
              </Link>
              <Link href="/billing" className="bb-guest-viewplans-link">
                View plans →
              </Link>
            </div>
          </div>
        ) : !profile || !draft ? (
          <div className="bb-profile-card"><p role="alert">{error || "Unable to load account."}</p></div>
        ) : !editing ? (
          <div className="bb-account-view-stage">
            {/* White Profile Card */}
            <div className="bb-profile-card">
              {/* Header: Title + Edit button */}
              <div className="bb-profile-card-header">
                <div className="bb-profile-head-left">
                  <UserIcon size={18} className="text-[#ff7300]" />
                  <h2>Account Information</h2>
                </div>
                <Link href="/account/edit" className="bb-profile-edit-btn">
                  Edit
                </Link>
              </div>

              {/* User Bio Top Row */}
              <div className="bb-profile-identity-row">
                <img
                  src={avatarPreview || (removeAvatar ? null : profile.avatarUrl) || "/assets/home/figma-buzzy.png"}
                  alt="Avatar"
                  className="bb-profile-avatar-circle"
                />
                <div className="bb-profile-user-fields">
                  <div className="bb-field-pair">
                    <span className="label">Full Name</span>
                    <strong className="val">{user.name}</strong>
                  </div>
                  <div className="bb-field-pair">
                    <span className="label">Email</span>
                    <strong className="val text-[#ff7300]">{user.email}</strong>
                  </div>
                  <div className="bb-field-pair">
                    <span className="label">Username</span>
                    <strong className="val">{user.username}</strong>
                  </div>
                </div>
                <span className="bb-members-pill-badge">{profile.user.tier}</span>
              </div>

              {/* Tags Grid */}
              <div className="bb-profile-tags-grid">
                <div>
                  <span className="bb-tag-group-title">BASIC INFO</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip">📅 {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Not set"}</span>
                    <span className="bb-info-chip">{profile.gender || "Not set"}</span>
                    <span className="bb-info-chip">{profile.occupation || "Not set"}</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">HOBBIES</span>
                  <div className="bb-tags-wrap">
                    {(profile.habits.length ? profile.habits : ["Not set"]).map(tag => <span key={tag} className="bb-info-chip green">{tag}</span>)}
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">INTERESTS</span>
                  <div className="bb-tags-wrap">
                    {(profile.interests.length ? profile.interests : ["Not set"]).map(tag => <span key={tag} className="bb-info-chip orange">{tag}</span>)}
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">SKILLS</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip purple">Not set</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">PERSONALITY & LIFESTYLE</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip blue">Not set</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">DAILY HABITS</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip yellow">{profile.habits.join(", ") || "Not set"}</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">FAVORITE COLORS</span>
                  <div className="bb-color-dots-row">
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                  </div>
                </div>
              </div>

              {/* Bio & Socials */}
              <div className="bb-profile-bio-block">
                <p>{profile.bio || "Not set"}</p>
                <div className="bb-profile-social-links"><span>Social links: Not set</span></div>
              </div>

              {/* Gallery */}
              <div className="bb-profile-gallery-block">
                <span className="bb-gallery-title">Gallery</span>
                <div className="bb-gallery-cards-row">
                  <div className="bb-gallery-img bb-gallery-empty" aria-label="No gallery photo">No photo</div>
                  <div className="bb-gallery-img bb-gallery-empty" aria-label="No gallery photo">No photo</div>
                  <div className="bb-gallery-img bb-gallery-empty" aria-label="No gallery photo">No photo</div>
                </div>
              </div>

              {/* Billing / Plan Card inside Profile */}
              <div className="bb-profile-billing-card">
                <div className="bb-pbc-head">
                  <CreditCard size={18} className="text-[#ff7300]" />
                  <span>Billing / Plan</span>
                </div>
                <div className="bb-pbc-body">
                  <div className="bb-pbc-info">
                    <strong>BeeBuddy {profile.user.tier === "PRO" ? "Buddy+" : profile.user.tier === "VIP" ? "Explorer" : "Free"} <span className="bb-plan-chip">{profile.user.tier === "FREE" ? "Free Plan" : "Paid Plan"}</span></strong>
                    <p>{profile.user.tier === "FREE" ? "Your free plan is active." : "Your purchased plan benefits are active."}</p>
                  </div>
                  <div className="bb-pbc-renewal">
                    <small>Valid Until</small>
                    <strong>{profile.user?.tierExpiresAt ? new Date(profile.user.tierExpiresAt).toLocaleDateString("en-GB") : "No renewal scheduled"}</strong>
                    <small>No automatic renewal</small>
                  </div>
                  <Link href="/billing" className="bb-pbc-manage-btn">Manage Plan</Link>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bb-profile-bottom-actions">
                <Link href="/" className="bb-profile-logout-btn">
                  <span>↳ Log out</span>
                </Link>
                <button
                  type="button"
                  className="bb-profile-invite-btn"
                  onClick={() => void navigator.clipboard?.writeText(window.location.origin)}
                >
                  Invite friends
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* EDIT MODE (Figma Frame 407:8037) */
          <form onSubmit={handleSave} className="bb-account-edit-stage">
            {/* Top Summary Card */}
            <div className="bb-profile-card bb-edit-top-card">
              <div className="bb-profile-card-header">
                <div className="bb-profile-head-left">
                  <UserIcon size={18} className="text-[#ff7300]" />
                  <h2>Account Information</h2>
                </div>
              </div>
              <div className="bb-profile-identity-row">
                <label className="bb-profile-avatar-upload" title="Change profile photo">
                  <img src={avatarPreview || (removeAvatar ? null : profile.avatarUrl) || "/assets/home/figma-buzzy.png"} alt="Change profile photo" className="bb-profile-avatar-circle" />
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={event => { setAvatarFile(event.target.files?.[0] || null); setRemoveAvatar(false); }} />
                </label>
                <div className="bb-profile-user-fields">
                  <div className="bb-field-pair"><span className="label">Full Name</span><input className="val" aria-label="Full Name" value={draft.fullName} onChange={event => updateDraft("fullName", event.target.value)} maxLength={100} /></div>
                  <div className="bb-field-pair"><span className="label">Email</span><strong className="val text-[#ff7300]">{user.email}</strong></div>
                  <div className="bb-field-pair"><span className="label">Username</span><strong className="val">{user.username}</strong></div>
                </div>
              </div>
            </div>

            {/* Profile Fields Card */}
            <div className="bb-edit-fields-card">
              <div className="bb-edit-card-header">
                <span className="bb-dot-icon">ⓘ</span>
                <div>
                  <h3>Profile Fields</h3>
                  <small>Keep your personal details up to date.</small>
                </div>
              </div>

              <div className="bb-edit-field-rows">
                <div className="bb-edit-row">
                  <div><strong>Personal Details</strong><p>Update your profile information</p></div>
                  <div className="bb-edit-toggle-active" />
                </div>
                <div className="bb-edit-row">
                  <div><strong>Date of Birth</strong><p>Your birthdate (MM/DD/YYYY)</p></div>
                  <input type="date" className="bb-edit-val-underlined" aria-label="Date of Birth" value={draft.dateOfBirth} onChange={event => updateDraft("dateOfBirth", event.target.value)} />
                </div>
                <div className="bb-edit-row">
                  <div><strong>Gender</strong><p>Select your gender identity</p></div>
                  <input type="text" className="bb-edit-val-underlined" aria-label="Gender" value={draft.gender} onChange={event => updateDraft("gender", event.target.value)} />
                </div>
                <div className="bb-edit-row">
                  <div><strong>Occupation</strong><p>Your current role or profession</p></div>
                  <input type="text" className="bb-edit-val-underlined" aria-label="Occupation" value={draft.occupation} onChange={event => updateDraft("occupation", event.target.value)} />
                </div>
                <div className="bb-edit-row">
                  <div><strong>Interests</strong><p>Topics you enjoy talking about</p></div>
                  <input type="text" className="bb-edit-val-underlined" aria-label="Interests" value={draft.interests} onChange={event => updateDraft("interests", event.target.value)} />
                </div>
                <div className="bb-edit-row">
                  <div><strong>Favorite Colors</strong><p>Colors that match your vibe</p></div>
                  <div className="bb-color-dots-row">
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                    <span className="bb-color-dot" style={{ background: "#e5e7eb" }} />
                  </div>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Habits</strong><p>Daily routines and rituals</p></div>
                  <input className="bb-edit-val-underlined" value={draft.habits} onChange={(event) => updateDraft("habits", event.target.value)} aria-label="Habits" />
                </div>
              </div>
            </div>

            {/* Profile Details Card */}
            <div className="bb-edit-fields-card">
              <div className="bb-edit-card-header">
                <SlidersHorizontal size={18} className="text-[#ff7300]" />
                <div>
                  <h3>Profile Details</h3>
                </div>
              </div>

              <div className="bb-edit-detail-list">
                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>About Me</strong>
                    <small>A brief intro about yourself</small>
                  </div>
                  <textarea className="bb-detail-item-val" aria-label="Bio" value={draft.bio} onChange={event => updateDraft("bio", event.target.value)} maxLength={500} />
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Self-Description / Bio</strong>
                    <small>A short bio that appears on your profile</small>
                  </div>
                  <textarea className="bb-detail-item-val" aria-label="Bio" value={draft.bio} onChange={event => updateDraft("bio", event.target.value)} maxLength={500} />
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Personality Type</strong>
                    <small>Your personality style (e.g., INTP, ENFJ)</small>
                  </div>
                  <span className="bb-detail-item-val">Not set</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Lifestyle</strong>
                    <small>Your daily habits and living style</small>
                  </div>
                  <span className="bb-detail-item-val">Not set</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Hobbies</strong>
                    <small>Activities you enjoy in your free time</small>
                  </div>
                  <span className="bb-detail-item-val">{profile.habits.join(", ") || "Not set"}</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Skills</strong>
                    <small>Abilities you&apos;re proficient in</small>
                  </div>
                  <span className="bb-detail-item-val">Not set</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Social Links</strong>
                    <small>Connect your profiles (e.g., Twitter, Instagram)</small>
                  </div>
                  <span className="bb-detail-item-val">Not set</span>
                </div>

                {/* Gallery with dashed plus card */}
                <div className="bb-edit-gallery-section">
                  <span className="label">Gallery</span>
                  <div className="bb-gallery-cards-row">



                    <div className="bb-gallery-add-card">
                      <span>+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="bb-edit-actions-row">
                <Link href="/account" className="bb-edit-cancel-btn">✕ Cancel</Link>
                <button type="submit" className="bb-edit-save-btn" disabled={saving}>{saving ? "Saving..." : "✓ Save Changes"}</button>
              </div>
            </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}

/* ==========================================================================
   6. BILLING & PLANS (Figma Frames 381:289, 407:9189, 407:8501, 566:7784)
   ========================================================================== */
function Billing({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [subView, setSubView] = useState<"overview" | "compare" | "manage" | "checkout">("overview");
  const [selectedPlan, setSelectedPlan] = useState("Explorer");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "apple">("card");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const tierFor = (name: string) => name === "Free" ? "FREE" : name === "Explorer" ? "VIP" : name === "Buddy+" ? "PRO" : null;
  const findPlan = (name: string) => plans.find(plan => plan.tier === tierFor(name));
  const formatPrice = (name: string) => {
    const plan = findPlan(name);
    return plan ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(plan.priceVND) : name === "Hive Pro" ? "Coming soon" : "Loading...";
  };
  const currentName = profile?.user.tier === "PRO" ? "Buddy+" : profile?.user.tier === "VIP" ? "Explorer" : "Free";
  const renewal = profile?.user.tierExpiresAt ? new Date(profile.user.tierExpiresAt).toLocaleDateString() : "No renewal";
  useEffect(() => {
    let active = true;
    getSubscriptionPlans().then(data => { if (active) setPlans(data); }).catch(cause => { if (active) setError(cause.message); });
    if (isLoggedIn) accountApi.profile().then(data => { if (active) setProfile(data); }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [isLoggedIn]);
  useEffect(() => {
    if (!isLoggedIn) return;
    const orderCode = Number(new URLSearchParams(window.location.search).get("orderCode"));
    if (!Number.isSafeInteger(orderCode) || orderCode <= 0) return;
    let active = true;
    let timer: number | undefined;
    const sync = async () => {
      try {
        const payment = await getPaymentStatus(orderCode);
        if (!active) return;
        setPaymentNotice(payment.status === "COMPLETED" ? "Payment completed. Your plan is active." : `Payment: ${payment.status}`);
        if (payment.status === "COMPLETED") { const nextProfile = await accountApi.profile(); if (active) setProfile(nextProfile); }
        else if (payment.status === "PENDING") timer = window.setTimeout(() => void sync(), 5000);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Unable to check payment."); }
    };
    void sync();
    return () => { active = false; if (timer) window.clearTimeout(timer); };
  }, [isLoggedIn]);
  const subscribe = async () => {
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    const tier = tierFor(selectedPlan);
    if (tier === "FREE") { window.location.href = "/home"; return; }
    if (!tier) { setError("This plan is not available yet."); return; }
    setWorking(true); setError("");
    try {
      const checkout = await createCheckout(tier);
      window.location.assign(checkout.checkoutUrl);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create checkout."); setWorking(false); }
  };

  return (
    <main className="bb-canvas bb-billing-canvas">
      {/* Floating social rail on left */}
      <aside className="bb-social-rail" aria-label="Social media">
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
          <img src="/assets/ui/facebook.svg" alt="" />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <img src="/assets/ui/instagram.png" alt="" />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
          <img src="/assets/ui/tiktok.svg" alt="" />
        </a>
      </aside>

      <div className="bb-billing-page-content">
        <SettingsNavTabs active="billing" />
        {error && <p className="form-error" role="alert">{error}</p>}
        {paymentNotice && <p className="form-notice" role="status">{paymentNotice}</p>}

        {/* 1. VIEW PLANS OVERVIEW (Figma Frame 381:289 & 407:10861) */}
        {subView === "overview" && (
          <div className="bb-billing-overview-stage">
            {/* Guest Banner Row matching Figma 381:289 (only shown for guests) */}
            {!isLoggedIn && (
              <div className="bb-settings-guest-row">
                <div className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_browsing.png"
                    alt="You're browsing as a guest"
                    className="bb-guest-img-cover"
                  />
                </div>
                <Link href="/account" className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_account.png"
                    alt="Account Info"
                    className="bb-guest-img-cover"
                  />
                </Link>
                <Link href="/billing" className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_billing.png"
                    alt="Billing"
                    className="bb-guest-img-cover"
                  />
                </Link>
                <div className="bb-guest-auth-actions">
                  <Link href="/login" className="bb-guest-signin-btn">
                    Sign in
                  </Link>
                  <Link href="/signup" className="bb-guest-signup-btn">
                    Create account
                  </Link>
                  <Link href="/billing" className="bb-guest-viewplans-link">
                    View plans →
                  </Link>
                </div>
              </div>
            )}

            <div className="bb-billing-head-row">
              <div>
                <h1 className="bb-billing-main-title">View Plans</h1>
                <p className="bb-billing-subhead">
                  Choose the plan that fits your journey. Upgrade to unlock more ways to connect, share, and explore with BeeBuddy.
                </p>
                <div className="bb-billing-security-note">
                  <Shield size={14} className="text-gray-400" />
                  <span>All prices are shown in VND. Pay securely with PayOS.</span>
                </div>
              </div>
              <div className="bb-billing-head-actions">
                <Link href="/help" className="bb-billing-help-btn">❓ Help</Link>
                <button
                  type="button"
                  className="bb-billing-compare-btn"
                  onClick={() => setSubView("compare")}
                >
                  📊 Compare plans
                </button>
              </div>
            </div>

            {/* Logged-In Account Info & Active Plan Card matching Figma Frame 407:10861 */}
            {isLoggedIn && (
              <div className="bb-billing-logged-in-summary-card">
                <div className="bb-bil-acc-head">
                  <UserIcon size={16} className="text-[#ff7300]" />
                  <h3>Account Information</h3>
                </div>
                <div className="bb-bil-acc-details">
                  <div className="bb-bil-avatar-col">
                    <img src={profile?.avatarUrl || "/assets/home/figma-buzzy.png"} alt="Avatar" className="bb-bil-avatar-img" />
                  </div>
                  <div className="bb-bil-info-grid">
                    <div className="bb-bil-info-row">
                      <span className="lbl">Full Name</span>
                      <span className="val">{profile?.fullName || "Not set"}</span>
                    </div>
                    <div className="bb-bil-info-row">
                      <span className="lbl">Email</span>
                      <span className="val text-[#ff7300] font-semibold">{profile?.user?.email || "Not signed in"}</span>
                    </div>
                    <div className="bb-bil-info-row">
                      <span className="lbl">Username</span>
                      <span className="val">{profile?.username || "Not set"}</span>
                    </div>
                  </div>
                </div>

                <div className="bb-bil-plan-head">
                  <CreditCard size={16} className="text-[#ff7300]" />
                  <h3>Billing / Plan</h3>
                </div>
                <div className="bb-bil-plan-summary-row">
                  <div className="bb-bil-plan-left">
                    <strong>BeeBuddy {currentName}</strong>
                    <span className="bb-bil-plan-pro-pill">{currentName === "Free" ? "Free Plan" : "Paid Plan"}</span>
                    <p>{currentName === "Free" ? "Your free plan is active." : "Your purchased benefits are available until the expiry date."}</p>
                  </div>
                  <div className="bb-bil-plan-right">
                    <div className="bb-bil-renewal-info">
                      <small>Valid Until</small>
                      <strong>{renewal}</strong>
                      <small>One-time payment; no automatic renewal.</small>
                    </div>
                    <button
                      type="button"
                      className="bb-bil-manage-btn"
                      onClick={() => setSubView("manage")}
                    >
                      Manage Plan
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bb-billing-grid-and-photo">
              {/* Left 4 Cards */}
              <div className="bb-plans-2x2-grid">
                {/* Free */}
                <div className="bb-figma-plan-card">
                  <div className="bb-plan-card-top">
                    <span className="bb-plan-icon">⭐</span>
                    <div>
                      <h3>Free</h3>
                      <small>Start your journey</small>
                    </div>
                  </div>
                  <div className="bb-plan-price-row">
                    <strong>{formatPrice("Free")}</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Perfect for new users who want to explore the BeeBuddy community and start connecting.
                  </p>
                  <ul className="bb-plan-checklist">{findPlan("Free")?.features.map(feature => <li key={feature.code}><span className="dot" />{feature.name}{feature.limitValue != null ? `: ${feature.limitValue}` : ""}</li>) || <li><span className="dot" />Loading plan benefits...</li>}</ul>
                  <button
                    type="button"
                    className="bb-plan-action-outline"
                    onClick={() => { window.location.href = isLoggedIn ? "/home" : "/signup"; }}
                  >
                    Continue with free →
                  </button>
                </div>

                {/* Explorer (Most Popular) */}
                <div className="bb-figma-plan-card is-popular">
                  <div className="bb-plan-card-top">
                    <span className="bb-plan-icon">🧭</span>
                    <div>
                      <h3>Explorer</h3>
                      <small>Go further together</small>
                    </div>
                    <span className="bb-popular-chip">⭐ Most Popular</span>
                  </div>
                  <div className="bb-plan-price-row">
                    <strong>{formatPrice(currentName)}</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Best for active users who want better discovery tools and more ways to connect.
                  </p>
                  <ul className="bb-plan-checklist">{findPlan("Explorer")?.features.map(feature => <li key={feature.code}><span className="dot" />{feature.name}</li>) || <li><span className="dot" />Loading plan benefits...</li>}</ul>
                  <button
                    type="button"
                    className="bb-plan-action-filled orange"
                    onClick={() => { setSelectedPlan("Explorer"); setSubView("checkout"); }}
                  >
                    Upgrade to Explorer →
                  </button>
                </div>

                {/* Buddy+ */}
                <div className="bb-figma-plan-card">
                  <div className="bb-plan-card-top">
                    <span className="bb-plan-icon">♥</span>
                    <div>
                      <h3>Buddy+</h3>
                      <small>Build your circle</small>
                    </div>
                  </div>
                  <div className="bb-plan-price-row">
                    <strong>{formatPrice("Buddy+")}</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Designed for highly engaged users who want richer social experiences and stronger community tools.
                  </p>
                  <ul className="bb-plan-checklist">{findPlan("Buddy+")?.features.map(feature => <li key={feature.code}><span className="dot" />{feature.name}</li>) || <li><span className="dot" />Loading plan benefits...</li>}</ul>
                  <button
                    type="button"
                    className="bb-plan-action-filled purple"
                    onClick={() => { setSelectedPlan("Buddy+"); setSubView("checkout"); }}
                  >
                    Upgrade to Buddy+ →
                  </button>
                </div>

                {/* Hive Pro */}
                <div className="bb-figma-plan-card">
                  <div className="bb-plan-card-top">
                    <span className="bb-plan-icon">🛡️</span>
                    <div>
                      <h3>Hive Pro</h3>
                      <small>Lead your community</small>
                    </div>
                  </div>
                  <div className="bb-plan-price-row">
                    <strong>{formatPrice("Hive Pro")}</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Made for community leaders, organizers, and super users who want the full BeeBuddy experience.
                  </p>
                  <ul className="bb-plan-checklist">{findPlan("Hive Pro")?.features.map(feature => <li key={feature.code}><span className="dot" />{feature.name}</li>) || <li><span className="dot" />Coming soon</li>}</ul>
                  <button
                    type="button"
                    className="bb-plan-action-filled amber"
                    disabled title="This plan is not available yet"
                  >
                    Upgrade to Hive Pro →
                  </button>
                </div>
              </div>

              {/* Right Vertical Photo Card matching exact Figma node 370:2500 */}
              <div className="bb-billing-photo-card">
                <img
                  src="/assets/buzzy/billing_friends_photo.png"
                  alt="More friends More journeys. Connect, explore, and build meaningful memories together."
                  className="bb-billing-friends-img"
                />
              </div>
            </div>

            {/* Quick link to manage active plan */}
            <div className="bb-billing-bottom-note">
              <span>Already subscribed? </span>
              <button type="button" className="text-[#ff7300] font-medium underline" onClick={() => setSubView("manage")}>
                Manage your active plan
              </button>
            </div>
          </div>
        )}

        {/* 2. PLAN FEATURES COMPARISON (Figma Frame 407:9189 & 395:3613) */}
        {subView === "compare" && (
          <div className="bb-billing-compare-stage">
            <div className="bb-compare-head-row">
              <button
                type="button"
                className="bb-compare-back-btn"
                onClick={() => setSubView("overview")}
              >
                ← Back to Plans
              </button>
              <h2>Plan Features Comparison</h2>
              <span className="bb-recommended-indicator">● Recommended</span>
            </div>

            <div className="bb-compare-table-wrap">
              <table className="bb-figma-matrix-table">
                <thead>
                  <tr>
                    <th>Included in each BeeBuddy plan</th>
                    <th>Free</th>
                    <th className="highlight-col">Explorer</th>
                    <th>Buddy+</th>
                    <th>Hive</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="category-header"><td colSpan={5}>PLAN BENEFITS</td></tr>
                  {Array.from(new Map(plans.flatMap(plan => plan.features.map(feature => [feature.code, feature] as const))).values()).map(feature => (
                    <tr key={feature.code}>
                      <td>{feature.name}</td>
                      {["Free", "Explorer", "Buddy+", "Hive Pro"].map(name => (
                        <td key={name} className={name === "Explorer" ? "highlight-col" : undefined}>
                          {name === "Hive Pro" ? "Coming soon" : findPlan(name)?.features.find(item => item.code === feature.code)?.limitValue ?? (findPlan(name)?.features.some(item => item.code === feature.code) ? "✓" : "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="bb-compare-footer-note">All prices are shown in VND.</p>
          </div>
        )}

        {/* 3. MANAGE PLAN (Figma Frame 407:8501) */}
        {subView === "manage" && (
          <div className="bb-billing-manage-stage">
            <div className="bb-manage-title-block">
              <div>
                <h1>Manage Plan</h1>
                <p>Manage your current plan and billing details. Upgrade, downgrade, or cancel your subscription anytime.</p>
              </div>
              <Link href="/help" className="bb-billing-help-btn">❓ Help</Link>
            </div>

            {/* Full-width Account Info & Billing / Plan card matching Figma Frame 407:8501 */}
            <div className="bb-billing-logged-in-summary-card">
              <div className="bb-bil-acc-head">
                <UserIcon size={16} className="text-[#ff7300]" />
                <h3>Account Information</h3>
              </div>
              <div className="bb-bil-acc-details">
                <div className="bb-bil-avatar-col">
                  <img src={profile?.avatarUrl || "/assets/home/figma-buzzy.png"} alt="Avatar" className="bb-bil-avatar-img" />
                </div>
                <div className="bb-bil-info-grid">
                  <div className="bb-bil-info-row">
                    <span className="lbl">Full Name</span>
                    <span className="val">{profile?.fullName || "Not set"}</span>
                  </div>
                  <div className="bb-bil-info-row">
                    <span className="lbl">Email</span>
                    <span className="val text-[#ff7300] font-semibold">{profile?.user?.email || "Not signed in"}</span>
                  </div>
                  <div className="bb-bil-info-row">
                    <span className="lbl">Username</span>
                    <span className="val">{profile?.username || "Not set"}</span>
                  </div>
                </div>
              </div>

              <div className="bb-bil-plan-head">
                <CreditCard size={16} className="text-[#ff7300]" />
                <h3>Billing / Plan</h3>
              </div>
              <div className="bb-bil-plan-summary-row">
                <div className="bb-bil-plan-left">
                  <strong>BeeBuddy {currentName} <span className="bb-bil-plan-pro-pill">{currentName === "Free" ? "Free Plan" : "Paid Plan"}</span></strong>
                  <p>{currentName === "Free" ? "Your free plan is active." : "Your purchased benefits are available until the expiry date."}</p>
                </div>
                <div className="bb-bil-plan-right">
                  <div className="bb-bil-renewal-info">
                    <small>Valid Until</small>
                    <strong>{renewal}</strong>
                    <small>One-time payment; no automatic renewal.</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="bb-manage-content-grid">
              <div className="bb-manage-cards-column">
                {/* Active plan card */}
                <div className="bb-active-subscription-card">
                  <div className="bb-sub-head">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧭</span>
                      <div>
                        <h3>{currentName}</h3>
                        <small>Current active plan</small>
                      </div>
                    </div>
                    <span className="bb-active-pill">ACTIVE</span>
                  </div>
                  <div className="bb-sub-price-row">
                    <strong>{formatPrice(currentName)}</strong>
                    <span>/ month</span>
                    <small className="ml-auto">Valid Until: <strong>{renewal}</strong></small>
                  </div>
                  <p className="bb-sub-info">
                    You&apos;re currently on the {currentName} plan. {findPlan(currentName)?.features.map(feature => feature.name).join(", ")}.
                  </p>
                  <div className="bb-sub-actions-row">
                    <button type="button" className="bb-btn-change-plan" onClick={() => setSubView("overview")}>
                      Change Plan
                    </button>
                    <button type="button" className="bb-btn-cancel-plan" disabled title="Plans expire automatically at the end of the paid period.">
                      Cancel Plan
                    </button>
                  </div>
                </div>

                {/* Other available plans */}
                <div className="bb-manage-other-plans-block">
                  <h3>Other available plans</h3>
                  <div className="bb-other-plans-row">
                    <div className="bb-other-plan-box">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">♥</span>
                          <strong>Buddy+</strong>
                        </div>
                        <small className="text-purple-600 font-semibold">Upgrade</small>
                      </div>
                      <div className="bb-other-price">
                        <strong>{formatPrice("Buddy+")}</strong>
                        <span>/ month</span>
                      </div>
                      <p>Unlock featured profile badges, unlimited private groups, and advanced event planning.</p>
                      <button type="button" className="bb-btn-upgrade-purple" onClick={() => { setSelectedPlan("Buddy+"); setSubView("checkout"); }}>
                        Upgrade to Buddy+
                      </button>
                    </div>
                    <div className="bb-other-plan-box">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600">♥</span>
                          <strong>Hive Pro+</strong>
                        </div>
                        <small className="text-amber-600 font-semibold">Upgrade</small>
                      </div>
                      <div className="bb-other-price">
                        <strong>{formatPrice("Hive Pro")}</strong>
                        <span>/ month</span>
                      </div>
                      <p>Unlock featured profile badges, unlimited private groups, and advanced event planning.</p>
                      <button type="button" className="bb-btn-upgrade-orange" disabled title="This plan is not available yet">
                        Upgrade to Hive Pro+
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Vertical Photo Card */}
              <div className="bb-billing-photo-card">
                <img
                  src="/assets/buzzy/billing_friends_photo.png"
                  alt="More friends More journeys. Connect, explore, and build meaningful memories together."
                  className="bb-billing-friends-img"
                />
              </div>
            </div>

            <div className="bb-manage-footer-note">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={14} />
                <span>All prices are shown in VND. Pay securely with PayOS.</span>
              </div>
              <button
                type="button"
                className="bb-billing-compare-btn"
                onClick={() => setSubView("compare")}
              >
                📊 Change plan
              </button>
            </div>
          </div>
        )}

        {/* 4. CHECKOUT / PAYMENT FORM (Figma Frame 566:7784 & 566:8656) */}
        {subView === "checkout" && (
          <div className="bb-billing-checkout-stage">
            <button
              type="button"
              className="bb-compare-back-btn"
              onClick={() => setSubView("overview")}
            >
              ← Back to Plans
            </button>

            <div className="bb-checkout-grid">
              {/* Left Column: Payment Methods + Billing Address */}
              <div className="bb-checkout-form-col">
                <h2 className="bb-checkout-section-title">Payment Method</h2>

                {/* Payment method selector */}
                <div className="bb-payment-methods-box">
                  <label className={`bb-payment-method-row ${paymentMethod === "card" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                    />
                    <CreditCard size={18} />
                    <strong>PayOS / VietQR</strong>
                  </label>

                  <label className={`bb-payment-method-row ${paymentMethod === "paypal" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === "paypal"}
                      disabled title="Not supported"
                    />
                    <span>PayPal</span>
                  </label>

                  <label className={`bb-payment-method-row ${paymentMethod === "apple" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === "apple"}
                      disabled title="Not supported"
                    />
                    <span>Apple Pay</span>
                  </label>
                </div>

                {paymentMethod === "card" && (
                  <div className="bb-card-fields-grid">
                    <div className="bb-form-group">
                      <label>Card Number</label>
                      <input type="text" disabled placeholder="Handled securely by PayOS" />
                    </div>
                    <div className="bb-form-row-2">
                      <div className="bb-form-group">
                        <label>Expiry Date</label>
                        <input type="text" disabled placeholder="Handled securely by PayOS" />
                      </div>
                      <div className="bb-form-group">
                        <label>CVV</label>
                        <input type="text" disabled placeholder="Handled securely by PayOS" />
                      </div>
                    </div>
                    <div className="bb-form-group">
                      <label>Cardholder Name</label>
                      <input type="text" disabled placeholder="Handled securely by PayOS" />
                    </div>
                  </div>
                )}

                <h2 className="bb-checkout-section-title mt-8">Billing Address</h2>
                <div className="bb-billing-address-box">
                  <div className="bb-form-group">
                    <label>Country</label>
                    <select disabled defaultValue="United States">
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                  <div className="bb-form-group">
                    <label>Full Name</label>
                    <input type="text" disabled placeholder="Handled securely by PayOS" />
                  </div>
                  <div className="bb-form-group">
                    <label>Address Line 1</label>
                    <input type="text" disabled placeholder="Handled securely by PayOS" />
                  </div>
                  <div className="bb-form-group">
                    <label>Address Line 2 (Optional)</label>
                    <input type="text" placeholder="Apt, suite, etc." />
                  </div>
                  <div className="bb-form-row-3">
                    <div className="bb-form-group">
                      <label>City</label>
                      <input type="text" disabled placeholder="Handled securely by PayOS" />
                    </div>
                    <div className="bb-form-group">
                      <label>State/Province</label>
                      <input type="text" disabled placeholder="Handled securely by PayOS" />
                    </div>
                    <div className="bb-form-group">
                      <label>ZIP/Postal Code</label>
                      <input type="text" disabled placeholder="Handled securely by PayOS" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="bb-btn-checkout-submit"
                    onClick={() => void subscribe()} disabled={working || !findPlan(selectedPlan)}
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="bb-order-summary-col">
                <div className="bb-order-summary-card">
                  <h3>Order Summary</h3>
                  <div className="bb-order-line">
                    <span>{selectedPlan} Plan (Monthly)</span>
                    <strong>{formatPrice(selectedPlan)}</strong>
                  </div>
                  <div className="bb-order-line">
                    <span>Taxes</span>
                    <strong>0 ₫</strong>
                  </div>
                  <div className="bb-order-divider" />
                  <div className="bb-order-total-line">
                    <span>Total</span>
                    <strong>{formatPrice(selectedPlan)}</strong>
                  </div>

                  <button
                    type="button"
                    className="bb-btn-subscribe-now"
                    disabled={working || !findPlan(selectedPlan)} onClick={() => void subscribe()}
                  >
                    {working ? "Please wait..." : "Subscribe Now"}
                  </button>

                  <div className="bb-secure-payment-label">
                    <Lock size={14} />
                    <span>Secure payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ==========================================================================
   7. SECURITY (Figma Frames 386:720, 395:5785, 436:537, 436:688)
   ========================================================================== */
type SecurityTab = "overview" | "activity" | "details";

function Security({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [securityView, setSecurityView] = useState<SecurityTab>("overview");
  const [logoutNotice, setLogoutNotice] = useState(false);
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AccountSession | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    accountApi.sessions().then(data => {
      if (active) { setSessions(data); setSelectedSession(data.find(item => item.isCurrent) || data[0] || null); }
    }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [isLoggedIn]);
  const currentSession = sessions.find(item => item.isCurrent);
  const detailsSession = selectedSession || currentSession;
  const deviceName = (session?: AccountSession | null) => session?.deviceName || session?.platform || "Web browser";
  const handleLogoutAll = async () => {
    setWorking(true); setError("");
    try {
      await accountApi.revokeOtherSessions();
      setSessions(await accountApi.sessions());
      setLogoutNotice(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to log out other sessions."); }
    finally { setWorking(false); }
  };

  return (
    <main className="bb-canvas bb-security-canvas">
      {/* Floating social rail on left */}
      <aside className="bb-social-rail" aria-label="Social media">
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
          <img src="/assets/ui/facebook.svg" alt="" />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <img src="/assets/ui/instagram.png" alt="" />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
          <img src="/assets/ui/tiktok.svg" alt="" />
        </a>
      </aside>

      <div className="bb-security-page-content">
        <SettingsNavTabs active="security" />
        {error && <p className="form-error" role="alert">{error}</p>}

        {/* 1. SECURITY OVERVIEW (Guest: Frame 386:720 / Logged-in: Frame 395:5785) */}
        {securityView === "overview" && (
          <div>
            {/* Guest Banner Row matching Figma 386:720 (shown only for guest) */}
            {!isLoggedIn && (
              <div className="bb-settings-guest-row">
                <div className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_browsing.png"
                    alt="You're browsing as a guest"
                    className="bb-guest-img-cover"
                  />
                </div>
                <Link href="/account" className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_account.png"
                    alt="Account Info"
                    className="bb-guest-img-cover"
                  />
                </Link>
                <Link href="/billing" className="bb-guest-card-wrap">
                  <img
                    src="/assets/buzzy/guest_card_billing.png"
                    alt="Billing"
                    className="bb-guest-img-cover"
                  />
                </Link>
                <div className="bb-guest-auth-actions">
                  <Link href="/login" className="bb-guest-signin-btn">
                    Sign in
                  </Link>
                  <Link href="/signup" className="bb-guest-signup-btn">
                    Create account
                  </Link>
                  <Link href="/billing" className="bb-guest-viewplans-link">
                    View plans →
                  </Link>
                </div>
              </div>
            )}

            {/* Logged-in Security Box matching Figma 395:5785 */}
            {isLoggedIn && (
              <div className="bb-security-box">
                <div className="bb-sec-box-title-row">
                  <SlidersHorizontal size={18} className="text-[#ff7300]" />
                  <h2>Security</h2>
                </div>

                <div className="bb-sec-items-list">
                  <div className="bb-sec-item-row">
                    <div className="bb-sec-item-info">
                      <strong>Login Activity</strong>
                      <p>Review recent sign-ins and active sessions</p>
                    </div>
                    <button
                      type="button"
                      className="bb-sec-btn-outline"
                      onClick={() => setSecurityView("activity")}
                    >
                      View
                    </button>
                  </div>

                  <div className="bb-sec-item-row">
                    <div className="bb-sec-item-info">
                      <strong>Password</strong>
                      <p>Change your account password regularly</p>
                    </div>
                    <Link href="/change-password" className="bb-sec-btn-outline">
                      Change
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. LOGIN ACTIVITY SESSIONS (Figma Frame 436:537) */}
        {securityView === "activity" && (
          <div className="bb-security-activity-box">
            <div className="bb-sec-activity-header">
              <div className="bb-sec-activity-header-left">
                <button
                  type="button"
                  className="bb-back-arrow-btn"
                  onClick={() => setSecurityView("overview")}
                  aria-label="Back to Security"
                >
                  ←
                </button>
                <div>
                  <h2>Login Activity</h2>
                  <p>Monitor where and when you are logged into your Beebuddy account</p>
                </div>
              </div>
              <button
                type="button"
                className="bb-btn-logout-all"
                onClick={() => void handleLogoutAll()} disabled={working}
              >
                <span>↳</span> Log Out All Sessions
              </button>
            </div>

            {logoutNotice && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
                All active sessions logged out except your current browser session.
              </div>
            )}

            {/* Current Session Card */}
            <div
              className="bb-current-session-card"
              onClick={() => { setSelectedSession(currentSession || null); setSecurityView("details"); }}
              role="button"
              tabIndex={0}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedSession(currentSession || null); setSecurityView("details"); } }}
            >
              <div className="bb-current-session-left">
                <div className="bb-device-icon-box">💻</div>
                <div className="bb-current-session-info">
                  <strong>{deviceName(currentSession)}</strong>
                  <small>IP Address: {currentSession?.ipAddress || "Unknown"}</small>
                </div>
              </div>
              <span className="bb-current-session-pill">CURRENT SESSION</span>
            </div>

            {/* Recent Logins */}
            <div className="bb-recent-logins-block">
              <h3>Recent Logins</h3>

              <div className="bb-login-history-list">
                {sessions.filter(session => !session.isCurrent).map(session => (
                  <div key={session.id} className="bb-login-history-row" role="button" tabIndex={0}
                    onClick={() => { setSelectedSession(session); setSecurityView("details"); }}
                    onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedSession(session); setSecurityView("details"); } }}>
                    <div className="bb-log-info-group">
                      <div className={`bb-log-icon-wrap ${session.isActive ? "active-icon" : ""}`}>{/mobile|ios|android/i.test(session.platform || "") ? "📱" : "💻"}</div>
                      <div className="bb-log-details"><strong>{deviceName(session)}</strong><small>{session.ipAddress || "Unknown IP"}</small></div>
                    </div>
                    <div className="bb-log-meta-group">
                      <span className="bb-log-time">{formatRelativeTime(session.lastUsedAt)}</span>
                      <span className={`bb-log-badge ${session.isActive ? "active" : "expired"}`}>{session.isActive ? "ACTIVE" : session.revokedAt ? "REVOKED" : "EXPIRED"}</span>
                    </div>
                  </div>
                ))}
                {sessions.length <= 1 && <p>No other sessions.</p>}
              </div>
            </div>
          </div>
        )}

        {/* 3. CURRENT SESSION DETAILS (Figma Frame 436:688) */}
        {securityView === "details" && (
          <div className="bb-security-details-box">
            <div className="bb-sec-activity-header">
              <div className="bb-sec-activity-header-left">
                <button
                  type="button"
                  className="bb-back-arrow-btn"
                  onClick={() => setSecurityView("activity")}
                  aria-label="Back to Activity"
                >
                  ←
                </button>
                <div>
                  <h2>Current Session Details</h2>
                  <p>Review active technical information, location telemetry, and browser footprint</p>
                </div>
              </div>
              <button
                type="button"
                className="bb-btn-logout-all"
                onClick={() => void handleLogoutAll()} disabled={working}
              >
                <span>↳</span> Log Out All Sessions
              </button>
            </div>

            {logoutNotice && (
              <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
                All active sessions logged out except your current browser session.
              </div>
            )}

            <div className="bb-telemetry-header-bar">
              <div className="bb-device-icon-box">💻</div>
              <div className="bb-current-session-info">
                <strong>{deviceName(detailsSession)}</strong>
                <small>IP Address: {detailsSession?.ipAddress || "Unknown"}</small>
              </div>
            </div>

            <div className="bb-telemetry-table">
              <div className="bb-telem-row">
                <span className="label">Device</span>
                <strong className="val">{deviceName(detailsSession)}</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">IP Address</span>
                <strong className="val">{detailsSession?.ipAddress || "Unknown"}</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Location</span>
                <strong className="val">Not available</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Login Time</span>
                <strong className="val">{detailsSession ? new Date(detailsSession.createdAt).toLocaleString() : "Not available"}</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Session Duration</span>
                <strong className="val">{detailsSession ? `${Math.max(0, Math.round((new Date(detailsSession.lastUsedAt).getTime() - new Date(detailsSession.createdAt).getTime()) / 60000))} minutes` : "Not available"}</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Operating System</span>
                <strong className="val">{detailsSession?.platform || "Not available"}</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Screen Resolution</span>
                <strong className="val">Not recorded</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Status</span>
                <span className="bb-telem-badge-active">{detailsSession?.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ==========================================================================
   8. HELP & SUPPORT (Guest: Frame 395:4896 / Logged-in: Frame 386:877)
   ========================================================================== */
function HelpSupport({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [openFaqs, setOpenFaqs] = useState<number[]>([0, 1, 2]);

  const toggleFaq = (idx: number) => {
    setOpenFaqs((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  return (
    <main className="bb-canvas bb-help-canvas">
      {/* Floating social rail on left */}
      <aside className="bb-social-rail" aria-label="Social media">
        <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
          <img src="/assets/ui/facebook.svg" alt="" />
        </a>
        <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <img src="/assets/ui/instagram.png" alt="" />
        </a>
        <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
          <img src="/assets/ui/tiktok.svg" alt="" />
        </a>
      </aside>

      <div className="bb-help-page-content">
        <SettingsNavTabs active="help" />

        {/* Guest Banner Row matching Figma 395:4896 (only shown for guests) */}
        {!isLoggedIn && (
          <div className="bb-settings-guest-row">
            <div className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_browsing.png"
                alt="You're browsing as a guest"
                className="bb-guest-img-cover"
              />
            </div>
            <Link href="/account" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_account.png"
                alt="Account Info"
                className="bb-guest-img-cover"
              />
            </Link>
            <Link href="/billing" className="bb-guest-card-wrap">
              <img
                src="/assets/buzzy/guest_card_billing.png"
                alt="Billing"
                className="bb-guest-img-cover"
              />
            </Link>
            <div className="bb-guest-auth-actions">
              <Link href="/login" className="bb-guest-signin-btn">
                Sign in
              </Link>
              <Link href="/signup" className="bb-guest-signup-btn">
                Create account
              </Link>
              <Link href="/billing" className="bb-guest-viewplans-link">
                View plans →
              </Link>
            </div>
          </div>
        )}

        {/* SLA Notice Banner matching Figma 386:877 */}
        <div className="bb-help-sla-banner">
          <span className="bb-sla-icon">ⓘ</span>
          <p>
            We usually respond within <strong>1–2 business days</strong>. Please include a short
            description of your issue and relevant screenshots so we can assist you more quickly.
          </p>
        </div>

        {/* Two Contact Cards */}
        <div className="bb-help-cards-grid">
          {/* General Inquiries */}
          <div className="bb-help-contact-card">
            <div className="bb-hcc-head">
              <span className="bb-hcc-icon">✉️</span>
              <h3>General Inquiries</h3>
            </div>
            <p>For general questions, partnerships, feedback, or anything about BeeBuddy.</p>
            <div className="bb-hcc-email-pill orange">
              hello.beebuddy@gmail.com
            </div>
            <a href="mailto:hello.beebuddy@gmail.com" className="bb-hcc-btn orange">
              Send Email
            </a>
          </div>

          {/* Customer Support */}
          <div className="bb-help-contact-card">
            <div className="bb-hcc-head">
              <span className="bb-hcc-icon">🎧</span>
              <h3>Customer Support</h3>
            </div>
            <p>For account issues, technical problems or features that are not working as expected.</p>
            <div className="bb-hcc-email-pill purple">
              support.beebuddy@gmail.com
            </div>
            <a href="mailto:support.beebuddy@gmail.com" className="bb-hcc-btn purple">
              Get Support
            </a>
          </div>
        </div>

        {/* FAQ Accordions matching Figma 386:877 */}
        <div className="bb-help-faq-list">
          <div className="bb-faq-card">
            <button
              type="button"
              className="bb-faq-toggle-btn"
              onClick={() => toggleFaq(0)}
              aria-expanded={openFaqs.includes(0)}
            >
              <strong>How do I manage my account?</strong>
              <span>{openFaqs.includes(0) ? "−" : "+"}</span>
            </button>
            {openFaqs.includes(0) && (
              <p className="bb-faq-answer">
                Go to Account Info in Settings to update your profile information, profile picture, and linked social accounts.
              </p>
            )}
          </div>

          <div className="bb-faq-card">
            <button
              type="button"
              className="bb-faq-toggle-btn"
              onClick={() => toggleFaq(1)}
              aria-expanded={openFaqs.includes(1)}
            >
              <strong>How do I change my plan?</strong>
              <span>{openFaqs.includes(1) ? "−" : "+"}</span>
            </button>
            {openFaqs.includes(1) && (
              <p className="bb-faq-answer">
                Open Billing and select View Plans to explore available subscriptions and find the perfect tier for you.
              </p>
            )}
          </div>

          <div className="bb-faq-card">
            <button
              type="button"
              className="bb-faq-toggle-btn"
              onClick={() => toggleFaq(2)}
              aria-expanded={openFaqs.includes(2)}
            >
              <strong>How can I report a technical issue?</strong>
              <span>{openFaqs.includes(2) ? "−" : "+"}</span>
            </button>
            {openFaqs.includes(2) && (
              <p className="bb-faq-answer">
                Send the details and screenshots to support.beebuddy@gmail.com and our development team will investigate it.
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ==========================================================================
   9. COMMUNITY MEMBERS DIRECTORY & EXPLORE (Figma Frames 219:5235, 481:1343)
   ========================================================================== */
function formatRelativeTime(value: string) {
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

function SearchPreviewGrid({
  result,
  loading,
  error,
  gridClassName,
  cardClassName,
}: {
  result: SearchPreviewResult | null;
  loading: boolean;
  error: string;
  gridClassName: string;
  cardClassName: string;
}) {
  if (loading) return <div className="bb-search-preview-state"><span className="bb-feed-loader" />Đang tìm trong cộng đồng...</div>;
  if (error) return <div className="bb-search-preview-state is-error">{error}</div>;
  if (!result) return <div className="bb-search-preview-state">Nhập một sở thích hoặc thói quen để tìm người có điểm chung.</div>;
  if (result.totalMatches === 0) return <div className="bb-search-preview-state">Chưa tìm thấy hồ sơ phù hợp với “{result.query}”.</div>;

  return (
    <>
      <div className="bb-search-result-summary" role="status">
        Tìm thấy <strong>{result.totalMatches}</strong> người phù hợp · Đang hiển thị <strong>{result.previewUsers.length}</strong>/{Math.min(3, result.totalMatches)} hồ sơ giới hạn
      </div>
      <div className={gridClassName}>
        {result.previewUsers.map((member) => (
          <article key={member.id} className={cardClassName}>
            <div className="bb-member-top-row">
              <div className="bb-member-avatar-ring">
                <img
                  src={member.avatarUrl || "/assets/home/avatar-01.png"}
                  alt={member.maskedName}
                  className="bb-member-avatar-img"
                />
              </div>
              <div className="bb-member-meta">
                <h3 className="bb-member-name">{member.maskedName}</h3>
                <p className="bb-member-role">Hồ sơ xem trước</p>
              </div>
            </div>
            <div className="bb-member-location-row"><MapPin size={14} className="bb-pin-icon" /><span>{member.location}</span></div>
            <p className="bb-member-bio">{member.connectionGoal}</p>
            <div className="bb-member-tags-row">
              {member.matchingInterests.map((tag) => <span key={tag} className="bb-member-interest-chip">{tag}</span>)}
            </div>
            <Link href="/get-started" className="bb-member-connect-btn bb-member-app-cta">Connect</Link>
          </article>
        ))}
      </div>
      <p className="bb-search-limit-notice">{result.limitNotice}</p>
    </>
  );
}

function CommunityDirectory({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [viewMode, setViewMode] = useState<"directory" | "explore">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("Skills");
  const [availFilter, setAvailFilter] = useState("Availability");
  const [interestFilter, setInterestFilter] = useState("Interests");
  const [openDropdown, setOpenDropdown] = useState<"skills" | "avail" | "interests" | null>(null);
  const [likingPost, setLikingPost] = useState<string | null>(null);
  const [popularInterests, setPopularInterests] = useState<string[]>([]);
  const [searchResult, setSearchResult] = useState<SearchPreviewResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotalPages, setFeedTotalPages] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeCommentsTitle, setActiveCommentsTitle] = useState("Comments");

  const openComments = (postId: string, title: string = "Comments") => {
    setActivePostId(postId);
    setActiveCommentsTitle(title);
    setIsCommentsOpen(true);
  };

  const loadFeed = async (page: number, append = false) => {
    setFeedLoading(true);
    setFeedError("");
    try {
      const feed = await postsApi.feed(page, 6);
      setFeedPosts((current) => append ? [...current, ...feed.posts] : feed.posts);
      setFeedPage(feed.page);
      setFeedTotalPages(feed.totalPages);
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : "Không thể tải bảng tin");
    } finally {
      setFeedLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "explore") void loadFeed(1);
  }, [viewMode, isLoggedIn]);

  useEffect(() => {
    let active = true;
    searchApi.popular()
      .then((items) => active && setPopularInterests(items))
      .catch(() => active && setPopularInterests([]));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim() || (interestFilter !== "Interests" ? interestFilter : popularInterests.find(tag => tag === "Coding") || popularInterests[0] || "");
    if (!query) {
      setSearchResult(null);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);
    setSearchError("");
    const timer = window.setTimeout(() => {
      searchApi.preview(query)
        .then((result) => active && setSearchResult(result))
        .catch((cause: Error) => active && setSearchError(cause.message))
        .finally(() => active && setSearchLoading(false));
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, interestFilter, popularInterests]);

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community`);
      alert("Link copied! Share BeeBuddy with your friends.");
    } catch {
      alert("Unable to copy automatically. Share the address in your browser.");
    }
  };

  const toggleLike = async (post: FeedPost) => {
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    if (likingPost) return;
    setLikingPost(post.id); setFeedError("");
    try {
      const result = await postsApi.setLike(post.id, !post.likedByCurrentUser);
      setFeedPosts(current => current.map(row => row.id === post.id ? { ...row, likesCount: result.likesCount, likedByCurrentUser: result.liked } : row));
    } catch (cause) { setFeedError(cause instanceof Error ? cause.message : "Unable to update like."); }
    finally { setLikingPost(null); }
  };

  const onApprovedComment = (postId: string) => {
    setFeedPosts((current) => current.map((post) =>
      post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
    ));
  };

  return (
    <div className="bb-figma-community-page">
      <div className="bb-figma-bg-decor" aria-hidden="true">
        <div className="bb-bg-circle circle-bottom-left" />
        <div className="bb-bg-circle circle-mid-bottom" />
        <div className="bb-bg-concentric-rings rings-bottom-right">
          <div className="bb-ring ring-1" />
          <div className="bb-ring ring-2" />
        </div>
      </div>

      <div className="bb-figma-community-container">
        {viewMode === "directory" ? (
          <div className="bb-directory-screen">
            <header className="bb-hive-header">
              <h1 className="bb-hive-main-title">Our Growing Hive</h1>
              <p className="bb-hive-subtitle">
                Join the buzz and start connecting today!
              </p>
            </header>

            <div className="bb-find-people-banner">
              <div className="bb-find-people-info">
                <h2 className="bb-find-people-title">Find your people</h2>
                <p className="bb-find-people-stats">
                  {searchResult
                    ? `${searchResult.totalMatches} người phù hợp • hiển thị tối đa 3 hồ sơ`
                    : "Tìm theo sở thích hoặc thói quen từ cộng đồng BeeBuddy"}
                </p>
              </div>
              <button
                type="button"
                className="bb-find-people-explore-btn"
                onClick={() => setViewMode("explore")}
              >
                <Users size={16} />
                <span>Explore</span>
              </button>
            </div>

            <div className="bb-figma-filter-bar">
              {/* Skills */}
              <div className="bb-filter-dropdown-wrap">
                <button
                  type="button"
                  className={`bb-filter-pill-btn ${skillFilter !== "Skills" ? "is-selected" : ""}`}
                  disabled title="Skills search is not available yet"
                >
                  <MapPin size={14} className="text-gray-500" />
                  <span>{skillFilter}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {openDropdown === "skills" && (
                  <div className="bb-filter-popup-menu">
                    {["Skills", "Design", "UX", "Coding", "Research", "Management", "Content", "ML"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={skillFilter === s ? "active" : ""}
                        onClick={() => { setSkillFilter(s); setOpenDropdown(null); }}
                      >
                        {s === "Skills" ? "All Skills" : s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="bb-filter-dropdown-wrap">
                <button
                  type="button"
                  className={`bb-filter-pill-btn ${availFilter !== "Availability" ? "is-selected" : ""}`}
                  disabled title="Availability search is not available yet"
                >
                  <Clock size={14} className="text-gray-500" />
                  <span>{availFilter}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {openDropdown === "avail" && (
                  <div className="bb-filter-popup-menu">
                    {["Availability", "Available today", "This week"].map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={availFilter === a ? "active" : ""}
                        onClick={() => { setAvailFilter(a); setOpenDropdown(null); }}
                      >
                        {a === "Availability" ? "Any Availability" : a}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Interests */}
              <div className="bb-filter-dropdown-wrap">
                <button
                  type="button"
                  className={`bb-filter-pill-btn ${interestFilter !== "Interests" ? "is-selected" : ""}`}
                  onClick={() => setOpenDropdown(openDropdown === "interests" ? null : "interests")}
                >
                  <span>{interestFilter}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {openDropdown === "interests" && (
                  <div className="bb-filter-popup-menu">
                    {["Interests", ...popularInterests].map((i) => (
                      <button
                        key={i}
                        type="button"
                        className={interestFilter === i ? "active" : ""}
                        onClick={() => { setInterestFilter(i); setOpenDropdown(null); }}
                      >
                        {i === "Interests" ? "All Interests" : i}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Search Box */}
              <div className="bb-search-input-box">
                <Search size={16} className="bb-search-box-icon" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bb-search-box-input"
                />
                <div className="bb-search-box-divider" />
                <button
                  type="button"
                  className="bb-search-box-sliders-btn"
                  aria-label="Reset filters"
                  onClick={() => {
                    setSkillFilter("Skills");
                    setAvailFilter("Availability");
                    setInterestFilter("Interests");
                    setSearchQuery("");
                  }}
                  title="Reset filters"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>
            </div>

            <SearchPreviewGrid
              result={searchResult}
              loading={searchLoading}
              error={searchError}
              gridClassName="bb-figma-member-grid"
              cardClassName="bb-figma-member-card"
            />

            {/* Growth banner */}
            <div className="bb-growth-message-card">
              <h3 className="bb-growth-title">The hive is buzzing!</h3>
              <p className="bb-growth-sub">
                We&apos;re still growing. Invite your friends to join the adventure and build meaningful connections together.
              </p>
              <button
                type="button"
                className="bb-growth-invite-btn"
                onClick={() => void copyInviteLink()}
              >
                Invite Friends
              </button>
            </div>
          </div>
        ) : (
          /* EXPLORE FEED VIEW (Figma Frame 481:1343) */
          <div className="bb-explore-screen">
            <header className="bb-explore-header">
              <div className="bb-explore-title-row">
                <button
                  type="button"
                  className="bb-explore-back-arrow-btn"
                  onClick={() => setViewMode("directory")}
                  aria-label="Back to directory"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="bb-explore-main-title">Explore the Hive</h1>
              </div>
              <p className="bb-explore-subtitle">
                Discover neighbors who share your passions and check out what&apos;s trending.
              </p>
            </header>

            <div className="bb-figma-filter-bar bb-explore-filter-bar">
              <div className="bb-search-input-box bb-search-explore-box">
                <Search size={16} className="bb-search-box-icon" />
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bb-search-box-input"
                />
              </div>

              <div className="bb-filter-dropdown-wrap">
                <button type="button" className="bb-filter-pill-btn" onClick={() => setOpenDropdown(openDropdown === "interests" ? null : "interests")}>
                  <span>{interestFilter}</span><ChevronDown size={14} className="text-gray-400" />
                </button>
                {openDropdown === "interests" && <div className="bb-filter-popup-menu">
                  {["Interests", ...popularInterests].map(interest => <button key={interest} type="button" className={interestFilter === interest ? "active" : ""}
                    onClick={() => { setInterestFilter(interest); setSearchQuery(""); setOpenDropdown(null); }}>{interest === "Interests" ? "All Interests" : interest}</button>)}
                </div>}
              </div>
              <button type="button" className="bb-filter-pill-btn" disabled title="Skills search is not available yet"><span>Skills</span><ChevronDown size={14} className="text-gray-400" /></button>
              <button type="button" className="bb-filter-pill-btn" disabled title="Availability search is not available yet"><span>Availability</span><ChevronDown size={14} className="text-gray-400" /></button>
            </div>

            {/* Discover Friends by Interest */}
            <section className="bb-discover-friends-section">
              <div className="bb-discover-header-row">
                <h2 className="bb-discover-title">Discover Friends by Interest</h2>
                <div className="bb-discover-search-tag">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tìm thói quen..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="bb-discover-tag-input"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="bb-discover-tag-chips">
                {popularInterests.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`bb-explore-tag-chip ${searchQuery.toLocaleLowerCase("vi-VN") === tag.toLocaleLowerCase("vi-VN") ? "is-active" : ""}`}
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <SearchPreviewGrid
                result={searchResult}
                loading={searchLoading}
                error={searchError}
                gridClassName="bb-explore-friends-grid"
                cardClassName="bb-explore-friend-card"
              />
            </section>

            {/* What's Buzzing Feed */}
            <section className="bb-whats-buzzing-section">
              <h2 className="bb-buzzing-section-title">What&apos;s Buzzing</h2>

              <div className="bb-buzzing-posts-list">
                {feedLoading && feedPosts.length === 0 && (
                  <div className="bb-feed-state-card"><span className="bb-feed-loader" />Đang tải bảng tin...</div>
                )}

                {feedError && (
                  <div className="bb-feed-state-card is-error">
                    <p>{feedError}</p>
                    <button type="button" onClick={() => void loadFeed(1)}>Thử lại</button>
                  </div>
                )}

                {!feedLoading && !feedError && feedPosts.length === 0 && (
                  <div className="bb-feed-state-card">
                    <strong>Chưa có bài viết công khai</strong>
                    <p>Các bài viết phù hợp với quyền xem của bạn sẽ xuất hiện tại đây.</p>
                  </div>
                )}

                {feedPosts.map((post) => (
                  <article key={post.id} className="bb-buzzing-post-card">
                    <div className="bb-post-header-row">
                      <div className="bb-post-author-group">
                        <img
                          src={post.author.avatarUrl || "/assets/home/avatar-01.png"}
                          alt={post.author.fullName}
                          className="bb-post-author-avatar"
                        />
                        <div>
                          <h4 className="bb-post-author-name">{post.author.fullName}</h4>
                          <p className="bb-post-author-role">@{post.author.username}</p>
                        </div>
                      </div>
                      <div className="bb-post-meta-right">
                        <Clock size={14} className="text-gray-400" />
                        <span className="bb-post-time">{formatRelativeTime(post.createdAt)}</span>
                        <span className={`bb-post-public-badge ${post.visibility === "CONNECTIONS" ? "is-connections" : ""}`}>
                          {post.visibility === "CONNECTIONS" ? <Users size={12} /> : <Globe size={12} />}
                          <span>{post.visibility === "CONNECTIONS" ? "Connections" : "Public"}</span>
                        </span>
                      </div>
                    </div>

                    <p className="bb-post-content-text">{post.content}</p>

                    {post.mediaUrls.length > 0 && (
                      <div className={`bb-post-media-grid count-${Math.min(post.mediaUrls.length, 3)}`}>
                        {post.mediaUrls.slice(0, 3).map((url) =>
                          /\.(mp4|webm|ogg)(\?.*)?$/i.test(url) ? (
                            <video key={url} src={url} controls preload="metadata" className="bb-post-media" />
                          ) : (
                            <img key={url} src={url} alt="Nội dung đính kèm bài viết" className="bb-post-media" />
                          )
                        )}
                      </div>
                    )}

                    <div className="bb-post-actions-bar">
                      <button type="button" className={`bb-post-action-btn ${post.likedByCurrentUser ? "is-liked" : ""}`} disabled={likingPost !== null} onClick={() => void toggleLike(post)} aria-pressed={post.likedByCurrentUser}>
                        <Heart size={16} /><span>{post.likesCount} likes</span>
                      </button>
                      <button
                        type="button"
                        className="bb-post-action-btn"
                        onClick={() => openComments(post.id, `Bình luận bài viết của ${post.author.fullName}`)}
                      >
                        <MessageSquare size={16} /><span>{post.commentsCount} bình luận</span>
                      </button>
                      <button
                        type="button"
                        className="bb-post-action-btn"
                        onClick={async () => {
                          await navigator.clipboard?.writeText?.(`${window.location.origin}/community?post=${post.id}`);
                          alert("Đã sao chép liên kết bài viết!");
                        }}
                      >
                        <Share2 size={16} /><span>Chia sẻ</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {feedPosts.length > 0 && feedPage < feedTotalPages && (
                <button
                  type="button"
                  className="bb-feed-load-more-btn"
                  disabled={feedLoading}
                  onClick={() => void loadFeed(feedPage + 1, true)}
                >
                  {feedLoading ? "Đang tải..." : "Xem thêm bài viết"}
                </button>
              )}
            </section>

            <div className="bb-growth-message-card bb-explore-growth-card">
              <img src="/assets/home/figma-buzzy.png" alt="Buzzy" className="bb-explore-growth-buzzy" />
              <h3 className="bb-growth-title">The hive is buzzing!</h3>
              <p className="bb-growth-sub">Great things are built together. Invite friends to join our cozy community space and explore adventures side-by-side.</p>
              <button type="button" className="bb-growth-invite-btn" onClick={() => void copyInviteLink()}>Invite Friends</button>
            </div>
          </div>
        )}
      </div>

      <CommentsModal
        isOpen={isCommentsOpen}
        postId={activePostId}
        isLoggedIn={isLoggedIn}
        onClose={() => setIsCommentsOpen(false)}
        title={activeCommentsTitle}
        onApprovedComment={onApprovedComment}
        showReportAction={false}
      />
    </div>
  );
}
