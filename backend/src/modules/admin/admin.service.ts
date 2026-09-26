import { prisma } from "../../lib/prisma";
import {
  CommentStatus,
  ConnectionStatus,
  AuditActorType,
  PaymentStatus,
  ReportStatus,
  Role,
  SubscriptionTier,
  UserRestrictionType,
} from "@prisma/client";

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

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        tierExpiresAt: tier === SubscriptionTier.FREE ? null : newExpiry,
      },
    });

    await prisma.moderationLog.create({
      data: {
        adminId,
        action: "ADJUST_TIER",
        targetType: "USER",
        targetId: userId,
        note: `Admin cập nhật gói cước sang ${tier}`,
      },
    });

    return updated;
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
          OR: [{ status: CommentStatus.FLAGGED }, { reports: { some: {} } }],
        },
      }),
      prisma.comment.findMany({
        where: {
          OR: [{ status: CommentStatus.FLAGGED }, { reports: { some: {} } }],
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
          reports: true,
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

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { status: newStatus },
    });

    // Cập nhật tất cả reports liên quan thành RESOLVED
    await prisma.report.updateMany({
      where: { commentId, status: ReportStatus.OPEN },
      data: { status: ReportStatus.RESOLVED, resolvedAt: new Date() },
    });

    await prisma.moderationLog.create({
      data: {
        adminId,
        action: action === "APPROVE" ? "APPROVE_COMMENT" : "HIDE_COMMENT",
        targetType: "COMMENT",
        targetId: commentId,
      },
    });

    return updated;
  }

  // 5. Quản lý Từ điển từ cấm (Badwords)
  public static async getBadwords() {
    return prisma.badWord.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  public static async addBadword(pattern: string, category = "OFFENSIVE") {
    const cleaned = pattern.trim().toLowerCase();
    return prisma.badWord.upsert({
      where: { pattern: cleaned },
      update: { isActive: true, category },
      create: { pattern: cleaned, category, isActive: true },
    });
  }

  public static async deleteBadword(id: string) {
    return prisma.badWord.delete({ where: { id } });
  }
}
