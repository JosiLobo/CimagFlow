import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { writeFileSync } from "fs";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  // Test connection first
  await prisma.$connect();
  
  const hash = await bcrypt.hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@signflow.com" },
    update: {
      password: hash,
      isActive: true,
      role: "ADMIN",
      name: "Administrador",
    },
    create: {
      name: "Administrador",
      email: "admin@signflow.com",
      password: hash,
      role: "ADMIN",
      phone: "11977777777",
      isActive: true,
    },
  });
  writeFileSync("/tmp/check-user-result.txt", "OK:" + user.email + "|" + user.role + "|active=" + user.isActive);
  await prisma.$disconnect();
}

main().catch((e) => {
  writeFileSync("/tmp/check-user-result.txt", "ERROR:" + String(e.message || e));
  process.exit(1);
});
