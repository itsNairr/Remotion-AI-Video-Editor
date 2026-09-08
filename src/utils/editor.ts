import { Cut, TextOverlay, Zoom } from '@/types/editor';

/**
 * Checks if the current playback time falls inside any cut dead air/segment
 */
export function isTimeInsideCut(currentTime: number, cuts: Cut[]): boolean {
  return cuts.some((cut) => currentTime >= cut.startSec && currentTime < cut.endSec);
}

/**
 * Finds the cut segment if current time is inside one
 */
export function getActiveCut(currentTime: number, cuts: Cut[]): Cut | undefined {
  return cuts.find((cut) => currentTime >= cut.startSec && currentTime < cut.endSec);
}

/**
 * Returns all overlays active at the given timestamp
 */
export function getActiveOverlays(currentTime: number, overlays: TextOverlay[]): TextOverlay[] {
  return overlays.filter(
    (overlay) => currentTime >= overlay.startSec && currentTime <= overlay.endSec
  );
}

/**
 * Returns the currently active camera zoom, if any
 */
export function getActiveZoom(currentTime: number, zooms: Zoom[]): Zoom | null {
  const active = zooms.find((z) => currentTime >= z.startSec && currentTime <= z.endSec);
  return active || null;
}

/**
 * Calculates net video duration after subtracting cuts
 */
export function calculateEffectiveDuration(duration: number, cuts: Cut[]): number {
  const totalCutDuration = cuts.reduce((acc, c) => acc + (c.endSec - c.startSec), 0);
  return Math.max(0, duration - totalCutDuration);
}

/**
 * Clamps a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// -------------------------------------------------------------
// Reusable Generic Collection Helpers for Timeline Operations
// -------------------------------------------------------------

/**
 * Adds an item to a sorted track collection.
 */
export function addTrackItem<T extends { id: string; startSec: number }>(items: T[], item: T): T[] {
  return [...items, item].sort((a, b) => a.startSec - b.startSec);
}

/**
 * Updates an item by ID within a track collection.
 */
export function updateTrackItem<T extends { id: string; startSec?: number }>(
  items: T[],
  id: string,
  patch: Partial<T>
): T[] {
  return items
    .map((item) => (item.id === id ? { ...item, ...patch } : item))
    .sort((a, b) => (a.startSec ?? 0) - (b.startSec ?? 0));
}

/**
 * Removes an item by ID from a track collection.
 */
export function removeTrackItem<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

/**
 * Nudges either the start or end timecode edge of a track item, clamping within video bounds.
 */
export function nudgeTrackItem<T extends { id: string; startSec: number; endSec: number }>(
  items: T[],
  id: string,
  deltaSec: number,
  edge: 'start' | 'end',
  maxDuration: number
): T[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (edge === 'start') {
      const nextStart = clamp(item.startSec + deltaSec, 0, item.endSec - 0.1);
      return { ...item, startSec: Number(nextStart.toFixed(2)) };
    } else {
      const nextEnd = clamp(item.endSec + deltaSec, item.startSec + 0.1, maxDuration);
      return { ...item, endSec: Number(nextEnd.toFixed(2)) };
    }
  });
}
