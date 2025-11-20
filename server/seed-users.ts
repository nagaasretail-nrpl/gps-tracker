import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function seedUsers() {
  console.log("🌱 Seeding users...");

  const adminEmail = "admin@gps.com";
  const userEmail = "user@gps.com";

  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);
  
  if (existingAdmin.length === 0) {
    const hashedPassword = await hashPassword("admin123");
    await db.insert(users).values({
      name: "Admin User",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    console.log("✅ Created admin user:");
    console.log("   Email: admin@gps.com");
    console.log("   Password: admin123");
  } else {
    console.log("⏭️  Admin user already exists");
  }

  const existingUser = await db.select().from(users).where(eq(users.email, userEmail)).limit(1);
  
  if (existingUser.length === 0) {
    const hashedPassword = await hashPassword("user123");
    await db.insert(users).values({
      name: "Regular User",
      email: userEmail,
      password: hashedPassword,
      role: "user",
    });
    console.log("✅ Created regular user:");
    console.log("   Email: user@gps.com");
    console.log("   Password: user123");
  } else {
    console.log("⏭️  Regular user already exists");
  }

  console.log("✅ User seeding complete!");
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error("❌ Error seeding users:", error);
  process.exit(1);
});
