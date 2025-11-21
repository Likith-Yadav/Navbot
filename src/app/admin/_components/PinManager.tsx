"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Trash2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { createPin, deletePin, updatePin } from "@/app/actions/admin";
import type { MapDTO } from "@/types/maps";

// Dynamic imports for Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });
const LeafletMapEvents = dynamic(() => import("@/components/LeafletMapEvents"), { ssr: false });

const userIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface PinManagerProps {
    maps: MapDTO[];
}

export function PinManager({ maps }: PinManagerProps) {
    const router = useRouter();
    const [selectedMapId, setSelectedMapId] = useState<string>(maps[0]?.id ?? "");
    const [loading, setLoading] = useState(false);

    // New/Edit Pin State
    const [newPinPos, setNewPinPos] = useState<{ lat: number; lng: number } | null>(null);
    const [editingPinId, setEditingPinId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [audioText, setAudioText] = useState("");
    const [videoUrl, setVideoUrl] = useState("");

    const selectedMap = maps.find((m) => m.id === selectedMapId);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedMap || (!newPinPos && !editingPinId)) return;

        setLoading(true);
        try {
            const payload = {
                mapId: selectedMap.id,
                name,
                slug: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString().slice(-4),
                description,
                lat: newPinPos?.lat ?? selectedMap.locationPins.find((p) => p.id === editingPinId)?.lat ?? 0,
                lng: newPinPos?.lng ?? selectedMap.locationPins.find((p) => p.id === editingPinId)?.lng ?? 0,
                imageUrl: imageUrl || undefined,
                audioText: audioText || undefined,
                videoUrl: videoUrl || undefined,
            };

            const res = editingPinId
                ? await updatePin(editingPinId, {
                    name,
                    description,
                    imageUrl: imageUrl || undefined,
                    audioText: audioText || undefined,
                    videoUrl: videoUrl || undefined,
                    lat: payload.lat,
                    lng: payload.lng,
                })
                : await createPin(payload);

            if (res.success) {
                setNewPinPos(null);
                setName("");
                setDescription("");
                setImageUrl("");
                setAudioText("");
                setVideoUrl("");
                setEditingPinId(null);
                router.refresh();
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this pin?")) return;
        setLoading(true);
        try {
            await deletePin(id);
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    if (!selectedMap) {
        return <div className="text-slate-400">Please create a map first.</div>;
    }

    const center: [number, number] = selectedMap.locationPins[0]
        ? [selectedMap.locationPins[0].lat, selectedMap.locationPins[0].lng]
        : [37.4221, -122.0841];

    return (
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-4">
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
                    <span className="text-sm text-slate-400">Click map to place a pin</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50 h-[500px] relative">
                    {/* @ts-ignore - Dynamic import types issue */}
                    <MapContainer center={center} zoom={18} className="h-full w-full">
                        {/* @ts-ignore */}
                        <TileLayer
                            url={selectedMap.tileUrl ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                            attribution={selectedMap.tileAttribution ?? "© OpenStreetMap"}
                        />
                        {/* @ts-ignore */}
                        <LeafletMapEvents onClick={(e) => setNewPinPos(e.latlng)} />

                        {selectedMap.locationPins.map((pin) => (
                            // @ts-ignore
                            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={userIcon}>
                                {/* @ts-ignore */}
                                <Popup>
                                    <div className="text-slate-800">
                                        <p className="font-bold">{pin.name}</p>
                                        <button
                                            onClick={() => handleDelete(pin.id)}
                                            className="mt-2 text-xs text-red-500 hover:underline"
                                        >
                                            Delete Pin
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {newPinPos && (
                            // @ts-ignore
                            <Marker position={[newPinPos.lat, newPinPos.lng]} icon={userIcon} opacity={0.6} />
                        )}
                    </MapContainer>
                </div>
            </div>

            <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                    <h3 className="mb-4 font-semibold">
                        {editingPinId ? "Edit Pin" : newPinPos ? "Add New Pin" : "Select location on map"}
                    </h3>

                    {newPinPos || editingPinId ? (
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Name</label>
                                <input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                    placeholder="e.g. Cafeteria"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                    placeholder="Optional details..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Image URL</label>
                                <input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Audio text (for TTS)</label>
                                <textarea
                                    value={audioText}
                                    onChange={(e) => setAudioText(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                    placeholder="What should be spoken at this pin?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-slate-400">Video URL</label>
                                <input
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:outline-none"
                                    placeholder="https://example.com/video.mp4"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50"
                                >
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingPinId ? "Update Pin" : "Save Pin"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewPinPos(null);
                                        setEditingPinId(null);
                                        setName("");
                                        setDescription("");
                                        setImageUrl("");
                                        setAudioText("");
                                        setVideoUrl("");
                                    }}
                                    className="mt-2 w-full text-sm text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <MapPin className="mb-2 h-8 w-8 opacity-50" />
                            <p className="text-sm">Click anywhere on the map to start adding a pin.</p>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
                    <h3 className="mb-4 font-semibold">Existing Pins ({selectedMap.locationPins.length})</h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                        {selectedMap.locationPins.map((pin) => (
                            <div key={pin.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 p-3 text-sm">
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{pin.name}</span>
                                    {pin.imageUrl && (
                                        <span className="text-xs text-slate-500 truncate max-w-[160px]">{pin.imageUrl}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            setEditingPinId(pin.id);
                                            setNewPinPos(null);
                                            setName(pin.name);
                                            setDescription(pin.description ?? "");
                                            setImageUrl(pin.imageUrl ?? "");
                                            setAudioText(pin.audioText ?? "");
                                            setVideoUrl(pin.videoUrl ?? "");
                                        }}
                                        className="text-slate-400 hover:text-brand-300"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pin.id)}
                                        className="text-slate-500 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
