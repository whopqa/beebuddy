export default function MarqueeStrip() {
  const words = ["Connect", "Explore", "Share", "Belong", "Discover", "Grow Together", "Find Your People", "Shared Interests", "Real Experiences", "Build Your Circle"];
  return <div className="bb-marquee" aria-label="Beebuddy values"><div>{[...words, ...words].map((word, i) => <span key={`${word}-${i}`}>{word}<em>·</em></span>)}</div></div>;
}
