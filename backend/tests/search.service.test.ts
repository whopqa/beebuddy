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
    ].map((profile) => ({
      ...profile,
      userId: `user-${profile.id}`,
      user: { isBanned: false, settings: { profileVisibility: "PUBLIC" }, visibilityRules: [
        { section: "BASIC", audience: "PUBLIC" },
        { section: "BIO", audience: "PUBLIC" },
        { section: "INTERESTS", audience: "PUBLIC" },
        { section: "HABITS", audience: "PUBLIC" },
        { section: "GOALS", audience: "PUBLIC" },
      ] },
    })));

    const result = await SearchService.searchInterestsPreview("cOdInG");

    expect(result.totalMatches).toBe(4);
    expect(result.previewUsers).toHaveLength(3);
    expect(result.previewUsers[0].maskedName).toBe("Nguyễn M***");
    expect(result.previewUsers[0].userId).toBe("user-1");
    expect(result.previewLimit).toBe(3);
  });

  it("shows only three masked preview profiles by default and combines selected filters", async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      { id: "1", fullName: "Alex Rivera", avatarUrl: null, location: "Da Nang", interests: ["Photography", "Travel"], habits: ["Weekends"], bio: null, connectionGoal: null, occupation: "Design", industry: null, user: { isBanned: false, settings: { profileVisibility: "PUBLIC" }, visibilityRules: [{ section: "BASIC", audience: "PUBLIC" }, { section: "INTERESTS", audience: "PUBLIC" }, { section: "OCCUPATION", audience: "PUBLIC" }, { section: "HABITS", audience: "PUBLIC" }] } },
      { id: "2", fullName: "Sam Kim", avatarUrl: null, location: "Hanoi", interests: ["Cooking"], habits: ["Flexible"], bio: null, connectionGoal: null, occupation: "Development", industry: null },
      { id: "3", fullName: "Priya Na", avatarUrl: null, location: "Hue", interests: ["Travel"], habits: [], bio: null, connectionGoal: null, occupation: "Design", industry: null },
      { id: "4", fullName: "Elen Ross", avatarUrl: null, location: "HCMC", interests: ["Photography"], habits: [], bio: null, connectionGoal: null, occupation: "Marketing", industry: null },
    ]);

    const initial = await SearchService.searchInterestsPreview("");
    expect(initial.totalMatches).toBe(4);
    expect(initial.previewUsers).toHaveLength(3);
    expect(initial.previewUsers[0].maskedName).toBe("Alex R***");

    const filtered = await SearchService.searchInterestsPreview("", {
      interests: ["photography"], skills: ["design"], availability: ["weekends"],
    });
    expect(filtered.totalMatches).toBe(1);
    expect(filtered.previewUsers[0].role).toBe("Design");
  });

  it("maps English design filter labels to existing Vietnamese profile interests", async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      { id: "1", fullName: "Trần Linh", avatarUrl: null, location: "Hà Nội", interests: ["Nhiếp ảnh"], habits: [], bio: null, connectionGoal: null, occupation: null, industry: null },
    ]);
    const result = await SearchService.searchInterestsPreview("", { interests: ["Photography"] });
    expect(result.totalMatches).toBe(1);
  });

  it("does not reveal private sections or non-public profiles in the web preview", async () => {
    prismaMock.profile.findMany.mockResolvedValue([
      { id: "1", fullName: "Hidden Person", avatarUrl: null, location: "Secret", interests: ["Travel"], habits: [], bio: null, connectionGoal: null, occupation: "Director", industry: null, user: { isBanned: false, settings: { profileVisibility: "ONLY_ME" }, visibilityRules: [{ section: "BASIC", audience: "PUBLIC" }] } },
      { id: "2", fullName: "Public Person", avatarUrl: null, location: "Private city", interests: ["Travel"], habits: ["Weekends"], bio: null, connectionGoal: "Private goal", occupation: "Private role", industry: null, user: { isBanned: false, settings: { profileVisibility: "PUBLIC" }, visibilityRules: [{ section: "BASIC", audience: "PUBLIC" }, { section: "INTERESTS", audience: "PUBLIC" }, { section: "HABITS", audience: "ONLY_ME" }, { section: "GOALS", audience: "CONNECTIONS" }, { section: "OCCUPATION", audience: "CONNECTIONS" }, { section: "PLACES", audience: "CONNECTIONS" }] } },
    ]);
    const result = await SearchService.searchInterestsPreview("");
    expect(result.totalMatches).toBe(1);
    expect(result.previewUsers[0]).toMatchObject({ location: "Vietnam", role: "BeeBuddy member", connectionGoal: "Find a companion" });
    expect((await SearchService.searchInterestsPreview("", { availability: ["Weekends"] })).totalMatches).toBe(0);
  });
});
