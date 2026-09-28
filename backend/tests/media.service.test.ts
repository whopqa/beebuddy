import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  mediaAsset: { findUnique: vi.fn() },
  profile: { findFirst: vi.fn() },
  messageAttachment: { findFirst: vi.fn() },
}));
const fsMock = vi.hoisted(() => ({
  mkdir: vi.fn(),
  stat: vi.fn(),
  unlink: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("fs/promises", () => fsMock);

import { detectImageFormat } from "../src/modules/media/media.service";
import { MediaService } from "../src/modules/media/media.service";

beforeEach(() => {
  vi.clearAllMocks();
  fsMock.stat.mockResolvedValue({ isFile: () => true, size: 1234 });
  prismaMock.profile.findFirst.mockResolvedValue(null);
  prismaMock.messageAttachment.findFirst.mockResolvedValue(null);
});

describe("media image signature validation", () => {
  it("recognizes supported image signatures", () => {
    expect(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toEqual({ mimeType: "image/jpeg", extension: "jpg" });
    expect(detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toEqual({ mimeType: "image/png", extension: "png" });
    expect(detectImageFormat(Buffer.from("GIF89a", "ascii"))).toEqual({ mimeType: "image/gif", extension: "gif" });
    expect(detectImageFormat(Buffer.concat([Buffer.from("RIFF0000WEBP", "ascii"), Buffer.alloc(4)]))).toEqual({ mimeType: "image/webp", extension: "webp" });
  });

  it("rejects SVG and arbitrary bytes even if a client could name them as an image", () => {
    expect(detectImageFormat(Buffer.from("<svg><script>alert(1)</script></svg>"))).toBeNull();
    expect(detectImageFormat(Buffer.from("not-an-image"))).toBeNull();
  });
});

describe("media read authorization", () => {
  const readyAsset = {
    id: "asset-1",
    ownerId: "owner-1",
    storageProvider: "LOCAL",
    objectKey: "images/2026/09/asset-1.png",
    sourceUrl: "http://localhost:3000/api/media/asset-1/content",
    mimeType: "image/png",
    byteSize: BigInt(1234),
    processingStatus: "READY",
    deletedAt: null,
    posts: [],
  };

  it("allows the owner to read a ready local asset", async () => {
    prismaMock.mediaAsset.findUnique.mockResolvedValue(readyAsset);
    await expect(MediaService.getReadableContent("asset-1", "owner-1")).resolves.toMatchObject({
      mimeType: "image/png",
      byteSize: 1234,
    });
  });

  it("allows an active conversation member to read a message image", async () => {
    prismaMock.mediaAsset.findUnique.mockResolvedValue(readyAsset);
    prismaMock.messageAttachment.findFirst.mockResolvedValue({ id: "attachment-1" });
    await expect(MediaService.getReadableContent("asset-1", "member-1")).resolves.toMatchObject({
      mimeType: "image/png",
    });
    expect(prismaMock.messageAttachment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ mediaAssetId: "asset-1" }),
    }));
  });

  it("denies a signed-in user who does not own or reference the asset", async () => {
    prismaMock.mediaAsset.findUnique.mockResolvedValue(readyAsset);
    await expect(MediaService.getReadableContent("asset-1", "stranger-1")).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(fsMock.stat).not.toHaveBeenCalled();
  });
});
