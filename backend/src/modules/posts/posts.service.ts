import { prisma } from "../../lib/prisma";
import {
  CommentStatus,
  CommunityMemberStatus,
  CommunityStatus,
  CommunityVisibility,
  ConnectionStatus,
  AuditActorType,
  Prisma,
  PostStatus,
  PostVisibility,
  ReactionType,
  ReportSource,
  ReportStatus,
} from "@prisma/client";
import { BadwordsFilter } from "../../common/filters/badwords.filter";
import { AppError } from "../../common/errors/app-error";
import { buildVisiblePostWhere, canViewPost } from "../../common/policies/post-access.policy";
import { ModerationAdapterService } from "../../common/services/moderation-adapter.service";

async function assertOwnedImageAssets(
  tx: Prisma.TransactionClient,
  ownerId: string,
  mediaAssetIds: string[]
) {
  const uniqueIds = Array.from(new Set(mediaAssetIds));
  if (!uniqueIds.length) return uniqueIds;
  const assets = await tx.mediaAsset.findMany({
    where: {
      id: { in: uniqueIds },
      ownerId,
      processingStatus: "READY",
      deletedAt: null,
      mimeType: { startsWith: "image/" },
    },
    select: { id: true },
  });
  if (assets.length !== uniqueIds.length) {
    throw new AppError("Ảnh không tồn tại, chưa sẵn sàng hoặc không thuộc người đăng", 409);
  }
  return uniqueIds;
}

export class PostsService {
  private static async getSocialAccess(userId: string) {
    const [connections, blocks] = await Promise.all([
      prisma.connection.findMany({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        select: { requesterId: true, addresseeId: true },
      }),
      prisma.userBlock.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
        select: { blockerId: true, blockedId: true },
      }),
    ]);

    const blockedUserIds = Array.from(new Set(blocks.map((block) =>
      block.blockerId === userId ? block.blockedId : block.blockerId
    )));
    const blocked = new Set(blockedUserIds);
    const connectedUserIds = Array.from(new Set(connections.map((connection) =>
      connection.requesterId === userId ? connection.addresseeId : connection.requesterId
    ))).filter((connectedId) => !blocked.has(connectedId));

    return { connectedUserIds, blockedUserIds };
  }

  public static async assertCanViewPost(postId: string, currentUserId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        audience: true,
        status: true,
        deletedAt: true,
        communityId: true,
        community: { select: { visibility: true, status: true, deletedAt: true } },
      },
    });

    if (!post || post.status !== PostStatus.PUBLISHED || post.deletedAt) {
      throw new AppError("Bài viết không tồn tại hoặc đã bị xóa", 404);
    }

    if (post.communityId) {
      if (!post.community || post.community.status !== CommunityStatus.ACTIVE || post.community.deletedAt) {
        throw new AppError("Community không còn khả dụng", 404);
      }
      if (post.community.visibility !== CommunityVisibility.PUBLIC) {
        if (!currentUserId) throw new AppError("Bạn không có quyền xem bài viết này", 403);
        const membership = await prisma.communityMember.findUnique({
          where: { communityId_userId: { communityId: post.communityId, userId: currentUserId } },
          select: { status: true },
        });
        if (membership?.status !== CommunityMemberStatus.ACTIVE) {
          throw new AppError("Bạn không có quyền xem bài viết này", 403);
        }
      }
    }


    if (currentUserId && currentUserId !== post.authorId) {
      const block = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: currentUserId, blockedId: post.authorId },
            { blockerId: post.authorId, blockedId: currentUserId },
          ],
        },
        select: { id: true },
      });
      if (block) throw new AppError("Bạn không có quyền xem bài viết này", 403);
    }

    let isConnected = false;
    if (
      currentUserId &&
      currentUserId !== post.authorId &&
      post.audience === PostVisibility.CONNECTIONS
    ) {
      const connection = await prisma.connection.findFirst({
        where: {
          status: ConnectionStatus.ACCEPTED,
          OR: [
            { requesterId: currentUserId, addresseeId: post.authorId },
            { requesterId: post.authorId, addresseeId: currentUserId },
          ],
        },
        select: { id: true },
      });
      isConnected = Boolean(connection);
    }

    let isSelectedRecipient = false;
    let isCustomAudienceMember = false;
    let isExcluded = false;
    if (currentUserId && currentUserId !== post.authorId) {
      if (post.audience === PostVisibility.SELECTED) {
        isSelectedRecipient = Boolean(await prisma.postAudienceUser.findUnique({
          where: { postId_userId: { postId, userId: currentUserId } },
          select: { id: true },
        }));
      }
      if (post.audience === PostVisibility.CUSTOM) {
        const [excluded, directGrant, listGrant] = await Promise.all([
          prisma.postExcludedUser.findUnique({
            where: { postId_userId: { postId, userId: currentUserId } },
            select: { id: true },
          }),
          prisma.postAudienceUser.findUnique({
            where: { postId_userId: { postId, userId: currentUserId } },
            select: { id: true },
          }),
          prisma.postAudienceList.findFirst({
            where: {
              postId,
              audienceList: { members: { some: { userId: currentUserId } } },
            },
            select: { id: true },
          }),
        ]);
        isExcluded = Boolean(excluded);
        isCustomAudienceMember = Boolean(directGrant || listGrant);
      }
    }

    if (!canViewPost({
      visibility: post.audience,
      authorId: post.authorId,
      currentUserId,
      isConnected,
      isSelectedRecipient,
      isCustomAudienceMember,
      isExcluded,
    })) {
      throw new AppError("Bạn không có quyền xem bài viết này", 403);
    }

    return post;
  }

  public static async getFeed(params: {
    userId?: string;
    page?: number;
    limit?: number;
    communityId?: string;
    postId?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 10);
    const skip = (page - 1) * limit;

    const socialAccess = params.userId
      ? await this.getSocialAccess(params.userId)
      : { connectedUserIds: [], blockedUserIds: [] };
    const visibilityWhere = buildVisiblePostWhere(
      params.userId,
      socialAccess.connectedUserIds,
      socialAccess.blockedUserIds
    );
    const whereClause: Prisma.PostWhereInput = params.communityId || params.postId
      ? { AND: [visibilityWhere, ...(params.communityId ? [{ communityId: params.communityId }] : []), ...(params.postId ? [{ id: params.postId }] : [])] }
      : visibilityWhere;

    const [total, posts] = await Promise.all([
      prisma.post.count({ where: whereClause }),
      prisma.post.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              role: true,
              tier: true,
              profile: {
                select: {
                  fullName: true,
                  username: true,
                  avatarUrl: true,
                  location: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: {
                where: { status: CommentStatus.APPROVED },
              },
              reactions: true,
            },
          },
          media: {
            orderBy: { sortOrder: "asc" },
            include: {
              mediaAsset: { select: { id: true, sourceUrl: true } },
            },
          },
          reactions: {
            where: { userId: params.userId ?? "__guest__" },
            select: { id: true },
            take: 1,
          },
          audienceUsers: {
            select: { userId: true },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      posts: posts.map((post) => ({
        id: post.id,
        content: post.content,
        mediaUrls: post.media.length
          ? post.media.flatMap((item) => item.mediaAsset.sourceUrl ? [item.mediaAsset.sourceUrl] : [])
          : post.mediaUrls,
        mediaAssets: post.media.map((item) => ({ id: item.mediaAsset.id, sourceUrl: item.mediaAsset.sourceUrl })),
        visibility: post.audience,
        likesCount: post._count.reactions,
        commentsCount: post._count.comments,
        likedByCurrentUser: post.reactions.length > 0,
        canEdit: Boolean(params.userId && params.userId === post.authorId),
        selectedUserIds: params.userId === post.authorId
          ? post.audienceUsers.map((item) => item.userId)
          : [],
        createdAt: post.createdAt,
        author: {
          id: post.author.id,
          fullName: post.author.profile?.fullName || "Người dùng BeeBuddy",
          username: post.author.profile?.username || "beebuddy_user",
          avatarUrl: post.author.profile?.avatarUrl || null,
          location: post.author.profile?.location || null,
          tier: post.author.tier,
        },
      })),
    };
  }

  public static async createPost(data: {
    authorId: string;
    content: string;
    visibility: "PUBLIC" | "CONNECTIONS" | "SELECTED" | "PRIVATE";
    mediaAssetIds: string[];
    selectedUserIds: string[];
  }) {
    const audience = data.visibility as PostVisibility;
    const selectedUserIds = Array.from(new Set(data.selectedUserIds)).filter((id) => id !== data.authorId);
    if (audience === PostVisibility.SELECTED && !selectedUserIds.length) {
      throw new AppError("Bài viết SELECTED cần ít nhất một người được xem", 400);
    }
    const filterResult = data.content
      ? await BadwordsFilter.checkContent(data.content)
      : { isClean: true, reason: "" };

    return prisma.$transaction(async (tx) => {
      const mediaAssetIds = await assertOwnedImageAssets(tx, data.authorId, data.mediaAssetIds);
      const post = await tx.post.create({
        data: {
          authorId: data.authorId,
          content: data.content,
          visibility: audience,
          audience,
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
          media: mediaAssetIds.length
            ? { create: mediaAssetIds.map((mediaAssetId, sortOrder) => ({ mediaAssetId, sortOrder })) }
            : undefined,
          audienceUsers: audience === PostVisibility.SELECTED
            ? { create: selectedUserIds.map((userId) => ({ userId })) }
            : undefined,
        },
      });
      if (post.content) await ModerationAdapterService.enqueue(tx, "POST", post.id, post.content);
      if (!filterResult.isClean) {
        const moderationCase = await tx.moderationCase.create({
          data: { caseType: "POST_CONTENT", summary: filterResult.reason },
        });
        await tx.report.create({
          data: {
            postId: post.id,
            moderationCaseId: moderationCase.id,
            source: ReportSource.RULE,
            reason: `Hệ thống tự động gắn cờ: ${filterResult.reason}`,
            reasonCode: "BADWORD_RULE",
            status: ReportStatus.OPEN,
          },
        });
      }
      return {
        postId: post.id,
        warning: filterResult.isClean ? null : "Bài viết đã được chuyển vào hàng đợi kiểm duyệt.",
      };
    });
  }

  public static async updatePost(data: {
    postId: string;
    authorId: string;
    content: string;
    visibility: "PUBLIC" | "CONNECTIONS" | "SELECTED" | "PRIVATE";
    mediaAssetIds: string[];
    selectedUserIds: string[];
  }) {
    const audience = data.visibility as PostVisibility;
    const selectedUserIds = Array.from(new Set(data.selectedUserIds)).filter((id) => id !== data.authorId);
    if (audience === PostVisibility.SELECTED && !selectedUserIds.length) {
      throw new AppError("Bài viết SELECTED cần ít nhất một người được xem", 400);
    }
    const filterResult = data.content
      ? await BadwordsFilter.checkContent(data.content)
      : { isClean: true, reason: "" };

    return prisma.$transaction(async (tx) => {
      const existing = await tx.post.findUnique({ where: { id: data.postId } });
      if (!existing || existing.deletedAt || existing.status === PostStatus.REMOVED) {
        throw new AppError("Không tìm thấy bài viết", 404);
      }
      if (existing.authorId !== data.authorId) throw new AppError("Bạn không có quyền sửa bài viết này", 403);
      const mediaAssetIds = await assertOwnedImageAssets(tx, data.authorId, data.mediaAssetIds);
      const post = await tx.post.update({
        where: { id: data.postId },
        data: {
          content: data.content,
          visibility: audience,
          audience,
          media: {
            deleteMany: {},
            ...(mediaAssetIds.length ? { create: mediaAssetIds.map((mediaAssetId, sortOrder) => ({ mediaAssetId, sortOrder })) } : {}),
          },
          audienceUsers: {
            deleteMany: {},
            ...(audience === PostVisibility.SELECTED ? { create: selectedUserIds.map((userId) => ({ userId })) } : {}),
          },
        },
      });
      if (post.content) await ModerationAdapterService.enqueue(tx, "POST", post.id, post.content);
      if (!filterResult.isClean) {
        const openRuleReport = await tx.report.findFirst({
          where: { postId: post.id, source: ReportSource.RULE, status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] } },
        });
        if (!openRuleReport) {
          const moderationCase = await tx.moderationCase.create({ data: { caseType: "POST_CONTENT", summary: filterResult.reason } });
          await tx.report.create({
            data: {
              postId: post.id,
              moderationCaseId: moderationCase.id,
              source: ReportSource.RULE,
              reason: `Hệ thống tự động gắn cờ: ${filterResult.reason}`,
              reasonCode: "BADWORD_RULE",
            },
          });
        }
      }
      return { postId: post.id, warning: filterResult.isClean ? null : "Bài viết đang chờ kiểm duyệt." };
    });
  }

  public static async deletePost(postId: string, authorId: string) {
    return prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post || post.deletedAt || post.status === PostStatus.REMOVED) throw new AppError("Không tìm thấy bài viết", 404);
      if (post.authorId !== authorId) throw new AppError("Bạn không có quyền xóa bài viết này", 403);
      const deletedAt = new Date();
      await tx.post.update({ where: { id: postId }, data: { status: PostStatus.REMOVED, deletedAt } });
      await tx.auditLog.create({
        data: {
          actorType: AuditActorType.USER,
          actorUserId: authorId,
          action: "DELETE_POST",
          targetType: "POST",
          targetId: postId,
          beforeData: { status: post.status },
          afterData: { status: PostStatus.REMOVED, deletedAt: deletedAt.toISOString() },
        },
      });
      return { id: postId, deletedAt };
    });
  }

  public static async setPostLike(postId: string, userId: string, liked: boolean) {
    await this.assertCanViewPost(postId, userId);
    return prisma.$transaction(async (tx) => {
      if (liked) {
        await tx.postReaction.upsert({
          where: { postId_userId: { postId, userId } },
          update: { type: ReactionType.LIKE },
          create: { postId, userId, type: ReactionType.LIKE },
        });
      } else {
        await tx.postReaction.deleteMany({ where: { postId, userId } });
      }
      return { liked, likesCount: await tx.postReaction.count({ where: { postId } }) };
    });
  }

  public static async reportPost(data: { postId: string; reporterId: string; reason: string }) {
    const post = await this.assertCanViewPost(data.postId, data.reporterId);
    if (post.authorId === data.reporterId) throw new AppError("Bạn không thể báo cáo bài viết của chính mình", 400);
    return prisma.$transaction(async (tx) => {
      const existing = await tx.report.findFirst({
        where: {
          postId: data.postId,
          reporterId: data.reporterId,
          status: { in: [ReportStatus.OPEN, ReportStatus.TRIAGED] },
        },
      });
      if (existing) return existing;
      const moderationCase = await tx.moderationCase.create({
        data: { caseType: "POST_REPORT", summary: data.reason },
      });
      return tx.report.create({
        data: {
          postId: data.postId,
          reporterId: data.reporterId,
          moderationCaseId: moderationCase.id,
          source: ReportSource.USER,
          reason: data.reason,
          reasonCode: "USER_REPORT",
          status: ReportStatus.OPEN,
        },
      });
    });
  }

  public static async getCommunityFeed(params: { communityId: string; userId?: string; page?: number; limit?: number }) {
    const community = await prisma.community.findUnique({
      where: { id: params.communityId },
      select: { id: true, visibility: true, status: true, deletedAt: true },
    });
    if (!community || community.status !== CommunityStatus.ACTIVE || community.deletedAt) {
      throw new AppError("Không tìm thấy community", 404);
    }
    if (community.visibility !== CommunityVisibility.PUBLIC) {
      if (!params.userId) throw new AppError("Community này không công khai", 403);
      const member = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: params.userId } },
      });
      if (member?.status !== CommunityMemberStatus.ACTIVE) throw new AppError("Community này không công khai", 403);
    }
    return this.getFeed(params);
  }

  public static async createCommunityPost(data: { communityId: string; authorId: string; content: string; mediaAssetIds?: string[] }) {
    const filterResult = data.content.trim()
      ? await BadwordsFilter.checkContent(data.content)
      : { isClean: true, violatedWords: [] as string[], reason: "" };
    return prisma.$transaction(async (tx) => {
      const [community, membership] = await Promise.all([
        tx.community.findUnique({ where: { id: data.communityId } }),
        tx.communityMember.findUnique({
          where: { communityId_userId: { communityId: data.communityId, userId: data.authorId } },
        }),
      ]);
      if (!community || community.status !== CommunityStatus.ACTIVE || community.deletedAt) {
        throw new AppError("Community không khả dụng", 404);
      }
      if (!membership || membership.status !== CommunityMemberStatus.ACTIVE) {
        throw new AppError("Chỉ thành viên đang hoạt động mới có thể đăng bài", 403);
      }
      const mediaAssetIds = Array.from(new Set(data.mediaAssetIds ?? []));
      if (mediaAssetIds.length) {
        const assets = await tx.mediaAsset.findMany({
          where: {
            id: { in: mediaAssetIds },
            ownerId: data.authorId,
            processingStatus: "READY",
            deletedAt: null,
            mimeType: { startsWith: "image/" },
          },
          select: { id: true },
        });
        if (assets.length !== mediaAssetIds.length) {
          throw new AppError("Ảnh không tồn tại, chưa sẵn sàng hoặc không thuộc người đăng", 409);
        }
      }
      const post = await tx.post.create({
        data: {
          communityId: data.communityId,
          authorId: data.authorId,
          content: data.content.trim(),
          visibility: PostVisibility.PUBLIC,
          audience: PostVisibility.PUBLIC,
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
          media: mediaAssetIds.length
            ? { create: mediaAssetIds.map((mediaAssetId, sortOrder) => ({ mediaAssetId, sortOrder })) }
            : undefined,
        },
      });
      if (post.content) await ModerationAdapterService.enqueue(tx, "POST", post.id, post.content);
      if (!filterResult.isClean) {
        await tx.report.create({
          data: {
            postId: post.id,
            source: ReportSource.RULE,
            reason: `Hệ thống tự động gắn cờ: ${filterResult.reason}`,
            reasonCode: "BADWORD_RULE",
            status: ReportStatus.OPEN,
          },
        });
      }
      return { post, warning: filterResult.isClean ? null : "Bài viết đã được chuyển vào hàng đợi kiểm duyệt." };
    });
  }

  public static async getComments(postId: string, currentUserId?: string) {
    await this.assertCanViewPost(postId, currentUserId);

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        OR: [
          { status: CommentStatus.APPROVED },
          currentUserId ? { authorId: currentUserId } : { status: CommentStatus.APPROVED },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            tier: true,
            profile: {
              select: {
                fullName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      content: c.content,
      status: c.status,
      flagReason: c.flagReason,
      createdAt: c.createdAt,
      author: {
        id: c.author.id,
        fullName: c.author.profile?.fullName || "Ẩn danh",
        username: c.author.profile?.username,
        avatarUrl: c.author.profile?.avatarUrl,
        tier: c.author.tier,
      },
    }));
  }

  public static async createComment(data: {
    postId: string;
    authorId: string;
    content: string;
  }) {
    await this.assertCanViewPost(data.postId, data.authorId);

    // 1. Chạy bộ lọc từ cấm (Badwords Filter)
    const filterResult = await BadwordsFilter.checkContent(data.content);

    let status: CommentStatus = CommentStatus.APPROVED;
    let flagReason: string | undefined = undefined;

    if (!filterResult.isClean) {
      status = CommentStatus.FLAGGED;
      flagReason = filterResult.reason;
    }

    // 2. Tạo bản ghi bình luận
    const comment = await prisma.comment.create({
      data: {
        postId: data.postId,
        authorId: data.authorId,
        content: data.content,
        status,
        flagReason,
      },
      include: {
        author: {
          select: {
            id: true,
            tier: true,
            profile: {
              select: {
                fullName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // 3. Nếu bị gắn cờ vi phạm, tự động tạo Report ghi nhận cho Admin
    if (status === CommentStatus.FLAGGED) {
      await prisma.report.create({
        data: {
          commentId: comment.id,
          source: ReportSource.RULE,
          reason: `Hệ thống tự động gắn cờ: ${flagReason}`,
          reasonCode: "BADWORD_RULE",
          status: ReportStatus.OPEN,
        },
      });
    }

    return {
      comment: {
        id: comment.id,
        postId: comment.postId,
        content: comment.content,
        status: comment.status,
        flagReason: comment.flagReason,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          fullName: comment.author.profile?.fullName || "Ẩn danh",
          username: comment.author.profile?.username,
          avatarUrl: comment.author.profile?.avatarUrl,
          tier: comment.author.tier,
        },
      },
      warning:
        status === CommentStatus.FLAGGED
          ? "Bình luận của bạn chứa từ ngữ không phù hợp và đang được chuyển vào hàng đợi kiểm duyệt của Quản trị viên."
          : null,
    };
  }

  public static async reportComment(data: {
    commentId: string;
    reporterId: string;
    reason: string;
  }) {
    const comment = await prisma.comment.findUnique({
      where: { id: data.commentId },
      select: { id: true, postId: true, authorId: true },
    });

    if (!comment) {
      throw new AppError("Không tìm thấy bình luận cần báo cáo", 404);
    }

    await this.assertCanViewPost(comment.postId, data.reporterId);

    const report = await prisma.report.create({
      data: {
        commentId: data.commentId,
        reporterId: data.reporterId,
        source: ReportSource.USER,
        reason: data.reason,
        status: ReportStatus.OPEN,
      },
    });

    return report;
  }
}
