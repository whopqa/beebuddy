import { prisma } from "../../lib/prisma";

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

  public static async searchInterestsPreview(query: string) {
    const cleanedQuery = (query || "").trim().toLowerCase();
    if (!cleanedQuery) {
      return {
        query: "",
        totalMatches: 0,
        previewUsers: [],
        limitNotice: "Vui lòng nhập từ khóa sở thích hoặc thói quen để tìm kiếm.",
      };
    }

    // Tìm profiles có interests hoặc habits chứa query (hoặc bio chứa query)
    const matchingProfiles = await prisma.profile.findMany({
      where: {
        OR: [
          { interests: { has: cleanedQuery } },
          { habits: { has: cleanedQuery } },
          { bio: { contains: cleanedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        location: true,
        interests: true,
        habits: true,
        connectionGoal: true,
      },
    });

    const totalMatches = matchingProfiles.length;
    // Giới hạn hiển thị trên Web chỉ tối đa 3 người với thông tin được che (masked)
    const previewProfiles = matchingProfiles.slice(0, 3).map((p) => ({
      id: p.id,
      maskedName: this.maskName(p.fullName),
      avatarUrl: p.avatarUrl,
      location: p.location || "Việt Nam",
      matchingInterests: p.interests.slice(0, 3),
      connectionGoal: p.connectionGoal || "Tìm bạn đồng hành",
    }));

    return {
      query: cleanedQuery,
      totalMatches,
      previewLimit: 3,
      previewUsers: previewProfiles,
      limitNotice:
        totalMatches > 3
          ? `Hệ thống tìm thấy ${totalMatches} người có cùng thói quen/sở thích này. Để xem danh sách đầy đủ và gửi lời mời kết nối, vui lòng tải ứng dụng BeeBuddy trên điện thoại!`
          : "Tải ứng dụng BeeBuddy trên điện thoại để bắt đầu kết nối và trò chuyện!",
      downloadAppUrl: "https://beebuddy.vn/download",
    };
  }

  public static async getPopularInterests() {
    return [
      "Board games",
      "Running",
      "Chạy bộ",
      "Đọc sách",
      "Coding",
      "Cà phê",
      "Cầu lông",
      "Học tiếng Anh",
      "Nhiếp ảnh",
      "Du lịch bụi",
    ];
  }
}
