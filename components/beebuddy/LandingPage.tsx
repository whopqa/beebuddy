"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import FigmaHeader from "./FigmaHeader";
import { webAuth } from "@/lib/auth-client";
import { submitNewsletter } from "@/lib/lead-client";

const homeAsset = (name: string) => `/assets/home/${name}`;
const FIGMA_HOME_DURATION = 42.5;

const ringTransition: Transition = {
  opacity: { duration: FIGMA_HOME_DURATION, times: [0, 0.1059, 0.2118, 0.3176, 0.4235, 1], ease: ["easeInOut", "easeInOut", "easeInOut", "easeInOut", "linear"], repeat: Infinity },
  rotate: { duration: FIGMA_HOME_DURATION, times: [0, 0.4235, 1], ease: "linear", repeat: Infinity },
};

const avatarMotion: Record<number, { initialX: number; positions: number[]; transition: Transition }> = {
  0: { initialX: 50, positions: [50, 50, -8, -8, 50, 50], transition: { x: { duration: FIGMA_HOME_DURATION, times: [0, 0.0071, 0.02, 0.0553, 0.0682, 1], ease: ["linear", [0.45, 1.45, 0.8, 1], "linear", "easeInOut", "linear"], repeat: Infinity } } },
  1: { initialX: 25, positions: [25, -4, -4, 25, 25], transition: { x: { duration: FIGMA_HOME_DURATION, times: [0, 0.0129, 0.0624, 0.0753, 1], ease: [[0.45, 1.45, 0.8, 1], "linear", "easeInOut", "linear"], repeat: Infinity } } },
  3: { initialX: -25, positions: [-25, -25, 4, 4, -25, -25], transition: { x: { duration: FIGMA_HOME_DURATION, times: [0, 0.0035, 0.0165, 0.0588, 0.0718, 1], ease: ["linear", [0.45, 1.45, 0.8, 1], "linear", "easeInOut", "linear"], repeat: Infinity } } },
  4: { initialX: -50, positions: [-50, -50, 8, 8, -50, -50], transition: { x: { duration: FIGMA_HOME_DURATION, times: [0, 0.0106, 0.0235, 0.0518, 0.0647, 1], ease: ["linear", [0.45, 1.45, 0.8, 1], "linear", "easeInOut", "linear"], repeat: Infinity } } },
};

export default function LandingPage({ authenticated = false }: { authenticated?: boolean }) {
  const [isAuth, setIsAuth] = useState(authenticated);

  useEffect(() => {
    let active = true;
    webAuth.me()
      .then(() => {
        if (active) setIsAuth(true);
      })
      .catch(() => {
        if (active) setIsAuth(false);
      });
    return () => { active = false; };
  }, []);

  const reducedMotion = useReducedMotion() === true;
  const heroImages = ["intro-hero-01.png", "intro-hero-02.png", "intro-hero-03.png", "intro-hero-04.png", "intro-hero-05.png"];
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
  // Figma 1:2, nodes 30:235 and 53:6/9/12/15 share one 42.5s timeline.
  const heroFadeTransitions: Transition[] = [
    { opacity: { duration: 42.5, times: heroTimes[0], ease: ["linear", [0.3, 0, 0.7, 1], "linear", [0.3, 0, 0.7, 1]], repeat: Infinity } },
    { opacity: { duration: 42.5, times: heroTimes[1], ease: ["linear", [0.3, 0, 0.7, 1], "linear", [0.3, 0, 0.7, 1], "linear"], repeat: Infinity } },
    { opacity: { duration: 42.5, times: heroTimes[2], ease: ["linear", [0.3, 0, 0.7, 1], "linear", [0.3, 0, 0.7, 1], "linear"], repeat: Infinity } },
    { opacity: { duration: 42.5, times: heroTimes[3], ease: ["linear", [0.3, 0, 0.7, 1], "linear", [0.3, 0, 0.7, 1], "linear"], repeat: Infinity } },
    { opacity: { duration: 42.5, times: heroTimes[4], ease: ["linear", [0.3, 0, 0.7, 1], "linear", [0.3, 0, 0.7, 1]], repeat: Infinity } },
  ];

  return (
    <div className="bb-site bb-design-site">
      <FigmaHeader authenticated={isAuth} designHome />

      <main className="bb-canvas" id="top">
        {/* Floating Social Media Rail on Left */}
        <aside className="bb-social-rail" aria-label="Social media">
          <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
            <img src={homeAsset("intro-facebook.svg")} alt="" />
          </a>
          <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
            <img src={homeAsset("intro-instagram.png")} alt="" />
          </a>
          <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
            <img src={homeAsset("intro-tiktok.svg")} alt="" />
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
              transition={reducedMotion ? { duration: 0 } : heroFadeTransitions[index]}
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
                <img src={homeAsset("intro-play.png")} alt="" />
                <span>
                  <small>GET IT ON</small>Google Play
                </span>
              </a>
              <Link className="bb-start-button" href="/get-started">
                <span className="bb-start-plane" aria-hidden="true"><img src={homeAsset("intro-send.png")} alt="" /><img className="bb-start-plane-trail" src={homeAsset("intro-send-trail.svg")} alt="" /></span>
                <span className="bb-start-label">GET STARTED</span>
              </Link>
            </div>
          </div>

          <a href="#join" className="bb-scroll-cue" aria-label="Scroll to footer">
            <span className="bb-scroll-label">SCROLL</span>
            <img src={homeAsset("intro-scroll-curve.svg")} alt="" className="bb-scroll-curve" />
            <img src={homeAsset("intro-scroll-dot.svg")} alt="" className="bb-scroll-dot" />
          </a>
        </section>

        {/* 2. SCENIC RIVER TRANSITION BAND & THREE FLOATING FEATURE ACTION CARDS (Figma 61:125 & Group 76) */}
        <section className="bb-scenic-transition-band" id="features" aria-label="Core Features">
          <div className="bb-scenic-river-backdrop" style={{ backgroundImage: `url(${homeAsset("river_landscape_cards_bg.png")})` }} />
          <div className="bb-scenic-gradient-overlay" />
          <div className="bb-feature-action-container">
            <InteractiveFeatureCard
              icon="intro-people.png"
              title="Find Like-Minded Friends"
              subtitle="Connect with people who share your vibe and your values"
              href="/community"
            />
            <InteractiveFeatureCard
              icon="intro-globe.png"
              title="Shared Interests"
              subtitle="Discover groups and activities that spark real connections"
              defaultActive
              href="#services"
            />
            <InteractiveFeatureCard
              icon="intro-chat.png"
              title="Real Experiences"
              subtitle="Turn conversations into moments you’ll always remember"
              href="/community"
            />
          </div>
        </section>

        <div className="bb-about-buzzy-sequence">
          <div
            className="bb-about-buzzy-snow-backdrop"
            style={{ backgroundImage: `url(${homeAsset("about_snowy_mountains_bg.png")})` }}
            aria-hidden="true"
          />

          {/* 3. ABOUT US SECTION (Figma frames 61:123, 61:76, 80:266) */}
          <section className="bb-intro-design" id="about" aria-labelledby="about-title">

          {/* Giant Faint Background Wordmark */}
          <div className="bb-giant-watermark" aria-hidden="true">Beebuddy</div>

          {/* Floating Bee Mascot on the right */}
          <div className="bb-flying-bee-wrap" aria-hidden="true">
            {reducedMotion ? (
              <img src={homeAsset("bee_about_flying_transparent.png")} alt="" className="bb-flying-bee" />
            ) : (
              <video
                className="bb-flying-bee bb-flying-bee-video"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                poster={homeAsset("bee_about_flying_transparent.png")}
                disablePictureInPicture
              >
                <source src={homeAsset("OngBay.webm")} type="video/webm" />
                <source src={homeAsset("OngBay.mp4")} type="video/mp4" />
              </video>
            )}
          </div>

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
              <img
                src={homeAsset("buzzy_meet_mascot.png")}
                alt="Buzzy with headphones"
                className="bb-buzzy-mascot-img"
              />
              <div className="bb-buzzy-aura-glow" aria-hidden="true" />
            </div>

            {/* Interactive Trait Pills in single unified capsule container */}
            <div className="bb-buzzy-traits-container" aria-label="Buzzy personality traits">
              <InteractiveTraitPill icon="♥" label="Friendly" />
              <InteractiveTraitPill icon="☺" label="Helpful" />
              <InteractiveTraitPill icon="★" label="Curious" />
              <InteractiveTraitPill icon="🔍" label="Fun" />
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

          <div className="bb-about-services-wave" aria-hidden="true">
            <svg viewBox="0 0 1440 190" preserveAspectRatio="none">
              <path
                className="bb-about-services-wave-back"
                d="M0 55C132 23 255 96 395 78C544 58 598 18 735 38C894 62 988 117 1133 84C1249 58 1338 40 1440 66V190H0Z"
              />
              <path
                className="bb-about-services-wave-front"
                d="M0 104C145 74 273 134 420 119C574 103 634 72 778 89C924 106 1038 146 1178 117C1279 96 1366 89 1440 108V190H0Z"
              />
            </svg>
          </div>
        </div>

        {/* 5. SERVICES SECTION (Figma frames 119:286, 181:1165, 186:1179-1199 with staggered rows and vertical typography) */}
        <section className="bb-services-showcase" id="services" aria-labelledby="services-showcase-title">
          <motion.div
            className="bb-figma-traveling-ellipse"
            initial={{ x: 0, y: 0 }}
            animate={reducedMotion ? { x: 0, y: 0 } : { x: [0, 1426.149, -232.851, 1496.149, -457.851, -457.851], y: [0, -625.778, -660.778, 256.222, 210.222, 210.222] }}
            transition={reducedMotion ? { duration: 0 } : { x: { duration: FIGMA_HOME_DURATION, times: [0, 0.2204, 0.4452, 0.5753, 0.6587, 1], ease: "linear", repeat: Infinity }, y: { duration: FIGMA_HOME_DURATION, times: [0, 0.2204, 0.4452, 0.5753, 0.6587, 1], ease: "linear", repeat: Infinity } }}
            aria-hidden="true"
          >
            <div className="bb-figma-traveling-ellipse-static">
              <img src={homeAsset("figma-ellipse-12.svg")} alt="" />
            </div>
          </motion.div>
          <div className="bb-services-inner">
            <h2 id="services-showcase-title" className="sr-only">Services</h2>

            <div className="bb-services-staggered-list">
              <InteractiveServiceRow
                number="01"
                title="Find Your People"
                side="left"
                image="home-02.png"
                description="Connect with people who share your passions, energy, and way of exploring."
              />
              <InteractiveServiceRow
                number="02"
                title="Shared Adventures"
                side="right"
                image="home-04.png"
                description="Turn shared interests into meaningful adventures and experiences together."
              />
              <InteractiveServiceRow
                number="03"
                title="Stories That Stay"
                side="left"
                image="home-08.png"
                description="Create memorable moments and stories that stay with you beyond the journey."
              />
              <InteractiveServiceRow
                number="04"
                title="Build Your Circle"
                side="right"
                image="home-20.png"
                description="Grow a welcoming circle built around trust, connection, and belonging."
              />
            </div>
          </div>

          {/* Keep the decorative artwork anchored to the full-width section, not the centered content. */}
          <div className="bb-services-vertical-art-wrap" aria-hidden="true">
            <img src={homeAsset("services_vertical_art.png")} alt="" className="bb-services-vertical-img" />
          </div>

          {/* Decorative Translucent Lens Circles */}
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
                {[1, 2, 3, 4, 5].map((number, index) => {
                  const movement = avatarMotion[index];
                  return movement ? (
                    <motion.div
                      key={number}
                      className="bb-figma-member-avatar"
                      initial={{ x: movement.initialX }}
                      animate={reducedMotion ? { x: 0 } : { x: movement.positions }}
                      transition={reducedMotion ? { duration: 0 } : movement.transition}
                    >
                      <img src={homeAsset(`figma-fav-${number}.png`)} alt="" />
                    </motion.div>
                  ) : (
                    <div key={number} className="bb-figma-member-avatar">
                      <img src={homeAsset(`figma-fav-${number}.png`)} alt="" />
                    </div>
                  );
                })}
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
            <motion.div
              className="bb-figma-community-orbit-left"
              initial={{ opacity: 1, rotate: 28.72 }}
              animate={reducedMotion ? { opacity: 1, rotate: 28.72 } : { opacity: [1, 0.7, 1, 0.7, 1, 1], rotate: [28.72, 388.72, 388.72] }}
              transition={reducedMotion ? { duration: 0 } : ringTransition}
              aria-hidden="true"
            >
              <img src={homeAsset("figma-ellipse-17.svg")} alt="" />
            </motion.div>
            {/* SVG Connecting Flow Line with Arrow from Figma 194:3348 */}
            <div className="bb-community-curve-wrap" aria-hidden="true">
              <img src={homeAsset("community_curve_path.svg")} alt="" className="bb-community-curve-img" />
            </div>

            {/* Card 1: Top Left (x: 90, y: 4231) */}
            <InteractiveCommunityCard
              className="card-top-left"
              image="community-reference-mountain.png"
              icon="community-story-icon.svg"
              tag="Story Exchange"
              hoverText="Every journey leaves something behind. Share the moments, little discoveries, and stories that might inspire someone else’s next adventure."
              text="Share travel stories, tips, and snapshots that inspire the next journey"
            />

            {/* Card 2: Middle Right (x: 793, y: 4526) */}
            <InteractiveCommunityCard
              className="card-mid-right"
              image="community-reference-dinner.png"
              icon="community-food-icon.svg"
              tag="Foodies Abroad"
              hoverText="Every journey leaves something behind. Share the moments, little discoveries, and stories that might inspire someone else’s next adventure."
              text="For food lovers exploring local flavors and shared meals"
            />

            {/* Card 3: Bottom Left (x: 90, y: 4755) */}
            <InteractiveCommunityCard
              className="card-bottom-left"
              image="community-reference-campfire.png"
              icon="community-event-icon.svg"
              tag="Buddy Events"
              hoverText="Some plans start with strangers and end with stories worth remembering. Find your people, share the moment, and see where it takes you."
              text="Curated gatherings, weekend plans, friendly activities"
            />

            {/* Concentric Decorative Rings on Right */}
            <div className="bb-concentric-rings" aria-hidden="true">
              <motion.div
                className="bb-figma-ring-outer"
                initial={{ opacity: 1, rotate: 0 }}
                animate={reducedMotion ? { opacity: 1, rotate: 0 } : { opacity: [1, 0.7, 1, 0.7, 1, 1], rotate: [0, 360, 360] }}
                transition={reducedMotion ? { duration: 0 } : ringTransition}
              >
                <img src={homeAsset("figma-ellipse-16.svg")} alt="" />
              </motion.div>
              <motion.div
                className="bb-figma-ring-inner"
                initial={{ opacity: 1, rotate: 0 }}
                animate={reducedMotion ? { opacity: 1, rotate: 0 } : { opacity: [1, 0.7, 1, 0.7, 1, 1], rotate: [0, 360, 360] }}
                transition={reducedMotion ? { duration: 0 } : ringTransition}
              >
                <img src={homeAsset("figma-ellipse-19.svg")} alt="" />
              </motion.div>
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.querySelector<HTMLInputElement>('input[type="email"]');
                    if (!input) return;
                    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
                    if (button) button.disabled = true;
                    try {
                      await submitNewsletter(input.value);
                      input.value = "";
                      alert("Thank you! You have been added to the BeeBuddy newsletter.");
                    } catch (error) {
                      alert(error instanceof Error ? error.message : "Unable to subscribe right now.");
                    } finally {
                      if (button) button.disabled = false;
                    }
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
  const reducedMotion = useReducedMotion() === true;
  const isActive = hovered || defaultActive;

  return (
    <Link
      href={href}
      className={`bb-feature-action-card ${isActive ? "is-active" : ""} ${hovered ? "is-revealed" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <img src={homeAsset(icon)} alt="" className="bb-feat-icon" />
      <span className="bb-feat-title">{title}</span>
      <motion.p
        initial={false}
        animate={{
          height: hovered ? "auto" : 0,
          opacity: hovered ? 1 : 0,
          marginTop: hovered ? 8 : 0,
        }}
        transition={{ duration: reducedMotion ? 0 : 0.5, ease: hovered ? "easeIn" : "easeOut" }}
        className="bb-feat-hover-subtitle"
      >
        {subtitle}
      </motion.p>
    </Link>
  );
}

/** Trait Pill with Mouse-in Scale and Glow */
function InteractiveTraitPill({ icon, label }: { icon: string; label: string }) {
  return (
    <button
      type="button"
      className={`bb-trait-pill bb-trait-${label.toLowerCase()}`}
    >
      <span className="bb-trait-icon">{icon}</span>
      <span className="bb-trait-label">{label}</span>
    </button>
  );
}

/** Staggered service row that reveals a photographic detail card on hover. */
function InteractiveServiceRow({
  number,
  title,
  side,
  image,
  description,
}: {
  number: string;
  title: string;
  side: "left" | "right";
  image: string;
  description: string;
}) {
  const [hovered, setHovered] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCard = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered(true);
  };

  const hideCard = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(false), 90);
  };

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return (
    <div className={`bb-service-stagger-item ${side} ${hovered ? "is-hovered" : ""}`}>
      <div
        className="bb-service-item-head"
        onMouseEnter={showCard}
        onMouseLeave={hideCard}
        onFocus={showCard}
        onBlur={hideCard}
        tabIndex={0}
      >
        <span className="bb-service-num">{number}</span>
        <div className="bb-service-dotted-line" />
        <span className="bb-service-title">{title}</span>
      </div>
      <motion.div
        className="bb-service-accent-bar"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />

      <div
        className="bb-service-hover-card"
        aria-hidden={!hovered}
        onMouseEnter={showCard}
        onMouseLeave={hideCard}
      >
        <img className="bb-service-hover-image" src={homeAsset(image)} alt="" />
        <div className="bb-service-hover-overlay" />
        <div className="bb-service-hover-content">
          <span className="bb-service-hover-number">{number}</span>
          <span className="bb-service-hover-title">{title}</span>
          <p>{description}</p>
        </div>
        <div className="bb-service-hover-accent" />
      </div>
    </div>
  );
}

/** Community card with the Figma variant's 300ms dissolve on hover. */
function InteractiveCommunityCard({
  image,
  icon,
  tag,
  text,
  className,
  hoverText,
}: {
  image: string;
  icon: string;
  tag: string;
  text: string;
  className: string;
  hoverText?: string;
}) {
  return (
    <article className={`bb-community-card-unit ${className}`}>
      <div className="bb-community-card-frame">
        <div className="bb-community-card-img">
          <img className="bb-community-source-photo" src={homeAsset(image)} alt={tag} />
        </div>
        <div
          className="bb-community-caption-pill"
        >
          <span className="bb-caption-bubble-icon" aria-hidden="true"><img src={homeAsset(icon)} alt="" /></span>
          <div className="bb-caption-text-wrap">
            <strong>{tag}</strong>
            <p>{text}</p>
          </div>
        </div>
        {hoverText && (
          <div className="bb-community-hover-layer">
            <div className="bb-community-hover-photo">
              <img className="bb-community-source-photo" src={homeAsset(image)} alt="" />
            </div>
            <div className="bb-community-hover-overlay">
              <img src={homeAsset(className === "card-mid-right" ? "community-hover-overlay-food.svg" : "community-hover-overlay.svg")} alt="" />
            </div>
            <p>{hoverText}</p>
            <Link className="bb-community-members" href="/community">Members</Link>
          </div>
        )}
        <Link className="bb-community-touch-link" href="/community" aria-label={`View ${tag} community`} />
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
        animate={reducedMotion ? { x: 0 } : { x: [0, -3399] }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { x: { duration: FIGMA_HOME_DURATION, times: [0, 1], ease: "linear", repeat: Infinity } }
        }
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="bb-marquee-cycle" aria-hidden={copy === 1}>
            {[...words, ...words, ...words].map((word, index) => (
              <span key={`${word}-${index}`} className="bb-marquee-item">
                {word}<b className="bb-marquee-dot">·</b>
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
