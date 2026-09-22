import { prisma } from "../../lib/prisma";
import { CommentStatus, PostVisibility } from "@prisma/client";
import { BadwordsFilter } from "../../common/filters/badwords.filter";

export class PostsService {
  public static async getFeed(params: {
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, params.limit || 10);
    const skip = (page - 1) * limit;

    let whereClause: any = { visibility: PostVisibility.PUBLIC };

    // Nếu người dùng đã đăng nhập, lấy bài viết PUBLIC + bài của những người đã kết nối (CONNECTIONS)
    if (params.userId) {
      const connections = await prisma.connection.findMany({
        where: {
          userId: params.userId,
          status: "ACCEPTED",
        },
        select: { targetId: true },
      });

      const connectedUserIds = connections.map((c) => c.targetId);

      whereClause = {
        OR: [
          { visibility: PostVisibility.PUBLIC },
          {
            authorId: { in: [params.userId, ...connectedUserIds] },
            visibility: PostVisibility.CONNECTIONS,
          },
        ],
      };
    }

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
        mediaUrls: post.mediaUrls,
        visibility: post.visibility,
        likesCount: post.likesCount,
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

  public static async getComments(postId: string, currentUserId?: string) {
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
    const post = await prisma.post.findUnique({
      where: { id: data.postId },
    });

    if (!post) {
      throw new Error("Bài viết không tồn tại hoặc đã bị xóa");
    }

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
          reporterId: data.authorId,
          commentId: comment.id,
          postId: data.postId,
          targetUserId: data.authorId,
          reason: `Hệ thống tự động gắn cờ: ${flagReason}`,
          status: "PENDING",
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
    });

    if (!comment) {
      throw new Error("Không tìm thấy bình luận cần báo cáo");
    }

    const report = await prisma.report.create({
      data: {
        commentId: data.commentId,
        postId: comment.postId,
        reporterId: data.reporterId,
        targetUserId: comment.authorId,
        reason: data.reason,
        status: "PENDING",
      },
    });

    return report;
  }
}
