import { Prisma, SubscriptionStatus } from "@prisma/client";
import { AppError } from "../errors/app-error";

export type Entitlement = {
  enabled: boolean;
  limitValue: number | null;
  config: Prisma.JsonValue | null;
};

export class EntitlementService {
  public static async resolve(
    tx: Prisma.TransactionClient,
    userId: string,
    featureCode: string,
    at = new Date()
  ): Promise<Entitlement> {
    const grant = await tx.entitlementGrant.findFirst({
      where: {
        userId,
        feature: { code: featureCode },
        startsAt: { lte: at },
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: at } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (grant) {
      const value = grant.value as Record<string, unknown> | null;
      return {
        enabled: value?.enabled !== false,
        limitValue: typeof value?.limitValue === "number" ? value.limitValue : null,
        config: grant.value,
      };
    }

    const subscription = await tx.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: at } }],
      },
      include: {
        plan: {
          include: {
            features: {
              where: { feature: { code: featureCode } },
              take: 1,
            },
          },
        },
      },
    });
    const planFeature = subscription?.plan.features[0];
    return {
      enabled: planFeature?.enabled ?? false,
      limitValue: planFeature?.limitValue ?? null,
      config: planFeature?.config ?? null,
    };
  }

  public static async require(
    tx: Prisma.TransactionClient,
    userId: string,
    featureCode: string
  ) {
    const entitlement = await this.resolve(tx, userId, featureCode);
    if (!entitlement.enabled) {
      throw new AppError(`Gói hiện tại chưa mở quyền ${featureCode}`, 403);
    }
    return entitlement;
  }
}
