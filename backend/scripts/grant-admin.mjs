import { PrismaClient, Role, AuditActorType } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
const demoUnverified = process.argv[3] === "--demo-unverified";
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || process.argv.length > (demoUnverified ? 4 : 3)) {
  console.error("Cách dùng: node scripts/grant-admin.mjs email@example.com [--demo-unverified]");
  process.exit(1);
}

const demoUntilValue = process.env.DEMO_SKIP_EMAIL_VERIFICATION_UNTIL || "";
const demoUntil = Date.parse(demoUntilValue);
const demoWindowActive = Number.isFinite(demoUntil)
  && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(demoUntilValue)
  && demoUntil > Date.now()
  && demoUntil - Date.now() <= 7 * 24 * 60 * 60 * 1000;

if (demoUnverified && !demoWindowActive) {
  console.error("Chỉ được dùng --demo-unverified khi chế độ demo trên Railway còn hiệu lực.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, isVerified: true, isBanned: true },
  });

  if (!user) throw new Error("Không tìm thấy tài khoản. Hãy đăng ký trước.");
  if (user.isBanned) throw new Error("Không thể cấp quyền cho tài khoản bị khóa.");
  if (!user.isVerified && (!demoUnverified || user.role !== Role.USER)) {
    throw new Error("Tài khoản chưa xác minh email; chỉ tài khoản USER mới có thể nhận ngoại lệ demo.");
  }
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
          metadata: {
            method: "railway_ssh",
            demoUnverified: !user.isVerified,
            ...(demoUnverified ? { demoUntil: demoUntilValue } : {}),
          },
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
