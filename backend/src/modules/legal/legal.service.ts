import { prisma } from "../../lib/prisma";

export class LegalService {
  public static async recordConsent(data: {
    userId?: string;
    sessionId?: string;
    consentType: string;
    isAccepted?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.userConsent.create({
      data: {
        userId: data.userId || null,
        sessionId: data.sessionId || null,
        consentType: data.consentType,
        isAccepted: data.isAccepted ?? true,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  public static async checkConsent(params: { userId?: string; sessionId?: string }) {
    if (!params.userId && !params.sessionId) {
      return { hasConsentedCookies: false, hasAcceptedTerms: false };
    }

    const consents = await prisma.userConsent.findMany({
      where: {
        OR: [
          params.userId ? { userId: params.userId } : {},
          params.sessionId ? { sessionId: params.sessionId } : {},
        ],
      },
      orderBy: { acceptedAt: "desc" },
    });

    const hasConsentedCookies = consents.some(
      (c) => c.consentType === "COOKIES" && c.isAccepted
    );
    const hasAcceptedTerms = consents.some(
      (c) => c.consentType === "TERMS" && c.isAccepted
    );

    return {
      hasConsentedCookies,
      hasAcceptedTerms,
      consents,
    };
  }
}
