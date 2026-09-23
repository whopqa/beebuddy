import { CommentStatus, PostVisibility, SubscriptionTier } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  connection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  post: {
    count: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  comment: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  report: {
    create: vi.fn(),
  },
  badWord: {
    findMany: vi.fn(),
  },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { BadwordsFilter } from "../src/common/filters/badwords.filter";
import { PostsService } from "../src/modules/posts/posts.service";

describe("PostsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only PUBLIC posts for a guest", async () => {
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    const result = await PostsService.getFeed({ page: 1, limit: 10 });

    expect(result.posts).toEqual([]);
    expect(prismaMock.connection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { visibility: PostVisibility.PUBLIC },
    }));
  });

  it("includes CONNECTIONS posts for accepted connections in either direction", async () => {
    prismaMock.connection.findMany.mockResolvedValue([
      { userId: "friend-1", targetId: "current-user" },
    ]);
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    await PostsService.getFeed({ userId: "current-user", page: 1, limit: 10 });

    expect(prismaMock.connection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ACCEPTED",
        OR: [{ userId: "current-user" }, { targetId: "current-user" }],
      }),
    }));
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { visibility: PostVisibility.PUBLIC },
          { authorId: "current-user" },
          { visibility: PostVisibility.CONNECTIONS, authorId: { in: ["friend-1"] } },
        ],
      },
    }));
  });

  it("denies comments for a post the current viewer cannot access", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "private-post",
      authorId: "author-1",
      visibility: PostVisibility.PRIVATE,
    });

    await expect(PostsService.getComments("private-post", "other-user")).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prismaMock.comment.findMany).not.toHaveBeenCalled();
  });

  it("flags an unsafe comment and creates a moderation report", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "public-post",
      authorId: "author-1",
      visibility: PostVisibility.PUBLIC,
    });
    vi.spyOn(BadwordsFilter, "checkContent").mockResolvedValue({
      isClean: false,
      violatedWords: ["scam"],
      reason: "Nội dung chứa từ ngữ không phù hợp (scam)",
    });
    prismaMock.comment.create.mockResolvedValue({
      id: "comment-1",
      postId: "public-post",
      content: "scam",
      status: CommentStatus.FLAGGED,
      flagReason: "Nội dung chứa từ ngữ không phù hợp (scam)",
      createdAt: new Date("2026-09-23T00:00:00.000Z"),
      author: {
        id: "current-user",
        tier: SubscriptionTier.FREE,
        profile: { fullName: "Current User", username: "current", avatarUrl: null },
      },
    });
    prismaMock.report.create.mockResolvedValue({ id: "report-1" });

    const result = await PostsService.createComment({
      postId: "public-post",
      authorId: "current-user",
      content: "scam",
    });

    expect(result.comment.status).toBe(CommentStatus.FLAGGED);
    expect(result.warning).toContain("kiểm duyệt");
    expect(prismaMock.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reporterId: "current-user",
        commentId: "comment-1",
        postId: "public-post",
        status: "PENDING",
      }),
    });
  });
});
