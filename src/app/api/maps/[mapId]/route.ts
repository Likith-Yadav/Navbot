import { NextResponse, NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mapUpdateSchema } from "@/lib/schemas";

type ParamsPromise = { params: Promise<{ mapId: string }> };

export async function GET(_request: NextRequest, { params }: ParamsPromise) {
  const { mapId } = await params;

  const map = await prisma.map.findUnique({
    where: { id: mapId },
    include: {
      locationPins: true,
      routes: {
        include: {
          waypoints: {
            orderBy: { order: "asc" },
          },
          startLocation: true,
          endLocation: true,
        },
      },
    },
  });

  if (!map) {
    return NextResponse.json({ error: "Map not found" }, { status: 404 });
  }

  return NextResponse.json({ data: map });
}

export async function PATCH(request: NextRequest, { params }: ParamsPromise) {
  const { mapId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = mapUpdateSchema.parse(await request.json());
    const map = await prisma.map.update({
      where: { id: mapId },
      data: payload,
    });
    return NextResponse.json({ data: map });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update map" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: ParamsPromise) {
  const { mapId } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.map.delete({ where: { id: mapId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete map" },
      { status: 400 },
    );
  }
}
