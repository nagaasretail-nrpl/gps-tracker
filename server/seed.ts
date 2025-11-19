import { db } from "./db";
import { vehicles, locations } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Check if demo vehicle already exists
  const existing = await db.select().from(vehicles).limit(1);
  if (existing.length > 0) {
    console.log("Database already seeded");
    return;
  }

  // Create demo vehicle
  const [demoVehicle] = await db
    .insert(vehicles)
    .values({
      name: "Demo Vehicle 1",
      deviceId: "DEMO-001",
      type: "car",
      status: "active",
      iconColor: "#2563eb",
    })
    .returning();

  console.log("Created demo vehicle:", demoVehicle.id);

  // Create initial location for demo vehicle
  await db.insert(locations).values({
    vehicleId: demoVehicle.id,
    latitude: "40.7128",
    longitude: "-74.0060",
    altitude: "10",
    speed: "45.5",
    heading: "90",
    address: "New York, NY",
    accuracy: "5",
  });

  console.log("Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .then(() => process.exit(0));
