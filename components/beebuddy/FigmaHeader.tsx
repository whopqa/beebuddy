"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Search, Menu, X } from "lucide-react";
import { webAuth } from "@/lib/auth-client";
import type { WebUser } from "@/lib/auth-types";
import { notificationsApi } from "@/lib/notifications-client";

export default function FigmaHeader({ authenticated = false }: { authenticated?: boolean }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [isAuth, setIsAuth] = useState(authenticated);
  const [user, setUser] = useState<WebUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    webAuth.me()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setIsAuth(true);
        void notificationsApi.list(undefined, 1, true).then((page) => setUnreadCount(page.unreadCount)).catch(() => undefined);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setIsAuth(false);
      });
    return () => { active = false; };
  }, []);

  const homePath = isAuth ? "/home" : "/";

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
              <span className="bb-hamburger-bar" />
              <span className="bb-hamburger-bar" />
              <span className="bb-hamburger-bar" />
            </button>

            {/* Brand Logo */}
            <Link href={homePath} className="bb-topbar-logo" aria-label="BeeBuddy home">
              <img src="/assets/ui/logo-mark.svg" alt="" className="bb-topbar-logo-mark" />
              <img src="/assets/ui/logo-word.svg" alt="BeeBuddy" className="bb-topbar-logo-word" />
            </Link>

            {/* Circular Search Button with magenta/purple outline */}
            <Link
              className="bb-topbar-search-btn"
              aria-label="Search"
              href="/discover"
            >
              <Search size={16} className="text-[#a855f7]" />
            </Link>
          </div>

          {/* Center Navigation Links */}
          <nav className="bb-topbar-nav" id="site-navigation" aria-label="Main Navigation">
            {isAuth && <Link href="/home" className="bb-topbar-nav-link">Dashboard</Link>}
            <Link href={`${homePath}#about`} className="bb-topbar-nav-link">
              About
            </Link>
            <Link href={`${homePath}#services`} className="bb-topbar-nav-link">
              Services
            </Link>
            <Link href="/community" className="bb-topbar-nav-link">
              Community
            </Link>
            <Link href="/discover" className="bb-topbar-nav-link">
              Discover
            </Link>
            {isAuth && <Link href="/messages" className="bb-topbar-nav-link">Messages</Link>}
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
                <button
                  className="bb-topbar-avatar-btn"
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  <img
                    src="/assets/home/figma-buzzy.png"
                    alt="User Avatar"
                    className="bb-topbar-avatar-img"
                  />
                </button>

                {accountOpen && (
                  <div className="bb-topbar-dropdown-menu" role="menu">
                    <div className="bb-dropdown-user-header">
                      <strong>{user?.profile?.fullName || "BeeBuddy Member"}</strong>
                      <span>{user?.email || ""}</span>
                    </div>
                    <div className="bb-dropdown-divider" />
                    <AccountMenuItem href="/account" icon="account-user.svg" label="Account Info" close={() => setAccountOpen(false)} />
                    <AccountMenuItem href="/billing" icon="account-billing.svg" label="Billing" close={() => setAccountOpen(false)} />
                    <AccountMenuItem href="/security" icon="account-security.svg" label="Security" close={() => setAccountOpen(false)} />
                    <AccountMenuItem href="/help" icon="account-help.svg" label="Help & Support" close={() => setAccountOpen(false)} />
                    <AccountMenuItem href="/settings" icon="account-settings.svg" label="Settings" close={() => setAccountOpen(false)} />
                    <div className="bb-dropdown-divider" />
                    <AccountMenuItem
                      href="/"
                      icon="account-logout.svg"
                      label="Log out"
                      close={() => {
                        setAccountOpen(false);
                        void webAuth.logout().finally(() => {
                          setUser(null);
                          setIsAuth(false);
                          window.location.href = "/";
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Slide-over Side Navigation Drawer (Toggled by hamburger button) */}
      {drawerOpen && (
        <div className="bb-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="bb-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="bb-drawer-header">
              <Link href={homePath} className="bb-topbar-logo" onClick={() => setDrawerOpen(false)}>
                <img src="/assets/ui/logo-mark.svg" alt="" className="bb-topbar-logo-mark" />
                <span className="bb-topbar-logo-text">eebuddy</span>
              </Link>
              <button
                type="button"
                className="bb-drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X size={22} />
              </button>
            </div>

            <div className="bb-drawer-body">
              <div className="bb-drawer-section">
                <span className="bb-drawer-label">MAIN</span>
                <Link href={homePath} onClick={() => setDrawerOpen(false)}>Home</Link>
                {isAuth && <Link href="/home" onClick={() => setDrawerOpen(false)}>My Dashboard</Link>}
                <Link href={`${homePath}#about`} onClick={() => setDrawerOpen(false)}>About Us</Link>
                <Link href={`${homePath}#services`} onClick={() => setDrawerOpen(false)}>Services</Link>
                <Link href="/community" onClick={() => setDrawerOpen(false)}>Community Members</Link>
                <Link href="/discover" onClick={() => setDrawerOpen(false)}>Discover People</Link>
                {isAuth && <Link href="/messages" onClick={() => setDrawerOpen(false)}>Messages</Link>}
                <Link href="/meet-buzzy" onClick={() => setDrawerOpen(false)}>Meet Buzzy</Link>
              </div>

              <div className="bb-drawer-section">
                <span className="bb-drawer-label">ONBOARDING & ACCOUNT</span>
                <Link href="/get-started" onClick={() => setDrawerOpen(false)}>Get Started Walkthrough</Link>
                <Link href="/start-your-journey" onClick={() => setDrawerOpen(false)}>Start Your Journey</Link>
                <Link href="/notifications" onClick={() => setDrawerOpen(false)}>Notifications</Link>
                <Link href="/account" onClick={() => setDrawerOpen(false)}>Account Profile</Link>
                <Link href="/settings" onClick={() => setDrawerOpen(false)}>Settings & Preferences</Link>
                <Link href="/billing" onClick={() => setDrawerOpen(false)}>Billing & Plans</Link>
                <Link href="/security" onClick={() => setDrawerOpen(false)}>Security & Sessions</Link>
                <Link href="/help" onClick={() => setDrawerOpen(false)}>Help & Support</Link>
              </div>

              <div className="bb-drawer-section">
                <span className="bb-drawer-label">LEGAL & POLICIES</span>
                <Link href="/privacy" onClick={() => setDrawerOpen(false)}>Privacy Policy</Link>
                <Link href="/terms" onClick={() => setDrawerOpen(false)}>Terms of Use</Link>
                <Link href="/cookies" onClick={() => setDrawerOpen(false)}>Cookie Preferences</Link>
              </div>
            </div>

            <div className="bb-drawer-footer">
              {!isAuth ? (
                <div className="bb-drawer-auth-btns">
                  <Link href="/login" className="bb-drawer-signin" onClick={() => setDrawerOpen(false)}>Sign In</Link>
                  <Link href="/signup" className="bb-drawer-signup" onClick={() => setDrawerOpen(false)}>Create Account</Link>
                </div>
              ) : (
                <div className="bb-drawer-user-info">
                  <img src="/assets/home/figma-buzzy.png" alt="" className="w-8 h-8 rounded-full" />
                  <span>{user?.profile?.fullName || "BeeBuddy Member"}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AccountMenuItem({
  href,
  icon,
  label,
  close,
}: {
  href: string;
  icon: string;
  label: string;
  close: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={close} className="bb-dropdown-item">
      <img src={`/assets/ui/${icon}`} alt="" className="bb-dropdown-icon" />
      <span>{label}</span>
    </Link>
  );
}
