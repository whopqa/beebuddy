import { prisma } from "../../lib/prisma";
import {
  CommentStatus,
  CommunityMemberStatus,
  CommunityStatus,
  CommunityVisibility,
  ConnectionStatus,
  PostStatus,
  PostVisibility,
  ReportSource,
  ReportStatus,
} from "@prisma/client";
import { BadwordsFilter } from "../../common/filters/badwords.filter";
import { AppError } from "../../common/errors/app-error";
import { buildVisiblePostWhere, canViewPost } from "../../common/policies/post-access.policy";
import { ModerationAdapterService } from "../../common/services/moderation-adapter.service";

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

  private static async assertCanViewPost(postId: string, currentUserId?: string) {
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
    const whereClause = params.communityId
      ? { AND: [visibilityWhere, { communityId: params.communityId }] }
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
              mediaAsset: { select: { sourceUrl: true } },
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
      posts: posts.map((post) => ({
        id: post.id,
        content: post.content,
        mediaUrls: post.media.length
          ? post.media.flatMap((item) => item.mediaAsset.sourceUrl ? [item.mediaAsset.sourceUrl] : [])
          : post.mediaUrls,
        visibility: post.audience,
        likesCount: post._count.reactions,
        commentsCount: post._count.comments,
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

  public static async createCommunityPost(data: { communityId: string; authorId: string; content: string }) {
    const filterResult = await BadwordsFilter.checkContent(data.content);
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
      const post = await tx.post.create({
        data: {
          communityId: data.communityId,
          authorId: data.authorId,
          content: data.content.trim(),
          visibility: PostVisibility.PUBLIC,
          audience: PostVisibility.PUBLIC,
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      await ModerationAdapterService.enqueue(tx, "POST", post.id, post.content);
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
