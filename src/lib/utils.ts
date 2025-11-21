import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMeters(distance: number) {
  if (distance < 1000) {
    return `${distance.toFixed(0)} m`;
  }
  return `${(distance / 1000).toFixed(2)} km`;
}
