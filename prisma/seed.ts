import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      fullName: "Administrator",
      role: "ADMIN",
    },
  });

  console.log("✅ Created admin user:", admin.username);

  // Create Regular Users
  const user1 = await prisma.user.upsert({
    where: { username: "user1" },
    update: {},
    create: {
      username: "user1",
      password: userPassword,
      fullName: "John Doe",
      role: "USER",
    },
  });

  console.log("✅ Created user:", user1.username);

  const user2 = await prisma.user.upsert({
    where: { username: "user2" },
    update: {},
    create: {
      username: "user2",
      password: userPassword,
      fullName: "Jane Smith",
      role: "USER",
    },
  });

  console.log("✅ Created user:", user2.username);

  const user3 = await prisma.user.upsert({
    where: { username: "user3" },
    update: {},
    create: {
      username: "user3",
      password: userPassword,
      fullName: "Bob Johnson",
      role: "USER",
    },
  });

  console.log("✅ Created user:", user3.username);

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
