import { prisma } from "../../lib/prisma";
import { ConsentDecision, LegalDocumentType } from "@prisma/client";

function documentType(consentType: string) {
  if (consentType === "TERMS") return LegalDocumentType.TERMS;
  if (consentType === "COOKIES") return LegalDocumentType.COOKIE_POLICY;
  return LegalDocumentType.PRIVACY;
}

export class LegalService {
  public static async recordConsent(data: {
    userId?: string;
    sessionId?: string;
    consentType: string;
    isAccepted?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (!data.userId && !data.sessionId) {
      throw new Error("Cần user hoặc session để ghi nhận consent");
    }
    const legalDocument = await prisma.legalDocument.findFirst({
      where: {
        type: documentType(data.consentType),
        effectiveAt: { lte: new Date() },
        retiredAt: null,
      },
      orderBy: { effectiveAt: "desc" },
    });
    if (!legalDocument) throw new Error("Chưa cấu hình phiên bản tài liệu pháp lý đang hiệu lực");
    const accepted = data.isAccepted ?? true;

    return prisma.userConsent.create({
      data: {
        userId: data.userId || null,
        sessionId: data.sessionId || null,
        anonymousSessionId: data.userId ? null : data.sessionId,
        legalDocumentId: legalDocument.id,
        consentType: data.consentType,
        isAccepted: accepted,
        decision: accepted ? ConsentDecision.ACCEPTED : ConsentDecision.REJECTED,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  public static async checkConsent(params: { userId?: string; sessionId?: string }) {
    if (!params.userId && !params.sessionId) {
      return { hasConsentedCookies: false, hasAcceptedTerms: false, hasAcceptedPrivacy: false };
    }

    const consentOwners = [
      ...(params.userId ? [{ userId: params.userId }] : []),
      ...(params.sessionId ? [{ sessionId: params.sessionId }] : []),
    ];
    const consents = await prisma.userConsent.findMany({
      where: { OR: consentOwners },
      orderBy: { acceptedAt: "desc" },
    });

    const latest = new Map<string, (typeof consents)[number]>();
    for (const consent of consents) {
      if (!latest.has(consent.consentType)) latest.set(consent.consentType, consent);
    }
    const accepted = (type: string) =>
      latest.get(type)?.decision === ConsentDecision.ACCEPTED;
    const hasConsentedCookies = accepted("COOKIES");
    const hasAcceptedTerms = accepted("TERMS");
    const hasAcceptedPrivacy = accepted("PRIVACY");

    return {
      hasConsentedCookies,
      hasAcceptedTerms,
      hasAcceptedPrivacy,
      consents,
    };
  }
}
