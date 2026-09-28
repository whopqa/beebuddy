import { OAuth2Client } from "google-auth-library";
import { ENV } from "../../config/environment";

export type VerifiedGoogleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl?: string;
  hostedDomain?: string;
  googleIsAuthoritativeForEmail: boolean;
};

export class GoogleIdentityService {
  private static client = new OAuth2Client();

  public static async verifyCredential(credential: string): Promise<VerifiedGoogleIdentity> {
    if (!ENV.GOOGLE.CLIENT_ID) {
      throw new Error("Google Sign-In chưa được cấu hình trên máy chủ");
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: ENV.GOOGLE.CLIENT_ID,
      });
    } catch {
      throw new Error("Google credential không hợp lệ hoặc đã hết hạn");
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Tài khoản Google chưa cung cấp email đã xác minh");
    }

    const email = payload.email.toLowerCase().trim();
    return {
      subject: payload.sub,
      email,
      emailVerified: true,
      fullName: payload.name?.trim() || email.split("@")[0],
      avatarUrl: payload.picture,
      hostedDomain: payload.hd,
      googleIsAuthoritativeForEmail: email.endsWith("@gmail.com") || Boolean(payload.hd),
    };
  }
}
