import { createHash, randomUUID } from "crypto";
import { mkdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { MediaProcessingStatus } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import { ENV } from "../../config/environment";
import { prisma } from "../../lib/prisma";
import { PostsService } from "../posts/posts.service";

type ImageFormat = { mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; extension: "jpg" | "png" | "webp" | "gif" };

export function detectImageFormat(bytes: Buffer): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: "image/png", extension: "png" };
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return { mimeType: "image/webp", extension: "webp" };
  }
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) {
    return { mimeType: "image/gif", extension: "gif" };
  }
  return null;
}

function normalizedDeclaredMimeType(value: string) {
  const mimeType = value.split(";", 1)[0].trim().toLowerCase();
  return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

function uploadRoot() {
  return path.resolve(ENV.MEDIA.UPLOAD_DIR);
}

function safeObjectPath(objectKey: string) {
  const root = uploadRoot();
  const absolutePath = path.resolve(root, ...objectKey.split("/"));
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new AppError("Đường dẫn media không hợp lệ", 500);
  }
  return absolutePath;
}

export class MediaService {
  public static async uploadImage(input: {
    ownerId: string;
    bytes: Buffer;
    declaredMimeType: string;
    purpose: "avatar" | "profile" | "post" | "message";
  }) {
    if (!input.bytes.length) throw new AppError("File ảnh không được rỗng", 400);
    if (input.bytes.length > ENV.MEDIA.IMAGE_MAX_BYTES) {
      throw new AppError(`Ảnh không được vượt quá ${Math.floor(ENV.MEDIA.IMAGE_MAX_BYTES / 1024 / 1024)} MB`, 413);
    }

    const format = detectImageFormat(input.bytes);
    if (!format) throw new AppError("Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc GIF hợp lệ", 415);
    if (normalizedDeclaredMimeType(input.declaredMimeType) !== format.mimeType) {
      throw new AppError("Nội dung file không khớp định dạng ảnh khai báo", 415);
    }

    const id = randomUUID();
    const now = new Date();
    const objectKey = `images/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${id}.${format.extension}`;
    const absolutePath = safeObjectPath(objectKey);
    const sourceUrl = `${ENV.CLIENT_URL.replace(/\/+$/, "")}/api/media/${id}/content`;
    const checksum = createHash("sha256").update(input.bytes).digest("hex");

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.bytes, { flag: "wx" });
    try {
      const asset = await prisma.mediaAsset.create({
        data: {
          id,
          ownerId: input.ownerId,
          storageProvider: "LOCAL",
          bucket: "beebuddy-local",
          objectKey,
          sourceUrl,
          mimeType: format.mimeType,
          byteSize: BigInt(input.bytes.length),
          checksum,
          processingStatus: MediaProcessingStatus.READY,
        },
      });
      return {
        id: asset.id,
        sourceUrl: asset.sourceUrl,
        mimeType: asset.mimeType,
        byteSize: Number(asset.byteSize),
        processingStatus: asset.processingStatus,
        purpose: input.purpose,
      };
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  public static async getReadableContent(assetId: string, viewerId?: string) {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        ownerId: true,
        storageProvider: true,
        objectKey: true,
        sourceUrl: true,
        mimeType: true,
        byteSize: true,
        processingStatus: true,
        deletedAt: true,
        posts: { select: { postId: true } },
        communityAvatars: {
          where: { status: "ACTIVE", deletedAt: null },
          select: {
            visibility: true,
            members: { where: { userId: viewerId ?? "__guest__", status: "ACTIVE" }, select: { id: true } },
          },
        },
        communityCovers: {
          where: { status: "ACTIVE", deletedAt: null },
          select: {
            visibility: true,
            members: { where: { userId: viewerId ?? "__guest__", status: "ACTIVE" }, select: { id: true } },
          },
        },
      },
    });
    if (!asset || asset.deletedAt || asset.processingStatus !== MediaProcessingStatus.READY) {
      throw new AppError("Không tìm thấy media", 404);
    }
    if (asset.storageProvider !== "LOCAL") {
      throw new AppError("Media này được lưu bởi provider bên ngoài", 409);
    }

    let readable = viewerId === asset.ownerId;
    if (!readable && asset.sourceUrl) {
      readable = Boolean(await prisma.profile.findFirst({ where: { avatarUrl: asset.sourceUrl }, select: { id: true } }));
    }
    if (!readable) {
      readable = [...(asset.communityAvatars ?? []), ...(asset.communityCovers ?? [])].some(
        (community) => community.visibility === "PUBLIC" || community.members.length > 0
      );
    }
    if (!readable) {
      for (const post of asset.posts) {
        try {
          await PostsService.assertCanViewPost(post.postId, viewerId);
          readable = true;
          break;
        } catch {
          // The asset may be attached to another post the viewer is allowed to see.
        }
      }
    }
    if (!readable && viewerId) {
      readable = Boolean(await prisma.messageAttachment.findFirst({
        where: {
          mediaAssetId: asset.id,
          message: {
            deletedAt: null,
            conversation: { members: { some: { userId: viewerId, status: "ACTIVE" } } },
          },
        },
        select: { id: true },
      }));
    }
    if (!readable) throw new AppError("Bạn không có quyền xem media này", 403);

    const absolutePath = safeObjectPath(asset.objectKey);
    const file = await stat(absolutePath).catch(() => null);
    if (!file?.isFile()) throw new AppError("File media không còn tồn tại", 404);
    return { absolutePath, mimeType: asset.mimeType, byteSize: Number(asset.byteSize ?? file.size) };
  }
}
