"use client";

import Link from "next/link";

export default function SimpleFooter({ designLogin = false }: { designLogin?: boolean }) {
  return (
    <footer className="bb-simple-black-footer" role="contentinfo">
      <div className="bb-simple-footer-inner">
        <p className="bb-simple-footer-copy">
          © 2026 BeeBuddy. All rights reserved
        </p>

        <div className="bb-simple-footer-links">
          <Link href="/privacy" className="bb-simple-footer-link">Privacy</Link>
          <Link href="/terms" className="bb-simple-footer-link">Terms</Link>
          <Link href="/cookies" className="bb-simple-footer-link">Cookies</Link>
          <span className="bb-simple-footer-pipe">|</span>
          <Link href="/" className="bb-simple-footer-brand" aria-label="BeeBuddy">
            {designLogin ? <span className="bb-login-footer-logo"><img src="/assets/home/login-footer-mark.svg" alt="" /><img src="/assets/home/login-footer-word.svg" alt="BeeBuddy" /></span> : <><span className="bb-brand-bee-icon">🐝</span><span className="bb-brand-name">BeeBuddy</span></>}
          </Link>
        </div>
      </div>
    </footer>
  );
}
