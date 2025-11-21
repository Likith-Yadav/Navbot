import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapPayloadSchema } from "@/lib/schemas";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const include = url.searchParams.get("include");
  const includeRelations = include === "full";

  const maps = await prisma.map.findMany({
    orderBy: { name: "asc" },
    include: includeRelations
      ? {
          locationPins: true,
          routes: { include: { waypoints: true } },
        }
      : undefined,
  });

  return NextResponse.json({ data: maps });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = mapPayloadSchema.parse(await request.json());
    const map = await prisma.map.create({ data: payload });
    return NextResponse.json({ data: map }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create map" },
      { status: 400 }
    );
  }
}
