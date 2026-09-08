/**
 * Formats seconds into MM:SS.SS or HH:MM:SS.SS string
 */
export function formatTimecode(seconds: number, includeHours: boolean = false): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.0';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (includeHours || hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}.${tenths}`;
  }

  return `${pad(mins)}:${pad(secs)}.${tenths}`;
}

/**
 * Converts seconds to frame count given a frame rate
 */
export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.max(0, Math.round(seconds * fps));
}

/**
 * Converts frame count to seconds
 */
export function framesToSeconds(frames: number, fps: number = 30): number {
  return Math.max(0, frames / fps);
}

/**
 * Parses timecodes like '00:14.2' or '14.2' into seconds
 */
export function parseTimecode(input: string): number {
  const parts = input.trim().split(':');
  if (parts.length === 1) {
    return parseFloat(parts[0]) || 0;
  }
  if (parts.length === 2) {
    const mins = parseFloat(parts[0]) || 0;
    const secs = parseFloat(parts[1]) || 0;
    return mins * 60 + secs;
  }
  if (parts.length === 3) {
    const hrs = parseFloat(parts[0]) || 0;
    const mins = parseFloat(parts[1]) || 0;
    const secs = parseFloat(parts[2]) || 0;
    return hrs * 3600 + mins * 60 + secs;
  }
  return 0;
}
