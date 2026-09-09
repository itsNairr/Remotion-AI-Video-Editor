export type TextPlacement =
  | 'center'
  | 'top_left'
  | 'top_center'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_center'
  | 'bottom_right'
  | 'custom';

export interface TextOverlay {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
  placement: TextPlacement;
  posX?: number;          // Normalized horizontal percentage (0 - 100%)
  posY?: number;          // Normalized vertical percentage (0 - 100%)
  textColor: string;      // e.g. '#ffffff', '#FFDD00', '#ef4444'
  bgColor: string;        // e.g. 'transparent', '#000000', 'rgba(0,0,0,0.8)'
  fontFamily: string;     // e.g. 'Times New Roman, serif', 'Inter, sans-serif', 'Arial, sans-serif'
  fontSize: number;       // e.g. 36, 48, 64
  fontWeight: 'normal' | 'bold' | '500' | '700' | '900' | string | number;
  isKnockout?: boolean;   // Inverted negative text: video plays inside letter cutouts, background is solid bgColor
  isFullScreen?: boolean; // Full-screen solid color screen / card / flash (e.g. white screen, black screen)
  paddingX?: number;      // Horizontal padding around text (default 24)
  paddingY?: number;      // Vertical padding around text (default 12)
  borderRadius?: number;  // Rounded corner radius (default 12)
  animation?: 'pop' | 'fade' | 'slide_up' | 'none';
  trackIndex?: number;    // 0 = T1 (primary text/screen), 1 = T2 (secondary stacked text), etc.
}

// Backwards-compatible alias for existing codebase
export type Overlay = TextOverlay;

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  width: number;
  height: number;
  thumbnailUrl?: string;
  sizeBytes?: number;
}

export interface VideoClip {
  id: string;
  assetId?: string;
  name: string;
  sourceUrl: string;
  startSec: number;        // Start timecode on master timeline
  endSec: number;          // End timecode on master timeline
  clipDurationSec: number; // Native file duration
  inPointSec?: number;     // Start trim offset within source
  trackIndex?: number;     // 0 = V1 (main video), 1 = V2 (overlay/B-roll), etc.
}

export interface Cut {
  id: string;
  startSec: number;
  endSec: number;
  reason: string;
  ripple?: boolean;
}

export type ZoomTargetAnchor = 'center' | 'speaker_face' | 'top_center';
export type ZoomTransition = 'instant_jump' | 'smooth_ease_in';

export interface Zoom {
  id: string;
  startSec: number;
  endSec: number;
  scale: number;
  target_anchor?: ZoomTargetAnchor;
  transition?: ZoomTransition;
  anchorX?: number; // Normalized 0-1, default 0.5
  anchorY?: number; // Normalized 0-1, default 0.5
  trackIndex?: number; // 0 = Z1 (primary camera zoom), 1 = Z2, etc.
}

export interface CaptionsConfig {
  enabled: boolean;
  style: 'karaoke_bounce' | 'minimal_box' | 'clean_sans';
  highlight_color: string;
  max_words_per_line: number;
  position_y_offset?: number;
}

export interface ProjectTrackConfig {
  videoTrackCount: number;   // Default 2 (V1, V2)
  overlayTrackCount: number; // Default 2 (T1, T2)
  zoomTrackCount: number;    // Default 1 (Z1)
}

export interface VideoProjectState {
  id: string;
  title: string;
  sourceUrl: string;
  durationSec: number;
  fps: number;
  width: number;
  height: number;
  clips: VideoClip[];
  cuts: Cut[];
  overlays: TextOverlay[];
  zooms: Zoom[];
  captions?: CaptionsConfig;
  trackConfig?: ProjectTrackConfig;
}

export type TimelineTrackType = 'clips' | 'cuts' | 'overlays' | 'zooms';

export interface SelectedElement {
  track: 'clips' | 'cuts' | 'overlays' | 'zooms' | 'captions';
  id: string;
}

export interface TimelineAction {
  action: 'add' | 'update' | 'remove' | 'nudge';
  track: TimelineTrackType;
  id?: string;
  data?: any;
}

export type ActionCardType = 'cut' | 'overlay' | 'zoom' | 'captions';

export interface ActionCard {
  id: string;
  type: ActionCardType;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  associatedId: string;
  createdAt: number;
  details?: Record<string, any>;
}

export interface PlayheadContext {
  currentSec: number;
  currentFrame: number;
  isPlaying: boolean;
}
