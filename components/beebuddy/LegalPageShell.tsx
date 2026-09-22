"use client";

import Link from "next/link";
import { useState } from "react";
import FigmaHeader from "./FigmaHeader";
import FigmaFooter from "./FigmaFooter";
import { privacyDoc, termsDoc, cookiesDoc, LegalDoc } from "@/lib/legalData";

export type LegalDocType = "privacy" | "terms" | "cookies";

export default function LegalPageShell({ type, authenticated = false }: { type: LegalDocType; authenticated?: boolean }) {
  const docMap: Record<LegalDocType, LegalDoc> = {
    privacy: privacyDoc,
    terms: termsDoc,
    cookies: cookiesDoc,
  };
  const doc = docMap[type];

  // Interactive state for Cookie Preferences page
  const [cookieToggles, setCookieToggles] = useState({
    essential: true,
    preference: false,
    analytics: false,
    personalization: false,
    marketing: false,
  });
  const [savedNotice, setSavedNotice] = useState("");

  const toggleCookie = (key: keyof typeof cookieToggles) => {
    if (key === "essential") return; // Always active
    setCookieToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAcceptAll = () => {
    setCookieToggles({
      essential: true,
      preference: true,
      analytics: true,
      personalization: true,
      marketing: true,
    });
    setSavedNotice("All optional cookies accepted.");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  const handleRejectOptional = () => {
    setCookieToggles({
      essential: true,
      preference: false,
      analytics: false,
      personalization: false,
      marketing: false,
    });
    setSavedNotice("Optional cookies rejected. Only essential cookies will be used.");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  const handleSavePreferences = () => {
    setSavedNotice("Your cookie preferences have been saved.");
    setTimeout(() => setSavedNotice(""), 3000);
  };

  return (
    <div className="bb-site bb-legal-figma-site">
      <FigmaHeader authenticated={authenticated} />

      <main className="bb-canvas bb-legal-showcase-canvas">
        {/* Document Header */}
        <header className="bb-legal-header-block">
          <h1 className="bb-legal-main-title">{doc.title}</h1>
          <p className="bb-legal-updated-sub">Last updated: {doc.lastUpdated}</p>
        </header>

        <div className="bb-legal-split-layout">
          {/* Left Column: Sticky Quick Links Navigation */}
          <aside className="bb-legal-sidebar-nav" aria-label="Quick links">
            <div className="bb-legal-sidebar-inner">
              <h3 className="bb-quick-links-title">Quick Links</h3>
              <nav className="bb-quick-links-list">
                {doc.quickLinks.map((item, idx) => (
                  <a
                    key={item}
                    href={`#section-${idx + 1}`}
                    className="bb-quick-link-item"
                  >
                    {item}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Right Column: Full Sections Content */}
          <section className="bb-legal-content-column">
            {doc.sections.map((section, idx) => {
              const secId = `section-${idx + 1}`;
              const isCookieChoiceSection =
                type === "cookies" &&
                section.title.toLowerCase().includes("choose your cookie preferences");
              const isYourChoicesSection =
                type === "cookies" && section.title.toLowerCase().includes("your choices");

              return (
                <article key={section.title} id={secId} className="bb-legal-doc-section">
                  {/* Orange circle dot + Section title */}
                  <h2 className="bb-legal-section-heading">
                    <span className="bb-orange-dot-marker" aria-hidden="true" />
                    <span>{section.title}</span>
                  </h2>

                  {/* Interactive cards on Cookie Preferences page */}
                  {isCookieChoiceSection && (
                    <div className="bb-cookie-preference-cards-wrap">
                      <div className="bb-cookie-pref-card">
                        <div className="bb-cookie-pref-info">
                          <strong>Essential Cookies</strong>
                          <p>Required for core website functions such as secure login, account sessions, navigation, fraud prevention, and remembering your cookie choices. These cookies cannot be disabled because BeeBuddy may not function correctly without them.</p>
                        </div>
                        <span className="bb-cookie-always-active">Always Active</span>
                      </div>

                      <div className="bb-cookie-pref-card">
                        <div className="bb-cookie-pref-info">
                          <strong>Preference Cookies</strong>
                          <p>Remember choices such as language, theme, display preferences, recently viewed communities, and other settings that make BeeBuddy feel more personal.</p>
                        </div>
                        <button
                          type="button"
                          className={`bb-cookie-toggle-btn ${cookieToggles.preference ? "is-allowed" : ""}`}
                          onClick={() => toggleCookie("preference")}
                        >
                          <span className="bb-cookie-toggle-dot" />
                          <span>{cookieToggles.preference ? "Allowed" : "Allow"}</span>
                        </button>
                      </div>

                      <div className="bb-cookie-pref-card">
                        <div className="bb-cookie-pref-info">
                          <strong>Analytics Cookies</strong>
                          <p>Help us understand how visitors use BeeBuddy, such as which pages are visited, which features are used, and where users experience problems.</p>
                        </div>
                        <button
                          type="button"
                          className={`bb-cookie-toggle-btn ${cookieToggles.analytics ? "is-allowed" : ""}`}
                          onClick={() => toggleCookie("analytics")}
                        >
                          <span className="bb-cookie-toggle-dot" />
                          <span>{cookieToggles.analytics ? "Allowed" : "Allow"}</span>
                        </button>
                      </div>

                      <div className="bb-cookie-pref-card">
                        <div className="bb-cookie-pref-info">
                          <strong>Personalization Cookies</strong>
                          <p>Help BeeBuddy provide more relevant suggestions based on interests and interactions, such as communities, activities, events, or content you may enjoy.</p>
                        </div>
                        <button
                          type="button"
                          className={`bb-cookie-toggle-btn ${cookieToggles.personalization ? "is-allowed" : ""}`}
                          onClick={() => toggleCookie("personalization")}
                        >
                          <span className="bb-cookie-toggle-dot" />
                          <span>{cookieToggles.personalization ? "Allowed" : "Allow"}</span>
                        </button>
                      </div>

                      <div className="bb-cookie-pref-card">
                        <div className="bb-cookie-pref-info">
                          <strong>Marketing Cookies</strong>
                          <p>Used only if BeeBuddy runs promotional or advertising campaigns. They may help measure campaign performance or show more relevant promotions.</p>
                        </div>
                        <button
                          type="button"
                          className={`bb-cookie-toggle-btn ${cookieToggles.marketing ? "is-allowed" : ""}`}
                          onClick={() => toggleCookie("marketing")}
                        >
                          <span className="bb-cookie-toggle-dot" />
                          <span>{cookieToggles.marketing ? "Allowed" : "Allow"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Body paragraphs and bullet items */}
                  {!isCookieChoiceSection && section.content.length > 0 && (
                    <div className="bb-legal-section-body">
                      {section.content.map((paragraph, pIdx) => {
                        const isBullet =
                          paragraph.startsWith("•") ||
                          paragraph.startsWith("-") ||
                          paragraph.startsWith("+");
                        return isBullet ? (
                          <li key={pIdx} className="bb-legal-bullet-item">
                            {paragraph.replace(/^[•\-+]\s*/, "")}
                          </li>
                        ) : (
                          <p key={pIdx} className="bb-legal-paragraph">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions on Cookie Your Choices section */}
                  {isYourChoicesSection && (
                    <div className="bb-cookie-actions-group">
                      <button
                        type="button"
                        className="bb-cookie-action-btn primary"
                        onClick={handleAcceptAll}
                      >
                        Accept All
                      </button>
                      <button
                        type="button"
                        className="bb-cookie-action-btn secondary"
                        onClick={handleRejectOptional}
                      >
                        Reject Optional
                      </button>
                      <button
                        type="button"
                        className="bb-cookie-action-btn tertiary"
                        onClick={handleSavePreferences}
                      >
                        Save Preferences
                      </button>
                      {savedNotice && (
                        <span className="bb-cookie-save-toast">✓ {savedNotice}</span>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {/* Bottom CTA Banner matching Figma 131:459 & 131:460 */}
            <div className="bb-legal-journey-cta-card">
              <h3 className="bb-legal-cta-heading">Ready to start your journey?</h3>
              <p className="bb-legal-cta-sub">
                Join a community of mindful explorers today. Discover new experiences and build friendships that grow beyond the screen.
              </p>
              <Link href="/signup" className="bb-legal-start-btn">
                <span>START YOUR JOURNEY</span>
                <span className="bb-arrow">&gt;</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Mountain landscape footer with newsletter */}
      <FigmaFooter />
    </div>
  );
}
