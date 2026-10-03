import { ProfileAudience, ProfileSection } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const searchAliases: Record<string, string[]> = {
  photography: ["nhiếp ảnh", "chụp ảnh"],
  travel: ["du lịch"],
  music: ["âm nhạc"],
  cooking: ["nấu ăn"],
  reading: ["đọc sách"],
  fitness: ["thể thao", "tập gym"],
  design: ["thiết kế"],
  development: ["lập trình", "coding", "developer"],
  marketing: ["tiếp thị"],
  writing: ["viết lách"],
  analytics: ["phân tích dữ liệu"],
  leadership: ["lãnh đạo"],
  "full-time": ["toàn thời gian"],
  "part-time": ["bán thời gian"],
  weekdays: ["ngày thường"],
  weekends: ["cuối tuần"],
  evenings: ["buổi tối"],
  flexible: ["linh hoạt"],
};

export class SearchService {
  private static maskName(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].slice(0, 2) + "***";
    }
    const firstName = parts.slice(0, -1).join(" ");
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName.slice(0, 1)}***`;
  }

  public static async searchInterestsPreview(
    query: string,
    filters: { interests?: string[]; skills?: string[]; availability?: string[] } = {},
  ) {
    const cleanedQuery = (query || "").trim().toLocaleLowerCase("vi-VN").slice(0, 80);
    const normalize = (value: string) => value.trim().toLocaleLowerCase("vi-VN");
    const containsTerm = (values: string[], term: string) =>
      [term, ...(searchAliases[term] || [])].some((alias) => values.some((value) => value.includes(alias)));
    const interests = (filters.interests || []).map(normalize).filter(Boolean).slice(0, 10);
    const skills = (filters.skills || []).map(normalize).filter(Boolean).slice(0, 10);
    const availability = (filters.availability || []).map(normalize).filter(Boolean).slice(0, 10);

    // PostgreSQL array `has` so khớp phân biệt hoa/thường. Profile hiện có thể
    // chứa cả "Coding" và "coding", vì vậy MVP đọc các trường tìm kiếm tối thiểu
    // rồi chuẩn hóa tại service để kết quả Web nhất quán với dữ liệu cũ.
    const profiles = await prisma.profile.findMany({
      select: {
        id: true,
        userId: true,
        fullName: true,
        avatarUrl: true,
        location: true,
        interests: true,
        habits: true,
        bio: true,
        connectionGoal: true,
        occupation: true,
        industry: true,
        user: {
          select: {
            isBanned: true,
            settings: { select: { profileVisibility: true } },
            visibilityRules: { select: { section: true, audience: true } },
          },
        },
      },
    });

    const matchingProfiles = profiles.filter((profile) => {
      if (profile.user?.isBanned || (profile.user?.settings?.profileVisibility && profile.user.settings.profileVisibility !== "PUBLIC")) return false;
      const rules = profile.user?.visibilityRules || [];
      const canShow = (section: ProfileSection) => rules.length
        ? rules.some((rule) => rule.section === section && rule.audience === ProfileAudience.PUBLIC)
        : (section === ProfileSection.BASIC || section === ProfileSection.BIO || section === ProfileSection.INTERESTS);
      if (!canShow(ProfileSection.BASIC)) return false;
      const publicInterests = canShow(ProfileSection.INTERESTS) ? profile.interests : [];
      const publicHabits = canShow(ProfileSection.HABITS) ? profile.habits : [];
      const publicBio = canShow(ProfileSection.BIO) ? profile.bio : null;
      const publicGoal = canShow(ProfileSection.GOALS) ? profile.connectionGoal : null;
      const publicOccupation = canShow(ProfileSection.OCCUPATION) ? profile.occupation : null;
      const publicIndustry = canShow(ProfileSection.OCCUPATION) ? profile.industry : null;
      const searchValues = [
        ...publicInterests, ...publicHabits, profile.fullName,
        publicBio, publicGoal, publicOccupation, publicIndustry,
      ].filter((value): value is string => Boolean(value)).map(normalize);
      const interestValues = publicInterests.map(normalize);
      const skillValues = [publicOccupation, publicIndustry, ...publicInterests, ...publicHabits]
        .filter((value): value is string => Boolean(value)).map(normalize);
      const availabilityValues = [publicBio, publicGoal, ...publicHabits]
        .filter((value): value is string => Boolean(value)).map(normalize);
      return (!cleanedQuery || searchValues.some((value) => value.includes(cleanedQuery))) &&
        (!interests.length || interests.some((term) => containsTerm(interestValues, term))) &&
        (!skills.length || skills.some((term) => containsTerm(skillValues, term))) &&
        (!availability.length || availability.some((term) => containsTerm(availabilityValues, term)));
    });

    const totalMatches = matchingProfiles.length;
    // Giới hạn hiển thị trên Web chỉ tối đa 3 người với thông tin được che (masked)
    const previewProfiles = matchingProfiles.slice(0, 3).map((p) => {
      const rules = p.user?.visibilityRules || [];
      const canShow = (section: ProfileSection) => rules.length
        ? rules.some((rule) => rule.section === section && rule.audience === ProfileAudience.PUBLIC)
        : (section === ProfileSection.BASIC || section === ProfileSection.BIO || section === ProfileSection.INTERESTS);
      return {
        id: p.id,
        userId: p.userId,
        maskedName: this.maskName(p.fullName),
        avatarUrl: p.avatarUrl,
        location: canShow(ProfileSection.PLACES) ? p.location || "Vietnam" : "Vietnam",
        matchingInterests: canShow(ProfileSection.INTERESTS) ? p.interests.slice(0, 3) : [],
        connectionGoal: canShow(ProfileSection.GOALS) ? p.connectionGoal || "Find a companion" : "Find a companion",
        role: canShow(ProfileSection.OCCUPATION) ? p.occupation || p.industry || "BeeBuddy member" : "BeeBuddy member",
      };
    });

    return {
      query: cleanedQuery,
      totalMatches,
      previewLimit: 3,
      previewUsers: previewProfiles,
      limitNotice:
        totalMatches > 3
          ? `We found ${totalMatches} people with similar habits or interests. Download the BeeBuddy mobile app to view the full list and send connection requests!`
          : "Download the BeeBuddy mobile app to start connecting and chatting!",
      downloadAppUrl: "https://beebuddy.vn/download",
    };
  }

  public static async getPopularInterests() {
    return [
      "Board games",
      "Running",
      "Hiking",
      "Reading",
      "Coding",
      "Coffee",
      "Badminton",
      "Learning English",
      "Photography",
      "Backpacking",
    ];
  }
}
