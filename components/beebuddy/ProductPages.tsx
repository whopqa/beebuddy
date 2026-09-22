"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  MessageSquare,
  Users,
  MapPin,
  ChevronDown,
  Clock,
  Search,
  SlidersHorizontal,
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
} from "lucide-react";
import FigmaHeader from "./FigmaHeader";
import FigmaFooter from "./FigmaFooter";
import SimpleFooter from "./SimpleFooter";
import CommentsModal from "./CommentsModal";
import { defaultDemoUser, readDemoUser, saveDemoUser, hasDemoSession, type DemoUser } from "@/lib/demo";

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

const people = [
  {
    name: "Alex Rivera",
    role: "UX Designer",
    location: "Portland, OR",
    text: "Looking for someone to grab coffee and talk design systems.",
    tags: ["Design", "Coffee", "Hiking"],
    avatar: "alex_rivera.png",
    skills: ["Design", "UX"],
    availability: "Available today",
  },
  {
    name: "Jordan Lee",
    role: "Community Manager",
    location: "Austin, TX",
    text: "Looking for a book club buddy or someone to try new restaurants with.",
    tags: ["Book clubs", "Foodie", "Board games"],
    avatar: "jordan_lee.png",
    skills: ["Community", "Management"],
    availability: "This week",
  },
  {
    name: "Priya Nair",
    role: "Product Designer",
    location: "London, UK",
    text: "Want to find a coding buddy for weekend projects and coffee chats.",
    tags: ["Coding", "Coffee", "Photography"],
    avatar: "priya_nair.png",
    skills: ["Design", "Coding"],
    availability: "Available today",
  },
  {
    name: "Sam Kim",
    role: "UX Researcher",
    location: "Seoul, KR",
    text: "Looking for a language exchange partner (Kor/Eng) and hiking buddies.",
    tags: ["Hiking", "Language", "Coffee"],
    avatar: "sam_kim.png",
    skills: ["Research", "Language"],
    availability: "This week",
  },
  {
    name: "Elena Rossi",
    role: "Content Creator",
    location: "Milan, IT",
    text: "Looking for someone to collaborate on a podcast or photography walk.",
    tags: ["Podcasting", "Photography", "Writing"],
    avatar: "elena_rossi.png",
    skills: ["Content", "Photography"],
    availability: "Available today",
  },
  {
    name: "Marcus Chen",
    role: "Software Engineer",
    location: "San Francisco, CA",
    text: "Looking for a study group for machine learning and a basketball buddy.",
    tags: ["ML", "Basketball", "Coffee"],
    avatar: "marcus_chen.png",
    skills: ["Coding", "ML"],
    availability: "This week",
  },
  {
    name: "Sofia Patel",
    role: "Student",
    location: "Toronto, ON",
    text: "Looking for a study buddy for exams and someone to try new cafes with.",
    tags: ["Study", "Coffee", "Yoga"],
    avatar: "sofia_patel.png",
    skills: ["Research", "Study"],
    availability: "Available today",
  },
  {
    name: "Daniel Okoro",
    role: "Product Manager",
    location: "Lagos, NG",
    text: "Looking for a walking buddy and someone to talk about books and product.",
    tags: ["Walking", "Books", "Product"],
    avatar: "daniel_okoro.png",
    skills: ["Management", "Product"],
    availability: "This week",
  },
];

const exploreInterests = [
  "Design",
  "Coffee",
  "Hiking",
  "Photography",
  "Coding",
  "Music",
  "Travel",
  "Cooking",
  "Gaming",
  "Yoga",
];

export default function ProductPage({ view }: { view: ProductView }) {
  // Community uses full mountain footer per Figma 219:5235 / 481:1343
  const isCommunity = view === "community";
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const syncAuth = () => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        if (p.get("guest") === "1") {
          setIsLoggedIn(false);
        } else if (p.get("auth") === "1" || p.get("login") === "1") {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(hasDemoSession());
        }
      }
    };
    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  return (
    <div className="bb-site bb-product-page-root">
      <FigmaHeader authenticated={isLoggedIn} />
      <ProductContent view={view} isLoggedIn={isLoggedIn} />
      {isCommunity ? <FigmaFooter /> : <SimpleFooter />}
    </div>
  );
}

function ProductContent({ view, isLoggedIn }: { view: ProductView; isLoggedIn: boolean }) {
  switch (view) {
    case "get-started":
      return <GetStarted />;
    case "start-your-journey":
      return <StartYourJourney />;
    case "community":
      return <CommunityDirectory />;
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
function GetStarted() {
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
        <span className="bb-gs-kicker-pill">● ONBOARDING CENTER</span>
        <h1 className="bb-gs-main-title">YOUR JOURNEY STARTS HERE</h1>
        <p className="bb-gs-subtitle">
          Welcome to BeeBuddy! Setting up your space takes less than 2 minutes. Follow these simple
          checkpoints to customize your travel style, connect with verified companions, and prepare
          for your next shared adventure.
        </p>

        {/* Ready to setup travel passport card */}
        <div className="bb-gs-passport-card">
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
        </div>
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
              <p>
                Onboarding starts with self-expression. Share your unique vibe, preferred pace, and
                local exploration bucket lists. Our intelligent matchmaking aligns you with buddies
                traveling with exact-match expectations.
              </p>
              <ul className="bb-gs-step-bullets">
                <li><span className="bb-bullet-dot" /> Social Media Identity Sync</li>
                <li><span className="bb-bullet-dot" /> Vibe & Activity Tags</li>
              </ul>
            </div>
            <div className="bb-gs-step-img-wrap">
              <img src="/assets/home/hero-01.png" alt="Find your people" className="bb-gs-step-img" />
            </div>
          </div>

          {/* Step 02 (Reversed) */}
          <div className="bb-gs-step-row is-reverse">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">02</span>
              <h3>Shared Adventures</h3>
              <p>
                Browse, join, or create micro-events. Whether it is a weekend market run, a local
                foodie crawl, or an intense mountain trek, shared plans build immediate comfort.
                Every event includes real-time group chat before setting out.
              </p>
              <ul className="bb-gs-step-bullets">
                <li><span className="bb-bullet-dot" /> Instant Group Events & Meetups</li>
                <li><span className="bb-bullet-dot" /> Pre-Trip Coordinates & Chats</li>
              </ul>
            </div>
            <div className="bb-gs-step-img-wrap">
              <img src="/assets/home/figma-community-mountain.png" alt="Shared adventures" className="bb-gs-step-img" />
            </div>
          </div>

          {/* Step 03 */}
          <div className="bb-gs-step-row">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">03</span>
              <h3>Stories That Stay</h3>
              <p>
                Preserve what matters. Share travel snapshots, pin your favorite local coffee shops,
                and write journal entries directly inside the community log. Let others trace your
                favorite trails and learn from your stories.
              </p>
              <ul className="bb-gs-step-bullets">
                <li><span className="bb-bullet-dot" /> Artisanal Route & Spot Pinning</li>
                <li><span className="bb-bullet-dot" /> Community Scrapbooks & Diaries</li>
              </ul>
            </div>
            <div className="bb-gs-step-img-wrap">
              <img src="/assets/home/hero-04.png" alt="Stories that stay" className="bb-gs-step-img" />
            </div>
          </div>

          {/* Step 04 (Reversed) */}
          <div className="bb-gs-step-row is-reverse">
            <div className="bb-gs-step-text">
              <span className="bb-gs-step-num">04</span>
              <h3>Build Your Circle</h3>
              <p>
                Onboarding finalizes with trust. Turn brief holiday connections into lifelong
                circles. Add travelers to your inner group, stay updated on their next destination
                ideas, and plan recurring reunions across the globe.
              </p>
              <ul className="bb-gs-step-bullets">
                <li><span className="bb-bullet-dot" /> Private Core Member Circles</li>
                <li><span className="bb-bullet-dot" /> Verified Companion Network</li>
              </ul>
            </div>
            <div className="bb-gs-step-img-wrap">
              <img src="/assets/home/hero-03.png" alt="Build your circle" className="bb-gs-step-img" />
            </div>
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

  return (
    <main className="bb-canvas bb-notifications-canvas">
      <div className="bb-notif-container">
        <header className="bb-notif-page-header">
          <h1 className="bb-notif-page-title">Notifications</h1>
          <p className="bb-notif-page-sub">
            {activeTab === "mentions" ? "You have 2 new mentions" : "You have 3 unread messages"}
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
              <div className="bb-notif-check-item is-checked">
                <span className="bb-check-circle">✓</span>
                <div>
                  <strong>Complete your profile</strong>
                  <p>Add your photo and bio</p>
                </div>
              </div>

              <div className="bb-notif-check-item is-checked">
                <span className="bb-check-circle">✓</span>
                <div>
                  <strong>Invite teammates</strong>
                  <p>Share the workspace link</p>
                </div>
              </div>

              <div className="bb-notif-check-item">
                <span className="bb-circle-num">3</span>
                <div>
                  <strong>Create your first project</strong>
                  <p>Start organizing your work</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Notifications List Items */}
        <div className="bb-notif-items-card">
          {activeTab === "all" && (
            <>
              <NotificationItem
                avatar="/assets/community/alex_rivera.png"
                title={<span><strong>Alex Johnson</strong> invited you to join <span className="text-[#ff7300]">Design Team</span></span>}
                desc="Join the workspace to collaborate on new projects."
                time="2m ago"
                unread
              />
              <NotificationItem
                avatar="/assets/community/header_avatar.png"
                title={<span><strong>System</strong> shared a file with you</span>}
                desc="Q3 Marketing Assets.zip has been uploaded to the shared drive."
                time="1h ago"
                unread
              />
              <NotificationItem
                avatar="/assets/community/elena_rossi.png"
                title={<span><strong>Sarah Connor</strong> mentioned you in a comment</span>}
                desc="&ldquo;Can you review the latest design specs for the dashboard?&rdquo;"
                time="Yesterday"
              />
              <NotificationItem
                avatar="/assets/community/sam_kim.png"
                title={<span><strong>TaskBot</strong> assigned you a task</span>}
                desc="New task: &ldquo;Update user documentation&rdquo; has been added to your board."
                time="Oct 24"
              />
            </>
          )}

          {activeTab === "unread" && (
            <>
              <NotificationItem
                avatar="/assets/community/alex_rivera.png"
                title={<span><strong>Alex Johnson</strong> invited you to join <span className="text-[#ff7300]">Design Team</span></span>}
                desc="Join the workspace to collaborate on new projects."
                time="2m ago"
                unread
              />
              <NotificationItem
                avatar="/assets/community/header_avatar.png"
                title={<span><strong>System</strong> shared a file with you</span>}
                desc="Q3 Marketing Assets.zip has been uploaded to the shared drive."
                time="1h ago"
                unread
              />
            </>
          )}

          {activeTab === "mentions" && (
            <>
              <NotificationItem
                avatar="/assets/community/elena_rossi.png"
                title={<span><strong>Sarah Chen</strong> mentioned you in <span className="text-[#ff7300]">Homepage Redesign</span></span>}
                desc="&ldquo;@you Can you review the hero section layout?&rdquo;"
                time="5m ago"
                unread
              />
              <NotificationItem
                avatar="/assets/community/marcus_chen.png"
                title={<span><strong>Mike Rivera</strong> tagged you in</span>}
                desc="Sprint Review Notes"
                time="20m ago"
                unread
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function NotificationItem({
  avatar,
  title,
  desc,
  time,
  unread = false,
}: {
  avatar: string;
  title: React.ReactNode;
  desc: string;
  time: string;
  unread?: boolean;
}) {
  return (
    <div className={`bb-notif-row ${unread ? "is-unread" : ""}`}>
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
              <select className="bb-pref-select" defaultValue="English">
                <option value="English">English ⌄</option>
                <option value="Spanish">Español</option>
                <option value="French">Français</option>
              </select>
            </div>

            <div className="bb-pref-item-row">
              <div className="bb-pref-item-info">
                <strong>Appearance</strong>
                <p>Choose your preferred theme</p>
              </div>
              <select className="bb-pref-select" defaultValue="System">
                <option value="System">System ⌄</option>
                <option value="Light">Light</option>
                <option value="Dark">Dark</option>
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
function AccountInfo({ isLoggedIn = false, editing = false }: { isLoggedIn?: boolean; editing?: boolean }) {
  const [user, setUser] = useState<DemoUser>(readDemoUser());

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    saveDemoUser(user);
    window.location.href = "/account";
  };

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
        {!isLoggedIn && !editing ? (
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
                  src="/assets/home/figma-buzzy.png"
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
                <span className="bb-members-pill-badge">Members</span>
              </div>

              {/* Tags Grid */}
              <div className="bb-profile-tags-grid">
                <div>
                  <span className="bb-tag-group-title">BASIC INFO</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip">📅 08/12/1992</span>
                    <span className="bb-info-chip">Non-binary</span>
                    <span className="bb-info-chip">Product Designer</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">HOBBIES</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip green">Sketching</span>
                    <span className="bb-info-chip green">Trail running</span>
                    <span className="bb-info-chip green">Cooking</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">INTERESTS</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip orange">Design</span>
                    <span className="bb-info-chip orange">Coffee</span>
                    <span className="bb-info-chip orange">Hiking</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">SKILLS</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip purple">UI/UX Design</span>
                    <span className="bb-info-chip purple">Prototyping</span>
                    <span className="bb-info-chip purple">User Research</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">PERSONALITY & LIFESTYLE</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip blue">INTP</span>
                    <span className="bb-info-chip blue">Minimalist & active</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">DAILY HABITS</span>
                  <div className="bb-tags-wrap">
                    <span className="bb-info-chip yellow">Morning journaling</span>
                  </div>
                </div>

                <div>
                  <span className="bb-tag-group-title">FAVORITE COLORS</span>
                  <div className="bb-color-dots-row">
                    <span className="bb-color-dot" style={{ background: "#f87171" }} />
                    <span className="bb-color-dot" style={{ background: "#34d399" }} />
                    <span className="bb-color-dot" style={{ background: "#c084fc" }} />
                  </div>
                </div>
              </div>

              {/* Bio & Socials */}
              <div className="bb-profile-bio-block">
                <p>Creative soul who loves design, nature, and a good espresso. ☕</p>
                <div className="bb-profile-social-links">
                  <a href="https://twitter.com" target="_blank" rel="noreferrer">
                    🐦 @designlife
                  </a>
                  <a href="https://linkedin.com" target="_blank" rel="noreferrer">
                    💼 linkedin.com/in/designlife
                  </a>
                </div>
              </div>

              {/* Gallery */}
              <div className="bb-profile-gallery-block">
                <span className="bb-gallery-title">Gallery</span>
                <div className="bb-gallery-cards-row">
                  <img src="/assets/buzzy/gallery_515_4462.png" alt="Gallery 1" className="bb-gallery-img" />
                  <img src="/assets/buzzy/gallery_515_4463.png" alt="Gallery 2" className="bb-gallery-img" />
                  <img src="/assets/buzzy/gallery_515_4464.png" alt="Gallery 3" className="bb-gallery-img" />
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
                    <strong>BeeBuddy Explorer <span className="bb-plan-chip">Pro Plan</span></strong>
                    <p>Access to premium features, exclusive events and more!</p>
                  </div>
                  <div className="bb-pbc-renewal">
                    <small>Next Renewal</small>
                    <strong>May 28, 2027</strong>
                    <small>Billing Cycle: <strong>Yearly</strong></small>
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
                  onClick={() => alert("Invite link copied to clipboard!")}
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
                <img src="/assets/home/figma-buzzy.png" alt="" className="bb-profile-avatar-circle" />
                <div className="bb-profile-user-fields">
                  <div className="bb-field-pair"><span className="label">Full Name</span><strong className="val">{user.name}</strong></div>
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
                  <span className="bb-edit-val-underlined">08/12/1992</span>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Gender</strong><p>Select your gender identity</p></div>
                  <span className="bb-edit-val-underlined">Non-binary</span>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Occupation</strong><p>Your current role or profession</p></div>
                  <span className="bb-edit-val-underlined">Product Designer</span>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Interests</strong><p>Topics you enjoy talking about</p></div>
                  <span className="bb-edit-val-underlined">Design, Coffee, Hiking</span>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Favorite Colors</strong><p>Colors that match your vibe</p></div>
                  <div className="bb-color-dots-row">
                    <span className="bb-color-dot" style={{ background: "#ff8500" }} />
                    <span className="bb-color-dot" style={{ background: "#f59e0b" }} />
                    <span className="bb-color-dot" style={{ background: "#eab308" }} />
                  </div>
                </div>
                <div className="bb-edit-row">
                  <div><strong>Habits</strong><p>Daily routines and rituals</p></div>
                  <span className="bb-edit-val-underlined">Morning journaling</span>
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
                  <span className="bb-detail-item-val">
                    Hello! I&apos;m a creative mind passionate about design and meaningful connections. Always looking for inspiration and good conversations.
                  </span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Self-Description / Bio</strong>
                    <small>A short bio that appears on your profile</small>
                  </div>
                  <span className="bb-detail-item-val">
                    Creative soul who loves design, nature, and a good espresso.
                  </span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Personality Type</strong>
                    <small>Your personality style (e.g., INTP, ENFJ)</small>
                  </div>
                  <span className="bb-detail-item-val">INTP</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Lifestyle</strong>
                    <small>Your daily habits and living style</small>
                  </div>
                  <span className="bb-detail-item-val">Minimalist & active</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Hobbies</strong>
                    <small>Activities you enjoy in your free time</small>
                  </div>
                  <span className="bb-detail-item-val">Sketching, trail running, cooking</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Skills</strong>
                    <small>Abilities you&apos;re proficient in</small>
                  </div>
                  <span className="bb-detail-item-val">UI/UX Design, Prototyping, User Research</span>
                </div>

                <div className="bb-detail-item">
                  <div className="bb-detail-item-label">
                    <strong>Social Links</strong>
                    <small>Connect your profiles (e.g., Twitter, Instagram)</small>
                  </div>
                  <span className="bb-detail-item-val">@designlife on Twitter, linkedin.com/in/designlife</span>
                </div>

                {/* Gallery with dashed plus card */}
                <div className="bb-edit-gallery-section">
                  <span className="label">Gallery</span>
                  <div className="bb-gallery-cards-row">
                    <img src="/assets/buzzy/gallery_515_4462.png" alt="" className="bb-gallery-img" />
                    <img src="/assets/buzzy/gallery_515_4463.png" alt="" className="bb-gallery-img" />
                    <img src="/assets/buzzy/gallery_515_4464.png" alt="" className="bb-gallery-img" />
                    <div className="bb-gallery-add-card">
                      <span>+</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="bb-edit-actions-row">
                <Link href="/account" className="bb-edit-cancel-btn">✕ Cancel</Link>
                <button type="submit" className="bb-edit-save-btn">✓ Save Changes</button>
              </div>
            </div>
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
                  <span>All prices are shown in USD. Cancel anytime. No long-term commitments.</span>
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
                    <img src="/assets/home/figma-buzzy.png" alt="Avatar" className="bb-bil-avatar-img" />
                  </div>
                  <div className="bb-bil-info-grid">
                    <div className="bb-bil-info-row">
                      <span className="lbl">Full Name</span>
                      <span className="val">BeeBuddy</span>
                    </div>
                    <div className="bb-bil-info-row">
                      <span className="lbl">Email</span>
                      <span className="val text-[#ff7300] font-semibold">hello.beebuddy@gmail.com</span>
                    </div>
                    <div className="bb-bil-info-row">
                      <span className="lbl">Username</span>
                      <span className="val">BeeNguyen</span>
                    </div>
                  </div>
                </div>

                <div className="bb-bil-plan-head">
                  <CreditCard size={16} className="text-[#ff7300]" />
                  <h3>Billing / Plan</h3>
                </div>
                <div className="bb-bil-plan-summary-row">
                  <div className="bb-bil-plan-left">
                    <strong>BeeBuddy Explorer</strong>
                    <span className="bb-bil-plan-pro-pill">Pro Plan</span>
                    <p>Access to premium features, exclusive events and more!</p>
                  </div>
                  <div className="bb-bil-plan-right">
                    <div className="bb-bil-renewal-info">
                      <small>Next Renewal</small>
                      <strong>May 28, 2027</strong>
                      <small>Billing Cycle: Yearly</small>
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
                    <strong>$0</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Perfect for new users who want to explore the BeeBuddy community and start connecting.
                  </p>
                  <ul className="bb-plan-checklist">
                    <li><span className="dot" /> Create and share posts</li>
                    <li><span className="dot" /> Join public communities</li>
                    <li><span className="dot" /> Explore activities</li>
                    <li><span className="dot" /> Save favorite posts and places</li>
                  </ul>
                  <button
                    type="button"
                    className="bb-plan-action-outline"
                    onClick={() => { setSelectedPlan("Free"); setSubView("checkout"); }}
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
                    <strong>$4.99</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Best for active users who want better discovery tools and more ways to connect.
                  </p>
                  <ul className="bb-plan-checklist">
                    <li><span className="dot" /> Everything in Free</li>
                    <li><span className="dot" /> Advanced search and filters</li>
                    <li><span className="dot" /> Unlimited saved posts and places</li>
                    <li><span className="dot" /> Create private groups</li>
                  </ul>
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
                    <strong>$9.99</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Designed for highly engaged users who want richer social experiences and stronger community tools.
                  </p>
                  <ul className="bb-plan-checklist">
                    <li><span className="dot" /> Everything in Explorer</li>
                    <li><span className="dot" /> Featured profile badge</li>
                    <li><span className="dot" /> Unlimited private groups</li>
                    <li><span className="dot" /> Advanced event planning tools</li>
                  </ul>
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
                    <strong>$19.99</strong>
                    <span>/ month</span>
                  </div>
                  <p className="bb-plan-short-desc">
                    Made for community leaders, organizers, and super users who want the full BeeBuddy experience.
                  </p>
                  <ul className="bb-plan-checklist">
                    <li><span className="dot" /> Everything in Buddy+</li>
                    <li><span className="dot" /> Community mgmt dashboard</li>
                    <li><span className="dot" /> Advanced privacy controls</li>
                    <li><span className="dot" /> Exclusive campaigns and events</li>
                  </ul>
                  <button
                    type="button"
                    className="bb-plan-action-filled amber"
                    onClick={() => { setSelectedPlan("Hive Pro"); setSubView("checkout"); }}
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
                  <tr className="category-header">
                    <td colSpan={5}>COMMUNITY & GROUPS</td>
                  </tr>
                  <tr>
                    <td>Join public communities</td>
                    <td>✓</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Create private groups</td>
                    <td>—</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Unlimited private groups</td>
                    <td>—</td>
                    <td className="highlight-col">—</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Community management dashboard</td>
                    <td>—</td>
                    <td className="highlight-col">—</td>
                    <td>—</td>
                    <td>✓</td>
                  </tr>

                  <tr className="category-header">
                    <td colSpan={5}>SEARCH & PROFILES</td>
                  </tr>
                  <tr>
                    <td>Basic search and filters</td>
                    <td>✓</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Advanced search and filters</td>
                    <td>—</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Better profile visibility</td>
                    <td>Basic</td>
                    <td className="highlight-col">Better</td>
                    <td>High</td>
                    <td>Max</td>
                  </tr>
                  <tr>
                    <td>Featured profile badge</td>
                    <td>—</td>
                    <td className="highlight-col">—</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>

                  <tr className="category-header">
                    <td colSpan={5}>STORAGE & INSIGHTS</td>
                  </tr>
                  <tr>
                    <td>Create and share posts</td>
                    <td>✓</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>Save favorite posts and places</td>
                    <td>✓</td>
                    <td className="highlight-col">✓</td>
                    <td>✓</td>
                    <td>✓</td>
                  </tr>
                  <tr>
                    <td>More storage for photos and memories</td>
                    <td>1 GB</td>
                    <td className="highlight-col">5 GB</td>
                    <td>20 GB</td>
                    <td>Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="bb-compare-footer-note">All prices are shown in USD. Cancel anytime.</p>
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
                  <img src="/assets/home/figma-buzzy.png" alt="Avatar" className="bb-bil-avatar-img" />
                </div>
                <div className="bb-bil-info-grid">
                  <div className="bb-bil-info-row">
                    <span className="lbl">Full Name</span>
                    <span className="val">BeeBuddy</span>
                  </div>
                  <div className="bb-bil-info-row">
                    <span className="lbl">Email</span>
                    <span className="val text-[#ff7300] font-semibold">hello.beebuddy@gmail.com</span>
                  </div>
                  <div className="bb-bil-info-row">
                    <span className="lbl">Username</span>
                    <span className="val">BeeNguyen</span>
                  </div>
                </div>
              </div>

              <div className="bb-bil-plan-head">
                <CreditCard size={16} className="text-[#ff7300]" />
                <h3>Billing / Plan</h3>
              </div>
              <div className="bb-bil-plan-summary-row">
                <div className="bb-bil-plan-left">
                  <strong>BeeBuddy Explorer <span className="bb-bil-plan-pro-pill">Pro Plan</span></strong>
                  <p>Access to premium features, exclusive events and more!</p>
                </div>
                <div className="bb-bil-plan-right">
                  <div className="bb-bil-renewal-info">
                    <small>Next Renewal</small>
                    <strong>May 28, 2027</strong>
                    <small>Billing Cycle: Yearly</small>
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
                        <h3>Explorer</h3>
                        <small>Current active plan</small>
                      </div>
                    </div>
                    <span className="bb-active-pill">ACTIVE</span>
                  </div>
                  <div className="bb-sub-price-row">
                    <strong>$4.99</strong>
                    <span>/ month</span>
                    <small className="ml-auto">Next Renewal: <strong>May 28, 2027</strong></small>
                  </div>
                  <p className="bb-sub-info">
                    You&apos;re currently on the Explorer plan. This gives you advanced discovery tools, unlimited saved posts, and the ability to create private groups.
                  </p>
                  <div className="bb-sub-actions-row">
                    <button type="button" className="bb-btn-change-plan" onClick={() => setSubView("overview")}>
                      Change Plan
                    </button>
                    <button type="button" className="bb-btn-cancel-plan" onClick={() => alert("Subscription cancelled.")}>
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
                        <strong>$9.99</strong>
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
                        <strong>$19.99</strong>
                        <span>/ month</span>
                      </div>
                      <p>Unlock featured profile badges, unlimited private groups, and advanced event planning.</p>
                      <button type="button" className="bb-btn-upgrade-orange" onClick={() => { setSelectedPlan("Hive Pro"); setSubView("checkout"); }}>
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
                <span>All prices are shown in USD. Cancel anytime. No long-term commitments.</span>
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
                    <strong>Credit / Debit Card</strong>
                  </label>

                  <label className={`bb-payment-method-row ${paymentMethod === "paypal" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === "paypal"}
                      onChange={() => setPaymentMethod("paypal")}
                    />
                    <span>PayPal</span>
                  </label>

                  <label className={`bb-payment-method-row ${paymentMethod === "apple" ? "is-selected" : ""}`}>
                    <input
                      type="radio"
                      name="pay"
                      checked={paymentMethod === "apple"}
                      onChange={() => setPaymentMethod("apple")}
                    />
                    <span>Apple Pay</span>
                  </label>
                </div>

                {paymentMethod === "card" && (
                  <div className="bb-card-fields-grid">
                    <div className="bb-form-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="0000 0000 0000 0000" defaultValue="4242 •••• •••• 4242" />
                    </div>
                    <div className="bb-form-row-2">
                      <div className="bb-form-group">
                        <label>Expiry Date</label>
                        <input type="text" placeholder="MM/YY" defaultValue="12/28" />
                      </div>
                      <div className="bb-form-group">
                        <label>CVV</label>
                        <input type="text" placeholder="123" defaultValue="888" />
                      </div>
                    </div>
                    <div className="bb-form-group">
                      <label>Cardholder Name</label>
                      <input type="text" placeholder="John Doe" defaultValue="Jane Doe" />
                    </div>
                  </div>
                )}

                <h2 className="bb-checkout-section-title mt-8">Billing Address</h2>
                <div className="bb-billing-address-box">
                  <div className="bb-form-group">
                    <label>Country</label>
                    <select defaultValue="United States">
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                  <div className="bb-form-group">
                    <label>Full Name</label>
                    <input type="text" defaultValue="Jane Doe" />
                  </div>
                  <div className="bb-form-group">
                    <label>Address Line 1</label>
                    <input type="text" defaultValue="123 Main Street" />
                  </div>
                  <div className="bb-form-group">
                    <label>Address Line 2 (Optional)</label>
                    <input type="text" placeholder="Apt, suite, etc." />
                  </div>
                  <div className="bb-form-row-3">
                    <div className="bb-form-group">
                      <label>City</label>
                      <input type="text" defaultValue="San Francisco" />
                    </div>
                    <div className="bb-form-group">
                      <label>State/Province</label>
                      <input type="text" defaultValue="CA" />
                    </div>
                    <div className="bb-form-group">
                      <label>ZIP/Postal Code</label>
                      <input type="text" defaultValue="94103" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="bb-btn-checkout-submit"
                    onClick={() => {
                      alert("Billing details submitted!");
                    }}
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
                    <strong>{selectedPlan === "Free" ? "$0.00" : selectedPlan === "Explorer" ? "$4.99" : selectedPlan === "Buddy+" ? "$9.99" : "$19.99"}</strong>
                  </div>
                  <div className="bb-order-line">
                    <span>Taxes</span>
                    <strong>$0.00</strong>
                  </div>
                  <div className="bb-order-divider" />
                  <div className="bb-order-total-line">
                    <span>Total</span>
                    <strong>{selectedPlan === "Free" ? "$0.00" : selectedPlan === "Explorer" ? "$4.99" : selectedPlan === "Buddy+" ? "$9.99" : "$19.99"}</strong>
                  </div>

                  <button
                    type="button"
                    className="bb-btn-subscribe-now"
                    onClick={() => {
                      alert(`Subscription confirmed for ${selectedPlan} plan!`);
                      setSubView("manage");
                    }}
                  >
                    Subscribe Now
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

  const handleLogoutAll = () => {
    setLogoutNotice(true);
    setTimeout(() => setLogoutNotice(false), 4000);
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
                onClick={handleLogoutAll}
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
              onClick={() => setSecurityView("details")}
              role="button"
              tabIndex={0}
            >
              <div className="bb-current-session-left">
                <div className="bb-device-icon-box">💻</div>
                <div className="bb-current-session-info">
                  <strong>Google Chrome on macOS (Apple Silicon)</strong>
                  <small>IP Address: 192.168.1.15 • San Francisco, CA, USA</small>
                </div>
              </div>
              <span className="bb-current-session-pill">CURRENT SESSION</span>
            </div>

            {/* Recent Logins */}
            <div className="bb-recent-logins-block">
              <h3>Recent Logins</h3>

              <div className="bb-login-history-list">
                <div className="bb-login-history-row">
                  <div className="bb-log-info-group">
                    <div className="bb-log-icon-wrap active-icon">📱</div>
                    <div className="bb-log-details">
                      <strong>Safari on iPhone 15</strong>
                      <small>London, UK • 85.90.12.34</small>
                    </div>
                  </div>
                  <div className="bb-log-meta-group">
                    <span className="bb-log-time">2 hours ago</span>
                    <span className="bb-log-badge active">ACTIVE</span>
                  </div>
                </div>

                <div className="bb-login-history-row">
                  <div className="bb-log-info-group">
                    <div className="bb-log-icon-wrap">💻</div>
                    <div className="bb-log-details">
                      <strong>Firefox on Windows 11</strong>
                      <small>Paris, France • 109.12.67.54</small>
                    </div>
                  </div>
                  <div className="bb-log-meta-group">
                    <span className="bb-log-time">Yesterday</span>
                    <span className="bb-log-badge expired">EXPIRED</span>
                  </div>
                </div>

                <div className="bb-login-history-row">
                  <div className="bb-log-info-group">
                    <div className="bb-log-icon-wrap">💻</div>
                    <div className="bb-log-details">
                      <strong>Chrome on macOS (Apple Silicon)</strong>
                      <small>San Francisco, CA, USA • 192.168.1.12</small>
                    </div>
                  </div>
                  <div className="bb-log-meta-group">
                    <span className="bb-log-time">3 days ago</span>
                    <span className="bb-log-badge expired">EXPIRED</span>
                  </div>
                </div>

                <div className="bb-login-history-row">
                  <div className="bb-log-info-group">
                    <div className="bb-log-icon-wrap">📱</div>
                    <div className="bb-log-details">
                      <strong>Edge on Android</strong>
                      <small>Tokyo, Japan • 210.45.67.89</small>
                    </div>
                  </div>
                  <div className="bb-log-meta-group">
                    <span className="bb-log-time">1 week ago</span>
                    <span className="bb-log-badge expired">EXPIRED</span>
                  </div>
                </div>

                <div className="bb-login-history-row">
                  <div className="bb-log-info-group">
                    <div className="bb-log-icon-wrap">📱</div>
                    <div className="bb-log-details">
                      <strong>Safari on iPad Pro</strong>
                      <small>Berlin, Germany • 92.122.3.45</small>
                    </div>
                  </div>
                  <div className="bb-log-meta-group">
                    <span className="bb-log-time">2 weeks ago</span>
                    <span className="bb-log-badge expired">EXPIRED</span>
                  </div>
                </div>
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
                onClick={handleLogoutAll}
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
                <strong>Google Chrome on macOS (Apple Silicon)</strong>
                <small>IP Address: 192.168.1.15 • San Francisco, CA, USA</small>
              </div>
            </div>

            <div className="bb-telemetry-table">
              <div className="bb-telem-row">
                <span className="label">Device</span>
                <strong className="val">Google Chrome on macOS - Apple Silicon</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">IP Address</span>
                <strong className="val">192.168.1.15</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Location</span>
                <strong className="val">San Francisco, CA, USA</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Login Time</span>
                <strong className="val">Sep 5, 2026 at 10:32 AM</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Session Duration</span>
                <strong className="val">3h 27m</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Operating System</span>
                <strong className="val">macOS Sequoia 15.2</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Screen Resolution</span>
                <strong className="val">2560 × 1600</strong>
              </div>
              <div className="bb-telem-row">
                <span className="label">Status</span>
                <span className="bb-telem-badge-active">Active</span>
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
function CommunityDirectory() {
  const [viewMode, setViewMode] = useState<"directory" | "explore">("directory");
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState("Skills");
  const [availFilter, setAvailFilter] = useState("Availability");
  const [interestFilter, setInterestFilter] = useState("Interests");
  const [activeExploreTag, setActiveExploreTag] = useState("Design");
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [likedPosts, setLikedPosts] = useState<string[]>(["post-elena"]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentsTitle, setActiveCommentsTitle] = useState("Comments");
  const [openDropdown, setOpenDropdown] = useState<"skills" | "avail" | "interests" | null>(null);

  const toggleConnect = (name: string) => {
    setConnectedUsers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) =>
      prev.includes(postId) ? prev.filter((p) => p !== postId) : [...prev, postId]
    );
  };

  const openComments = (title: string = "Comments") => {
    setActiveCommentsTitle(title);
    setIsCommentsOpen(true);
  };

  const filteredMembers = useMemo(() => {
    return people.filter((member) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.location.toLowerCase().includes(q) ||
        member.tags.some((t) => t.toLowerCase().includes(q)) ||
        member.text.toLowerCase().includes(q);

      const matchSkill = skillFilter === "Skills" || member.skills.includes(skillFilter);
      const matchAvail = availFilter === "Availability" || member.availability === availFilter;
      const matchInterest = interestFilter === "Interests" || member.tags.includes(interestFilter);

      return matchQuery && matchSkill && matchAvail && matchInterest;
    });
  }, [searchQuery, skillFilter, availFilter, interestFilter]);

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
                  2,400+ members • 120+ shared activities this week
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
                  onClick={() => setOpenDropdown(openDropdown === "skills" ? null : "skills")}
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
                  onClick={() => setOpenDropdown(openDropdown === "avail" ? null : "avail")}
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
                    {["Interests", "Coffee", "Hiking", "Design", "Photography", "Coding", "Yoga", "Books"].map((i) => (
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

            {/* 8 Member Cards */}
            <div className="bb-figma-member-grid">
              {filteredMembers.map((member) => {
                const isConnected = connectedUsers.includes(member.name);
                return (
                  <article key={member.name} className="bb-figma-member-card">
                    <div className="bb-member-top-row">
                      <div className="bb-member-avatar-ring">
                        <img
                          src={`/assets/community/${member.avatar}`}
                          alt={member.name}
                          className="bb-member-avatar-img"
                        />
                      </div>
                      <div className="bb-member-meta">
                        <h3 className="bb-member-name">{member.name}</h3>
                        <p className="bb-member-role">{member.role}</p>
                      </div>
                    </div>

                    <div className="bb-member-location-row">
                      <MapPin size={14} className="bb-pin-icon" />
                      <span>{member.location}</span>
                    </div>

                    <p className="bb-member-bio">{member.text}</p>

                    <div className="bb-member-tags-row">
                      {member.tags.map((tag) => (
                        <span key={tag} className="bb-member-interest-chip">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={`bb-member-connect-btn ${isConnected ? "is-connected" : ""}`}
                      onClick={() => toggleConnect(member.name)}
                    >
                      {isConnected ? "Connected ✓" : "Connect"}
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Growth banner */}
            <div className="bb-growth-message-card">
              <h3 className="bb-growth-title">The hive is buzzing!</h3>
              <p className="bb-growth-sub">
                We&apos;re still growing. Invite your friends to join the adventure and build meaningful connections together.
              </p>
              <button
                type="button"
                className="bb-growth-invite-btn"
                onClick={() => {
                  navigator.clipboard?.writeText?.(window.location.href);
                  alert("Link copied! Share BeeBuddy with your friends.");
                }}
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

              <div className="bb-filter-pill-btn"><span>Interests</span><ChevronDown size={14} className="text-gray-400" /></div>
              <div className="bb-filter-pill-btn"><span>Skills</span><ChevronDown size={14} className="text-gray-400" /></div>
              <div className="bb-filter-pill-btn"><span>Availability</span><ChevronDown size={14} className="text-gray-400" /></div>
            </div>

            {/* Discover Friends by Interest */}
            <section className="bb-discover-friends-section">
              <div className="bb-discover-header-row">
                <h2 className="bb-discover-title">Discover Friends by Interest</h2>
                <div className="bb-discover-search-tag">
                  <Search size={14} className="text-gray-400" />
                  <input type="text" placeholder="Search or add tags..." className="bb-discover-tag-input" />
                </div>
              </div>

              <div className="bb-discover-tag-chips">
                {exploreInterests.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`bb-explore-tag-chip ${activeExploreTag === tag ? "is-active" : ""}`}
                    onClick={() => setActiveExploreTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="bb-explore-friends-grid">
                {[
                  { name: "Alex Rivera", role: "UX Designer", location: "Portland, OR", bio: "Looking for someone to grab coffee and talk design systems.", tags: ["Design", "Coffee", "Hiking"], avatar: "alex_rivera.png" },
                  { name: "Jordan Lee", role: "Creative Writer", location: "Austin, TX", bio: "Always down for a weekend hiking trip and notebook brain storming.", tags: ["Coffee", "Hiking", "Yoga"], avatar: "jordan_lee.png" },
                  { name: "Marcus Chen", role: "Software Developer", location: "San Francisco, CA", bio: "Looking for design enthusiasts who also enjoy trail running.", tags: ["Design", "Coding", "Hiking"], avatar: "marcus_chen.png" },
                ].map((friend) => {
                  const isConnected = connectedUsers.includes(friend.name);
                  return (
                    <div key={friend.name} className="bb-explore-friend-card">
                      <div className="bb-member-top-row">
                        <div className="bb-member-avatar-ring">
                          <img src={`/assets/community/${friend.avatar}`} alt={friend.name} className="bb-member-avatar-img" />
                        </div>
                        <div className="bb-member-meta">
                          <h4 className="bb-member-name">{friend.name}</h4>
                          <p className="bb-member-role">{friend.role}</p>
                        </div>
                      </div>
                      <div className="bb-member-location-row"><MapPin size={13} className="bb-pin-icon" /><span>{friend.location}</span></div>
                      <p className="bb-member-bio">{friend.bio}</p>
                      <div className="bb-member-tags-row">
                        {friend.tags.map((t) => <span key={t} className="bb-member-interest-chip">{t}</span>)}
                      </div>
                      <button
                        type="button"
                        className={`bb-member-connect-btn ${isConnected ? "is-connected" : ""}`}
                        onClick={() => toggleConnect(friend.name)}
                      >
                        {isConnected ? "Connected ✓" : "Connect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* What's Buzzing Feed */}
            <section className="bb-whats-buzzing-section">
              <h2 className="bb-buzzing-section-title">What&apos;s Buzzing</h2>

              <div className="bb-buzzing-posts-list">
                {/* Post 1: Elena */}
                <article className="bb-buzzing-post-card">
                  <div className="bb-post-header-row">
                    <div className="bb-post-author-group">
                      <img src="/assets/community/elena_rossi.png" alt="Elena Rossi" className="bb-post-author-avatar" />
                      <div>
                        <h4 className="bb-post-author-name">Elena Rossi</h4>
                        <p className="bb-post-author-role">Content Creator</p>
                      </div>
                    </div>
                    <div className="bb-post-meta-right">
                      <Clock size={14} className="text-gray-400" />
                      <span className="bb-post-time">2 hours ago</span>
                      <span className="bb-post-public-badge"><Globe size={12} /><span>Public</span></span>
                    </div>
                  </div>
                  <p className="bb-post-content-text">
                    Is anyone planning on hitting the Forest Park trails this Saturday morning? Grab a coffee afterwards and talk about new photography setups! Let&apos;s get a small group going
                  </p>
                  <div className="bb-member-tags-row">
                    {["Hiking", "Coffee", "Photography"].map((t) => <span key={t} className="bb-member-interest-chip">{t}</span>)}
                  </div>
                  <div className="bb-post-actions-bar">
                    <button type="button" className={`bb-post-action-btn ${likedPosts.includes("post-elena") ? "is-liked" : ""}`} onClick={() => toggleLike("post-elena")}>
                      <Heart size={16} className={likedPosts.includes("post-elena") ? "fill-current text-[#ff7300]" : ""} />
                      <span>{likedPosts.includes("post-elena") ? "25 Likes" : "24 Likes"}</span>
                    </button>
                    <button type="button" className="bb-post-action-btn" onClick={() => openComments("Comments on Elena's Post")}>
                      <MessageSquare size={16} /><span>Comments</span>
                    </button>
                    <button type="button" className="bb-post-action-btn" onClick={() => alert("Post link copied!")}>
                      <Share2 size={16} /><span>Share</span>
                    </button>
                  </div>
                </article>

                {/* Post 2: Priya (with locked circle-only overlay) */}
                <article className="bb-buzzing-post-card">
                  <div className="bb-post-header-row">
                    <div className="bb-post-author-group">
                      <img src="/assets/community/priya_nair.png" alt="Priya Nair" className="bb-post-author-avatar" />
                      <div>
                        <h4 className="bb-post-author-name">Priya Nair</h4>
                        <p className="bb-post-author-role">Product Designer</p>
                      </div>
                    </div>
                    <div className="bb-post-meta-right">
                      <Clock size={14} className="text-gray-400" />
                      <span className="bb-post-time">5 hours ago</span>
                      <span className="bb-post-public-badge"><Globe size={12} /><span>Public</span></span>
                    </div>
                  </div>
                  <p className="bb-post-content-text">
                    Just completed a minimalist redesign of our community&apos;s local coffee shop landing page. Would love to get some peer reviews from fellow designers around Portland over a hot brew!
                  </p>
                  <div className="bb-member-tags-row">
                    {["Design", "Coffee", "Coding"].map((t) => <span key={t} className="bb-member-interest-chip">{t}</span>)}
                  </div>
                  <div className="bb-locked-circle-box">
                    <div className="bb-locked-badge"><Lock size={12} /><span>Circle Only</span></div>
                    <p className="bb-locked-copy">Only connections can view this post</p>
                    <button type="button" className={`bb-locked-connect-btn ${connectedUsers.includes("Priya Nair") ? "is-connected" : ""}`} onClick={() => toggleConnect("Priya Nair")}>
                      {connectedUsers.includes("Priya Nair") ? "Connected ✓" : "Connect"}
                    </button>
                  </div>
                  <div className="bb-post-actions-bar">
                    <button type="button" className={`bb-post-action-btn ${likedPosts.includes("post-priya") ? "is-liked" : ""}`} onClick={() => toggleLike("post-priya")}>
                      <Heart size={16} className={likedPosts.includes("post-priya") ? "fill-current text-[#ff7300]" : ""} />
                      <span>{likedPosts.includes("post-priya") ? "43 Likes" : "42 Likes"}</span>
                    </button>
                    <button type="button" className="bb-post-action-btn" onClick={() => openComments("Comments on Priya's Post")}>
                      <MessageSquare size={16} /><span>Comments</span>
                    </button>
                    <button type="button" className="bb-post-action-btn" onClick={() => alert("Post link copied!")}>
                      <Share2 size={16} /><span>Share</span>
                    </button>
                  </div>
                </article>
              </div>
            </section>

            <div className="bb-growth-message-card bb-explore-growth-card">
              <img src="/assets/home/figma-buzzy.png" alt="Buzzy" className="bb-explore-growth-buzzy" />
              <h3 className="bb-growth-title">The hive is buzzing!</h3>
              <p className="bb-growth-sub">Great things are built together. Invite friends to join our cozy community space and explore adventures side-by-side.</p>
              <button type="button" className="bb-growth-invite-btn" onClick={() => alert("Invite link copied!")}>Invite Friends</button>
            </div>
          </div>
        )}
      </div>

      <CommentsModal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        title={activeCommentsTitle}
      />
    </div>
  );
}
