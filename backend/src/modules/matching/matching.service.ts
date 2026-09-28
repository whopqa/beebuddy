import { randomUUID } from "crypto";
import {
  ConnectionStatus,
  MatchFeedbackType,
  MatchRecommendationStatus,
  NotificationType,
  Prisma,
  ProfileAudience,
  ProfileSection,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";
import { NotificationService } from "../../common/services/notification.service";

function pairKey(first: string, second: string) { return [first, second].sort().join(":"); }
function ageFrom(date?: Date | null) {
  if (!date) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  if (now.getUTCMonth() < date.getUTCMonth() || now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate()) age--;
  return age;
}

export class MatchingService {
  static getPreference(userId: string) {
    return prisma.matchingPreference.findUnique({ where: { userId } });
  }

  static setPreference(userId: string, data: { enabled: boolean; minAge?: number; maxAge?: number; maxDistanceKm?: number; preferredGoals: string[]; weights?: Record<string, number> }) {
    return prisma.matchingPreference.upsert({
      where: { userId }, update: data, create: { userId, ...data },
    });
  }

  static async refresh(userId: string, limit = 20) {
    const preference = await prisma.matchingPreference.findUnique({ where: { userId } });
    if (preference?.enabled === false) throw new AppError("Matching đang bị tắt", 409);
    const [self, blocks, connections, dismissed] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { userInterests: true, userHabits: true, connectionGoals: { include: { connectionGoal: true } } },
      }),
      prisma.userBlock.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
      prisma.connection.findMany({ where: { OR: [{ requesterId: userId }, { addresseeId: userId }], status: { in: [ConnectionStatus.PENDING, ConnectionStatus.ACCEPTED] } } }),
      prisma.matchFeedback.findMany({ where: { userId, type: { in: [MatchFeedbackType.PASS, MatchFeedbackType.BLOCK, MatchFeedbackType.REPORT] } }, select: { candidateUserId: true } }),
    ]);
    const excluded = new Set<string>([userId]);
    blocks.forEach((b) => excluded.add(b.blockerId === userId ? b.blockedId : b.blockerId));
    connections.forEach((c) => excluded.add(c.requesterId === userId ? c.addresseeId : c.requesterId));
    dismissed.forEach((f) => excluded.add(f.candidateUserId));
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: [...excluded] }, isBanned: false,
        visibilityRules: { some: { section: ProfileSection.BASIC, audience: ProfileAudience.PUBLIC } },
      },
      take: 100,
      include: {
        profile: true, userInterests: true, userHabits: true,
        connectionGoals: { include: { connectionGoal: true } },
      },
    });
    const ownInterests = new Set(self.userInterests.map((x) => x.interestId));
    const ownHabits = new Set(self.userHabits.map((x) => x.habitId));
    const preferredGoals = new Set(preference?.preferredGoals ?? self.connectionGoals.map((x) => x.connectionGoal.slug));
    const weights = (preference?.weights as Record<string, number> | null) ?? {};
    const wi = Math.max(0, weights.interests ?? 0.5), wh = Math.max(0, weights.habits ?? 0.2), wg = Math.max(0, weights.goals ?? 0.3);
    const denominator = wi + wh + wg || 1;
    const ranked = candidates.flatMap((candidate) => {
      const age = ageFrom(candidate.profile?.dateOfBirth);
      if (age !== null && (preference?.minAge && age < preference.minAge || preference?.maxAge && age > preference.maxAge)) return [];
      const sharedInterests = candidate.userInterests.filter((x) => ownInterests.has(x.interestId)).length;
      const sharedHabits = candidate.userHabits.filter((x) => ownHabits.has(x.habitId)).length;
      const goalMatches = candidate.connectionGoals.filter((x) => preferredGoals.has(x.connectionGoal.slug)).length;
      const interestScore = sharedInterests / Math.max(ownInterests.size, candidate.userInterests.length, 1);
      const habitScore = sharedHabits / Math.max(ownHabits.size, candidate.userHabits.length, 1);
      const goalScore = goalMatches ? 1 : 0;
      const score = Math.min(1, (interestScore * wi + habitScore * wh + goalScore * wg) / denominator);
      return [{ candidate, score, reasons: [
        ...(sharedInterests ? [{ code: "SHARED_INTERESTS", count: sharedInterests }] : []),
        ...(sharedHabits ? [{ code: "SHARED_HABITS", count: sharedHabits }] : []),
        ...(goalMatches ? [{ code: "MATCHED_GOALS", count: goalMatches }] : []),
      ] }];
    }).filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(limit, 1), 50));
    const batchId = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return prisma.$transaction(async (tx) => {
      await tx.matchRecommendation.updateMany({
        where: {
          userId,
          status: { in: [MatchRecommendationStatus.PENDING, MatchRecommendationStatus.VIEWED] },
        },
        data: { status: MatchRecommendationStatus.EXPIRED },
      });
      const items = [];
      for (const item of ranked) {
        items.push(await tx.matchRecommendation.create({
          data: { userId, candidateUserId: item.candidate.id, batchId, score: item.score, reasons: item.reasons, algorithmVersion: "rule-v1", expiresAt },
          include: { candidateUser: { select: { id: true, tier: true, profile: { select: { fullName: true, username: true, avatarUrl: true, location: true } } } } },
        }));
      }
      return { batchId, items };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  static list(userId: string, limit = 20) {
    return prisma.userBlock.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }).then((blocks) => prisma.matchRecommendation.findMany({
      where: { userId, candidateUserId: { notIn: blocks.map((b) => b.blockerId === userId ? b.blockedId : b.blockerId) }, status: { in: [MatchRecommendationStatus.PENDING, MatchRecommendationStatus.VIEWED] }, expiresAt: { gt: new Date() } },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }], take: Math.min(Math.max(limit, 1), 50),
      include: { candidateUser: { select: { id: true, tier: true, profile: { select: { fullName: true, username: true, avatarUrl: true, location: true } } } } },
    }));
  }

  static async feedback(userId: string, recommendationId: string, type: MatchFeedbackType, reasons?: Record<string, unknown>) {
    return prisma.$transaction(async (tx) => {
      const rec = await tx.matchRecommendation.findUnique({ where: { id: recommendationId } });
      if (!rec || rec.userId !== userId) throw new AppError("Không tìm thấy recommendation", 404);
      const now = new Date();
      const feedback = await tx.matchFeedback.create({ data: { userId, candidateUserId: rec.candidateUserId, recommendationId, type, reasons: reasons as Prisma.InputJsonValue | undefined } });
      await tx.matchRecommendation.update({ where: { id: rec.id }, data: { status: type === MatchFeedbackType.LIKE || type === MatchFeedbackType.CONNECT ? MatchRecommendationStatus.ACCEPTED : MatchRecommendationStatus.DISMISSED, respondedAt: now } });
      if (type === MatchFeedbackType.BLOCK) {
        await tx.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: userId, blockedId: rec.candidateUserId } }, update: {}, create: { blockerId: userId, blockedId: rec.candidateUserId } });
      }
      if (type === MatchFeedbackType.CONNECT) {
        const key = pairKey(userId, rec.candidateUserId);
        const connection = await tx.connection.upsert({
          where: { pairKey: key },
          update: { requesterId: userId, addresseeId: rec.candidateUserId, userId, targetId: rec.candidateUserId, status: ConnectionStatus.PENDING, requestedAt: now, respondedAt: null, endedAt: null },
          create: { userId, targetId: rec.candidateUserId, requesterId: userId, addresseeId: rec.candidateUserId, pairKey: key },
        });
        await NotificationService.create(tx, {
          recipientId: rec.candidateUserId,
          actorId: userId,
          type: NotificationType.CONNECTION_REQUEST,
          entityType: "Connection",
          entityId: connection.id,
          payload: { connectionId: connection.id, requesterId: userId },
          dedupeKey: `connection-request:${connection.id}:${now.toISOString()}`,
        });
      }
      if (type === MatchFeedbackType.REPORT) {
        await tx.report.create({
          data: {
            reporterId: userId,
            targetUserId: rec.candidateUserId,
            source: "USER",
            reason: typeof reasons?.reason === "string" ? reasons.reason.slice(0, 1000) : "Báo cáo từ matching feedback",
            reasonCode: "MATCHING_FEEDBACK",
          },
        });
      }
      return feedback;
    });
  }
}
