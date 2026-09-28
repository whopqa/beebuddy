import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const databaseName = process.env.STAGING_DATABASE_NAME?.trim() || "beebuddy_v2_staging";

if (!/^[a-z][a-z0-9_]{2,62}$/.test(databaseName)) {
  throw new Error("STAGING_DATABASE_NAME chỉ được chứa chữ thường, số và dấu gạch dưới");
}

async function main() {
  const current = await prisma.$queryRawUnsafe("SELECT current_database() AS name");

  if (current[0]?.name === databaseName) {
    console.log(`Database ${databaseName} đang được sử dụng; không cần tạo lại.`);
    return;
  }

  const existing = await prisma.$queryRawUnsafe(
    "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
    databaseName
  );

  if (existing[0]?.exists) {
    console.log(`Database ${databaseName} đã tồn tại.`);
    return;
  }

  // The identifier is safe because databaseName is restricted by the regex above.
  await prisma.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  console.log(`Đã tạo database ${databaseName}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
