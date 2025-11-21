"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    mapPayloadSchema,
    locationPayloadSchema,
    routePayloadSchema,
} from "@/lib/schemas";

// --- Maps ---

export async function createMap(data: z.infer<typeof mapPayloadSchema>) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        const map = await prisma.map.create({ data });
        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true, data: map };
    } catch (error) {
        return { success: false, error: "Failed to create map" };
    }
}

export async function deleteMap(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        // Manually delete dependents to ensure correct order and avoid FK constraints
        // 1. Delete all routes associated with this map
        await prisma.route.deleteMany({ where: { mapId: id } });

        // 2. Delete all pins associated with this map
        await prisma.locationPin.deleteMany({ where: { mapId: id } });

        // 3. Finally delete the map
        await prisma.map.delete({ where: { id } });

        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true };
    } catch (error) {
        console.error("Delete map error:", error);
        return { success: false, error: "Failed to delete map" };
    }
}

// --- Pins (Locations) ---

export async function createPin(data: z.infer<typeof locationPayloadSchema>) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        const pin = await prisma.locationPin.create({ data });
        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true, data: pin };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to create pin" };
    }
}

export async function deletePin(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        // Delete routes that use this pin as start or end
        await prisma.route.deleteMany({
            where: {
                OR: [
                    { startLocationId: id },
                    { endLocationId: id },
                ],
            },
        });

        await prisma.locationPin.delete({ where: { id } });
        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true };
    } catch (error) {
        console.error("Delete pin error:", error);
        return { success: false, error: "Failed to delete pin" };
    }
}

// --- Routes ---

export async function createRoute(data: z.infer<typeof routePayloadSchema>) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        // Prisma needs the waypoints to be created separately or via nested create
        // The schema has waypoints array, we need to map it for Prisma
        const { waypoints, ...routeData } = data;

        const route = await prisma.route.create({
            data: {
                ...routeData,
                waypoints: {
                    create: waypoints.map((wp) => ({
                        order: wp.order,
                        lat: wp.lat,
                        lng: wp.lng,
                        instruction: wp.instruction,
                        locationId: wp.locationId,
                    })),
                },
            },
        });
        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true, data: route };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to create route" };
    }
}

export async function deleteRoute(id: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        await prisma.route.delete({ where: { id } });
        revalidatePath("/admin");
        revalidatePath("/navigate");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete route" };
    }
}
