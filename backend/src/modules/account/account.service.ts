import { prisma } from "../../lib/prisma";
import bcrypt from "bcryptjs";

export class AccountService {
  public static async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tier: true,
            tierExpiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      throw new Error("Không tìm thấy hồ sơ người dùng");
    }

    return profile;
  }

  public static async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      avatarUrl?: string;
      bio?: string;
      gender?: string;
      dateOfBirth?: string;
      location?: string;
      interests?: string[];
      habits?: string[];
      connectionGoal?: string;
    }
  ) {
    const updated = await prisma.profile.update({
      where: { userId },
      data: {
        fullName: data.fullName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        location: data.location,
        interests: data.interests,
        habits: data.habits,
        connectionGoal: data.connectionGoal,
      },
    });

    return updated;
  }

  public static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new Error("Người dùng không tồn tại");
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Mật khẩu hiện tại không chính xác");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  public static async getSettings(userId: string) {
    let settings = await prisma.userSetting.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await prisma.userSetting.create({
        data: { userId },
      });
    }

    return settings;
  }

  public static async updateSettings(
    userId: string,
    data: {
      profileVisibility?: string;
      emailNotification?: boolean;
      language?: string;
      theme?: string;
    }
  ) {
    const updated = await prisma.userSetting.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return updated;
  }
}
