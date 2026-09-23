import { PostVisibility } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildVisiblePostWhere, canViewPost } from "../src/common/policies/post-access.policy";

describe("post access policy", () => {
  it("allows guests to view only PUBLIC posts", () => {
    expect(canViewPost({ visibility: PostVisibility.PUBLIC, authorId: "author" })).toBe(true);
    expect(canViewPost({ visibility: PostVisibility.CONNECTIONS, authorId: "author" })).toBe(false);
    expect(buildVisiblePostWhere()).toEqual({ visibility: PostVisibility.PUBLIC });
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
});
