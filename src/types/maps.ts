export interface LocationPinDTO {
  id: string;
  mapId: string;
  name: string;
  slug: string;
  description?: string | null;
  lat: number;
  lng: number;
  floor?: string | null;
  category?: string | null;
  audioText?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteWaypointDTO {
  id: string;
  routeId: string;
  order: number;
  lat: number;
  lng: number;
  locationId?: string | null;
  location?: LocationPinDTO | null;
  instruction?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RouteDTO {
  id: string;
  mapId: string;
  name: string;
  slug: string;
  description?: string | null;
  isDefault: boolean;
  estimatedMinutes?: number | null;
  startLocationId: string;
  endLocationId: string;
  instructions?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  startLocation?: LocationPinDTO;
  endLocation?: LocationPinDTO;
  waypoints: RouteWaypointDTO[];
}

export interface MapDTO {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  baseMapType: "TILE" | "IMAGE_OVERLAY";
  tileUrl?: string | null;
  tileAttribution?: string | null;
  imageOverlayUrl?: string | null;
  imageBounds?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  locationPins: LocationPinDTO[];
  routes: RouteDTO[];
}
