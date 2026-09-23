"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import FigmaHeader from "./FigmaHeader";
import { webAuth } from "@/lib/auth-client";

const homeAsset = (name: string) => `/assets/home/${name}`;

export default function LandingPage({ authenticated = false }: { authenticated?: boolean }) {
  const [isAuth, setIsAuth] = useState(authenticated);

  useEffect(() => {
    let active = true;
    webAuth.me()
      .then(() => { if (active) setIsAuth(true); })
      .catch(() => { if (active) setIsAuth(false); });
    return () => { active = false; };
  }, []);

  const reducedMotion = useReducedMotion() === true;
  const heroImages = ["hero-01.png", "hero-02.png", "hero-03.png", "hero-04.png", "hero-05.png"];
  const heroOpacity = [
    [1, 1, 0, 0, 1],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0, 0],
    [0, 0, 1, 1, 0],
  ];
  const heroTimes = [
    [0, 0.1412, 0.2, 0.9412, 1],
    [0, 0.1412, 0.2, 0.3412, 0.4, 1],
    [0, 0.3412, 0.4, 0.5412, 0.6, 1],
    [0, 0.5412, 0.6, 0.7412, 0.8, 1],
    [0, 0.7412, 0.8, 0.9412, 1],
  ];

  return (
    <div className="bb-site bb-design-site">
      <FigmaHeader authenticated={isAuth} />

      <main className="bb-canvas" id="top">
        {/* Floating Social Media Rail on Left */}
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

        {/* 1. HERO SECTION (Figma frame 54:3) */}
        <section className="bb-hero-design" aria-labelledby="hero-title">
          {heroImages.map((image, index) => (
            <motion.div
              key={image}
              className="bb-hero-slide"
              style={{ backgroundImage: `url(${homeAsset(image)})` }}
              initial={{ opacity: index === 0 ? 1 : 0 }}
              animate={reducedMotion ? { opacity: index === 0 ? 1 : 0 } : { opacity: heroOpacity[index] }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 42.5, repeat: Infinity, repeatType: "loop", times: heroTimes[index], ease: "linear" }
              }
              aria-hidden={index !== 0}
            />
          ))}
          <div className="bb-hero-wash" />
          <div className="bb-hero-shade" />

          <div className="bb-hero-design-copy">
            <h1 id="hero-title">
              CONNECT WITH PEOPLE<br />WHO MAKE EVERY<br />JOURNEY BETTER
            </h1>
            <p>
              BeeBuddy brings like minded people together to share experiences build meaningful connections and grow through every journey
            </p>
            <div className="bb-hero-design-actions">
              <a className="bb-play-badge" href="/signup" aria-label="Get started on Google Play">
                <img src={homeAsset("home-18.png")} alt="" />
                <span>
                  <small>GET IT ON</small>Google Play
                </span>
              </a>
              <Link className="bb-start-button" href={isAuth ? "/get-started" : "/signup"}>
                GET STARTED <span>↗</span>
              </Link>
            </div>
          </div>

          <a href="#features" className="bb-scroll-cue" aria-label="Scroll down">
            <img src={homeAsset("scroll_cue_hero.png")} alt="Scroll" className="bb-scroll-cue-img" />
          </a>
        </section>

        {/* 2. SCENIC RIVER TRANSITION BAND & THREE FLOATING FEATURE ACTION CARDS (Figma 61:125 & Group 76) */}
        <section className="bb-scenic-transition-band" id="features" aria-label="Core Features">
          <div className="bb-scenic-river-backdrop" style={{ backgroundImage: `url(${homeAsset("river_landscape_cards_bg.png")})` }} />
          <div className="bb-scenic-gradient-overlay" />
          <div className="bb-feature-action-container">
            <InteractiveFeatureCard
              icon="figma-people.png"
              title="Find Like-Minded Friends"
              subtitle="Connect with people who share your vibe and your values"
              href="/community"
            />
            <InteractiveFeatureCard
              icon="figma-globe.png"
              title="Shared Interests"
              subtitle="Discover groups and activities that spark real connections"
              defaultActive
              href="#services"
            />
            <InteractiveFeatureCard
              icon="figma-chat.png"
              title="Real Experiences"
              subtitle="Turn conversations into moments you’ll always remember"
              href="/community"
            />
          </div>
        </section>

        {/* 3. ABOUT US SECTION (Figma frames 61:123, 61:76, 80:266) */}
        <section className="bb-intro-design" id="about" aria-labelledby="about-title">
          <div className="bb-intro-snow-backdrop" style={{ backgroundImage: `url(${homeAsset("about_snowy_mountains_bg.png")})` }} />

          {/* Giant Faint Background Wordmark */}
          <div className="bb-giant-watermark" aria-hidden="true">Beebuddy</div>

          {/* Floating Bee Mascot on the right */}
          <motion.div
            className="bb-flying-bee-wrap"
            animate={reducedMotion ? false : { y: [0, -10, 0], x: [0, 4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <img src={homeAsset("bee_about_flying_transparent.png")} alt="" className="bb-flying-bee" />
          </motion.div>

          <div className="bb-intro-copy-card">
            <div className="bb-intro-title-wrap">
              <h2 id="about-title">About Us</h2>
              <div className="bb-intro-title-bar" />
            </div>
            <span className="bb-brand-year">Brand Identity 2026</span>
            <p>
              <strong>BeeBuddy</strong> is a social connection platform designed to help people meet like minded friends
              build meaningful relationships and turn shared interests into real experiences. It creates a simple space
              where every connection can grow naturally and every journey can begin together.
            </p>
            <p>
              Our vision is to make finding the right people feel easier and more genuine. BeeBuddy encourages users to discover
              new friendships share experiences and create lasting memories beyond the screen.
            </p>
            <p>
              Built around connection and community the platform combines friendly interactions smart matching and shared
              activities to create an experience that feels warm approachable and personal.
            </p>
            <div className="bb-intro-footer-note">
              <strong>SOCIAL CONNECTION PLATFORM</strong>
              <small>By BeeBuddy</small>
            </div>
          </div>

          {/* Decorative Wavy Rainbow Kite String with tiny bees */}
          <div className="bb-kite-trail-wrap" aria-hidden="true">
            <img src={homeAsset("kite_trail_about.svg")} alt="" className="bb-kite-trail-img" />
          </div>
        </section>

        {/* 4. MEET BUZZY SECTION (Figma frame 110:74, 270:1426-1429) */}
        <section className="bb-buzzy-showcase" id="meet-buzzy" aria-labelledby="buzzy-showcase-title">
          <div className="bb-buzzy-left-column">
            <div className="bb-buzzy-character-stage">
              <motion.img
                src={homeAsset("buzzy_meet_mascot.png")}
                alt="Buzzy with headphones"
                className="bb-buzzy-mascot-img"
                animate={reducedMotion ? false : { y: [0, -12, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="bb-buzzy-aura-glow" aria-hidden="true" />
            </div>

            {/* Interactive Trait Pills in single unified capsule container */}
            <div className="bb-buzzy-traits-container" aria-label="Buzzy personality traits">
              <InteractiveTraitPill icon="♥" label="Friendly" defaultColor="#ff8500" />
              <InteractiveTraitPill icon="☺" label="Helpful" defaultColor="#ff9900" />
              <InteractiveTraitPill icon="★" label="Curious" defaultColor="#eab308" />
              <InteractiveTraitPill icon="🔍" label="Fun" defaultColor="#f97316" />
            </div>
          </div>

          <div className="bb-buzzy-right-column">
            <div className="bb-buzzy-companion-tag">
              <span>♥</span> YOUR JOURNEY COMPANION
            </div>
            <h2 id="buzzy-showcase-title" className="bb-buzzy-title-sunburst">
              Meet Buzzy
              <span className="bb-sunburst-rays" aria-hidden="true">
                <span className="ray ray-1" />
                <span className="ray ray-2" />
                <span className="ray ray-3" />
              </span>
            </h2>
            <p>
              Buzzy is BeeBuddy’s friendly little companion who makes every connection feel warmer.
              From meeting new people to discovering shared activities, Buzzy is always there to make the
              journey feel easier, brighter and more welcoming.
            </p>
            <Link className="bb-buzzy-cta-pill" href="/meet-buzzy">
              Say Hi to Buzzy <span>→</span>
            </Link>
          </div>
        </section>

        {/* 5. SERVICES SECTION (Figma frames 119:286, 181:1165, 186:1179-1199 with staggered rows and vertical typography) */}
        <section className="bb-services-showcase" id="services" aria-labelledby="services-showcase-title">
          <div className="bb-services-inner">
            <h2 id="services-showcase-title" className="sr-only">Services</h2>

            <div className="bb-services-staggered-list">
              <InteractiveServiceRow number="01" title="Find Your People" side="left" />
              <InteractiveServiceRow number="02" title="Shared Adventures" side="right" />
              <InteractiveServiceRow number="03" title="Stories That Stay" side="left" />
              <InteractiveServiceRow number="04" title="Build Your Circle" side="right" />
            </div>

            {/* Giant Vertical Artwork from Figma on Far Right */}
            <div className="bb-services-vertical-art-wrap" aria-hidden="true">
              <img src={homeAsset("services_vertical_art.png")} alt="" className="bb-services-vertical-img" />
            </div>
          </div>

          {/* Decorative Translucent Lens Circles */}
          <div className="bb-lens-circle circle-1" aria-hidden="true" />
          <div className="bb-lens-circle circle-2" aria-hidden="true" />
          <div className="bb-lens-circle circle-3" aria-hidden="true" />
        </section>

        {/* 6. TICKER & SOLID ORANGE ACCENT BAND (Figma frames 159:687 & 157:102) */}
        <div className="bb-ticker-strip-wrap">
          <MarqueeStrip />
        </div>
        <div className="bb-solid-orange-accent-band">
          <div className="bb-accent-band-content">
            <span>Real people</span>
            <b className="bb-star">✦</b>
            <span>Real connections</span>
            <b className="bb-star">✦</b>
            <span>Moments today</span>
            <b className="bb-star">✦</b>
            <span>Memories forever</span>
            <b className="bb-star">✦</b>
            <span>Real people</span>
            <b className="bb-star">✦</b>
            <span>Real connections</span>
            <b className="bb-star">✦</b>
            <span>Moments today</span>
            <b className="bb-star">✦</b>
            <span>Memories forever</span>
          </div>
        </div>

        {/* 7. COMMUNITY SECTION (Figma frame 123:308, 157:50, 194:3365, 194:3387, 194:3288 with curved arrow path) */}
        <section className="bb-community-showcase" id="community" aria-labelledby="community-showcase-title">
          <div className="bb-community-header-block">
            <h2 id="community-showcase-title">Community</h2>
            <div className="bb-member-proof-row">
              <div className="bb-member-avatar-stack">
                <img src={homeAsset("avatar-01.png")} alt="" />
                <img src={homeAsset("avatar-02.png")} alt="" />
                <img src={homeAsset("avatar-03.png")} alt="" />
                <img src={homeAsset("avatar-04.png")} alt="" />
                <img src="/assets/community/clara_bennett.png" alt="" />
                <img src="/assets/community/alex_rivera.png" alt="" />
                <span className="bb-stack-badge">+86</span>
              </div>
              <span className="bb-member-label">BeeBuddy member</span>
            </div>

            <div className="bb-community-subhead-row">
              <span className="bb-globe-icon-wrap" aria-hidden="true">
                <img src={homeAsset("figma-globe.png")} alt="" className="bb-globe-img" />
              </span>
              <div>
                <strong>Wherever you are, you’ll always find your people</strong>
                <p>From local hangouts to global adventures - connections happen here</p>
              </div>
            </div>
          </div>

          {/* Connected Cards Layout with SVG Dashed Curved Path */}
          <div className="bb-community-cards-stage">
            {/* SVG Connecting Flow Line with Arrow from Figma 194:3348 */}
            <div className="bb-community-curve-wrap" aria-hidden="true">
              <img src={homeAsset("community_curve_path.svg")} alt="" className="bb-community-curve-img" />
            </div>

            {/* Card 1: Top Left (x: 90, y: 4231) */}
            <InteractiveCommunityCard
              className="card-top-left"
              image="figma-community-mountain.png"
              tag="Story Exchange"
              text="Share travel stories, tips, and snapshots that inspire the next journey"
            />

            {/* Card 2: Middle Right (x: 793, y: 4526) */}
            <InteractiveCommunityCard
              className="card-mid-right"
              image="figma-community-dinner.png"
              tag="Foodies Abroad"
              text="For food lovers exploring local flavors and shared meals"
            />

            {/* Card 3: Bottom Left (x: 90, y: 4755) */}
            <InteractiveCommunityCard
              className="card-bottom-left"
              image="figma-community-campfire.png"
              tag="Buddy Events"
              text="Curated gatherings, weekend plans, friendly activities"
            />

            {/* Concentric Decorative Rings on Right */}
            <div className="bb-concentric-rings" aria-hidden="true">
              <div className="ring ring-outer" />
              <div className="ring ring-inner" />
            </div>
          </div>
        </section>

        {/* 8. FOOTER & GLASSMORPHISM NEWSLETTER (Figma frame 30:153, 1440x1000px) */}
        <section className="bb-footer-showcase" id="join">
          <div className="bb-footer-mountains-backdrop" style={{ backgroundImage: `url(${homeAsset("footer_lake_landscape.png")})` }} />

          <div className="bb-footer-content-wrap">
            {/* Top Row: Links Directory and Hero Tagline */}
            <div className="bb-footer-top-grid">
              <div className="bb-footer-nav-columns">
                <div className="bb-footer-col">
                  <h4>PRODUCT</h4>
                  <Link href="/community">find your people</Link>
                  <Link href="/start-your-journey">shared adventures</Link>
                  <Link href="/get-started">build your circle</Link>
                  <Link href="/signup">download app</Link>
                  <span className="bb-col-sub">Social Connection Platform</span>
                  <span className="bb-col-sub">Built For Real Connection</span>
                  <span className="bb-col-sub">Designed For Shared Journeys</span>
                </div>

                <div className="bb-footer-col">
                  <h4>DISCOVER</h4>
                  <a href="#services">how it works</a>
                  <Link href="/community">explore activities</Link>
                  <Link href="/community">community stories</Link>
                  <Link href="/meet-buzzy">meet buzzy</Link>
                  <span className="bb-col-sub">connect more easily and share better moments</span>
                </div>

                <div className="bb-footer-col">
                  <h4>COMMUNITY</h4>
                  <a href="mailto:hello.beebuddy@gmail.com">hello.beebuddy@gmail.com</a>
                  <Link href="/community">events & meetups</Link>
                  <Link href="/start-your-journey">share your story</Link>
                  <Link href="/community">community guidelines</Link>
                  <span className="bb-col-sub">We’d love to hear from you</span>
                </div>

                <div className="bb-footer-col">
                  <h4>SUPPORT</h4>
                  <Link href="/help">help center</Link>
                  <Link href="/community">safety & trust</Link>
                  <Link href="/privacy">privacy policy</Link>
                  <Link href="/terms">terms of use</Link>
                  <span className="bb-col-sub">Join a community of mindful explorers</span>
                </div>
              </div>

              <div className="bb-footer-tagline-block">
                <p className="bb-tagline-meet">Meet Today</p>
                <p className="bb-tagline-connect">Connect Deeper</p>
                <h3 className="bb-tagline-grow">Grow Together</h3>
                <p className="bb-tagline-sub">
                  Every connection starts with a hello. BeeBuddy helps you find your people,
                  share real experiences, and build friendships that grow beyond the screen
                </p>
              </div>
            </div>

            {/* Glassmorphism Floating Newsletter Card with Peeking Buzzy */}
            <div className="bb-newsletter-stage">
              <div className="bb-newsletter-buzzy-anchor">
                <img src={homeAsset("footer_peeking_buzzy.png")} alt="" className="bb-peeking-buzzy" />
              </div>

              <div className="bb-glass-newsletter-card">
                <div className="bb-glass-card-header">
                  <div className="bb-glass-bee-icon">
                    <img src="/assets/ui/logo-mark.svg" alt="" />
                  </div>
                  <div className="bb-glass-titles">
                    <h4>Stay in the Loop</h4>
                    <p>Give an email, get the newsletter</p>
                  </div>
                </div>

                <form
                  className="bb-glass-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Thank you! You have been added to the BeeBuddy newsletter.");
                  }}
                >
                  <input
                    type="email"
                    required
                    placeholder="your@email.com"
                    className="bb-glass-input"
                  />
                  <button type="submit" className="bb-glass-submit">
                    Start your journey <span>&gt;</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Bottom Copyright & Legal Links */}
            <div className="bb-footer-bottom-bar">
              <span className="bb-copyright">© 2026 BeeBuddy. All rights reserved</span>
              <div className="bb-bottom-links">
                <Link href="/privacy">Privacy</Link>
                <span className="bb-sep">|</span>
                <Link href="/terms">Terms</Link>
                <span className="bb-sep">|</span>
                <Link href="/cookies">Cookies</Link>
                <span className="bb-sep">|</span>
                <b className="bb-bottom-brand">BeeBuddy</b>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ==========================================================================
   Interactive Components with Mouse-in Hover Transitions
   ========================================================================== */

/** Feature Card with Mouse-in Subtitle Reveal from Figma Component 16, 17, 18 */
function InteractiveFeatureCard({
  icon,
  title,
  subtitle,
  defaultActive = false,
  href,
}: {
  icon: string;
  title: string;
  subtitle: string;
  defaultActive?: boolean;
  href: string;
}) {
  const [hovered, setHovered] = useState(false);
  const isActive = hovered || defaultActive;

  return (
    <Link
      href={href}
      className={`bb-feature-action-card ${isActive ? "is-active" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="bb-feat-top-row">
        <img src={homeAsset(icon)} alt="" className="bb-feat-icon" />
        <span className="bb-feat-title">{title}</span>
      </div>
      <motion.p
        initial={false}
        animate={{
          height: hovered ? "auto" : 0,
          opacity: hovered ? 1 : 0,
          marginTop: hovered ? 8 : 0,
        }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="bb-feat-hover-subtitle"
      >
        {subtitle}
      </motion.p>
    </Link>
  );
}

/** Trait Pill with Mouse-in Scale and Glow */
function InteractiveTraitPill({ icon, label, defaultColor }: { icon: string; label: string; defaultColor: string }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      type="button"
      className="bb-trait-pill"
      style={{
        background: hovered ? "linear-gradient(90deg, #ff8500, #ffb020)" : "linear-gradient(90deg, #ff9900, #ffc040)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ scale: 1.08, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <span className="bb-trait-icon">{icon}</span>
      <span className="bb-trait-label">{label}</span>
    </motion.button>
  );
}

/** Staggered Service Row with Mouse-in Line Expansion */
function InteractiveServiceRow({ number, title, side }: { number: string; title: string; side: "left" | "right" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`bb-service-stagger-item ${side} ${hovered ? "is-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="bb-service-item-head">
        <span className="bb-service-num">{number}</span>
        <div className="bb-service-dotted-line" />
        <span className="bb-service-title">{title}</span>
      </div>
      <motion.div
        className="bb-service-accent-bar"
        initial={{ scaleX: 0.85 }}
        animate={{ scaleX: hovered ? 1 : 0.85 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    </div>
  );
}

/** Community Story Card with Mouse-in Image Zoom and Caption Lift */
function InteractiveCommunityCard({
  image,
  tag,
  text,
  className,
}: {
  image: string;
  tag: string;
  text: string;
  className: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      className={`bb-community-card-unit ${className} ${hovered ? "is-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="bb-community-card-frame">
        <motion.img
          src={homeAsset(image)}
          alt={tag}
          className="bb-community-card-img"
          animate={{ scale: hovered ? 1.05 : 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="bb-community-caption-pill"
          animate={{ y: hovered ? -3 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <span className="bb-caption-bubble-icon" aria-hidden="true">💬</span>
          <div className="bb-caption-text-wrap">
            <strong>{tag}</strong>
            <p>{text}</p>
          </div>
        </motion.div>
      </div>
    </article>
  );
}

/** Infinite Marquee Ticker Strip */
function MarqueeStrip() {
  const words = [
    "Connect",
    "Explore",
    "Share",
    "Belong",
    "Discover",
    "Grow Together",
    "Find Your People",
    "Shared Interests",
    "Real Experiences",
    "Build Your Circle",
  ];
  const reducedMotion = useReducedMotion() === true;

  return (
    <div className="bb-marquee-container" aria-label="BeeBuddy values">
      <motion.div
        className="bb-marquee-track"
        initial={{ x: 0 }}
        animate={reducedMotion ? { x: 0 } : { x: [0, -1800] }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 32, repeat: Infinity, repeatType: "loop", ease: "linear" }
        }
      >
        {[...words, ...words, ...words].map((word, index) => (
          <span key={`${word}-${index}`} className="bb-marquee-item">
            {word}
            <b className="bb-marquee-dot">·</b>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
