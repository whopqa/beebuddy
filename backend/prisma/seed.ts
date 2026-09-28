import {
  AuthProvider,
  ProfileAudience,
  ProfileSection,
  PrismaClient,
  Role,
  SubscriptionTier,
  PostVisibility,
  CommentStatus,
  CommunityJoinPolicy,
  CommunityMemberRole,
  CommunityVisibility,
  ConnectionStatus,
  SubscriptionSource,
  SubscriptionStatus,
  UserPlaceRelation,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const defaultProfileVisibility = [
  { section: ProfileSection.BASIC, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.BIO, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.INTERESTS, audience: ProfileAudience.PUBLIC },
  { section: ProfileSection.AGE, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.OCCUPATION, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.PLACES, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.GOALS, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.INTRO_MEDIA, audience: ProfileAudience.CONNECTIONS },
  { section: ProfileSection.HABITS, audience: ProfileAudience.ONLY_ME },
];

function normalizedName(value: string) {
  return value.trim().toLocaleLowerCase("vi-VN");
}

function catalogSlug(prefix: string, value: string) {
  const readable = value.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || prefix;
  const suffix = createHash("sha256").update(normalizedName(value)).digest("hex").slice(0, 8);
  return `${readable}-${suffix}`;
}

function uniqueCatalogNames(values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const displayName = value.trim();
    if (displayName) unique.set(normalizedName(displayName), displayName);
  }
  return [...unique.values()];
}

function connectionPairKey(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(":");
}

async function syncEmailIdentity(userId: string, email: string, passwordHash: string) {
  const normalizedEmail = email.toLowerCase();
  await prisma.authIdentity.upsert({
    where: {
      provider_providerSubject: {
        provider: AuthProvider.EMAIL,
        providerSubject: normalizedEmail,
      },
    },
    update: {
      userId,
      providerEmail: normalizedEmail,
      passwordHash,
      verifiedAt: new Date(),
    },
    create: {
      userId,
      provider: AuthProvider.EMAIL,
      providerSubject: normalizedEmail,
      providerEmail: normalizedEmail,
      passwordHash,
      verifiedAt: new Date(),
    },
  });
}

async function syncProfileTaxonomyAndPrivacy(userId: string) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { userId } });

  await prisma.$transaction(async (tx) => {
    await Promise.all(defaultProfileVisibility.map((rule) =>
      tx.profileVisibilityRule.upsert({
        where: { userId_section: { userId, section: rule.section } },
        update: { audience: rule.audience },
        create: { userId, ...rule },
      })
    ));

    await tx.userInterest.deleteMany({ where: { userId } });
    for (const [priority, displayName] of uniqueCatalogNames(profile.interests).entries()) {
      const normalized = normalizedName(displayName);
      const interest = await tx.interest.upsert({
        where: { normalizedName: normalized },
        update: { displayName, isActive: true },
        create: {
          slug: catalogSlug("interest", displayName),
          displayName,
          normalizedName: normalized,
        },
      });
      await tx.userInterest.create({
        data: { userId, interestId: interest.id, priority, source: "SEED" },
      });
    }

    await tx.userHabit.deleteMany({ where: { userId } });
    for (const [priority, displayName] of uniqueCatalogNames(profile.habits).entries()) {
      const normalized = normalizedName(displayName);
      const habit = await tx.habit.upsert({
        where: { normalizedName: normalized },
        update: { displayName, isActive: true },
        create: {
          slug: catalogSlug("habit", displayName),
          displayName,
          normalizedName: normalized,
        },
      });
      await tx.userHabit.create({
        data: { userId, habitId: habit.id, priority, source: "SEED" },
      });
    }

    await tx.userPlace.deleteMany({
      where: { userId, relationType: UserPlaceRelation.CURRENT },
    });
    if (profile.location?.trim()) {
      const displayName = profile.location.trim();
      const normalized = normalizedName(displayName);
      const place = await tx.place.upsert({
        where: { normalizedName: normalized },
        update: { displayName, isActive: true },
        create: {
          slug: catalogSlug("place", displayName),
          displayName,
          normalizedName: normalized,
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

    await tx.userConnectionGoal.deleteMany({ where: { userId } });
    if (profile.connectionGoal?.trim()) {
      const displayName = profile.connectionGoal.trim();
      const normalized = normalizedName(displayName);
      const goal = await tx.connectionGoal.upsert({
        where: { normalizedName: normalized },
        update: { displayName, isActive: true },
        create: {
          slug: catalogSlug("goal", displayName),
          displayName,
          normalizedName: normalized,
        },
      });
      await tx.userConnectionGoal.create({
        data: { userId, connectionGoalId: goal.id, priority: 0 },
      });
    }
  });
}

async function syncSubscription(userId: string, tier: SubscriptionTier) {
  const plan = await prisma.plan.findFirstOrThrow({
    where: { tier, isActive: true },
    orderBy: { version: "desc" },
  });
  const active = await prisma.subscription.findFirst({
    where: { userId, status: SubscriptionStatus.ACTIVE },
  });
  const now = new Date();
  if (active) {
    await prisma.subscription.update({
      where: { id: active.id },
      data: { planId: plan.id, source: SubscriptionSource.ADMIN },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        source: SubscriptionSource.ADMIN,
        startsAt: now,
        currentPeriodStart: now,
      },
    });
  }
}

async function main() {
  console.log("🌱 Bắt đầu gieo dữ liệu khởi tạo (Seeding Database)...");

  // 1. Tạo từ khóa cấm mặc định (BadWords)
  const defaultBadwords = [
    { pattern: "đm", category: "PROFANITY" },
    { pattern: "dcm", category: "PROFANITY" },
    { pattern: "đcm", category: "PROFANITY" },
    { pattern: "vcl", category: "PROFANITY" },
    { pattern: "vkl", category: "PROFANITY" },
    { pattern: "lừa đảo", category: "SCAM" },
    { pattern: "scam", category: "SCAM" },
    { pattern: "fuck", category: "PROFANITY" },
    { pattern: "bitch", category: "HARASSMENT" },
  ];

  for (const bw of defaultBadwords) {
    await prisma.badWord.upsert({
      where: { pattern: bw.pattern },
      update: {},
      create: { pattern: bw.pattern, category: bw.category, isActive: true },
    });
  }
  console.log("✅ Đã khởi tạo danh sách từ cấm.");

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash("admin123456", salt);
  const userPasswordHash = await bcrypt.hash("user123456", salt);

  // 2. Tạo tài khoản Quản trị viên (Admin)
  const admin = await prisma.user.upsert({
    where: { email: "admin@beebuddy.vn" },
    update: { role: Role.ADMIN, passwordHash: adminPasswordHash, isVerified: true },
    create: {
      email: "admin@beebuddy.vn",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      tier: SubscriptionTier.PRO,
      isVerified: true,
      profile: {
        create: {
          fullName: "Quản Trị Viên BeeBuddy",
          username: "beebuddy_admin",
          bio: "Tài khoản quản trị hệ thống BeeBuddy",
          location: "Hà Nội, Việt Nam",
        },
      },
      settings: {
        create: {},
      },
    },
  });
  await syncEmailIdentity(admin.id, admin.email, adminPasswordHash);
  console.log(`✅ Đã tạo tài khoản Admin: ${admin.email} (Mật khẩu: admin123456)`);

  // 3. Tạo tài khoản mẫu
  const user1 = await prisma.user.upsert({
    where: { email: "minh.nguyen@beebuddy.vn" },
    update: { passwordHash: userPasswordHash, isVerified: true },
    create: {
      email: "minh.nguyen@beebuddy.vn",
      passwordHash: userPasswordHash,
      role: Role.USER,
      tier: SubscriptionTier.VIP,
      isVerified: true,
      profile: {
        create: {
          fullName: "Minh Nguyễn",
          username: "minh_runner",
          bio: "Thích chạy bộ buổi sáng và chơi board games cuối tuần 🏃‍♂️🎲",
          location: "TP. Hồ Chí Minh",
          interests: ["Board games", "Running", "Coding"],
          habits: ["Dậy sớm", "Chạy bộ 5km", "Đọc sách"],
          connectionGoal: "Tìm bạn chạy bộ cùng khu vực Q1, Q3",
        },
      },
      settings: { create: {} },
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "trang.le@beebuddy.vn" },
    update: { passwordHash: userPasswordHash, isVerified: true },
    create: {
      email: "trang.le@beebuddy.vn",
      passwordHash: userPasswordHash,
      role: Role.USER,
      tier: SubscriptionTier.PRO,
      isVerified: true,
      profile: {
        create: {
          fullName: "Trang Lê",
          username: "trang_coffee",
          bio: "Food & coffee lover. Muốn kết nối với các bạn thích khám phá quán xá xinh đẹp ☕🍰",
          location: "Hà Nội",
          interests: ["Cà phê", "Đọc sách", "Nhiếp ảnh"],
          habits: ["Uống cafe sáng", "Viết nhật ký"],
          connectionGoal: "Gặp gỡ bạn bè mới có chung đam mê cà phê",
        },
      },
      settings: { create: {} },
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: "hoang.pham@beebuddy.vn" },
    update: { passwordHash: userPasswordHash, isVerified: true },
    create: {
      email: "hoang.pham@beebuddy.vn",
      passwordHash: userPasswordHash,
      role: Role.USER,
      tier: SubscriptionTier.FREE,
      isVerified: true,
      profile: {
        create: {
          fullName: "Hoàng Phạm",
          username: "hoang_coder",
          bio: "Software developer, đam mê cầu lông và leo núi 🏸⛰️",
          location: "Đà Nẵng",
          interests: ["Coding", "Cầu lông", "Board games"],
          habits: ["Luyện code", "Chơi thể thao 3 buổi/tuần"],
          connectionGoal: "Lập nhóm chơi cầu lông cuối tuần",
        },
      },
      settings: { create: {} },
    },
  });

  await Promise.all([
    syncEmailIdentity(user1.id, user1.email, userPasswordHash),
    syncEmailIdentity(user2.id, user2.email, userPasswordHash),
    syncEmailIdentity(user3.id, user3.email, userPasswordHash),
  ]);

  for (const user of [admin, user1, user2, user3]) {
    await syncProfileTaxonomyAndPrivacy(user.id);
    await syncSubscription(user.id, user.tier);
  }

  // 4. Tạo kết nối mẫu giữa user1 và user2
  await prisma.connection.upsert({
    where: { pairKey: connectionPairKey(user1.id, user2.id) },
    update: {
      status: ConnectionStatus.ACCEPTED,
      respondedAt: new Date(),
      endedAt: null,
    },
    create: {
      userId: user1.id,
      targetId: user2.id,
      requesterId: user1.id,
      addresseeId: user2.id,
      pairKey: connectionPairKey(user1.id, user2.id),
      status: ConnectionStatus.ACCEPTED,
      respondedAt: new Date(),
    },
  });

  await prisma.community.upsert({
    where: { slug: "song-tich-cuc-cung-beebuddy" },
    update: {},
    create: {
      ownerId: user1.id,
      name: "Sống tích cực cùng BeeBuddy",
      slug: "song-tich-cuc-cung-beebuddy",
      description: "Cộng đồng chia sẻ thói quen tốt và tìm bạn đồng hành.",
      visibility: CommunityVisibility.PUBLIC,
      joinPolicy: CommunityJoinPolicy.OPEN,
      members: {
        create: {
          userId: user1.id,
          role: CommunityMemberRole.OWNER,
        },
      },
    },
  });

  // 5. Tạo bài viết mẫu (Posts)
  const existingPost = await prisma.post.findFirst();
  if (!existingPost) {
    const post1 = await prisma.post.create({
      data: {
        authorId: admin.id,
        content:
          "Chào mừng mọi người đến với cộng đồng BeeBuddy! Cùng kết nối, chia sẻ những thói quen tích cực và tìm kiếm những người bạn đồng điệu mỗi ngày nhé 🐝✨",
        visibility: PostVisibility.PUBLIC,
        audience: PostVisibility.PUBLIC,
        likesCount: 0,
      },
    });

    const post2 = await prisma.post.create({
      data: {
        authorId: user1.id,
        content:
          "Cuối tuần này ai ở TP.HCM muốn lập team board game Avalon hoặc Catan không? Comment bên dưới nhé! Tụi mình đang thiếu 2 người 🎲👋",
        visibility: PostVisibility.PUBLIC,
        audience: PostVisibility.PUBLIC,
        likesCount: 0,
      },
    });

    await prisma.comment.create({
      data: {
        postId: post2.id,
        authorId: user2.id,
        content: "Cho mình đăng ký 1 slot nhé! Mình chơi được cả Avalon và Bang! 🎉",
        status: CommentStatus.APPROVED,
      },
    });

    await prisma.post.create({
      data: {
        authorId: user1.id,
        content:
          "[Connections Only] Hôm nay mình vừa hoàn thành buổi chạy 10km sáng sớm quanh bờ kè. Cảm giác thật tuyệt vời! Cố gắng duy trì streak nào 🏃‍♂️🔥",
        visibility: PostVisibility.CONNECTIONS,
        audience: PostVisibility.CONNECTIONS,
        likesCount: 0,
      },
    });
  }

  console.log("🎉 Seed dữ liệu mẫu hoàn tất!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed dữ liệu:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
