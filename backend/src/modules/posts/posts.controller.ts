import { Request, Response } from "express";
import { PostsService } from "./posts.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";

const createCommentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được rỗng").max(1000, "Tối đa 1000 ký tự"),
});

const reportCommentSchema = z.object({
  reason: z.string().trim().min(3, "Vui lòng cung cấp lý do báo cáo").max(1000),
});

const postMutationSchema = z.object({
  content: z.string().trim().max(10000).default(""),
  visibility: z.enum(["PUBLIC", "CONNECTIONS", "SELECTED", "PRIVATE"]).default("PUBLIC"),
  mediaAssetIds: z.array(z.string().uuid()).max(4).default([]),
  selectedUserIds: z.array(z.string().uuid()).max(200).default([]),
}).strict().refine((value) => Boolean(value.content || value.mediaAssetIds.length), {
  message: "Bài viết phải có nội dung hoặc ít nhất một ảnh",
}).refine((value) => value.visibility !== "SELECTED" || value.selectedUserIds.length > 0, {
  message: "Bài viết SELECTED cần ít nhất một người được xem",
});

const reportPostSchema = z.object({
  reason: z.string().trim().min(3, "Vui lòng cung cấp lý do báo cáo").max(1000),
}).strict();

const createCommunityPostSchema = z.object({
  content: z.string().trim().max(10000).default(""),
  mediaAssetIds: z.array(z.string().uuid()).max(4).default([]),
}).strict().refine((value) => Boolean(value.content || value.mediaAssetIds.length), {
  message: "Bài viết phải có nội dung hoặc ít nhất một ảnh",
});

export class PostsController {
  public static async createPost(req: Request, res: Response) {
    const parsed = postMutationSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await PostsService.createPost({
        authorId: req.user!.id,
        ...parsed.data,
      }), "Đăng bài thành công", 201);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async updatePost(req: Request, res: Response) {
    const parsed = postMutationSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await PostsService.updatePost({
        postId: req.params.postId,
        authorId: req.user!.id,
        ...parsed.data,
      }), "Cập nhật bài viết thành công");
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async deletePost(req: Request, res: Response) {
    try {
      return sendSuccess(res, await PostsService.deletePost(req.params.postId, req.user!.id), "Đã xóa bài viết");
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async likePost(req: Request, res: Response) {
    try {
      return sendSuccess(res, await PostsService.setPostLike(req.params.postId, req.user!.id, true));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async unlikePost(req: Request, res: Response) {
    try {
      return sendSuccess(res, await PostsService.setPostLike(req.params.postId, req.user!.id, false));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async reportPost(req: Request, res: Response) {
    const parsed = reportPostSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await PostsService.reportPost({
        postId: req.params.postId,
        reporterId: req.user!.id,
        reason: parsed.data.reason,
      }), "Báo cáo bài viết thành công");
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getCommunityFeed(req: Request, res: Response) {
    try {
      return sendSuccess(res, await PostsService.getCommunityFeed({
        communityId: req.params.communityId,
        userId: req.user?.id,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      }));
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async createCommunityPost(req: Request, res: Response) {
    const parsed = createCommunityPostSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);
    try {
      return sendSuccess(res, await PostsService.createCommunityPost({
        communityId: req.params.communityId,
        authorId: req.user!.id,
        content: parsed.data.content,
        mediaAssetIds: parsed.data.mediaAssetIds,
      }), "Đăng bài vào community thành công", 201);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getFeed(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = req.user?.id;
      const postId = req.query.postId;
      if (postId !== undefined && (typeof postId !== "string" || !z.string().uuid().safeParse(postId).success)) {
        return sendError(res, "Post ID không hợp lệ", 400);
      }

      const feed = await PostsService.getFeed({ userId, page, limit, postId: postId as string | undefined });
      return sendSuccess(res, feed);
    } catch (err: any) {
      return sendError(res, err.message, getErrorStatus(err));
    }
  }

  public static async getComments(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const currentUserId = req.user?.id;

      const comments = await PostsService.getComments(postId, currentUserId);
      return sendSuccess(res, comments);
    } catch (err: any) {
      return sendError(res, err.message, getErrorStatus(err));
    }
  }

  public static async createComment(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const parsed = createCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const result = await PostsService.createComment({
        postId,
        authorId: req.user!.id,
        content: parsed.data.content,
      });

      return sendSuccess(res, result, "Gửi bình luận thành công", 201);
    } catch (err: any) {
      return sendError(res, err.message, getErrorStatus(err));
    }
  }

  public static async reportComment(req: Request, res: Response) {
    try {
      const { commentId } = req.params;
      const parsed = reportCommentSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0].message, 400);
      }

      const report = await PostsService.reportComment({
        commentId,
        reporterId: req.user!.id,
        reason: parsed.data.reason,
      });

      return sendSuccess(res, report, "Báo cáo bình luận thành công");
    } catch (err: any) {
      return sendError(res, err.message, getErrorStatus(err));
    }
  }
}
