import { PrismaClient, Role, AuditActorType } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Cách dùng: node scripts/grant-admin.mjs email-da-xac-minh@example.com");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, isVerified: true, isBanned: true },
  });

  if (!user) throw new Error("Không tìm thấy tài khoản. Hãy đăng ký trước.");
  if (!user.isVerified) throw new Error("Tài khoản chưa xác minh email.");
  if (user.isBanned) throw new Error("Không thể cấp quyền cho tài khoản bị khóa.");
  if (user.role === Role.ADMIN) {
    console.log(`${user.email} đã là admin; không thay đổi dữ liệu.`);
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } }),
      prisma.auditLog.create({
        data: {
          actorType: AuditActorType.SYSTEM,
          action: "ADMIN_BOOTSTRAP",
          targetType: "User",
          targetId: user.id,
          beforeData: { role: user.role },
          afterData: { role: Role.ADMIN },
          metadata: { method: "railway_ssh" },
        },
      }),
    ]);
    console.log(`Đã cấp quyền admin cho ${user.email}. Hãy đăng xuất và đăng nhập lại.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
