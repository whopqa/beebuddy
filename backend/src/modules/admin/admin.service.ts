import { prisma } from "../../lib/prisma";
import {
  CommentStatus,
  ConnectionStatus,
  AuditActorType,
  ModerationCaseStatus,
  PaymentStatus,
  PostStatus,
  ReportStatus,
  Role,
  SubscriptionTier,
  UserRestrictionType,
} from "@prisma/client";
import { AppError } from "../../common/errors/app-error";

export class AdminService {
  // 1. Dashboard Metrics
  public static async getDashboardMetrics() {
    const [
      totalUsers,
      totalAdmins,
      vipUsers,
      proUsers,
      totalPayments,
      successfulPayments,
      pendingReports,
      flaggedComments,
    ] = await Promise.all([
      prisma.user.count({ where: { role: Role.USER } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { tier: SubscriptionTier.VIP } }),
      prisma.user.count({ where: { tier: SubscriptionTier.PRO } }),
      prisma.payment.count(),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.report.count({ where: { status: ReportStatus.OPEN } }),
      prisma.comment.count({ where: { status: CommentStatus.FLAGGED } }),
    ]);

    const recentPayments = await prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, profile: { select: { fullName: true } } },
        },
      },
    });

    return {
      overview: {
        totalUsers,
        totalAdmins,
        subscribers: {
          vip: vipUsers,
          pro: proUsers,
          total: vipUsers + proUsers,
        },
        revenue: {
          totalAmountVND: Number(successfulPayments._sum.amount || 0),
          successfulCount: successfulPayments._count,
          totalOrders: totalPayments,
        },
        moderation: {
          pendingReports,
          flaggedComments,
        },
      },
      recentPayments,
    };
  }

  // 2. Quản lý Tài khoản (User Management)
  public static async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: Role;
    tier?: SubscriptionTier;
    isBanned?: boolean;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 15);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.tier) where.tier = params.tier;
    if (params.isBanned !== undefined) where.isBanned = params.isBanned;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { profile: { fullName: { contains: params.search, mode: "insensitive" } } },
        { profile: { username: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              requestsSent: { where: { status: ConnectionStatus.ACCEPTED } },
              requestsReceived: { where: { status: ConnectionStatus.ACCEPTED } },
              payments: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        tier: u.tier,
        tierExpiresAt: u.tierExpiresAt,
        isBanned: u.isBanned,
        banReason: u.banReason,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        fullName: u.profile?.fullName || "Chưa đặt tên",
        username: u.profile?.username,
        avatarUrl: u.profile?.avatarUrl,
        location: u.profile?.location,
        stats: {
          postsCount: u._count.posts,
          commentsCount: u._count.comments,
          connectionsCount: u._count.requestsSent + u._count.requestsReceived,
          paymentsCount: u._count.payments,
        },
      })),
    };
  }

  public static async banUser(adminId: string, userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Không tìm thấy người dùng");
    if (user.role === Role.ADMIN) throw new Error("Không thể khóa tài khoản Admin");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isBanned: true, banReason: reason },
      });
      await tx.userRestriction.create({
        data: {
          userId,
          type: UserRestrictionType.BAN,
          reasonCode: "ADMIN_BAN",
          note: reason,
          createdByUserId: adminId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          actorUserId: adminId,
          action: "BAN_USER",
          targetType: "USER",
          targetId: userId,
          afterData: { isBanned: true, reason },
        },
      });
      await tx.moderationLog.create({
        data: { adminId, action: "BAN_USER", targetType: "USER", targetId: userId, note: reason },
      });
      return updated;
    });
  }

  public static async unbanUser(adminId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isBanned: false, banReason: null },
      });
      await tx.userRestriction.updateMany({
        where: { userId, type: UserRestrictionType.BAN, revokedAt: null },
        data: { revokedAt: now, revokedByUserId: adminId },
      });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          actorUserId: adminId,
          action: "UNBAN_USER",
          targetType: "USER",
          targetId: userId,
          afterData: { isBanned: false },
        },
      });
      await tx.moderationLog.create({
        data: { adminId, action: "UNBAN_USER", targetType: "USER", targetId: userId },
      });
      return updated;
    });
  }

  public static async updateUserTier(
    adminId: string,
    userId: string,
    tier: SubscriptionTier,
    durationMonths = 1
  ) {
    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setMonth(newExpiry.getMonth() + durationMonths);

    return prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({ where: { id: userId }, select: { tier: true, tierExpiresAt: true } });
      if (!before) throw new AppError("Không tìm thấy người dùng", 404);
      const updated = await tx.user.update({
        where: { id: userId },
        data: { tier, tierExpiresAt: tier === SubscriptionTier.FREE ? null : newExpiry },
      });
      await tx.moderationLog.create({ data: { adminId, action: "ADJUST_TIER", targetType: "USER", targetId: userId, note: `Admin cập nhật gói cước sang ${tier}` } });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.ADMIN,
          actorUserId: adminId,
          action: "ADJUST_TIER",
          targetType: "USER",
          targetId: userId,
          beforeData: { tier: before.tier, tierExpiresAt: before.tierExpiresAt?.toISOString() ?? null },
          afterData: { tier, tierExpiresAt: updated.tierExpiresAt?.toISOString() ?? null },
        },
      });
      return updated;
    });
  }

  // 3. Quản lý Giao dịch & Doanh thu (Payment Management)
  public static async getPayments(params: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    search?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 15);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.search) {
      const searchNum = Number(params.search);
      where.OR = [
        !isNaN(searchNum) ? { orderCode: searchNum } : {},
        { user: { email: { contains: params.search, mode: "insensitive" } } },
      ].filter((condition) => Object.keys(condition).length > 0);
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              email: true,
              profile: { select: { fullName: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      payments,
    };
  }

  // 4. Quản lý Kiểm duyệt Bình luận & Báo cáo (Content Moderation)
  public static async getFlaggedComments(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 15);
    const skip = (page - 1) * limit;

    const [total, comments] = await Promise.all([
      prisma.comment.count({
        where: {
          OR: [
            { status: CommentStatus.FLAGGED },
            { reports: { some: { status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } } } },
          ],
        },
      }),
      prisma.comment.findMany({
        where: {
          OR: [
            { status: CommentStatus.FLAGGED },
            { reports: { some: { status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } } } },
          ],
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              email: true,
              profile: { select: { fullName: true, avatarUrl: true } },
            },
          },
          post: {
            select: {
              id: true,
              content: true,
            },
          },
          reports: {
            where: { status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      comments,
    };
  }

  public static async moderateComment(
    adminId: string,
    commentId: string,
    action: "APPROVE" | "HIDE"
  ) {
    const newStatus = action === "APPROVE" ? CommentStatus.APPROVED : CommentStatus.HIDDEN;

    return prisma.$transaction(async (tx) => {
      const before = await tx.comment.findUnique({ where: { id: commentId } });
      if (!before) throw new AppError("Không tìm thấy bình luận", 404);
      const now = new Date();
      const updated = await tx.comment.update({ where: { id: commentId }, data: { status: newStatus } });
      const reports = await tx.report.findMany({ where: { commentId, status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } }, select: { moderationCaseId: true } });
      await tx.report.updateMany({
        where: { commentId, status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } },
        data: { status: action === "APPROVE" ? ReportStatus.DISMISSED : ReportStatus.RESOLVED, resolvedAt: now },
      });
      const caseIds = reports.flatMap((report) => report.moderationCaseId ? [report.moderationCaseId] : []);
      if (caseIds.length) {
        await tx.moderationCase.updateMany({ where: { id: { in: caseIds } }, data: { status: action === "APPROVE" ? ModerationCaseStatus.DISMISSED : ModerationCaseStatus.RESOLVED, resolvedAt: now } });
        await tx.moderationDecision.createMany({ data: caseIds.map((caseId) => ({ caseId, actorId: adminId, action: action === "APPROVE" ? "APPROVE_COMMENT" : "HIDE_COMMENT", reason: "Quyết định kiểm duyệt thủ công" })) });
      }
      const auditAction = action === "APPROVE" ? "APPROVE_COMMENT" : "HIDE_COMMENT";
      await tx.moderationLog.create({ data: { adminId, action: auditAction, targetType: "COMMENT", targetId: commentId } });
      await tx.auditLog.create({ data: { actorType: AuditActorType.ADMIN, actorUserId: adminId, action: auditAction, targetType: "COMMENT", targetId: commentId, beforeData: { status: before.status }, afterData: { status: updated.status } } });
      return updated;
    });
  }

  public static async getFlaggedPosts(params: { page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 15);
    const where = { reports: { some: { status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } } } };
    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          author: { select: { email: true, profile: { select: { fullName: true, avatarUrl: true } } } },
          media: { orderBy: { sortOrder: "asc" }, include: { mediaAsset: { select: { sourceUrl: true } } } },
          reports: { where: { status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } }, orderBy: { createdAt: "asc" }, include: { reporter: { select: { email: true, profile: { select: { fullName: true } } } } } },
          _count: { select: { comments: true, reactions: true } },
        },
      }),
    ]);
    return {
      total, page, limit, totalPages: Math.ceil(total / limit),
      posts: posts.map((post) => ({
        ...post,
        mediaUrls: post.media.flatMap((item) => item.mediaAsset.sourceUrl ? [item.mediaAsset.sourceUrl] : []),
        commentsCount: post._count.comments,
        reactionsCount: post._count.reactions,
      })),
    };
  }

  public static async moderatePost(adminId: string, postId: string, action: "APPROVE" | "HIDE") {
    return prisma.$transaction(async (tx) => {
      const before = await tx.post.findUnique({ where: { id: postId } });
      if (!before) throw new AppError("Không tìm thấy bài viết", 404);
      if (action === "APPROVE" && before.deletedAt && before.status === PostStatus.REMOVED) {
        throw new AppError("Không thể khôi phục bài viết đã được tác giả xóa", 409);
      }
      const now = new Date();
      const updated = await tx.post.update({
        where: { id: postId },
        data: action === "APPROVE"
          ? { status: PostStatus.PUBLISHED }
          : { status: PostStatus.REMOVED, deletedAt: now },
      });
      const reports = await tx.report.findMany({ where: { postId, status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } }, select: { moderationCaseId: true } });
      await tx.report.updateMany({
        where: { postId, status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } },
        data: { status: action === "APPROVE" ? ReportStatus.DISMISSED : ReportStatus.RESOLVED, resolvedAt: now },
      });
      const caseIds = reports.flatMap((report) => report.moderationCaseId ? [report.moderationCaseId] : []);
      if (caseIds.length) {
        await tx.moderationCase.updateMany({ where: { id: { in: caseIds } }, data: { status: action === "APPROVE" ? ModerationCaseStatus.DISMISSED : ModerationCaseStatus.RESOLVED, resolvedAt: now } });
        await tx.moderationDecision.createMany({ data: caseIds.map((caseId) => ({ caseId, actorId: adminId, action: action === "APPROVE" ? "APPROVE_POST" : "HIDE_POST", reason: "Quyết định kiểm duyệt thủ công" })) });
      }
      const auditAction = action === "APPROVE" ? "APPROVE_POST" : "HIDE_POST";
      await tx.moderationLog.create({ data: { adminId, action: auditAction, targetType: "POST", targetId: postId } });
      await tx.auditLog.create({ data: { actorType: AuditActorType.ADMIN, actorUserId: adminId, action: auditAction, targetType: "POST", targetId: postId, beforeData: { status: before.status, deletedAt: before.deletedAt?.toISOString() ?? null }, afterData: { status: updated.status, deletedAt: updated.deletedAt?.toISOString() ?? null } } });
      return updated;
    });
  }

  public static async getReports(params: { page?: number; limit?: number; status?: ReportStatus }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 25);
    const where = params.status ? { status: params.status } : {};
    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: { select: { email: true, profile: { select: { fullName: true } } } },
          targetUser: { select: { email: true, profile: { select: { fullName: true } } } },
          post: { select: { id: true, content: true, status: true, author: { select: { email: true, profile: { select: { fullName: true } } } } } },
          comment: { select: { id: true, content: true, status: true, author: { select: { email: true, profile: { select: { fullName: true } } } } } },
          moderationCase: { select: { id: true, caseType: true, priority: true, status: true } },
        },
      }),
    ]);
    return { total, page, limit, totalPages: Math.ceil(total / limit), reports };
  }

  public static async resolveReport(adminId: string, reportId: string, action: "RESOLVE" | "DISMISS", note?: string) {
    return prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id: reportId } });
      if (!report) throw new AppError("Không tìm thấy báo cáo", 404);
      if (report.status !== ReportStatus.OPEN && report.status !== ReportStatus.TRIAGED) {
        throw new AppError("Báo cáo đã được xử lý", 409);
      }
      const now = new Date();
      const status = action === "RESOLVE" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;
      const updated = await tx.report.update({ where: { id: reportId }, data: { status, resolvedAt: now, details: note?.trim() || report.details } });
      if (report.moderationCaseId) {
        await tx.moderationCase.update({ where: { id: report.moderationCaseId }, data: { status: action === "RESOLVE" ? ModerationCaseStatus.RESOLVED : ModerationCaseStatus.DISMISSED, resolvedAt: now } });
        await tx.moderationDecision.create({ data: { caseId: report.moderationCaseId, actorId: adminId, action: `${action}_REPORT`, reason: note?.trim() || "Admin xử lý báo cáo" } });
      }
      await tx.auditLog.create({ data: { actorType: AuditActorType.ADMIN, actorUserId: adminId, action: `${action}_REPORT`, targetType: "REPORT", targetId: reportId, beforeData: { status: report.status }, afterData: { status } } });
      return updated;
    });
  }

  public static async getAuditLogs(params: { page?: number; limit?: number; action?: string; targetType?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 30);
    const where = {
      ...(params.action ? { action: { contains: params.action, mode: "insensitive" as const } } : {}),
      ...(params.targetType ? { targetType: params.targetType } : {}),
    };
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" }, include: { actorUser: { select: { email: true, profile: { select: { fullName: true } } } } } }),
    ]);
    return { total, page, limit, totalPages: Math.ceil(total / limit), logs };
  }

  // 5. Quản lý Từ điển từ cấm (Badwords)
  public static async getBadwords() {
    return prisma.badWord.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  public static async addBadword(adminId: string, pattern: string, category = "OFFENSIVE") {
    const cleaned = pattern.trim().toLowerCase();
    return prisma.$transaction(async (tx) => {
      const word = await tx.badWord.upsert({ where: { pattern: cleaned }, update: { isActive: true, category }, create: { pattern: cleaned, category, isActive: true } });
      await tx.auditLog.create({ data: { actorType: AuditActorType.ADMIN, actorUserId: adminId, action: "UPSERT_BADWORD", targetType: "BADWORD", targetId: word.id, afterData: { pattern: word.pattern, category: word.category, isActive: true } } });
      return word;
    });
  }

  public static async deleteBadword(adminId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const word = await tx.badWord.delete({ where: { id } });
      await tx.auditLog.create({ data: { actorType: AuditActorType.ADMIN, actorUserId: adminId, action: "DELETE_BADWORD", targetType: "BADWORD", targetId: id, beforeData: { pattern: word.pattern, category: word.category } } });
      return word;
    });
  }
}
