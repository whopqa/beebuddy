"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();

export function GoogleSignInButton({
  mode,
  disabled,
  onCredential,
  onError,
}: {
  mode: "login" | "signup";
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  const renderButton = useCallback(() => {
    if (!clientId || !window.google?.accounts.id || !containerRef.current) return;
    containerRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      cancel_on_tap_outside: true,
      callback: (response) => {
        if (!response.credential) {
          onError("Google không trả về credential hợp lệ");
          return;
        }
        void callbackRef.current(response.credential);
      },
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: mode === "signup" ? "signup_with" : "continue_with",
      shape: "pill",
      width: Math.min(Math.max(containerRef.current.clientWidth, 240), 400),
      locale: "vi",
    });
  }, [mode, onError]);

  useEffect(() => {
    if (scriptReady) renderButton();
    return () => window.google?.accounts.id.cancel();
  }, [renderButton, scriptReady]);

  if (!clientId) return null;

  return (
    <>
      <Script
        id="google-identity-services"
        src="https://accounts.google.com/gsi/client?hl=vi"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => onError("Không tải được Google Sign-In. Hãy kiểm tra kết nối mạng.")}
      />
      <div
        className="bb-google-signin-wrapper"
        aria-busy={!scriptReady || disabled}
        style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? "none" : "auto" }}
      >
        <div ref={containerRef} />
      </div>
    </>
  );
}

export const googleSignInConfigured = Boolean(clientId);
