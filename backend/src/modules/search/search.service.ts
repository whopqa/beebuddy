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
    const cleanedQuery = (query || "").trim().toLocaleLowerCase("vi-VN").slice(0, 80);
    if (!cleanedQuery) {
      return {
        query: "",
        totalMatches: 0,
        previewUsers: [],
        limitNotice: "Vui lòng nhập từ khóa sở thích hoặc thói quen để tìm kiếm.",
      };
    }

    // PostgreSQL array `has` so khớp phân biệt hoa/thường. Profile hiện có thể
    // chứa cả "Coding" và "coding", vì vậy MVP đọc các trường tìm kiếm tối thiểu
    // rồi chuẩn hóa tại service để kết quả Web nhất quán với dữ liệu cũ.
    const profiles = await prisma.profile.findMany({
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        location: true,
        interests: true,
        habits: true,
        bio: true,
        connectionGoal: true,
      },
    });

    const matches = (value: string) =>
      value.toLocaleLowerCase("vi-VN").includes(cleanedQuery);
    const matchingProfiles = profiles.filter((profile) =>
      profile.interests.some(matches) ||
      profile.habits.some(matches) ||
      Boolean(profile.bio && matches(profile.bio)) ||
      Boolean(profile.connectionGoal && matches(profile.connectionGoal))
    );

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
