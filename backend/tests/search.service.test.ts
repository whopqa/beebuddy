import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  profile: { findMany: vi.fn() },
}));

vi.mock("../src/lib/prisma", () => ({ prisma: prismaMock }));

import { SearchService } from "../src/modules/search/search.service";

describe("SearchService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("matches interests and habits without case sensitivity and limits preview to three", async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      { id: "1", fullName: "Nguyễn Minh", avatarUrl: null, location: "TP.HCM", interests: ["Coding"], habits: [], bio: null, connectionGoal: "Tìm bạn code" },
      { id: "2", fullName: "Trần An", avatarUrl: null, location: "Hà Nội", interests: [], habits: ["coding buổi tối"], bio: null, connectionGoal: null },
      { id: "3", fullName: "Lê Bình", avatarUrl: null, location: null, interests: [], habits: [], bio: "Thích CODING", connectionGoal: null },
      { id: "4", fullName: "Phạm Chi", avatarUrl: null, location: null, interests: [], habits: [], bio: null, connectionGoal: "Tìm nhóm coding" },
      { id: "5", fullName: "Vũ Dũng", avatarUrl: null, location: null, interests: ["Running"], habits: [], bio: null, connectionGoal: null },
    ]);

    const result = await SearchService.searchInterestsPreview("cOdInG");

    expect(result.totalMatches).toBe(4);
    expect(result.previewUsers).toHaveLength(3);
    expect(result.previewUsers[0].maskedName).toBe("Nguyễn M***");
    expect(result.previewLimit).toBe(3);
  });
});
