import { Request, Response } from "express";
import { PostsService } from "./posts.service";
import { sendError, sendSuccess } from "../../common/utils/response";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";

const createCommentSchema = z.object({
  content: z.string().min(1, "Nội dung bình luận không được rỗng").max(1000, "Tối đa 1000 ký tự"),
});

const reportCommentSchema = z.object({
  reason: z.string().min(3, "Vui lòng cung cấp lý do báo cáo"),
});

export class PostsController {
  public static async getFeed(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const userId = req.user?.id;

      const feed = await PostsService.getFeed({ userId, page, limit });
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
