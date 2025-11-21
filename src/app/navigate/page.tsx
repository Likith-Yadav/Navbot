"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Compass, Loader2, Map, Mic, Navigation, PinIcon, Volume2 } from "lucide-react";
import type { LatLngBoundsExpression, LatLngExpression, Icon } from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { formatMeters } from "@/lib/utils";
import { speak } from "@/lib/voice-utils";
import type { MapDTO, RouteDTO, LocationPinDTO, RouteWaypointDTO } from "@/types/maps";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
}) as typeof import("react-leaflet").MapContainer;
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
}) as typeof import("react-leaflet").TileLayer;
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
}) as typeof import("react-leaflet").Marker;
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
}) as typeof import("react-leaflet").Popup;
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), {
  ssr: false,
}) as typeof import("react-leaflet").Polyline;
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), {
  ssr: false,
}) as typeof import("react-leaflet").Circle;
const ImageOverlay = dynamic(() => import("react-leaflet").then((mod) => mod.ImageOverlay), {
  ssr: false,
}) as typeof import("react-leaflet").ImageOverlay;

const defaultCenter: [number, number] = [37.4221, -122.0841];

const normalizeLng = (lng: number) => {
  const normalized = ((lng + 180) % 360 + 360) % 360 - 180;
  return Number.isFinite(normalized) ? normalized : lng;
};

type BoundsInfo = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  center: [number, number];
};

function parseImageBounds(bounds: MapDTO["imageBounds"]): LatLngBoundsExpression | null {
  if (!bounds) return null;

  if (
    Array.isArray(bounds) &&
    bounds.length === 2 &&
    Array.isArray(bounds[0]) &&
    Array.isArray(bounds[1]) &&
    bounds[0].length >= 2 &&
    bounds[1].length >= 2
  ) {
    return [
      [Number(bounds[0][0]), Number(bounds[0][1])],
      [Number(bounds[1][0]), Number(bounds[1][1])],
    ];
  }

  const maybeObj = bounds as Record<string, any>;
  if (
    maybeObj?.southWest &&
    maybeObj?.northEast &&
    typeof maybeObj.southWest.lat === "number" &&
    typeof maybeObj.southWest.lng === "number" &&
    typeof maybeObj.northEast.lat === "number" &&
    typeof maybeObj.northEast.lng === "number"
  ) {
    return [
      [maybeObj.southWest.lat, maybeObj.southWest.lng],
      [maybeObj.northEast.lat, maybeObj.northEast.lng],
    ];
  }

  return null;
}

function buildBoundsExpression(bounds: BoundsInfo): LatLngBoundsExpression {
  return [
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng],
  ];
}

function distanceInKm(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c =
    2 *
    Math.atan2(
      Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng),
      Math.sqrt(1 - sinDLat * sinDLat - Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng),
    );
  return R * c;
}

function bearingDegrees(a: [number, number], b: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(toRad(b[0]));
  const x =
    Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) -
    Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(dLng);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function headingToText(heading: number) {
  if (heading >= 337.5 || heading < 22.5) return "north";
  if (heading < 67.5) return "northeast";
  if (heading < 112.5) return "east";
  if (heading < 157.5) return "southeast";
  if (heading < 202.5) return "south";
  if (heading < 247.5) return "southwest";
  if (heading < 292.5) return "west";
  return "northwest";
}

function FitMapBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 20 });
  }, [map, bounds]);

  return null;
}

export default function NavigatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destinationParam = searchParams.get("destination");
  const mapIdParam = searchParams.get("mapId");
  const routeIdParam = searchParams.get("routeId");
  const userNameParam = searchParams.get("user");
  const [maps, setMaps] = useState<MapDTO[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewportMode, setViewportMode] = useState<"combined" | "campus" | "user">("combined");
  const watchIdRef = useRef<number | null>(null);

  const [userIcon, setUserIcon] = useState<Icon | null>(null);
  const spokenWaypointsRef = useRef<Set<string>>(new Set());
  const leafletRef = useRef<typeof import("leaflet")>();

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      const L = await import("leaflet");
      leafletRef.current = L;

      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      setUserIcon(
        L.icon({
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconSize: [30, 48],
          iconAnchor: [15, 48],
          className: "user-location-marker",
        })
      );
    })();
  }, []);

  useEffect(() => {
    async function fetchMaps() {
      try {
        setLoading(true);
        const res = await fetch("/api/maps?include=full", { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch maps");
        }
        const body = await res.json();
        setMaps(body.data ?? []);
        const initialMapId = mapIdParam && body.data?.some((m: MapDTO) => m.id === mapIdParam)
          ? mapIdParam
          : body.data?.[0]?.id ?? null;
        setSelectedMapId(initialMapId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load maps");
      } finally {
        setLoading(false);
      }
    }

    fetchMaps();
  }, [mapIdParam]);

  const startGeolocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by this browser.");
      return;
    }
    setError(null);
    try {
      // Grab a one-time current position to force permission prompt and seed state
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
          setAccuracy(pos.coords.accuracy);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Please allow access and retry."
              : err.code === err.POSITION_UNAVAILABLE
                ? "Location unavailable. Try again with better signal."
                : "Unable to read GPS. Retry after a moment.";
          setError(message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
          setAccuracy(pos.coords.accuracy);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied. Please allow access and retry."
              : err.code === err.POSITION_UNAVAILABLE
                ? "Location unavailable. Try again with better signal."
                : "Unable to read GPS. Retry after a moment.";
          setError(message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
      );
      watchIdRef.current = watchId;
    } catch (geoErr) {
      setError("Unable to start geolocation. Please retry.");
    }
  }, []);

  useEffect(() => {
    startGeolocation();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [startGeolocation]);

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null;
  const buildCampusTourRoute = (map: MapDTO): RouteDTO | null => {
    if (!map.locationPins || map.locationPins.length < 2) return null;
    const pins = map.locationPins.slice();
    const mainGate =
      pins.find((p) => /gate/i.test(p.name)) ??
      pins.find((p) => /entrance|welcome/i.test(p.name)) ??
      pins[0];
    const rest = pins.filter((p) => p.id !== mainGate.id);
    const ordered = [mainGate, ...rest, mainGate];
    const waypoints: RouteWaypointDTO[] = ordered.map((p, idx) => ({
      id: `virtual-${idx}`,
      routeId: "virtual-campus-tour",
      order: idx,
      lat: p.lat,
      lng: p.lng,
      locationId: p.id,
      location: p,
      instruction:
        idx === 0
          ? "Start at the main gate."
          : idx === ordered.length - 1
            ? "Return to the main gate."
            : `Proceed to ${p.name}.`,
    }));

    return {
      id: "virtual-campus-tour",
      mapId: map.id,
      name: "Campus Tour",
      slug: "campus-tour",
      description: "Visit all locations and return to the main gate.",
      isDefault: false,
      estimatedMinutes: Math.max(10, ordered.length * 3),
      startLocationId: mainGate.id,
      endLocationId: mainGate.id,
      startLocation: mainGate,
      endLocation: mainGate,
      instructions: "Follow the highlighted path through all locations.",
      metadata: { virtual: true },
      waypoints,
      createdAt: "",
      updatedAt: "",
    };
  };

  const activeRoute: RouteDTO | undefined = useMemo(() => {
    if (!selectedMap) return undefined;
    spokenWaypointsRef.current.clear();

    const tourRoute = selectedMap.routes.find((r) => /tour/i.test(r.name));
    const wantsTour = destinationParam && /tour/i.test(destinationParam);
    if (wantsTour) {
      return (
        tourRoute ??
        buildCampusTourRoute(selectedMap) ??
        selectedMap.routes
          .slice()
          .sort((a, b) => (b.waypoints?.length ?? 0) - (a.waypoints?.length ?? 0))[0] ??
        selectedMap.routes[0]
      );
    }

    if (routeIdParam) {
      const byId = selectedMap.routes.find((route) => route.id === routeIdParam);
      if (byId) return byId;
    }

    // If a destination is provided via URL, try to find a matching route
    if (destinationParam) {
      const target = destinationParam.toLowerCase();
      const matchingRoute = selectedMap.routes.find(
        (route) =>
          route.endLocation?.name.toLowerCase().includes(target) ||
          route.name.toLowerCase().includes(target)
      );
      if (matchingRoute) return matchingRoute;
    }

    // Prefer an explicit tour route when no destination is specified
    if (!destinationParam && tourRoute) return tourRoute;

    return selectedMap.routes.find((route) => route.isDefault) ?? selectedMap.routes[0];
  }, [selectedMap, destinationParam, routeIdParam]);

  const guidanceSteps = useMemo(() => {
    if (!activeRoute || !activeRoute.waypoints?.length) return [];
    const sorted = activeRoute.waypoints.slice().sort((a, b) => a.order - b.order);
    const steps: string[] = [];
    let prevBearing: number | null = null;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const distMeters = distanceInKm([prev.lat, prev.lng], [curr.lat, curr.lng]) * 1000;
      const bearing = bearingDegrees([prev.lat, prev.lng], [curr.lat, curr.lng]);
      const dir = headingToText(bearing);
      const target = curr.location?.name ?? `waypoint ${i + 1}`;

      let turnText = "";
      if (prevBearing !== null) {
        const delta = ((bearing - prevBearing + 540) % 360) - 180; // normalize to [-180,180]
        if (Math.abs(delta) > 25) {
          turnText = delta > 0 ? " then turn right" : " then turn left";
        }
      }

      steps.push(`Go ${formatMeters(distMeters)} ${dir} to ${target}${turnText}.`);
      prevBearing = bearing;
    }

    const finalName = activeRoute.endLocation?.name ?? sorted[sorted.length - 1]?.location?.name;
    if (finalName) {
      steps.push(`Arrive at ${finalName}.`);
    }
    return steps;
  }, [activeRoute]);

  const routePolyline: LatLngExpression[] | undefined = activeRoute
    ? activeRoute.waypoints
      .slice()
      .sort((a, b) => a.order - b.order)
        .map((waypoint) => [waypoint.lat, normalizeLng(waypoint.lng)])
    : undefined;

  useEffect(() => {
    if (!userPosition || !activeRoute || !routePolyline || routePolyline.length === 0) return;

    const sortedWaypoints = activeRoute.waypoints.slice().sort((a, b) => a.order - b.order);
    const thresholdMeters = 35;

    const metersBetween = (a: [number, number], b: [number, number]) => distanceInKm(a, b) * 1000;

    let closestIdx = -1;
    let closestDist = Infinity;
    sortedWaypoints.forEach((wp, idx) => {
      const dist = metersBetween(userPosition, [wp.lat, wp.lng]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });

    if (closestIdx === -1 || closestDist > thresholdMeters) return;

    const wp = sortedWaypoints[closestIdx];
    const key = wp.id ?? `idx-${closestIdx}`;
    if (spokenWaypointsRef.current.has(key)) return;
    spokenWaypointsRef.current.add(key);

    const isFinal = closestIdx === sortedWaypoints.length - 1;
    if (wp.location) setArrivalPin(wp.location);
    const line = isFinal
      ? `You have arrived at ${activeRoute.endLocation?.name ?? "your destination"}.`
      : wp.location?.audioText ??
        wp.instruction ??
        `Approaching ${wp.location?.name ?? `waypoint ${closestIdx + 1}`}. Keep following the path.`;
    speak(line);
  }, [userPosition, activeRoute, routePolyline]);

  const center: [number, number] = selectedMap?.locationPins?.[0]
    ? [selectedMap.locationPins[0].lat, selectedMap.locationPins[0].lng]
    : defaultCenter;

  // Speak route summary once per route selection, even if user is off campus
  const hasSpokenRouteRef = useRef<string | null>(null);
  const [arrivalPin, setArrivalPin] = useState<LocationPinDTO | null>(null);
  useEffect(() => {
    if (!activeRoute) return;
    const key = `${activeRoute.id}-${destinationParam ?? ""}`;
    if (hasSpokenRouteRef.current === key) return;
    hasSpokenRouteRef.current = key;

    const startName = activeRoute.startLocation?.name ?? "start";
    const endName = activeRoute.endLocation?.name ?? "your destination";
    const summary = `Starting guidance from ${startName} to ${endName}. Follow the highlighted path.`;
    speak(summary);
  }, [activeRoute, destinationParam]);

  const campusBounds = useMemo<BoundsInfo | null>(() => {
    if (!selectedMap?.locationPins.length) return null;
    const lats = selectedMap.locationPins.map((pin) => pin.lat);
    const lngs = selectedMap.locationPins.map((pin) => normalizeLng(pin.lng));
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as [number, number],
    };
  }, [selectedMap]);

  const userWithinCampus = useMemo(() => {
    if (!userPosition || !campusBounds) return false;
    const [lat, lngRaw] = userPosition;
    const lng = normalizeLng(lngRaw);
    const padding = 0.01;
    return (
      lat >= campusBounds.minLat - padding &&
      lat <= campusBounds.maxLat + padding &&
      lng >= campusBounds.minLng - padding &&
      lng <= campusBounds.maxLng + padding
    );
  }, [userPosition, campusBounds]);

  const distanceFromCampus = useMemo(() => {
    if (!userPosition || !campusBounds) return null;
    const normalizedUser: [number, number] = [userPosition[0], normalizeLng(userPosition[1])];
    return distanceInKm(normalizedUser, campusBounds.center);
  }, [userPosition, campusBounds]);

  const campusBoundsExpression = useMemo<LatLngBoundsExpression | null>(() => {
    if (!campusBounds) return null;
    return buildBoundsExpression(campusBounds);
  }, [campusBounds]);

  const fitBounds = useMemo<LatLngBoundsExpression | null>(() => {
    const userBounds: LatLngBoundsExpression | null = userPosition
      ? ([
          [userPosition[0], normalizeLng(userPosition[1])],
          [userPosition[0], normalizeLng(userPosition[1])],
        ] as LatLngBoundsExpression)
      : null;

    if (viewportMode === "user") {
      return userBounds ?? campusBoundsExpression;
    }

    if (viewportMode === "campus") {
      return campusBoundsExpression ?? userBounds;
    }

    if (viewportMode === "combined") {
      if (campusBounds && userPosition) {
        const normalizedUserLng = normalizeLng(userPosition[1]);
        return [
          [Math.min(campusBounds.minLat, userPosition[0]), Math.min(campusBounds.minLng, normalizedUserLng)],
          [Math.max(campusBounds.maxLat, userPosition[0]), Math.max(campusBounds.maxLng, normalizedUserLng)],
        ];
      }
      return campusBoundsExpression ?? userBounds;
    }

    return campusBoundsExpression;
  }, [viewportMode, campusBoundsExpression, campusBounds, userPosition]);

  const locationStatusLabel = userPosition ? (userWithinCampus ? "Live guidance" : "Off campus") : "Awaiting GPS";
  const handleRetryGps = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    startGeolocation();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row lg:py-12">
        <div className="w-full space-y-6 lg:w-2/3">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Navigate live</p>
              <h1 className="text-3xl font-semibold">Interactive campus guidance</h1>
            </div>
            <div className="ml-auto flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
              <Navigation className="h-4 w-4 text-brand-300" />
              <span>{userPosition ? "Tracking your location" : "Waiting for GPS"}</span>
              {!userPosition && (
                <button onClick={handleRetryGps} className="text-xs text-brand-200 underline hover:text-brand-100">
                  Retry
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/50">
              <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
              <p className="mt-4 text-sm text-slate-300">Loading map data…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              <span>{error}</span>
              <button
                onClick={handleRetryGps}
                className="rounded-full border border-red-200/60 px-3 py-1 text-xs font-semibold text-red-50 hover:bg-red-200/10"
              >
                Retry GPS
              </button>
            </div>
          )}

          {!loading && selectedMap && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-slate-300">Map context</label>
                <select
                  value={selectedMapId ?? ""}
                  onChange={(event) => setSelectedMapId(event.target.value)}
                  className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-white focus:outline-none"
                >
                  {maps.map((map) => (
                    <option key={map.id} value={map.id} className="bg-slate-900 text-white">
                      {map.name}
                    </option>
                  ))}
                </select>
                <span className="rounded-full border border-white/10 px-4 py-1 text-xs text-slate-300">
                  {selectedMap.locationPins.length} pins · {selectedMap.routes.length} routes
                </span>
                <span className="rounded-full border border-white/10 px-4 py-1 text-xs text-slate-300">
                  {selectedMap.locationPins.length} pins · {selectedMap.routes.length} routes
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span className="uppercase tracking-[0.2em]">Viewport</span>
                <div className="flex rounded-full border border-white/10 bg-slate-900/60 p-1 text-white">
                  {[
                    { value: "combined", label: "Pins + Me" },
                    { value: "campus", label: "Campus" },
                    { value: "user", label: "Me" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.value === "user" && !userPosition}
                      onClick={() => setViewportMode(option.value as typeof viewportMode)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        viewportMode === option.value ? "bg-brand-500 text-white" : "text-slate-300"
                      } ${!userPosition && option.value === "user" ? "opacity-40" : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60">
                <MapContainer
                  center={center}
                  zoom={18}
                  className="h-[520px] w-full"
                  scrollWheelZoom
                  worldCopyJump
                  maxBounds={[
                    [-90, -180],
                    [90, 180],
                  ]}
                  maxBoundsViscosity={1}
                  key={`${selectedMap.id}-${viewportMode}`}
                >
                  {fitBounds && <FitMapBounds bounds={fitBounds} />}
                  {selectedMap.baseMapType === "IMAGE_OVERLAY" &&
                  selectedMap.imageOverlayUrl &&
                  selectedMap.imageBounds &&
                  parseImageBounds(selectedMap.imageBounds) ? (
                    <ImageOverlay
                      url={selectedMap.imageOverlayUrl}
                      bounds={parseImageBounds(selectedMap.imageBounds)!}
                      opacity={1}
                    />
                  ) : (
                    <TileLayer
                      url={selectedMap.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                      attribution={selectedMap.tileAttribution ?? "© OpenStreetMap"}
                      noWrap={false}
                    />
                  )}
                  {routePolyline && (
                    <Polyline
                      positions={routePolyline}
                      color="#38bdf8"
                      weight={5}
                      opacity={0.8}
                      dashArray="10, 15"
                    />
                  )}
                  {userPosition && userWithinCampus && routePolyline && routePolyline.length > 0 && (
                    <Polyline
                      positions={[userPosition, routePolyline[0]]}
                      color="#94a3b8"
                      weight={3}
                      opacity={0.6}
                      dashArray="5, 10"
                    />
                  )}
                  {selectedMap.locationPins.map((pin) => (
                    <Marker
                      key={pin.id}
                      position={[pin.lat, pin.lng]}
                      eventHandlers={{
                        click: () => speak(pin.audioText ?? pin.description ?? `You selected ${pin.name}.`),
                      }}
                    >
                      <Popup>
                        <div className="space-y-2 text-slate-800">
                          <p className="font-semibold">{pin.name}</p>
                          {pin.imageUrl && (
                            <img
                              src={pin.imageUrl}
                              alt={pin.name}
                              className="h-28 w-full rounded-lg object-cover"
                            />
                          )}
                          {pin.description && <p className="text-sm">{pin.description}</p>}
                          <button
                            onClick={() => speak(pin.audioText ?? pin.description ?? `You selected ${pin.name}.`)}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-500"
                          >
                            <Volume2 className="h-3 w-3" /> Play audio
                          </button>
                          <button
                            onClick={() => router.push(`/navigate?destination=${encodeURIComponent(pin.name)}`)}
                            className="mt-2 w-full rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-400"
                          >
                            Navigate Here
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {userPosition && (
                    <>
                      <Marker position={[userPosition[0], normalizeLng(userPosition[1])]} icon={userIcon ?? undefined}>
                        <Popup>You are here (~{Math.round(accuracy)}m)</Popup>
                      </Marker>
                      {userWithinCampus && (
                        <Circle
                          center={[userPosition[0], normalizeLng(userPosition[1])]}
                          radius={accuracy}
                          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1 }}
                        />
                      )}
                    </>
                  )}
                </MapContainer>
              </div>
            </div >
          )
          }
        </div >

        <aside className="w-full space-y-6 lg:w-1/3">
          {arrivalPin && (
            <div className="rounded-3xl border border-brand-400/40 bg-brand-400/10 p-4 text-sm text-white shadow-lg">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Arrived: {arrivalPin.name}</p>
                <button
                  onClick={() => setArrivalPin(null)}
                  className="text-xs text-brand-100 hover:text-white"
                >
                  Close
                </button>
              </div>
              {arrivalPin.imageUrl && (
                <img
                  src={arrivalPin.imageUrl}
                  alt={arrivalPin.name}
                  className="mt-3 h-36 w-full rounded-2xl object-cover"
                />
              )}
              {arrivalPin.description && <p className="mt-2 text-slate-100">{arrivalPin.description}</p>}
            </div>
          )}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5 text-brand-300" />
              <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Voice Assistant</p>
            </div>
            <p className="mt-4 text-xl font-semibold text-white">Aurora is listening</p>
            <p className="text-sm text-slate-300">
              Ask for any building, landmark, or admin-defined route. Gemini handles transcription; Web Speech covers
              fallback devices.
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-200">
              <p className="rounded-2xl border border-white/10 bg-white/5 p-3">
                “Hi Aurora, guide me to the Knowledge Library.”
              </p>
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5/50 p-3 text-slate-400">
                Aurora · "Sure! Starting the Welcome Center ➜ Library route. I’ll let you know when you need to turn."
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-200">
              <div>
                <span>Status · {locationStatusLabel}</span>
                {userPosition && distanceFromCampus && !userWithinCampus && (
                  <p className="text-xs text-slate-400">
                    ~{distanceFromCampus.toFixed(1)} km from campus. Use “Pins + Me” view to see both.
                  </p>
                )}
              </div>
              <div className="h-10 w-10 rounded-full border border-brand-400/40 bg-brand-400/20 p-2 text-brand-200">
                <Mic className="h-full w-full" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
            <div className="flex items-center gap-3">
              <Map className="h-5 w-5 text-brand-300" />
              <p className="text-sm uppercase tracking-[0.3em] text-brand-200">Route overview</p>
            </div>
            {activeRoute ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Current route</p>
                  <p className="text-xl font-semibold text-white">{activeRoute.name}</p>
                </div>
                <div className="grid gap-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-3">
                    <PinIcon className="h-4 w-4 text-brand-300" />
                    <div>
                      <p className="text-xs uppercase text-slate-500">Starts at</p>
                      <p className="text-base text-white">{activeRoute.startLocation?.name ?? "Welcome Center"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-3">
                    <Compass className="h-4 w-4 text-brand-300" />
                    <div>
                      <p className="text-xs uppercase text-slate-500">Destination</p>
                      <p className="text-base text-white">{activeRoute.endLocation?.name ?? "Destination"}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Guidance</p>
                  {guidanceSteps.length > 0 ? (
                    <ul className="mt-2 space-y-2">
                      {guidanceSteps.map((step, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-brand-300 font-semibold">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{activeRoute.instructions ?? "Follow the pathway highlighted on the map."}</p>
                  )}
                  <p className="mt-3 text-xs text-slate-500">
                    {activeRoute.estimatedMinutes ? `${activeRoute.estimatedMinutes} min` : "Approx."} · {formatMeters(320)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No routes available for this map. Please add one in the admin console.</p>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.3em] text-brand-200">Quick tips</p>
            <ul className="mt-4 space-y-3 list-disc pl-5">
              <li>Tap any pin on the map to hear its description.</li>
              <li>Switch maps using the dropdown to explore other campuses or floors.</li>
              <li>Grant microphone access so Aurora can listen for new intents.</li>
            </ul>
          </div>
        </aside>
      </div >
    </div >
  );
}
