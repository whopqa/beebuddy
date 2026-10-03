"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { NOTIFICATION_PREFERENCES_CHANGED_EVENT, notificationsApi } from "@/lib/notifications-client";

export default function FigmaHeader({ authenticated = false, designHome = false }: { authenticated?: boolean; designHome?: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(authenticated);
  const [user, setUser] = useState<WebUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  useEffect(() => {
    let active = true;
    const refreshUnreadCount = () => {
      void notificationsApi.list(undefined, 1, true)
        .then((page) => { if (active) setUnreadCount(page.unreadCount); })
        .catch(() => undefined);
    };
    window.addEventListener(NOTIFICATION_PREFERENCES_CHANGED_EVENT, refreshUnreadCount);
    webAuth.me()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setIsAuth(true);
        refreshUnreadCount();
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setIsAuth(false);
        setUnreadCount(0);
      });
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATION_PREFERENCES_CHANGED_EVENT, refreshUnreadCount);
    };
  }, []);

  const homePath = isAuth ? "/home" : "/";
  const hasCustomAvatar = Boolean(user?.profile?.avatarUrl && !user.profile.avatarUrl.includes("/assets/"));

  return (
    <>
      <header className="bb-figma-topbar">
        {/* Top decorative gradient strips matching Figma Rectangle 13 & 14 */}
        <div className="bb-topbar-strips">
          <div className="bb-topbar-strip-orange" />
          <div className="bb-topbar-strip-black" />
        </div>

        <div className="bb-topbar-inner">
          {/* Left: 3-line Hamburger Menu Toggle (visible on all viewports per Figma) */}
          <div className="bb-topbar-brand-wrap">
            <button
              className="bb-topbar-menu-toggle"
              type="button"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-expanded={drawerOpen}
              aria-label="Toggle site navigation drawer"
            >
              {designHome ? <img src="/assets/home/intro-menu.svg" alt="" /> : <><span className="bb-hamburger-bar" /><span className="bb-hamburger-bar" /><span className="bb-hamburger-bar" /></>}
            </button>

            {/* Brand Logo */}
            <Link href={homePath} className="bb-topbar-logo" aria-label="BeeBuddy home">
              <img src={designHome ? "/assets/home/intro-logo-mark.svg" : "/assets/ui/logo-mark.svg"} alt="" className="bb-topbar-logo-mark" />
              <img src={designHome ? "/assets/home/intro-logo-word.svg" : "/assets/ui/logo-word.svg"} alt="BeeBuddy" className="bb-topbar-logo-word" />
            </Link>

            {/* Circular Search Button with magenta/purple outline */}
            <Link
              className="bb-topbar-search-btn"
              aria-label="Search"
              href="/community"
            >
              {designHome ? <img src="/assets/home/intro-search.svg" alt="" /> : <Search size={16} className="text-[#a855f7]" />}
            </Link>
          </div>

          {/* Center Navigation Links */}
          <nav className="bb-topbar-nav" id="site-navigation" aria-label="Main Navigation">
            <Link href={`${homePath}#about`} className="bb-topbar-nav-link">
              About
            </Link>
            <Link href={`${homePath}#services`} className="bb-topbar-nav-link">
              Services
            </Link>
            <Link href={`${homePath}#community`} className="bb-topbar-nav-link">
              Community
            </Link>
          </nav>

          {/* Right side: Authenticated (Bell + Avatar) vs Unauthenticated (Sign in + Create account) */}
          {!isAuth ? (
            <div className="bb-topbar-actions">
              <Link href="/login" className="bb-topbar-signin">
                Sign in
              </Link>
              <Link href="/signup" className="bb-topbar-signup">
                Create account
              </Link>
            </div>
          ) : (
            <div className="bb-topbar-actions bb-topbar-user-actions">
              <Link
                className="bb-topbar-bell-btn"
                href="/notifications"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && <span className="bb-topbar-bell-dot" />}
              </Link>

              <div className="bb-topbar-avatar-wrap">
                <Link
                  className={`bb-topbar-avatar-btn ${hasCustomAvatar ? "" : "is-default-avatar"}`}
                  href="/account"
                  aria-label="Account Info"
                >
                  <img
                    src={hasCustomAvatar ? user?.profile?.avatarUrl || "" : "/assets/home/OngChuaGanAvatar.png"}
                    alt="User Avatar"
                    className="bb-topbar-avatar-img"
                  />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Figma's compact left Settings panel; existing destination pages stay available. */}
      {drawerOpen && (
        <div className="bb-settings-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="bb-settings-panel" role="dialog" aria-modal="true" aria-label="Settings navigation" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="bb-settings-panel-heading" onClick={() => setDrawerOpen(false)} aria-label="Close settings navigation">
              <img src="/assets/home/settings-menu.svg" alt="" />
              <span>Settings</span>
            </button>
            <nav className="bb-settings-panel-links" aria-label="Settings">
              <Link href="/settings" onClick={() => setDrawerOpen(false)}><img src="/assets/home/settings-gear.svg" alt="" /><span>Settings</span></Link>
              <Link href="/account" onClick={() => setDrawerOpen(false)}><img src="/assets/home/settings-user.svg" alt="" /><span>Account Info</span></Link>
              <Link href="/billing" onClick={() => setDrawerOpen(false)}><img src="/assets/home/settings-billing.svg" alt="" /><span>Billing</span></Link>
              <Link href="/security" onClick={() => setDrawerOpen(false)}><img src="/assets/home/settings-shield.svg" alt="" /><span>Security</span></Link>
              <Link href="/help" onClick={() => setDrawerOpen(false)}><img src="/assets/home/settings-help.svg" alt="" /><span>Help &amp; Support</span></Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
