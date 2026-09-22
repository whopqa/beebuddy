import { PrismaClient, Role, SubscriptionTier, PostVisibility, CommentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    update: { role: Role.ADMIN },
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
  console.log(`✅ Đã tạo tài khoản Admin: ${admin.email} (Mật khẩu: admin123456)`);

  // 3. Tạo tài khoản mẫu
  const user1 = await prisma.user.upsert({
    where: { email: "minh.nguyen@beebuddy.vn" },
    update: {},
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
    update: {},
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
    update: {},
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

  // 4. Tạo kết nối mẫu giữa user1 và user2
  await prisma.connection.upsert({
    where: {
      userId_targetId: {
        userId: user1.id,
        targetId: user2.id,
      },
    },
    update: {},
    create: {
      userId: user1.id,
      targetId: user2.id,
      status: "ACCEPTED",
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
        likesCount: 18,
      },
    });

    const post2 = await prisma.post.create({
      data: {
        authorId: user1.id,
        content:
          "Cuối tuần này ai ở TP.HCM muốn lập team board game Avalon hoặc Catan không? Comment bên dưới nhé! Tụi mình đang thiếu 2 người 🎲👋",
        visibility: PostVisibility.PUBLIC,
        likesCount: 7,
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
        likesCount: 5,
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
