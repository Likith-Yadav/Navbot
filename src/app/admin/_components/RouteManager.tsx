"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, Map as MapIcon, Trash2, Plus } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { createRoute, deleteRoute } from "@/app/actions/admin";
import type { MapDTO } from "@/types/maps";

// Dynamic imports
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false });
const LeafletMapEvents = dynamic(() => import("@/components/LeafletMapEvents"), { ssr: false });

const userIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface RouteManagerProps {
    maps: MapDTO[];
}

export function RouteManager({ maps }: RouteManagerProps) {
    const router = useRouter();
    const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id ?? "");
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // New Route State
    const [name, setName] = useState("");
    const [startId, setStartId] = useState("");
    const [endId, setEndId] = useState("");
    const [waypoints, setWaypoints] = useState<{ lat: number; lng: number; order: number }[]>([]);

    const selectedMap = maps.find((m) => m.id === selectedMapId);

    if (!selectedMap) return <div className="text-slate-400">Please create a map first.</div>;

    const center: [number, number] = selectedMap.locationPins[0]
        ? [selectedMap.locationPins[0].lat, selectedMap.locationPins[0].lng]
        : [37.4221, -122.0841];

    function handleMapClick(e: L.LeafletMouseEvent) {
        if (!isCreating) return;
        setWaypoints([...waypoints, { lat: e.latlng.lat, lng: e.latlng.lng, order: waypoints.length }]);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createRoute({
                mapId: selectedMap!.id,
                name,
                slug: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4),
                startLocationId: startId,
                endLocationId: endId,
                waypoints: waypoints.map((wp, idx) => ({ ...wp, order: idx })),
                isDefault: false,
            });

            if (res.success) {
                setIsCreating(false);
                setName("");
                setStartId("");
                setEndId("");
                setWaypoints([]);
                router.refresh();
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this route?")) return;
        setLoading(true);
        try {
            await deleteRoute(id);
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <select
                        value={selectedMapId}
                        onChange={(e) => setSelectedMapId(e.target.value)}
                        className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-white focus:outline-none"
                    >
                        {maps.map((map) => (
                            <option key={map.id} value={map.id}>
                                {map.name}
                            </option>
                        ))}
                    </select>
                    {!isCreating && (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400"
                        >
                            <Plus className="h-4 w-4" />
                            New Route
                        </button>
                    )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 h-[500px] relative">
                    {/* @ts-ignore */}
                    <MapContainer center={center} zoom={18} className="h-full w-full">
                        {/* @ts-ignore */}
                        <TileLayer
                            url={selectedMap.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                            attribution={selectedMap.tileAttribution ?? "© OpenStreetMap"}
                        />
                        {/* @ts-ignore */}
                        <LeafletMapEvents onClick={handleMapClick} />

                        {/* Existing Pins */}
                        {selectedMap.locationPins.map((pin) => (
                            // @ts-ignore
                            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={userIcon} opacity={0.5} />
                        ))}

                        {/* Current Route Waypoints */}
                        {waypoints.length > 0 && (
                            // @ts-ignore
                            <Polyline
                                positions={waypoints.map((wp) => [wp.lat, wp.lng])}
                                color="#38bdf8"
                                weight={4}
                                dashArray="10, 10"
                            />
                        )}
                        {waypoints.map((wp, idx) => (
                            // @ts-ignore
                            <Marker key={idx} position={[wp.lat, wp.lng]} icon={userIcon} opacity={0.8} />
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div className="space-y-6">
                {isCreating ? (
                    <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
                        <h3 className="font-semibold">Create Route</h3>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Route Name</label>
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                placeholder="e.g. Main Entrance to Library"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Start Location</label>
                            <select
                                required
                                value={startId}
                                onChange={(e) => setStartId(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                            >
                                <option value="">Select Start...</option>
                                {selectedMap.locationPins.map((pin) => (
                                    <option key={pin.id} value={pin.id}>
                                        {pin.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">End Location</label>
                            <select
                                required
                                value={endId}
                                onChange={(e) => setEndId(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                            >
                                <option value="">Select Destination...</option>
                                {selectedMap.locationPins.map((pin) => (
                                    <option key={pin.id} value={pin.id}>
                                        {pin.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="rounded-lg bg-slate-950 p-4 text-xs text-slate-400">
                            <p>Click on the map to add waypoints for the path.</p>
                            <p className="mt-1 text-brand-300">{waypoints.length} waypoints added</p>
                            <div className="mt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setWaypoints((prev) => prev.slice(0, -1))}
                                    className="text-slate-400 hover:text-white hover:underline"
                                    disabled={waypoints.length === 0}
                                >
                                    Undo Last
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWaypoints([])}
                                    className="text-red-400 hover:underline"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="flex-1 px-4 py-2 text-sm text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || waypoints.length < 2}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save Route
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                        <h3 className="mb-4 font-semibold">Existing Routes ({selectedMap.routes.length})</h3>
                        <div className="space-y-3">
                            {selectedMap.routes.map((route) => (
                                <div key={route.id} className="rounded-lg bg-slate-950 p-3 text-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-white">{route.name}</span>
                                        <button
                                            onClick={() => handleDelete(route.id)}
                                            className="text-slate-500 hover:text-red-400"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{route.startLocation?.name}</span>
                                        <span>→</span>
                                        <span>{route.endLocation?.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
