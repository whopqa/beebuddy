import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import {
  AuthProvider,
  Prisma,
  ProfileAudience,
  ProfileSection,
  UserPlaceRelation,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";

function normalizeCatalogName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function catalogSlug(prefix: string, value: string) {
  const normalizedName = normalizeCatalogName(value);
  const readable = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || prefix;
  const suffix = createHash("sha256").update(normalizedName).digest("hex").slice(0, 8);
  return `${readable}-${suffix}`;
}

function uniqueCatalogValues(values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const displayName = value.trim();
    if (displayName) unique.set(normalizeCatalogName(displayName), displayName);
  }
  return [...unique.entries()].map(([normalizedName, displayName]) => ({
    normalizedName,
    displayName,
  }));
}

async function syncInterests(tx: Prisma.TransactionClient, userId: string, values: string[]) {
  const catalogs = await Promise.all(uniqueCatalogValues(values).map(async (item) =>
    tx.interest.upsert({
      where: { normalizedName: item.normalizedName },
      update: { displayName: item.displayName, isActive: true },
      create: {
        slug: catalogSlug("interest", item.displayName),
        displayName: item.displayName,
        normalizedName: item.normalizedName,
      },
    })
  ));

  await tx.userInterest.deleteMany({
    where: catalogs.length
      ? { userId, interestId: { notIn: catalogs.map((item) => item.id) } }
      : { userId },
  });
  await Promise.all(catalogs.map((item, priority) => tx.userInterest.upsert({
    where: { userId_interestId: { userId, interestId: item.id } },
    update: { priority, source: "USER" },
    create: { userId, interestId: item.id, priority, source: "USER" },
  })));
}

async function syncHabits(tx: Prisma.TransactionClient, userId: string, values: string[]) {
  const catalogs = await Promise.all(uniqueCatalogValues(values).map(async (item) =>
    tx.habit.upsert({
      where: { normalizedName: item.normalizedName },
      update: { displayName: item.displayName, isActive: true },
      create: {
        slug: catalogSlug("habit", item.displayName),
        displayName: item.displayName,
        normalizedName: item.normalizedName,
      },
    })
  ));

  await tx.userHabit.deleteMany({
    where: catalogs.length
      ? { userId, habitId: { notIn: catalogs.map((item) => item.id) } }
      : { userId },
  });
  await Promise.all(catalogs.map((item, priority) => tx.userHabit.upsert({
    where: { userId_habitId: { userId, habitId: item.id } },
    update: { priority, source: "USER" },
    create: { userId, habitId: item.id, priority, source: "USER" },
  })));
}

async function syncCurrentPlace(tx: Prisma.TransactionClient, userId: string, value: string) {
  await tx.userPlace.deleteMany({
    where: { userId, relationType: UserPlaceRelation.CURRENT },
  });
  const displayName = value.trim();
  if (!displayName) return;

  const normalizedName = normalizeCatalogName(displayName);
  const place = await tx.place.upsert({
    where: { normalizedName },
    update: { displayName, isActive: true },
    create: {
      slug: catalogSlug("place", displayName),
      displayName,
      normalizedName,
    },
  });
  await tx.userPlace.create({
    data: {
      userId,
      placeId: place.id,
      relationType: UserPlaceRelation.CURRENT,
      isPrimary: true,
    },
  });
}

async function syncConnectionGoal(tx: Prisma.TransactionClient, userId: string, value: string) {
  await tx.userConnectionGoal.deleteMany({ where: { userId } });
  const displayName = value.trim();
  if (!displayName) return;

  const normalizedName = normalizeCatalogName(displayName);
  const goal = await tx.connectionGoal.upsert({
    where: { normalizedName },
    update: { displayName, isActive: true },
    create: {
      slug: catalogSlug("goal", displayName),
      displayName,
      normalizedName,
    },
  });
  await tx.userConnectionGoal.create({
    data: { userId, connectionGoalId: goal.id, priority: 0 },
  });
}

const profileUserSelect = {
  id: true,
  email: true,
  role: true,
  tier: true,
  tierExpiresAt: true,
  createdAt: true,
  visibilityRules: {
    select: { section: true, audience: true },
    orderBy: { section: "asc" as const },
  },
};

export class AccountService {
  public static async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: profileUserSelect } },
    });

    if (!profile) throw new Error("Không tìm thấy hồ sơ người dùng");
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
    return prisma.$transaction(async (tx) => {
      const updated = await tx.profile.update({
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
        include: { user: { select: profileUserSelect } },
      });

      if (data.interests !== undefined) await syncInterests(tx, userId, data.interests);
      if (data.habits !== undefined) await syncHabits(tx, userId, data.habits);
      if (data.location !== undefined) await syncCurrentPlace(tx, userId, data.location);
      if (data.connectionGoal !== undefined) {
        await syncConnectionGoal(tx, userId, data.connectionGoal);
      }

      return updated;
    });
  }

  public static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) throw new Error("Người dùng không tồn tại");

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new Error("Mật khẩu hiện tại không chính xác");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.authIdentity.upsert({
        where: {
          provider_providerSubject: {
            provider: AuthProvider.EMAIL,
            providerSubject: user.email.toLowerCase(),
          },
        },
        update: { passwordHash, lastUsedAt: new Date() },
        create: {
          userId,
          provider: AuthProvider.EMAIL,
          providerSubject: user.email.toLowerCase(),
          providerEmail: user.email.toLowerCase(),
          passwordHash,
          verifiedAt: user.isVerified ? new Date() : null,
        },
      }),
      prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true, sessionsRevoked: true };
  }

  public static async getProfilePrivacy(userId: string) {
    return prisma.profileVisibilityRule.findMany({
      where: { userId },
      select: { section: true, audience: true },
      orderBy: { section: "asc" },
    });
  }

  public static async updateProfilePrivacy(
    userId: string,
    rules: Array<{ section: ProfileSection; audience: ProfileAudience }>
  ) {
    return prisma.$transaction(async (tx) => {
      for (const rule of rules) {
        await tx.profileVisibilityRule.upsert({
          where: { userId_section: { userId, section: rule.section } },
          update: { audience: rule.audience },
          create: { userId, section: rule.section, audience: rule.audience },
        });
      }

      return tx.profileVisibilityRule.findMany({
        where: { userId },
        select: { section: true, audience: true },
        orderBy: { section: "asc" },
      });
    });
  }

  public static async getSettings(userId: string) {
    let settings = await prisma.userSetting.findUnique({ where: { userId } });
    if (!settings) settings = await prisma.userSetting.create({ data: { userId } });
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
    return prisma.userSetting.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
