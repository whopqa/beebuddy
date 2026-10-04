"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AuthRequiredModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="bb-auth-required-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="bb-auth-required-modal" role="dialog" aria-modal="true" aria-labelledby="bb-auth-required-title">
        <button type="button" className="bb-auth-required-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="bb-auth-required-heading">
          <h2 id="bb-auth-required-title">Please sign in to continue</h2>
          <img src="/assets/home/AssignedYouATask.png" alt="Buzzy" />
        </div>
        <div className="bb-auth-required-actions">
          <Link href="/login" className="bb-auth-required-signin">Sign in</Link>
          <Link href="/signup" className="bb-auth-required-signup">Create account</Link>
        </div>
      </section>
    </div>
  );
}
