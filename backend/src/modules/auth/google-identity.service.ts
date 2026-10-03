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
      throw new Error("Google Sign-In is not configured on the server");
    }

    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: ENV.GOOGLE.CLIENT_ID,
      });
    } catch {
      throw new Error("Google credential is invalid or expired");
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new Error("Google account did not provide a verified email address");
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
