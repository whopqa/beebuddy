"use client";

import { FormEvent, useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "newsletter", email }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Please try again.");
      setStatus("success");
      setMessage("You’re on the list — see you in your inbox.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form className="bb-newsletter-form" onSubmit={submit} noValidate>
      <div className="bb-newsletter-heading"><strong>Stay in the Loop</strong><span>Give an email, get the newsletter</span></div>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <div className="bb-newsletter-input-row">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          required
          aria-describedby={message ? "newsletter-status" : undefined}
        />
        <button type="submit" disabled={status === "loading"} aria-label="Subscribe to newsletter">
          {status === "loading" ? "…" : "→"}
        </button>
      </div>
      {message && <p id="newsletter-status" className={`bb-newsletter-status ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
    </form>
  );
}
