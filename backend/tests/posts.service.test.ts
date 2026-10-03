import {
  CommentStatus,
  CommunityMemberStatus,
  CommunityVisibility,
  PostStatus,
  PostVisibility,
  SubscriptionTier,
} from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  connection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  userBlock: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  postAudienceUser: { findUnique: vi.fn() },
  postAudienceList: { findFirst: vi.fn() },
  postExcludedUser: { findUnique: vi.fn() },
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
    prismaMock.userBlock.findMany.mockResolvedValue([]);
    prismaMock.userBlock.findFirst.mockResolvedValue(null);
  });

  it("queries only PUBLIC posts for a guest", async () => {
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    const result = await PostsService.getFeed({ page: 1, limit: 10 });

    expect(result.posts).toEqual([]);
    expect(prismaMock.connection.findMany).not.toHaveBeenCalled();
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        audience: PostVisibility.PUBLIC,
        OR: [
          { communityId: null },
          { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
        ],
      },
    }));
  });

  it("filters shared post links through the same visibility policy as the feed", async () => {
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    await PostsService.getFeed({ postId: "post-1", page: 1, limit: 1 });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {
            status: PostStatus.PUBLISHED,
            deletedAt: null,
            audience: PostVisibility.PUBLIC,
            OR: [
              { communityId: null },
              { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
            ],
          },
          { id: "post-1" },
        ],
      },
    }));
  });

  it("includes CONNECTIONS posts for accepted connections in either direction", async () => {
    prismaMock.connection.findMany.mockResolvedValue([
      { requesterId: "friend-1", addresseeId: "current-user" },
    ]);
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    await PostsService.getFeed({ userId: "current-user", page: 1, limit: 10 });

    expect(prismaMock.connection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: "ACCEPTED",
        OR: [{ requesterId: "current-user" }, { addresseeId: "current-user" }],
      }),
    }));
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        OR: expect.arrayContaining([
          { audience: PostVisibility.PUBLIC },
          { authorId: "current-user" },
          { audience: PostVisibility.CONNECTIONS, authorId: { in: ["friend-1"] } },
        ]),
      }),
    }));
  });

  it("removes users blocked in either direction from the member feed", async () => {
    prismaMock.connection.findMany.mockResolvedValue([
      { requesterId: "current-user", addresseeId: "blocked-user" },
      { requesterId: "current-user", addresseeId: "friend-1" },
    ]);
    prismaMock.userBlock.findMany.mockResolvedValue([
      { blockerId: "blocked-user", blockedId: "current-user" },
    ]);
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.post.findMany.mockResolvedValue([]);

    await PostsService.getFeed({ userId: "current-user" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        AND: [
          {
            status: PostStatus.PUBLISHED,
            deletedAt: null,
            AND: [{
              OR: [
                { communityId: null },
                { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
                { community: { is: { members: { some: { userId: "current-user", status: CommunityMemberStatus.ACTIVE } } } } },
              ],
            }],
            OR: [
              { audience: PostVisibility.PUBLIC },
              { authorId: "current-user" },
              { audience: PostVisibility.CONNECTIONS, authorId: { in: ["friend-1"] } },
              {
                audience: PostVisibility.SELECTED,
                audienceUsers: { some: { userId: "current-user" } },
              },
              {
                audience: PostVisibility.CUSTOM,
                OR: [
                  { audienceUsers: { some: { userId: "current-user" } } },
                  {
                    audienceLists: {
                      some: {
                        audienceList: {
                          members: { some: { userId: "current-user" } },
                        },
                      },
                    },
                  },
                ],
                excludedUsers: { none: { userId: "current-user" } },
              },
            ],
          },
          { authorId: { notIn: ["blocked-user"] } },
        ],
      },
    }));
  });

  it("denies comments for a post the current viewer cannot access", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "private-post",
      authorId: "author-1",
      audience: PostVisibility.PRIVATE,
      status: PostStatus.PUBLISHED,
      deletedAt: null,
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
      audience: PostVisibility.PUBLIC,
      status: PostStatus.PUBLISHED,
      deletedAt: null,
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
    expect(result.warning).toContain("moderation queue");
    expect(prismaMock.report.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        commentId: "comment-1",
        source: "RULE",
        status: "OPEN",
        reasonCode: "BADWORD_RULE",
      }),
    });
  });
});
