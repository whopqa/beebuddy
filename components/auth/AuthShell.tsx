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
import { GoogleSignInButton, googleSignInConfigured } from "./GoogleSignInButton";

export type AuthMode = "login" | "signup" | "verify" | "forgot" | "reset" | "change";

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
  reset: {
    title: "RESET PASSWORD",
    subtitle: "Choose a secure new password for your account",
    submit: "SAVE NEW PASSWORD",
  },
  change: {
    title: "CHANGE PASSWORD",
    subtitle: "Enter your old and new password below",
    submit: "CHANGE PASSWORD",
  },
};

export default function AuthShell({
  mode,
  initialEmail = "",
  resetToken = "",
  developmentCode = "",
}: {
  mode: AuthMode;
  initialEmail?: string;
  resetToken?: string;
  developmentCode?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [developmentActionUrl, setDevelopmentActionUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(() => {
    const digits = developmentCode.replace(/\D/g, "").slice(0, 6).split("");
    return [...digits, ...Array(6 - digits.length).fill("")];
  });
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [form, setForm] = useState({ name: "", email: initialEmail, password: "", confirm: "", oldPassword: "" });
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
    if (mode === "verify" && (!form.email || code.join("").length !== 6)) return setError("Vui lòng nhập email và mã xác minh gồm 6 chữ số.");
    if (mode === "signup" && !form.name.trim()) return setError("Please enter your name.");
    if (["login", "signup", "forgot"].includes(mode) && !form.email) return setError("Please enter your email address.");
    if (mode === "login" && !form.password) return setError("Please enter your password.");
    if (mode === "signup" && (form.password.length < 8 || !/[A-Za-zÀ-ỹ]/.test(form.password) || !/\d/.test(form.password))) return setError("Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.");
    if (mode === "signup" && form.password !== form.confirm) return setError("Passwords do not match.");
    if (mode === "signup" && !acceptTerms) return setError("Bạn cần đồng ý Điều khoản sử dụng để đăng ký.");
    if (mode === "signup" && !acceptPrivacy) return setError("Bạn cần đồng ý Chính sách quyền riêng tư để đăng ký.");
    if (mode === "change" && (!form.oldPassword || form.password.length < 8 || !/[A-Za-zÀ-ỹ]/.test(form.password) || !/\d/.test(form.password))) return setError("Mật khẩu mới cần ít nhất 8 ký tự, gồm chữ và số.");
    if (mode === "change" && form.oldPassword === form.password) return setError("New password must be different from the old password.");
    if (mode === "reset" && !resetToken) return setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã thiếu token.");
    if (mode === "reset" && (form.password.length < 8 || !/[A-Za-zÀ-ỹ]/.test(form.password) || !/\d/.test(form.password))) return setError("Mật khẩu cần ít nhất 8 ký tự, gồm chữ và số.");
    if (mode === "reset" && form.password !== form.confirm) return setError("Mật khẩu xác nhận không khớp.");
    setLoading(true);
    try {
      if (mode === "login") {
        const result = await webAuth.login(form.email.trim(), form.password);
        router.replace(result.user.role === "ADMIN" ? "/admin" : "/home");
        router.refresh();
      } else if (mode === "signup") {
        const result = await webAuth.register(form.name.trim(), form.email.trim(), form.password, {
          acceptTerms,
          acceptPrivacy,
          consentSessionId: getConsentSessionId(),
        });
        const params = new URLSearchParams({ email: result.user.email });
        if (result.developmentCode) params.set("devCode", result.developmentCode);
        router.replace(`/verify-code?${params.toString()}`);
      } else if (mode === "verify") {
        await webAuth.confirmEmailVerification(form.email.trim(), code.join(""));
        router.replace("/get-started");
        router.refresh();
      } else if (mode === "forgot") {
        const result = await webAuth.requestPasswordReset(form.email.trim());
        setNotice(result.message);
        setDevelopmentActionUrl(result.developmentActionUrl || "");
      } else if (mode === "reset") {
        await webAuth.confirmPasswordReset(resetToken, form.password);
        window.location.href = "/login?passwordChanged=1";
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

  const resendVerification = async () => {
    setError(""); setNotice(""); setLoading(true);
    try {
      const result = await webAuth.requestEmailVerification(form.email.trim());
      setNotice(result.developmentCode
        ? `${result.message} Mã local development: ${result.developmentCode}`
        : result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi lại mã xác minh");
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async (credential: string) => {
    setError(""); setNotice("");
    if (mode === "signup" && (!acceptTerms || !acceptPrivacy)) {
      setError("Bạn cần đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư trước khi đăng ký bằng Google.");
      return;
    }
    setLoading(true);
    try {
      const result = await webAuth.googleSignIn(credential, {
        acceptTerms: mode === "login" ? true : acceptTerms,
        acceptPrivacy: mode === "login" ? true : acceptPrivacy,
        consentSessionId: getConsentSessionId(),
      });
      router.replace(result.user.role === "ADMIN" ? "/admin" : "/home");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng nhập bằng Google");
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

              {["login", "signup", "forgot", "verify"].includes(mode) && (
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

              {mode === "reset" && (
                <>
                  <PasswordField
                    label="New Password"
                    value={form.password}
                    show={showPassword}
                    onChange={(v) => update("password", v)}
                    toggle={() => setShowPassword(!showPassword)}
                    placeholder="At least 8 characters, letters and numbers"
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={form.confirm}
                    show={showPassword}
                    onChange={(v) => update("confirm", v)}
                    toggle={() => setShowPassword(!showPassword)}
                    placeholder="Enter the new password again"
                  />
                </>
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
              {mode === "login" && error.includes("Email chưa được xác minh") && (
                <p className="form-notice">
                  <Link
                    href={`/verify-code?email=${encodeURIComponent(form.email.trim())}`}
                    className="auth-switch-link"
                  >
                    Nhập hoặc gửi lại mã xác minh
                  </Link>
                </p>
              )}
              {notice && <p className="form-notice" role="status">{notice}</p>}
              {developmentActionUrl && (
                <p className="form-notice">
                  Local development: <Link href={developmentActionUrl} className="auth-switch-link">mở liên kết đặt lại mật khẩu</Link>.
                </p>
              )}

              <button className="auth-submit bb-figma-btn-primary" disabled={loading}>
                {loading ? "Please wait..." : submitLabel}
              </button>
              {mode === "verify" && (
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={resendVerification}
                  disabled={loading || !form.email.trim()}
                  style={{ border: 0, background: "transparent", cursor: "pointer", alignSelf: "center" }}
                >
                  Gửi lại mã xác minh
                </button>
              )}
            </form>

            {(mode === "login" || mode === "signup") && googleSignInConfigured && (
              <>
                <AuthDivider />
                <div className="bb-social-stack">
                  {mode === "login" && (
                    <p className="bb-social-legal-copy">
                      Bằng cách tiếp tục với Google, bạn đồng ý với <Link href="/terms" target="_blank">Điều khoản sử dụng</Link> và <Link href="/privacy" target="_blank">Chính sách quyền riêng tư</Link> của BeeBuddy.
                    </p>
                  )}
                  <GoogleSignInButton
                    mode={mode}
                    disabled={loading}
                    onCredential={googleSignIn}
                    onError={setError}
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
