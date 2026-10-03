import {
  ConnectionStatus,
  ConversationMemberRole,
  ConversationType,
  HabitCompletionSource,
  HabitRoutineFrequency,
  MascotMemoryCategory,
  MascotMemorySourceType,
  MascotSuggestionStatus,
  MascotSuggestionType,
  MoodValue,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../common/errors/app-error";

export class WellbeingService {
  static createMood(userId: string, data: { mood: MoodValue; energyLevel: number; note?: string; recordedAt?: Date }) {
    return prisma.moodCheckIn.create({ data: { userId, mood: data.mood, energyLevel: data.energyLevel, note: data.note, recordedAt: data.recordedAt } });
  }
  static listMoods(userId: string, limit = 30) { return prisma.moodCheckIn.findMany({ where: { userId }, orderBy: { recordedAt: "desc" }, take: Math.min(Math.max(limit, 1), 100) }); }

  static createRoutine(userId: string, data: { habitId?: string; name: string; frequency: HabitRoutineFrequency; schedule: Record<string, unknown>; timezone: string; targetValue?: number; unit?: string; startsOn: Date; endsOn?: Date }) {
    return prisma.habitRoutine.create({ data: { userId, ...data, schedule: data.schedule as Prisma.InputJsonValue } });
  }
  static listRoutines(userId: string, activeOnly = true) { return prisma.habitRoutine.findMany({ where: { userId, ...(activeOnly ? { isActive: true } : {}) }, orderBy: { createdAt: "desc" }, include: { completions: { orderBy: { localDate: "desc" }, take: 14 } } }); }
  static async completeRoutine(userId: string, routineId: string, data: { localDate: Date; value?: number; note?: string }) {
    const routine = await prisma.habitRoutine.findUnique({ where: { id: routineId } });
    if (!routine || routine.userId !== userId || !routine.isActive) throw new AppError("Routine không khả dụng", 404);
    return prisma.habitCompletion.upsert({
      where: { routineId_localDate: { routineId, localDate: data.localDate } },
      update: { value: data.value ?? 1, note: data.note, completedAt: new Date(), source: HabitCompletionSource.USER },
      create: { routineId, userId, localDate: data.localDate, value: data.value ?? 1, note: data.note },
    });
  }
  static async setRoutineActive(userId: string, routineId: string, isActive: boolean) {
    const result = await prisma.habitRoutine.updateMany({ where: { id: routineId, userId }, data: { isActive } });
    if (!result.count) throw new AppError("Không tìm thấy routine", 404);
    return { isActive };
  }

  static listSuggestions(userId: string) { return prisma.mascotSuggestion.findMany({ where: { userId, status: { in: [MascotSuggestionStatus.PENDING, MascotSuggestionStatus.SEEN] }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" } }); }
  static async refreshSuggestions(userId: string) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const [latestMood, todayMood, routines, connectionCount] = await Promise.all([
      prisma.moodCheckIn.findFirst({ where: { userId }, orderBy: { recordedAt: "desc" } }),
      prisma.moodCheckIn.findFirst({ where: { userId, recordedAt: { gte: today } } }),
      prisma.habitRoutine.findMany({
        where: { userId, isActive: true },
        include: { completions: { where: { localDate: today }, take: 1 } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.connection.count({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
    ]);

    const candidates: Array<{ type: MascotSuggestionType; title: string; content: string; reason: string; payload?: Prisma.InputJsonValue }> = [];
    if (!todayMood) {
      candidates.push({
        type: MascotSuggestionType.CHECK_IN,
        title: "How are you feeling today?",
        content: "Take a minute to check in with your mood and energy today.",
        reason: "You haven't completed a mood check-in today.",
      });
    } else if (latestMood && (latestMood.mood === MoodValue.VERY_LOW || latestMood.mood === MoodValue.LOW)) {
      candidates.push({
        type: MascotSuggestionType.CHECK_IN,
        title: "A short break matters too",
        content: "Try breathing slowly, drinking some water, or messaging someone you trust.",
        reason: "Your most recent mood check-in was low.",
      });
    }
    const pendingRoutine = routines.find((routine) => routine.completions.length === 0);
    if (pendingRoutine) {
      candidates.push({
        type: MascotSuggestionType.HABIT,
        title: `One small step with “${pendingRoutine.name}”`,
        content: `Complete ${pendingRoutine.targetValue} ${pendingRoutine.unit} today to stay on track with your routine.`,
        reason: "This routine hasn't been marked complete today.",
        payload: { routineId: pendingRoutine.id },
      });
    }
    if (connectionCount === 0) {
      candidates.push({
        type: MascotSuggestionType.SOCIAL,
        title: "Find someone like-minded",
        content: "Explore your matches to start a positive new connection.",
        reason: "You have no active connections yet.",
      });
    }

    for (const candidate of candidates.slice(0, 3)) {
      const recent = await prisma.mascotSuggestion.findFirst({
        where: { userId, title: candidate.title, createdAt: { gte: recentCutoff } },
      });
      if (!recent) {
        await prisma.mascotSuggestion.create({
          data: {
            userId,
            ...candidate,
            expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
    return this.listSuggestions(userId);
  }
  static async respondSuggestion(userId: string, suggestionId: string, status: "SEEN" | "ACCEPTED" | "DISMISSED") {
    const result = await prisma.mascotSuggestion.updateMany({ where: { id: suggestionId, userId }, data: { status, seenAt: new Date(), ...(status === MascotSuggestionStatus.ACCEPTED || status === MascotSuggestionStatus.DISMISSED ? { respondedAt: new Date() } : {}) } });
    if (!result.count) throw new AppError("Không tìm thấy gợi ý", 404); return { status };
  }

  static listMemories(userId: string) { return prisma.mascotMemory.findMany({ where: { userId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { createdAt: "desc" } }); }
  static createExplicitMemory(userId: string, data: { category: MascotMemoryCategory; summary: string; expiresAt?: Date; consent: true }) {
    if (data.consent !== true) throw new AppError("Cần xác nhận đồng ý trước khi lưu memory", 400);
    return prisma.mascotMemory.create({ data: { userId, category: data.category, summary: data.summary.trim(), sourceType: MascotMemorySourceType.USER_EXPLICIT, confidence: 1, consentRecordedAt: new Date(), expiresAt: data.expiresAt } });
  }
  static async revokeMemory(userId: string, memoryId: string) { const r = await prisma.mascotMemory.updateMany({ where: { id: memoryId, userId, revokedAt: null }, data: { revokedAt: new Date() } }); if (!r.count) throw new AppError("Không tìm thấy memory", 404); return { revoked: true }; }

  static async getMascotConversation(userId: string) {
    const existing = await prisma.conversation.findFirst({ where: { type: ConversationType.AI, createdByUserId: userId, deletedAt: null }, include: { members: true } });
    if (existing) return existing;
    return prisma.$transaction((tx) => tx.conversation.create({
      data: { type: ConversationType.AI, title: "Buzzy", createdByUserId: userId, members: { create: { userId, role: ConversationMemberRole.OWNER } } },
      include: { members: true },
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
