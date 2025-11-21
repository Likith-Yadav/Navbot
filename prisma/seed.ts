import { PrismaClient, MapType, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("password", 12);

  const campusMap = await prisma.map.upsert({
    where: { slug: "central-campus" },
    update: {
      name: "MVJ College of Engineering",
      description:
        "Navigate the MVJCE campus with ease. Find labs, libraries, and departments.",
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tileAttribution: "&copy; OpenStreetMap contributors",
      metadata: {
        welcomeMessage: "Welcome to MVJ College of Engineering!",
      },
    },
    create: {
      slug: "central-campus",
      name: "MVJ College of Engineering",
      description:
        "Navigate the MVJCE campus with ease. Find labs, libraries, and departments.",
      baseMapType: MapType.TILE,
      tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      tileAttribution: "&copy; OpenStreetMap contributors",
      metadata: {
        welcomeMessage: "Welcome to MVJ College of Engineering!",
      },
    },
  });

  // Clear existing data for this map to prevent jumbled pins
  await prisma.route.deleteMany({ where: { mapId: campusMap.id } });
  await prisma.locationPin.deleteMany({ where: { mapId: campusMap.id } });

  const welcomeCenter = await prisma.locationPin.create({
    data: {
      slug: "welcome-center",
      mapId: campusMap.id,
      name: "Main Gate (Welcome Center)",
      description:
        "Main entrance to the college. Security and information desk available here.",
      lat: 12.9837,
      lng: 77.7572,
      audioText:
        "You are at the Main Gate of MVJ College of Engineering.",
      imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585",
    },
  });

  const innovationHub = await prisma.locationPin.create({
    data: {
      slug: "innovation-hub",
      mapId: campusMap.id,
      name: "Admin Block",
      description: "Administrative offices, Principal's office, and Admissions.",
      lat: 12.9840,
      lng: 77.7575,
      audioText:
        "This is the Admin Block, housing the administrative offices.",
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
    },
  });

  const library = await prisma.locationPin.create({
    data: {
      slug: "knowledge-library",
      mapId: campusMap.id,
      name: "Central Library",
      description: "Main library building with reading rooms and digital access.",
      lat: 12.9835,
      lng: 77.7580,
      audioText: "The Central Library is a quiet zone for study and research.",
      imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da",
    },
  });

  await prisma.route.create({
    data: {
      slug: "mvj-campus-tour",
      mapId: campusMap.id,
      name: "MVJ Campus Tour",
      description: "A guided tour from the Main Gate to the Library.",
      isDefault: true,
      startLocationId: welcomeCenter.id,
      endLocationId: library.id,
      instructions:
        "Start at the Main Gate, walk past the Admin Block on your left, and proceed to the Central Library.",
      waypoints: {
        create: [
          {
            order: 1,
            lat: welcomeCenter.lat,
            lng: welcomeCenter.lng,
            instruction: "Start at the Main Gate.",
          },
          {
            order: 2,
            lat: innovationHub.lat,
            lng: innovationHub.lng,
            locationId: innovationHub.id,
            instruction: "Pass the Admin Block on your left.",
          },
          {
            order: 3,
            lat: library.lat,
            lng: library.lng,
            locationId: library.id,
            instruction: "Arrive at the Central Library.",
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
