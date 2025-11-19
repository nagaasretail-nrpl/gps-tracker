import { db } from "./db";
import { vehicles, locations, geofences, pois } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  // Check if demo vehicle already exists
  const existingVehicles = await db.select().from(vehicles).limit(1);
  const existingGeofences = await db.select().from(geofences).limit(1);
  
  let seededSomething = false;

  let demoVehicle;
  
  if (existingVehicles.length === 0) {
    // Create demo vehicle
    [demoVehicle] = await db
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

    // Create initial location for demo vehicle (Times Square, NYC)
    await db.insert(locations).values({
      vehicleId: demoVehicle.id,
      latitude: "40.7580",
      longitude: "-73.9855",
      altitude: "10",
      speed: "45.5",
      heading: "90",
      address: "Times Square, New York, NY",
      accuracy: "5",
    });
    
    seededSomething = true;
  } else {
    demoVehicle = existingVehicles[0];
    console.log("Demo vehicle already exists:", demoVehicle.id);
  }

  if (existingGeofences.length === 0) {
    // Create demo geofence (circular around Central Park)
    await db.insert(geofences).values({
      name: "Central Park Zone",
      description: "Monitoring zone around Central Park",
      type: "circle",
      coordinates: {
        center: { lat: 40.7829, lng: -73.9654 },
        radius: 1000, // 1km radius
      },
      color: "#10b981",
      active: true,
      alertOnEntry: true,
      alertOnExit: true,
    });
    
    console.log("Created demo geofence: Central Park Zone");
    seededSomething = true;
  } else {
    console.log("Geofences already exist");
  }

  // Check and create POI
  const existingPois = await db.select().from(pois).limit(1);
  if (existingPois.length === 0) {
    await db.insert(pois).values({
      name: "Main Office",
      description: "Company headquarters",
      latitude: "40.7589",
      longitude: "-73.9851",
      category: "custom",
      icon: "Building2",
    });
    
    console.log("Created demo POI: Main Office");
    seededSomething = true;
  } else {
    console.log("POIs already exist");
  }

  if (seededSomething) {
    console.log("Database seeded successfully!");
  } else {
    console.log("Database already fully seeded");
  }
}

seed()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .then(() => process.exit(0));
