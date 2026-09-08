/**
 * Security and parameter guardrails to prevent prompt injection,
 * CSS injection, and state corruption.
 */

const ALLOWED_FONTS = [
  'Times New Roman, serif',
  'Times New Roman',
  'Inter, sans-serif',
  'Inter',
  'Arial, sans-serif',
  'Arial',
  'Arial Black, Impact, sans-serif',
  'Impact, sans-serif',
  'Impact',
  'Courier New, monospace',
  'Courier New',
  'Georgia, serif',
  'Georgia',
  'system-ui, sans-serif',
  'sans-serif',
  'serif',
  'monospace',
];

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_RGBA_REGEX = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/i;

/**
 * Truncates and sanitizes prompt string to prevent buffer/context overflow attacks.
 */
export function sanitizeUserPrompt(prompt: string, maxLength = 400): string {
  if (!prompt || typeof prompt !== 'string') return '';
  return prompt
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // remove control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Encloses the user prompt in an isolated XML boundary for Gemini.
 */
export function wrapPromptInIsolatedBoundary(prompt: string): string {
  const sanitized = sanitizeUserPrompt(prompt);
  return `<user_editing_request>\n${sanitized}\n</user_editing_request>`;
}

/**
 * Validates that a color string is a safe hex, rgb, rgba, or transparent.
 * Blocks any CSS injection attempts (; url() expression etc.)
 */
export function validateColor(color: unknown, defaultColor = '#ffffff'): string {
  if (typeof color !== 'string') return defaultColor;
  const trimmed = color.trim().toLowerCase();

  if (trimmed === 'transparent') return 'transparent';
  if (HEX_COLOR_REGEX.test(trimmed)) return trimmed;
  if (RGB_RGBA_REGEX.test(trimmed)) return trimmed;

  // Named safe colors
  const SAFE_NAMED_COLORS: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    yellow: '#eab308',
    amber: '#f59e0b',
    purple: '#a855f7',
    emerald: '#10b981',
    gray: '#6b7280',
    zinc: '#71717a',
  };

  if (SAFE_NAMED_COLORS[trimmed]) {
    return SAFE_NAMED_COLORS[trimmed];
  }

  return defaultColor;
}

/**
 * Validates that a font family is in our safe whitelist.
 * Blocks external @import or CSS breakout attempts.
 */
export function validateFontFamily(
  fontFamily: unknown,
  defaultFont = 'Inter, system-ui, sans-serif'
): string {
  if (typeof fontFamily !== 'string') return defaultFont;
  const trimmed = fontFamily.trim();

  // Check if matches or includes any of our whitelisted font keywords
  const matched = ALLOWED_FONTS.find((allowed) =>
    trimmed.toLowerCase().includes(allowed.toLowerCase())
  );

  if (matched) return matched;
  return defaultFont;
}

/**
 * Validates and clamps numeric properties to safe finite ranges.
 */
export function clampNumber(
  val: unknown,
  min: number,
  max: number,
  defaultVal: number
): number {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
    return defaultVal;
  }
  return Math.max(min, Math.min(max, val));
}
