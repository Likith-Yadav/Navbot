"use client";

import { useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";

interface LeafletMapEventsProps {
    onClick: (e: LeafletMouseEvent) => void;
}

export default function LeafletMapEvents({ onClick }: LeafletMapEventsProps) {
    useMapEvents({
        click: onClick,
    });
    return null;
}
