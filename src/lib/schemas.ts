import { z } from "zod";

export const idSchema = z.string().min(1);

export const mapPayloadSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  baseMapType: z.enum(["TILE", "IMAGE_OVERLAY"]).default("TILE"),
  tileUrl: z.string().url().optional(),
  tileAttribution: z.string().optional(),
  imageOverlayUrl: z.string().url().optional(),
  imageBounds: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

export const mapUpdateSchema = mapPayloadSchema.partial();

export const locationPayloadSchema = z.object({
  mapId: z.string().min(1),
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  floor: z.string().optional(),
  category: z.string().optional(),
  audioText: z.string().optional(),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const locationUpdateSchema = locationPayloadSchema.partial();

export const waypointSchema = z.object({
  order: z.number().int().nonnegative(),
  lat: z.number(),
  lng: z.number(),
  locationId: z.string().optional(),
  instruction: z.string().optional(),
});

export const routePayloadSchema = z.object({
  mapId: z.string().min(1),
  slug: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  startLocationId: z.string().min(1),
  endLocationId: z.string().min(1),
  instructions: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  waypoints: z.array(waypointSchema).default([]),
});
