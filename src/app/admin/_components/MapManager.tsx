"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { createMap, deleteMap } from "@/app/actions/admin";
import type { MapDTO } from "@/types/maps";

interface MapManagerProps {
    maps: MapDTO[];
}

export function MapManager({ maps }: MapManagerProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [tileUrl, setTileUrl] = useState("");

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await createMap({
                name,
                slug,
                tileUrl: tileUrl || undefined,
                baseMapType: "TILE",
            });
            if (res.success) {
                setIsCreating(false);
                setName("");
                setSlug("");
                setTileUrl("");
                router.refresh();
            } else {
                alert(res.error);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure? This will delete all pins and routes associated with this map.")) return;
        setLoading(true);
        try {
            await deleteMap(id);
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Maps</h2>
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-400"
                >
                    <Plus className="h-4 w-4" />
                    New Map
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Name</label>
                            <input
                                required
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                                }}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                                placeholder="e.g. Main Campus"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-slate-400">Slug</label>
                            <input
                                required
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                                placeholder="e.g. main-campus"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-slate-400">Tile URL (Optional)</label>
                            <input
                                value={tileUrl}
                                onChange={(e) => setTileUrl(e.target.value)}
                                className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-2 text-white focus:border-brand-500 focus:outline-none"
                                placeholder="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <p className="text-xs text-slate-500">Leave empty for default OpenStreetMap.</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2 text-sm font-medium text-white hover:bg-brand-400 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Map
                        </button>
                    </div>
                </form>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {maps.map((map) => (
                    <div key={map.id} className="relative rounded-2xl border border-white/10 bg-slate-900/50 p-6 transition hover:bg-slate-900/80">
                        <div className="absolute right-4 top-4">
                            <button
                                onClick={() => handleDelete(map.id)}
                                disabled={loading}
                                className="rounded-full p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <h3 className="font-semibold text-white">{map.name}</h3>
                        <p className="text-sm text-slate-400">{map.slug}</p>
                        <div className="mt-4 flex gap-4 text-xs text-slate-500">
                            <span>{map.locationPins.length} pins</span>
                            <span>{map.routes.length} routes</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
