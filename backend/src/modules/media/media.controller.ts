import { Request, Response } from "express";
import { z } from "zod";
import { getErrorStatus } from "../../common/errors/app-error";
import { sendError, sendSuccess } from "../../common/utils/response";
import { MediaService } from "./media.service";

const purposeSchema = z.enum(["avatar", "post", "message"]);
const assetIdSchema = z.string().uuid();

export class MediaController {
  public static async uploadImage(req: Request, res: Response) {
    const purpose = purposeSchema.safeParse(req.query.purpose);
    if (!purpose.success) return sendError(res, "Mục đích upload không hợp lệ", 400);
    if (!Buffer.isBuffer(req.body)) return sendError(res, "Yêu cầu phải chứa một file ảnh", 400);

    try {
      const asset = await MediaService.uploadImage({
        ownerId: req.user!.id,
        bytes: req.body,
        declaredMimeType: req.headers["content-type"] || "",
        purpose: purpose.data,
      });
      return sendSuccess(res, asset, "Upload ảnh thành công", 201);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }

  public static async getContent(req: Request, res: Response) {
    const assetId = assetIdSchema.safeParse(req.params.assetId);
    if (!assetId.success) return sendError(res, "Media ID không hợp lệ", 400);

    try {
      const content = await MediaService.getReadableContent(assetId.data, req.user?.id);
      res.setHeader("Content-Type", content.mimeType);
      res.setHeader("Content-Length", String(content.byteSize));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.sendFile(content.absolutePath);
    } catch (error) {
      return sendError(res, error, getErrorStatus(error));
    }
  }
}
