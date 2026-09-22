"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import FigmaHeader from "./FigmaHeader";
import SimpleFooter from "./SimpleFooter";

const buzzyTraits = [
  { icon: "♥", label: "Friendly" },
  { icon: "★", label: "Helpful" },
  { icon: "★", label: "Curious" },
  { icon: "●", label: "Fun" },
];

const buzzyServices = [
  {
    icon: "👥",
    title: "Find friends",
    desc: "Helps you meet like-minded people based on your interests.",
  },
  {
    icon: "📅",
    title: "Suggest activities",
    desc: "Recommends fun activities you can do together.",
  },
  {
    icon: "🌐",
    title: "Guide communities",
    desc: "Points you to the right communities where you belong.",
  },
  {
    icon: "🎁",
    title: "Celebrate moments",
    desc: "Cheers with you on your milestones and new friendships.",
  },
  {
    icon: "💬",
    title: "Spark conversations",
    desc: "Gives friendly prompts to help you start meaningful chats.",
  },
  {
    icon: "⭐",
    title: "Give tips",
    desc: "Shares helpful tips to make your experience easier and more fun.",
  },
];

const buzzyAngles = [
  { title: "Front View", img: "/assets/buzzy/buzzy_front_view.png" },
  { title: "Side View", img: "/assets/buzzy/buzzy_side_view.png" },
  { title: "Back View", img: "/assets/buzzy/buzzy_back_view.png" },
  { title: "3/4 View", img: "/assets/buzzy/buzzy_3_4_view.png" },
];

const buzzyExpressions = [
  { title: "Happy", img: "/assets/buzzy/buzzy_expr_happy.png" },
  { title: "Waving", img: "/assets/buzzy/buzzy_expr_waving.png" },
  { title: "Curious", img: "/assets/buzzy/buzzy_expr_curious.png" },
  { title: "Excited", img: "/assets/buzzy/buzzy_expr_excited.png" },
  { title: "Sleepy", img: "/assets/buzzy/buzzy_expr_sleepy.png" },
  { title: "Cheerful", img: "/assets/buzzy/buzzy_expr_cheerful.png" },
];

export default function MeetBuzzyPage({ authenticated = false }: { authenticated?: boolean }) {
  const reducedMotion = useReducedMotion() === true;

  return (
    <div className="bb-site bb-meet-buzzy-figma-page">
      <FigmaHeader authenticated={authenticated} />

      <main className="bb-canvas bb-buzzy-showcase-canvas">
        {/* SECTION 1: HERO (Figma frames 515:3502 top) */}
        <section className="bb-buzzy-page-hero">
          <div className="bb-buzzy-page-hero-left">
            <div className="bb-buzzy-companion-pill">
              <span className="text-orange-500">♥</span> YOUR JOURNEY COMPANION
            </div>
            <h1 className="bb-buzzy-page-hero-title">Meet Buzzy</h1>
            <p className="bb-buzzy-page-hero-desc">
              Buzzy is BeeBuddy’s friendly little companion who makes every connection feel warmer.
              From meeting new people to discovering shared activities, Buzzy is always there to make the
              journey feel easier, brighter and more welcoming.
            </p>

            <div className="bb-buzzy-page-traits-row">
              {buzzyTraits.map((t) => (
                <span key={t.label} className="bb-buzzy-page-trait-pill">
                  <span className="trait-icon">{t.icon}</span>
                  <span className="trait-text">{t.label}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="bb-buzzy-page-hero-right">
            <motion.div
              className="bb-buzzy-stage-mascot-wrap"
              animate={reducedMotion ? false : { y: [0, -14, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img
                src="/assets/home/figma-buzzy.png"
                alt="Buzzy mascot"
                className="bb-buzzy-mascot-large"
              />
            </motion.div>
          </div>
        </section>

        {/* SECTION 2: HOW BUZZY HELPS YOU (6 CARDS) */}
        <section className="bb-buzzy-helps-section">
          <div className="bb-buzzy-helps-header">
            <div className="bb-buzzy-helps-titles">
              <h2>
                <span className="text-amber-500">⚡</span> How Buzzy helps you
              </h2>
              <p>Always by your side, every step of the way</p>
            </div>
            <Link href="/community" className="bb-buzzy-helps-link">
              <span>A kinder, more connected world</span>
              <span>→</span>
            </Link>
          </div>

          <div className="bb-buzzy-helps-grid">
            {buzzyServices.map((card) => (
              <div key={card.title} className="bb-buzzy-help-card">
                <div className="bb-buzzy-help-icon">{card.icon}</div>
                <h3 className="bb-buzzy-help-title">{card.title}</h3>
                <p className="bb-buzzy-help-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: BUZZY FROM EVERY ANGLE (4 CARDS) */}
        <section className="bb-buzzy-angles-section">
          <div className="bb-buzzy-angles-header-bar">
            <span className="bb-bar-brand">Beebuddy</span>
            <h2 className="bb-bar-title">Buzzy from every angle</h2>
            <span className="bb-bar-copy">© 2026 BeeBuddy. All rights reserved.</span>
          </div>

          <div className="bb-buzzy-angles-grid">
            {buzzyAngles.map((item) => (
              <div key={item.title} className="bb-buzzy-angle-card">
                <div className="bb-buzzy-angle-img-wrap">
                  <img src={item.img} alt={item.title} className="bb-buzzy-angle-img" />
                </div>
                <span className="bb-buzzy-angle-caption">{item.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: BUZZY'S EXPRESSIONS (6 CARDS) */}
        <section className="bb-buzzy-expressions-section">
          <div className="bb-buzzy-expressions-header">
            <h2>Buzzy&apos;s expressions</h2>
            <p>Always ready with a smile (and more!).</p>
          </div>

          <div className="bb-buzzy-expressions-grid">
            {buzzyExpressions.map((item) => (
              <div key={item.title} className="bb-buzzy-expression-card">
                <div className="bb-buzzy-expr-img-wrap">
                  <img src={item.img} alt={item.title} className="bb-buzzy-expr-img" />
                </div>
                <span className="bb-buzzy-expr-caption">{item.title}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: BOTTOM CTA BANNER (LET BUZZY GUIDE YOU) */}
        <section className="bb-buzzy-guide-cta-section">
          <div className="bb-buzzy-guide-cta-card">
            {/* Sticky note on left */}
            <div className="bb-buzzy-sticky-note-wrap">
              <img
                src="/assets/buzzy/buzzy_kinder_note.png"
                alt="Kinder people Brighter days"
                className="bb-buzzy-sticky-note-img"
              />
            </div>

            <div className="bb-buzzy-guide-cta-content">
              <span className="bb-buzzy-guide-badge">READY TO MEET NEW PEOPLE?</span>
              <h2 className="bb-buzzy-guide-title">Let Buzzy guide you</h2>
              <p className="bb-buzzy-guide-subtitle">
                Join BeeBuddy and be part of a kinder, more connected community.
              </p>
              <Link href="/get-started" className="bb-buzzy-guide-start-btn">
                Get Started Today →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SimpleFooter />
    </div>
  );
}
