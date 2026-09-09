import { Cut, TextOverlay, VideoClip, Zoom } from '@/types/editor';

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

/**
 * Splits a video clip at a specified timecode into two separate sequential clips.
 * Preserves the source file inPointSec offsets accurately so video plays continuously.
 */
export function splitClipAtTime(
  clips: VideoClip[],
  splitTimeSec: number,
  targetTrackIndex?: number
): { clips: VideoClip[]; splitSuccess: boolean; splitClipId?: string } {
  const targetIndex = clips.findIndex((c) => {
    const matchesTrack = targetTrackIndex === undefined || (c.trackIndex || 0) === targetTrackIndex;
    return matchesTrack && splitTimeSec > c.startSec + 0.05 && splitTimeSec < c.endSec - 0.05;
  });

  if (targetIndex === -1) {
    return { clips, splitSuccess: false };
  }

  const target = clips[targetIndex];
  const offsetFromClipStart = splitTimeSec - target.startSec;
  const currentInPoint = target.inPointSec || 0;

  const baseName = target.name.replace(/\s*\((Part \d+|Split \d+)\)$/i, '');

  const part1: VideoClip = {
    ...target,
    id: `clip_${Date.now()}_a`,
    name: `${baseName} (Part 1)`,
    startSec: Number(target.startSec.toFixed(2)),
    endSec: Number(splitTimeSec.toFixed(2)),
    clipDurationSec: target.clipDurationSec,
    inPointSec: Number(currentInPoint.toFixed(2)),
    trackIndex: target.trackIndex || 0,
  };

  const part2: VideoClip = {
    ...target,
    id: `clip_${Date.now()}_b`,
    name: `${baseName} (Part 2)`,
    startSec: Number(splitTimeSec.toFixed(2)),
    endSec: Number(target.endSec.toFixed(2)),
    clipDurationSec: target.clipDurationSec,
    inPointSec: Number((currentInPoint + offsetFromClipStart).toFixed(2)),
    trackIndex: target.trackIndex || 0,
  };

  const updatedClips = [...clips];
  updatedClips.splice(targetIndex, 1, part1, part2);

  return {
    clips: updatedClips.sort((a, b) => a.startSec - b.startSec),
    splitSuccess: true,
    splitClipId: part2.id,
  };
}

/**
 * Slices out a range [startSec, endSec] from the clips collection,
 * removing dead air and rippling subsequent clips forward to close the gap.
 */
export function cutRangeFromClips(
  clips: VideoClip[],
  startSec: number,
  endSec: number
): { clips: VideoClip[]; newDurationSec: number } {
  if (startSec >= endSec) return { clips, newDurationSec: Math.max(...clips.map((c) => c.endSec), 0) };

  const cutDuration = endSec - startSec;
  const newClips: VideoClip[] = [];

  for (const clip of clips) {
    // 1. Clip completely before cut range
    if (clip.endSec <= startSec) {
      newClips.push({ ...clip });
    }
    // 2. Clip completely after cut range -> ripple backwards by cutDuration
    else if (clip.startSec >= endSec) {
      newClips.push({
        ...clip,
        startSec: Number((clip.startSec - cutDuration).toFixed(2)),
        endSec: Number((clip.endSec - cutDuration).toFixed(2)),
      });
    }
    // 3. Cut falls completely inside this clip -> split into 2 and drop the middle
    else if (clip.startSec < startSec && clip.endSec > endSec) {
      const inPoint = clip.inPointSec || 0;
      const part1: VideoClip = {
        ...clip,
        id: `clip_${Date.now()}_1`,
        name: `${clip.name.replace(/\s*\((Part \d+)\)$/i, '')} (Part 1)`,
        startSec: Number(clip.startSec.toFixed(2)),
        endSec: Number(startSec.toFixed(2)),
        inPointSec: Number(inPoint.toFixed(2)),
      };
      const part2: VideoClip = {
        ...clip,
        id: `clip_${Date.now()}_2`,
        name: `${clip.name.replace(/\s*\((Part \d+)\)$/i, '')} (Part 2)`,
        startSec: Number(startSec.toFixed(2)),
        endSec: Number((clip.endSec - cutDuration).toFixed(2)),
        inPointSec: Number((inPoint + (endSec - clip.startSec)).toFixed(2)),
      };
      newClips.push(part1, part2);
    }
    // 4. Cut overlaps start of this clip
    else if (clip.startSec >= startSec && clip.endSec > endSec) {
      const inPoint = clip.inPointSec || 0;
      const trimmedStartSec = startSec;
      const trimmedEndSec = clip.endSec - cutDuration;
      const newInPoint = inPoint + (endSec - clip.startSec);
      newClips.push({
        ...clip,
        startSec: Number(trimmedStartSec.toFixed(2)),
        endSec: Number(trimmedEndSec.toFixed(2)),
        inPointSec: Number(newInPoint.toFixed(2)),
      });
    }
    // 5. Cut overlaps end of this clip
    else if (clip.startSec < startSec && clip.endSec <= endSec) {
      newClips.push({
        ...clip,
        endSec: Number(startSec.toFixed(2)),
      });
    }
    // 6. Clip is completely engulfed by the cut -> omit (deleted)
  }

  const sorted = newClips.sort((a, b) => a.startSec - b.startSec);
  const newDuration = sorted.length > 0 ? Math.max(...sorted.map((c) => c.endSec)) : 0;
  return {
    clips: sorted,
    newDurationSec: Number(newDuration.toFixed(2)),
  };
}
