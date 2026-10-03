import nodemailer, { Transporter } from "nodemailer";
import { ENV } from "../../config/environment";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export class AuthEmailService {
  private static transporter: Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: ENV.EMAIL.SMTP_HOST,
        port: ENV.EMAIL.SMTP_PORT,
        secure: ENV.EMAIL.SMTP_SECURE,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        auth: {
          user: ENV.EMAIL.SMTP_USER,
          pass: ENV.EMAIL.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  private static async deliver(message: EmailMessage) {
    if (ENV.EMAIL.DELIVERY_MODE === "console") {
      console.info(`[BeeBuddy email:console] to=${message.to} subject=${message.subject}\n${message.text}`);
      return;
    }

    if (ENV.EMAIL.DELIVERY_MODE === "resend") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ENV.EMAIL.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ENV.EMAIL.FROM,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        const detail = result && typeof result === "object" && "message" in result && typeof result.message === "string"
          ? `: ${result.message}`
          : "";
        throw new Error(`Resend rejected the email (HTTP ${response.status})${detail}`);
      }
      return;
    }

    await this.getTransporter().sendMail({
      from: ENV.EMAIL.FROM,
      ...message,
    });
  }

  public static async sendVerificationCode(input: {
    email: string;
    fullName: string;
    code: string;
  }) {
    const name = escapeHtml(input.fullName || "friend");
    const ttl = ENV.EMAIL.VERIFICATION_TTL_MINUTES;
    await this.deliver({
      to: input.email,
      subject: `${input.code} is your BeeBuddy verification code`,
      text: `Hello ${input.fullName || "friend"},\n\nYour BeeBuddy verification code is: ${input.code}\nThis code is valid for ${ttl} minutes and can be used only once.\n\nIf you did not create this account, please ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#202124;max-width:560px;margin:auto">
          <h1 style="color:#126b3a">Verify your BeeBuddy email</h1>
          <p>Hello ${name},</p>
          <p>Enter this code to complete your sign-up:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#126b3a">${input.code}</p>
          <p>This code is valid for <strong>${ttl} minutes</strong> and can be used only once.</p>
          <p style="color:#667085">If you did not create this account, please ignore this email.</p>
        </div>`,
    });
  }

  public static async sendPasswordReset(input: {
    email: string;
    fullName: string;
    resetUrl: string;
  }) {
    const name = escapeHtml(input.fullName || "friend");
    const safeUrl = escapeHtml(input.resetUrl);
    const ttl = ENV.EMAIL.PASSWORD_RESET_TTL_MINUTES;
    await this.deliver({
      to: input.email,
      subject: "Reset your BeeBuddy password",
      text: `Hello ${input.fullName || "friend"},\n\nOpen this link to reset your BeeBuddy password:\n${input.resetUrl}\n\nThis link is valid for ${ttl} minutes and can be used only once. If you did not request this change, please ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#202124;max-width:560px;margin:auto">
          <h1 style="color:#126b3a">Reset your password</h1>
          <p>Hello ${name},</p>
          <p>You recently requested a BeeBuddy password reset.</p>
          <p><a href="${safeUrl}" style="display:inline-block;background:#126b3a;color:white;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Reset password</a></p>
          <p>This link is valid for <strong>${ttl} minutes</strong> and can be used only once.</p>
          <p style="color:#667085">If you did not request this change, please ignore this email. Your current password remains secure.</p>
        </div>`,
    });
  }
}
