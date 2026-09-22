"use client";

import Link from "next/link";
import { useState, FormEvent } from "react";

export default function FigmaFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  };

  return (
    <footer className="bb-figma-full-footer">
      {/* Mountain landscape backdrop image */}
      <div className="bb-footer-mountain-backdrop" aria-hidden="true">
        <img
          src="/assets/home/figma-footer-mountains.png"
          alt=""
          className="bb-footer-mountain-img"
        />
        <div className="bb-footer-mountain-overlay" />
      </div>

      <div className="bb-footer-main-container">
        {/* Top section: 4 link columns on left, Slogan + Newsletter on right */}
        <div className="bb-footer-content-grid">
          {/* Left: 4 Navigation Columns */}
          <div className="bb-footer-nav-columns">
            <div className="bb-footer-col">
              <h4 className="bb-footer-col-title">PRODUCT</h4>
              <Link href="/community" className="bb-footer-link">find your people</Link>
              <Link href="/community" className="bb-footer-link">shared adventures</Link>
              <Link href="/get-started" className="bb-footer-link">build your circle</Link>
              <Link href="/signup" className="bb-footer-link">download app</Link>
              <div className="bb-footer-col-spacer" />
              <span className="bb-footer-subtext">Social Connection Platform</span>
              <span className="bb-footer-subtext">Built For Real Connection</span>
              <span className="bb-footer-subtext">Designed For Shared Journeys</span>
            </div>

            <div className="bb-footer-col">
              <h4 className="bb-footer-col-title">DISCOVER</h4>
              <Link href="/#services" className="bb-footer-link">how it works</Link>
              <Link href="/community" className="bb-footer-link">explore activities</Link>
              <Link href="/community" className="bb-footer-link">community stories</Link>
              <Link href="/meet-buzzy" className="bb-footer-link">meet buzzy</Link>
              <div className="bb-footer-col-spacer" />
              <span className="bb-footer-subtext">Connect More Easily And Share</span>
              <span className="bb-footer-subtext">Better Moments</span>
            </div>

            <div className="bb-footer-col">
              <h4 className="bb-footer-col-title">COMMUNITY</h4>
              <a href="mailto:hello.beebuddy@gmail.com" className="bb-footer-link">hello.beebuddy@gmail.com</a>
              <Link href="/community" className="bb-footer-link">events & meetups</Link>
              <Link href="/start-your-journey" className="bb-footer-link">share your story</Link>
              <Link href="/community" className="bb-footer-link">community guidelines</Link>
              <div className="bb-footer-col-spacer" />
              <span className="bb-footer-subtext">We&apos;d Love To Hear From You</span>
            </div>

            <div className="bb-footer-col">
              <h4 className="bb-footer-col-title">SUPPORT</h4>
              <Link href="/help" className="bb-footer-link">help center</Link>
              <Link href="/security" className="bb-footer-link">safety & trust</Link>
              <Link href="/privacy" className="bb-footer-link">privacy policy</Link>
              <Link href="/terms" className="bb-footer-link">terms of use</Link>
              <div className="bb-footer-col-spacer" />
              <span className="bb-footer-subtext">Join A Community Of</span>
              <span className="bb-footer-subtext">Mindful Explorers</span>
            </div>
          </div>

          {/* Right: Slogan block */}
          <div className="bb-footer-slogan-block">
            <h2 className="bb-slogan-line">Meet Today</h2>
            <h2 className="bb-slogan-line">Connect Deeper</h2>
            <h2 className="bb-slogan-gradient">Grow Together</h2>
            <p className="bb-slogan-description">
              Every Connection Starts With A Hello. BeeBuddy Helps You Find Your People, Share Real Experiences, And Build Friendships That Grow Beyond The Screen
            </p>
          </div>
        </div>

        {/* Newsletter Section with Peeking Buzzy mascot */}
        <div className="bb-footer-newsletter-wrap">
          {/* Peeking Buzzy Mascot perched on top-left of the card */}
          <div className="bb-newsletter-buzzy-anchor" aria-hidden="true">
            <img
              src="/assets/home/figma-buzzy.png"
              alt="Buzzy Mascot"
              className="bb-newsletter-buzzy-img"
            />
          </div>

          <div className="bb-glass-newsletter-card">
            <div className="bb-glass-header-row">
              <div className="bb-glass-bee-badge">
                <img src="/assets/ui/logo-mark.svg" alt="" className="bb-glass-bee-icon" />
              </div>
              <div className="bb-glass-text-group">
                <h3 className="bb-glass-card-title">Stay In The Loop</h3>
                <p className="bb-glass-card-sub">Give An Email, Get The Newsletter</p>
              </div>
            </div>

            {subscribed ? (
              <div className="bb-glass-success-msg">
                ✓ You&apos;re subscribed! Welcome to the BeeBuddy hive.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="bb-glass-form-row">
                <input
                  type="email"
                  required
                  placeholder="Your@Email.Com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bb-glass-email-input"
                />
                <button type="submit" className="bb-glass-submit-btn">
                  <span>START YOUR JOURNEY</span>
                  <span className="bb-submit-arrow">&gt;</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Dark Copyright & Legal Bar at the very bottom */}
      <div className="bb-footer-bottom-dark-bar">
        <div className="bb-bottom-bar-inner">
          <p className="bb-bottom-copyright">
            © 2026 BeeBuddy. All rights reserved
          </p>

          <div className="bb-bottom-links-wrap">
            <Link href="/privacy" className="bb-bottom-legal-link">Privacy</Link>
            <span className="bb-bottom-divider">|</span>
            <Link href="/terms" className="bb-bottom-legal-link">Terms</Link>
            <span className="bb-bottom-divider">|</span>
            <Link href="/cookies" className="bb-bottom-legal-link">Cookies</Link>
            <span className="bb-bottom-divider">|</span>
            <Link href="/" className="bb-bottom-brand-logo" aria-label="BeeBuddy">
              <img src="/assets/ui/logo-mark.svg" alt="" className="bb-bottom-logo-mark" />
              <span className="bb-bottom-logo-text">BeeBuddy</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
