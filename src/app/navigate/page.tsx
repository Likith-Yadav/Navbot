"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Compass, Loader2, Map, Mic, Navigation, PinIcon } from "lucide-react";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { formatMeters } from "@/lib/utils";
import type { MapDTO, RouteDTO } from "@/types/maps";

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

const defaultCenter: [number, number] = [37.4221, -122.0841];

const userIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function NavigatePage() {
  const searchParams = useSearchParams();
  const destinationParam = searchParams.get("destination");
  const [maps, setMaps] = useState<MapDTO[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setSelectedMapId(body.data?.[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load maps");
      } finally {
        setLoading(false);
      }
    }

    fetchMaps();
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setError((prev) => prev ?? "Geolocation unavailable. Some guidance features may be limited.");
      },
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? null;
  const activeRoute: RouteDTO | undefined = useMemo(() => {
    if (!selectedMap) return undefined;

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

    return selectedMap.routes.find((route) => route.isDefault) ?? selectedMap.routes[0];
  }, [selectedMap, destinationParam]);

  const routePolyline: LatLngExpression[] | undefined = activeRoute
    ? activeRoute.waypoints
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((waypoint) => [waypoint.lat, waypoint.lng])
    : undefined;

  const center: [number, number] = selectedMap?.locationPins?.[0]
    ? [selectedMap.locationPins[0].lat, selectedMap.locationPins[0].lng]
    : defaultCenter;

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
            </div>
          </div>

          {loading && (
            <div className="flex min-h-[500px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-slate-900/50">
              <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
              <p className="mt-4 text-sm text-slate-300">Loading map data…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              {error}
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
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60">
                <MapContainer center={center} zoom={18} className="h-[520px] w-full" scrollWheelZoom>
                  <TileLayer
                    url={selectedMap.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                    attribution={selectedMap.tileAttribution ?? "© OpenStreetMap"}
                  />
                  {routePolyline && (
                    <Polyline
                      positions={routePolyline}
                      color="#38bdf8"
                      weight={5}
                      opacity={0.8}
                      dashArray="10, 15"
                    />
                  )}
                  {userPosition && routePolyline && routePolyline.length > 0 && (
                    <Polyline
                      positions={[userPosition, routePolyline[0]]}
                      color="#94a3b8"
                      weight={3}
                      opacity={0.6}
                      dashArray="5, 10"
                    />
                  )}
                  {selectedMap.locationPins.map((pin) => (
                    <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={userIcon}>
                      <Popup>
                        <div className="space-y-1 text-slate-800">
                          <p className="font-semibold">{pin.name}</p>
                          {pin.description && <p className="text-sm">{pin.description}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {userPosition && (
                    <Marker position={userPosition} icon={userIcon}>
                      <Popup>You are here</Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            </div >
          )
          }
        </div >

        <aside className="w-full space-y-6 lg:w-1/3">
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
              <span>Status · {userPosition ? "Live guidance" : "Awaiting GPS"}</span>
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
                  <p>{activeRoute.instructions ?? "Follow the pathway highlighted on the map."}</p>
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
