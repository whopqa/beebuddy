import { CommunityMemberStatus, CommunityVisibility, PostStatus, PostVisibility } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildVisiblePostWhere, canViewPost } from "../src/common/policies/post-access.policy";

describe("post access policy", () => {
  it("allows guests to view only PUBLIC posts", () => {
    expect(canViewPost({ visibility: PostVisibility.PUBLIC, authorId: "author" })).toBe(true);
    expect(canViewPost({ visibility: PostVisibility.CONNECTIONS, authorId: "author" })).toBe(false);
    expect(buildVisiblePostWhere()).toEqual({
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      audience: PostVisibility.PUBLIC,
      OR: [
        { communityId: null },
        { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
      ],
    });
  });

  it("allows an author to view all of their own posts", () => {
    expect(canViewPost({
      visibility: PostVisibility.PRIVATE,
      authorId: "user-1",
      currentUserId: "user-1",
    })).toBe(true);
  });

  it("allows accepted connections to view CONNECTIONS posts but not PRIVATE posts", () => {
    expect(canViewPost({
      visibility: PostVisibility.CONNECTIONS,
      authorId: "user-2",
      currentUserId: "user-1",
      isConnected: true,
    })).toBe(true);
    expect(canViewPost({
      visibility: PostVisibility.PRIVATE,
      authorId: "user-2",
      currentUserId: "user-1",
      isConnected: true,
    })).toBe(false);
  });

  it("excludes blocked users before applying feed visibility", () => {
    expect(buildVisiblePostWhere("user-1", ["user-2"], ["user-3"])).toEqual({
      AND: [
        {
          status: PostStatus.PUBLISHED,
          deletedAt: null,
          AND: [{
            OR: [
              { communityId: null },
              { community: { is: { visibility: CommunityVisibility.PUBLIC } } },
              { community: { is: { members: { some: { userId: "user-1", status: CommunityMemberStatus.ACTIVE } } } } },
            ],
          }],
          OR: [
            { audience: PostVisibility.PUBLIC },
            { authorId: "user-1" },
            { audience: PostVisibility.CONNECTIONS, authorId: { in: ["user-2"] } },
            {
              audience: PostVisibility.SELECTED,
              audienceUsers: { some: { userId: "user-1" } },
            },
            {
              audience: PostVisibility.CUSTOM,
              OR: [
                { audienceUsers: { some: { userId: "user-1" } } },
                {
                  audienceLists: {
                    some: {
                      audienceList: { members: { some: { userId: "user-1" } } },
                    },
                  },
                },
              ],
              excludedUsers: { none: { userId: "user-1" } },
            },
          ],
        },
        { authorId: { notIn: ["user-3"] } },
      ],
    });
  });
});
