"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import FigmaHeader from "@/components/beebuddy/FigmaHeader";
import SimpleFooter from "@/components/beebuddy/SimpleFooter";
import { webAuth } from "@/lib/auth-client";
import { accountApi } from "@/lib/account-client";
import { getConsentSessionId } from "@/lib/cookie-consent";

export type AuthMode = "login" | "signup" | "verify" | "forgot" | "change";

const copy: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  login: {
    title: "WELCOME BACK",
    subtitle: "Log in to continue your journey",
    submit: "LOG IN",
  },
  signup: {
    title: "SIGN UP",
    subtitle: "Create an account to start your journey",
    submit: "SIGN UP",
  },
  verify: {
    title: "ENTER LOGIN CODE",
    subtitle: "Enter the 6-digit code sent to your email or phone",
    submit: "VERIFY CODE",
  },
  forgot: {
    title: "FORGOT PASSWORD",
    subtitle: "Enter your email to reset your password",
    submit: "RESET PASSWORD",
  },
  change: {
    title: "CHANGE PASSWORD",
    subtitle: "Enter your old and new password below",
    submit: "CHANGE PASSWORD",
  },
};

export default function AuthShell({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", oldPassword: "" });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const { title, subtitle, submit: submitLabel } = copy[mode];

  useEffect(() => {
    if (mode === "login" && new URLSearchParams(window.location.search).get("passwordChanged") === "1") {
      setNotice("Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.");
    }
  }, [mode]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (mode === "verify" && code.join("").length !== 6) return setError("Please enter the 6-digit verification code.");
    if (mode === "signup" && !form.name.trim()) return setError("Please enter your name.");
    if (mode !== "verify" && !form.email && mode !== "change") return setError("Please enter your email address.");
    if (["login", "signup"].includes(mode) && form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (mode === "signup" && form.password !== form.confirm) return setError("Passwords do not match.");
    if (mode === "signup" && !acceptTerms) return setError("Bạn cần đồng ý Điều khoản sử dụng để đăng ký.");
    if (mode === "signup" && !acceptPrivacy) return setError("Bạn cần đồng ý Chính sách quyền riêng tư để đăng ký.");
    if (mode === "change" && (!form.oldPassword || form.password.length < 6)) return setError("Please complete both password fields.");
    if (mode === "change" && form.oldPassword === form.password) return setError("New password must be different from the old password.");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await webAuth.login(form.email.trim(), form.password);
        router.replace(result.user.role === "ADMIN" ? "/admin" : "/home");
        router.refresh();
      } else if (mode === "signup") {
        await webAuth.register(form.name.trim(), form.email.trim(), form.password, {
          acceptTerms,
          acceptPrivacy,
          consentSessionId: getConsentSessionId(),
        });
        router.replace("/get-started");
        router.refresh();
      } else if (mode === "verify") {
        setNotice("Xác minh email chưa được bật trong phiên bản hiện tại.");
      } else if (mode === "forgot") {
        router.push("/change-password");
      } else if (mode === "change") {
        await accountApi.changePassword(form.oldPassword, form.password);
        await webAuth.logout();
        window.location.href = "/login?passwordChanged=1";
      } else {
        router.push("/login");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  };

  const handleCode = (index: number, value: string) => {
    const next = [...code]; next[index] = value.replace(/\D/g, "").slice(-1); setCode(next);
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
  };
  const codeKey = (index: number, key: string) => { if (key === "Backspace" && !code[index] && index > 0) codeRefs.current[index - 1]?.focus(); };
  const pasteCode = (event: React.ClipboardEvent) => {
    const values = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (!values.length) return; event.preventDefault(); setCode([...values, ...Array(6 - values.length).fill("")]); codeRefs.current[Math.min(values.length, 5)]?.focus();
  };

  return (
    <div className="auth-page bb-figma-auth-screen">
      {/* change-password in Figma uses authenticated header */}
      <FigmaHeader authenticated={mode === "change"} />

      <main className="auth-layout">
        {/* Left Side: Mountain sunset puzzle hero photo matching Figma */}
        <section className="auth-hero">
          <div
            className="auth-hero-image"
            style={{ backgroundImage: "url(/assets/home/figma-puzzle.png)", backgroundPosition: "82% center" }}
          />
          <div className="auth-hero-copy">
            <h2>Explore the world with friends</h2>
            <p>
              Join a community of travelers and outdoor enthusiasts. Discover new routes, share experiences, and find your next adventure buddy.
            </p>
          </div>
        </section>

        {/* Right Side: Exact Figma Form Card */}
        <section className="auth-form-side">
          <div className="auth-form-container">
            <div className="auth-heading">
              <h1 className="auth-figma-title">{title}</h1>
              <p className="auth-figma-subtitle">{subtitle}</p>
            </div>

            <form onSubmit={submit} noValidate className="auth-figma-form">
              {mode === "signup" && (
                <Field
                  label="Full Name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                />
              )}

              {mode === "change" && (
                <PasswordField
                  label="Old Password"
                  value={form.oldPassword}
                  show={showPassword}
                  onChange={(v) => update("oldPassword", v)}
                  toggle={() => setShowPassword(!showPassword)}
                  placeholder="Enter old password"
                />
              )}

              {mode !== "verify" && mode !== "change" && (
                <Field
                  label="Email Address"
                  type="email"
                  placeholder="hello@example.com"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                />
              )}

              {mode === "login" && (
                <PasswordField
                  label="Password"
                  value={form.password}
                  show={showPassword}
                  onChange={(v) => update("password", v)}
                  toggle={() => setShowPassword(!showPassword)}
                />
              )}

              {mode === "signup" && (
                <>
                  <PasswordField
                    label="Password"
                    value={form.password}
                    show={showPassword}
                    onChange={(v) => update("password", v)}
                    toggle={() => setShowPassword(!showPassword)}
                  />
                  <PasswordField
                    label="Confirm Password"
                    value={form.confirm}
                    show={showPassword}
                    onChange={(v) => update("confirm", v)}
                    toggle={() => setShowPassword(!showPassword)}
                  />
                  <div className="bb-signup-consents">
                    <label className="bb-signup-consent-row">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(event) => setAcceptTerms(event.target.checked)}
                        className="bb-figma-checkbox"
                      />
                      <span>
                        Tôi đã đọc và đồng ý với <Link href="/terms" target="_blank">Điều khoản sử dụng</Link>.
                      </span>
                    </label>
                    <label className="bb-signup-consent-row">
                      <input
                        type="checkbox"
                        checked={acceptPrivacy}
                        onChange={(event) => setAcceptPrivacy(event.target.checked)}
                        className="bb-figma-checkbox"
                      />
                      <span>
                        Tôi đồng ý với <Link href="/privacy" target="_blank">Chính sách quyền riêng tư</Link>.
                      </span>
                    </label>
                  </div>
                </>
              )}

              {mode === "change" && (
                <PasswordField
                  label="New Password"
                  value={form.password}
                  show={showPassword}
                  onChange={(v) => update("password", v)}
                  toggle={() => setShowPassword(!showPassword)}
                  placeholder="Enter new password"
                />
              )}

              {mode === "verify" && (
                <OtpInput
                  code={code}
                  codeRefs={codeRefs}
                  onChange={handleCode}
                  onKeyDown={codeKey}
                  onPaste={pasteCode}
                />
              )}

              {mode === "login" && (
                <div className="form-options">
                  <label className="bb-remember-me-label">
                    <input type="checkbox" className="bb-figma-checkbox" />
                    <span>Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="bb-forgot-link">
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && <p className="form-error" role="alert">{error}</p>}
              {notice && <p className="form-notice" role="status">{notice}</p>}

              <button className="auth-submit bb-figma-btn-primary" disabled={loading}>
                {loading ? "Please wait..." : submitLabel}
              </button>
            </form>

            {(mode === "login" || mode === "signup") && (
              <>
                <AuthDivider />
                <div className="bb-social-stack">
                  <SocialLoginButton
                    provider="Google"
                    onNotice={() => setNotice("Google sign-in is not connected in this demo.")}
                  />
                  <SocialLoginButton
                    provider="Apple"
                    onNotice={() => setNotice("Apple sign-in is not connected in this demo.")}
                  />
                </div>
              </>
            )}

            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  <span>Don&apos;t have an account? </span>
                  <Link href="/signup" className="auth-switch-link">Sign Up</Link>
                </>
              ) : mode === "signup" ? (
                <>
                  <span>Already have an account? </span>
                  <Link href="/login" className="auth-switch-link">Log in</Link>
                </>
              ) : (
                <>
                  <span>Back to </span>
                  <Link href="/login" className="auth-switch-link">Login</Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Clean black bottom footer bar matching Figma Group 36 */}
      <SimpleFooter />
    </div>
  );
}

export function Field({ label, placeholder, value, onChange, type = "text" }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="auth-field-input"
      />
    </label>
  );
}

export function PasswordField({ label, value, show, onChange, toggle, placeholder = "••••••••" }: { label: string; value: string; show: boolean; onChange: (value: string) => void; toggle: () => void; placeholder?: string }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{label}</span>
      <div className="password-input">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={label === "Old Password" ? "current-password" : "new-password"}
          className="auth-field-input"
        />
        <button type="button" onClick={toggle} aria-label={show ? "Hide password" : "Show password"} className="bb-eye-btn">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

export function OtpInput({
  code,
  codeRefs,
  onChange,
  onKeyDown,
  onPaste,
}: {
  code: string[];
  codeRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, key: string) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="otp-field">
      <div className="otp-row">
        {code.map((value, index) => (
          <input
            key={index}
            ref={(element) => {
              codeRefs.current[index] = element;
            }}
            value={value}
            placeholder="0"
            inputMode="numeric"
            maxLength={1}
            aria-label={`Digit ${index + 1}`}
            onChange={(event) => onChange(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event.key)}
            onPaste={onPaste}
            className="otp-box-input"
          />
        ))}
      </div>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="auth-divider">
      <span className="auth-divider-line" />
      <span className="auth-divider-text">Or continue with</span>
      <span className="auth-divider-line" />
    </div>
  );
}

export function SocialLoginButton({ provider, onNotice }: { provider: "Google" | "Apple"; onNotice: () => void }) {
  return (
    <button
      type="button"
      className={`social-login ${provider === "Apple" ? "apple" : "google"}`}
      onClick={onNotice}
      aria-label={`Continue with ${provider}`}
    >
      {provider === "Google" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.64-.78 1.08-1.87.96-2.96-.94.04-2.07.63-2.73 1.41-.58.68-1.1 1.77-.96 2.83 1.05.08 2.1-.53 2.73-1.28z" />
        </svg>
      )}
      <span>Continue with {provider}</span>
    </button>
  );
}
