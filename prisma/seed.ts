import { PrismaClient, MapType, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("password", 12);

  const campusMap = await prisma.map.upsert({
    where: { slug: "central-campus" },
    update: {
      name: "Central Innovation Campus",
      description:
        "A demo campus showcasing how the navigation assistant guides visitors across buildings and labs.",
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tileAttribution: "&copy; OpenStreetMap contributors",
      metadata: {
        welcomeMessage: "Welcome to the Central Innovation Campus!",
      },
    },
    create: {
      slug: "central-campus",
      name: "Central Innovation Campus",
      description:
        "A demo campus showcasing how the navigation assistant guides visitors across buildings and labs.",
      baseMapType: MapType.TILE,
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tileAttribution: "&copy; OpenStreetMap contributors",
      metadata: {
        welcomeMessage: "Welcome to the Central Innovation Campus!",
      },
    },
  });

  const welcomeCenter = await prisma.locationPin.upsert({
    where: { slug_mapId: { slug: "welcome-center", mapId: campusMap.id } },
    update: {
      name: "Welcome Center",
      description:
        "Pick up visitor passes, ask questions, and meet the concierge team.",
      lat: 37.4221,
      lng: -122.0841,
      audioText:
        "You are at the Welcome Center. This is the perfect spot to begin your tour of the campus.",
      imageUrl: "https://images.unsplash.com/photo-1485217988980-11786ced9454",
    },
    create: {
      slug: "welcome-center",
      mapId: campusMap.id,
      name: "Welcome Center",
      description:
        "Pick up visitor passes, ask questions, and meet the concierge team.",
      lat: 37.4221,
      lng: -122.0841,
      audioText:
        "You are at the Welcome Center. This is the perfect spot to begin your tour of the campus.",
      imageUrl: "https://images.unsplash.com/photo-1485217988980-11786ced9454",
    },
  });

  const innovationHub = await prisma.locationPin.upsert({
    where: { slug_mapId: { slug: "innovation-hub", mapId: campusMap.id } },
    update: {
      name: "Innovation Hub",
      description: "A collaborative workspace for research teams and founders.",
      lat: 37.4212,
      lng: -122.085,
      audioText:
        "The Innovation Hub is where students build prototypes, test ideas, and showcase demos.",
      imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    },
    create: {
      slug: "innovation-hub",
      mapId: campusMap.id,
      name: "Innovation Hub",
      description: "A collaborative workspace for research teams and founders.",
      lat: 37.4212,
      lng: -122.085,
      audioText:
        "The Innovation Hub is where students build prototypes, test ideas, and showcase demos.",
      imageUrl: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    },
  });

  const library = await prisma.locationPin.upsert({
    where: { slug_mapId: { slug: "knowledge-library", mapId: campusMap.id } },
    update: {
      name: "Knowledge Library",
      description: "Silent study spaces, archives, and digital resource labs.",
      lat: 37.4204,
      lng: -122.0838,
      audioText: "The Knowledge Library offers collaborative zones and quiet pods.",
      imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    },
    create: {
      slug: "knowledge-library",
      mapId: campusMap.id,
      name: "Knowledge Library",
      description: "Silent study spaces, archives, and digital resource labs.",
      lat: 37.4204,
      lng: -122.0838,
      audioText: "The Knowledge Library offers collaborative zones and quiet pods.",
      imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e",
    },
  });

  await prisma.route.upsert({
    where: { slug_mapId: { slug: "welcome-to-library", mapId: campusMap.id } },
    update: {
      name: "Welcome Center to Library",
      description: "A shaded path that guides visitors through the quad.",
      startLocationId: welcomeCenter.id,
      endLocationId: library.id,
      instructions:
        "Exit the Welcome Center, keep Innovation Hub on your left, and continue straight until you reach the Library entrance.",
      waypoints: {
        deleteMany: {},
        create: [
          {
            order: 1,
            lat: welcomeCenter.lat,
            lng: welcomeCenter.lng,
            instruction: "Head south toward the main quad.",
          },
          {
            order: 2,
            lat: innovationHub.lat,
            lng: innovationHub.lng,
            locationId: innovationHub.id,
            instruction: "Pass by the Innovation Hub on your left and stay on the paved pathway.",
          },
          {
            order: 3,
            lat: library.lat,
            lng: library.lng,
            locationId: library.id,
            instruction: "Arrive at the Library entrance.",
          },
        ],
      },
    },
    create: {
      slug: "welcome-to-library",
      mapId: campusMap.id,
      name: "Welcome Center to Library",
      description: "A shaded path that guides visitors through the quad.",
      isDefault: true,
      startLocationId: welcomeCenter.id,
      endLocationId: library.id,
      instructions:
        "Exit the Welcome Center, keep Innovation Hub on your left, and continue straight until you reach the Library entrance.",
      waypoints: {
        create: [
          {
            order: 1,
            lat: welcomeCenter.lat,
            lng: welcomeCenter.lng,
            instruction: "Head south toward the main quad.",
          },
          {
            order: 2,
            lat: innovationHub.lat,
            lng: innovationHub.lng,
            locationId: innovationHub.id,
            instruction: "Pass by the Innovation Hub on your left and stay on the paved pathway.",
          },
          {
            order: 3,
            lat: library.lat,
            lng: library.lng,
            locationId: library.id,
            instruction: "Arrive at the Library entrance.",
          },
        ],
      },
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Super Admin",
      username: "admin",
      passwordHash: adminPasswordHash,
    },
    create: {
      username: "admin",
      email: "admin@example.com",
      name: "Super Admin",
      passwordHash: adminPasswordHash,
      role: AdminRole.SUPERADMIN,
    },
  });

  console.log("🌱 Database seeded with demo campus data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
