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
        throw new Error(`Resend từ chối gửi email (HTTP ${response.status})${detail}`);
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
    const name = escapeHtml(input.fullName || "bạn");
    const ttl = ENV.EMAIL.VERIFICATION_TTL_MINUTES;
    await this.deliver({
      to: input.email,
      subject: `${input.code} là mã xác minh BeeBuddy của bạn`,
      text: `Xin chào ${input.fullName || "bạn"},\n\nMã xác minh BeeBuddy của bạn là: ${input.code}\nMã có hiệu lực trong ${ttl} phút và chỉ dùng được một lần.\n\nNếu bạn không tạo tài khoản này, hãy bỏ qua email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#202124;max-width:560px;margin:auto">
          <h1 style="color:#126b3a">Xác minh email BeeBuddy</h1>
          <p>Xin chào ${name},</p>
          <p>Nhập mã sau để hoàn tất đăng ký:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#126b3a">${input.code}</p>
          <p>Mã có hiệu lực trong <strong>${ttl} phút</strong> và chỉ dùng được một lần.</p>
          <p style="color:#667085">Nếu bạn không tạo tài khoản này, hãy bỏ qua email.</p>
        </div>`,
    });
  }

  public static async sendPasswordReset(input: {
    email: string;
    fullName: string;
    resetUrl: string;
  }) {
    const name = escapeHtml(input.fullName || "bạn");
    const safeUrl = escapeHtml(input.resetUrl);
    const ttl = ENV.EMAIL.PASSWORD_RESET_TTL_MINUTES;
    await this.deliver({
      to: input.email,
      subject: "Đặt lại mật khẩu BeeBuddy",
      text: `Xin chào ${input.fullName || "bạn"},\n\nMở liên kết sau để đặt lại mật khẩu BeeBuddy:\n${input.resetUrl}\n\nLiên kết có hiệu lực trong ${ttl} phút và chỉ dùng được một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#202124;max-width:560px;margin:auto">
          <h1 style="color:#126b3a">Đặt lại mật khẩu</h1>
          <p>Xin chào ${name},</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu BeeBuddy.</p>
          <p><a href="${safeUrl}" style="display:inline-block;background:#126b3a;color:white;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Đặt lại mật khẩu</a></p>
          <p>Liên kết có hiệu lực trong <strong>${ttl} phút</strong> và chỉ dùng được một lần.</p>
          <p style="color:#667085">Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email. Mật khẩu hiện tại vẫn an toàn.</p>
        </div>`,
    });
  }
}
