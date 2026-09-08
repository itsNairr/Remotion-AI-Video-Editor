'use client';

import { VideoProjectState } from '@/types/editor';
import { getActiveCut, getActiveOverlays, getActiveZoom } from '@/utils/editor';
import { computeTextMetrics } from '@/utils/textRendering';
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, Video } from 'remotion';

export interface VideoCompositionProps {
  state: VideoProjectState;
}

export const VideoComposition: React.FC<VideoCompositionProps> = ({ state }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  // Active camera punch-in zoom
  const activeZoom = getActiveZoom(currentTime, state.zooms);
  const scale = activeZoom ? activeZoom.scale : 1.0;

  const isSpeakerAnchor =
    activeZoom?.target_anchor === 'speaker_face' || activeZoom?.target_anchor === 'top_center';
  const anchorX = (activeZoom?.anchorX ?? 0.5) * 100;
  const anchorY = isSpeakerAnchor ? 35 : (activeZoom?.anchorY ?? 0.5) * 100;

  const transitionStyle =
    activeZoom?.transition === 'instant_jump'
      ? 'none'
      : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';

  // Active text overlays
  const activeOverlays = getActiveOverlays(currentTime, state.overlays);

  // Active cut indicator
  const activeCut = getActiveCut(currentTime, state.cuts);

  // Dynamic captions
  const captions = state.captions;
  const showCaptions = captions?.enabled;

  return (
    <AbsoluteFill className="bg-black select-none overflow-hidden font-sans">
      {/* Dynamic Video Layer with Zoom transform & Multi-Clip Stitching */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: `${anchorX}% ${anchorY}%`,
          transition: transitionStyle,
        }}
        className="relative flex items-center justify-center w-full h-full"
      >
        {state.clips && state.clips.length > 0 ? (
          state.clips.map((clip) => {
            const fromFrame = Math.round(clip.startSec * fps);
            const durationInFrames = Math.max(1, Math.round((clip.endSec - clip.startSec) * fps));
            const startFromFrame = Math.round((clip.inPointSec || 0) * fps);

            return (
              <Sequence
                key={clip.id}
                from={fromFrame}
                durationInFrames={durationInFrames}
                layout="none"
              >
                <Video
                  src={clip.sourceUrl}
                  startFrom={startFromFrame}
                  className="w-full h-full object-contain"
                  playsInline
                />
              </Sequence>
            );
          })
        ) : (
          <Video
            src={state.sourceUrl}
            className="w-full h-full object-contain"
            playsInline
          />
        )}
      </div>

      {/* Dead Air / Cut Indicator Overlay */}
      {activeCut && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[2px] border-4 border-red-500/80 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg font-bold text-sm tracking-wide uppercase shadow-lg shadow-red-950/60 flex items-center gap-2">
            <span>✂️ Cut Segment ({activeCut.reason || 'Dead Air'})</span>
          </div>
        </div>
      )}

      {/* Dynamic Captions Subtitles Layer */}
      {showCaptions && (
        <div
          style={{ bottom: `${captions.position_y_offset ?? 14}%` }}
          className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center text-center px-6 w-full max-w-2xl"
        >
          <div
            className={`px-4 py-2 rounded-xl backdrop-blur-md shadow-2xl transition-all ${
              captions.style === 'minimal_box'
                ? 'bg-black/80 border border-zinc-700 text-white font-mono text-sm'
                : captions.style === 'clean_sans'
                ? 'bg-zinc-950/70 text-white font-sans text-lg font-bold drop-shadow-md'
                : 'bg-black/60 text-white font-black text-2xl tracking-wider uppercase'
            }`}
          >
            <span>AI Powered </span>
            <span
              style={{ color: captions.highlight_color || '#FFDD00' }}
              className={captions.style === 'karaoke_bounce' ? 'inline-block animate-bounce font-black' : 'font-extrabold'}
            >
              Timeline Copilot
            </span>
            <span> in Real-Time</span>
          </div>
        </div>
      )}

      {/* Render Active Overlays (1:1 with Canvas Export) */}
      {activeOverlays.map((overlay) => {
        const metrics = computeTextMetrics(overlay, width, height);

        // INVERTED NEGATIVE SPACE / KNOCKOUT TEXT (Solid background, text reveals underlying video)
        if (metrics.isKnockout) {
          const maskId = `knockout-mask-${overlay.id}-${overlay.placement || 'center'}-${Math.round(metrics.textY)}-${metrics.fontSize}`;

          return (
            <AbsoluteFill
              key={`${overlay.id}-${overlay.placement || 'center'}-${metrics.fontSize}-${overlay.text}`}
              className="z-20 pointer-events-none"
            >
              <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
              >
                <defs>
                  <mask id={maskId} x="0" y="0" width={width} height={height}>
                    <rect x="0" y="0" width={width} height={height} fill="#ffffff" />
                    <text
                      x={metrics.textX}
                      y={metrics.textY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#000000"
                      fontSize={metrics.fontSize}
                      fontWeight={metrics.fontWeight}
                      fontFamily={metrics.fontFamily}
                      letterSpacing="0.04em"
                      style={{ textTransform: 'uppercase' }}
                    >
                      {overlay.text}
                    </text>
                  </mask>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width={width}
                  height={height}
                  fill={metrics.bgColor}
                  mask={`url(#${maskId})`}
                />
              </svg>
            </AbsoluteFill>
          );
        }

        // Standard Text Element (Exact pixel placement, font, color, background)
        return (
          <div
            key={overlay.id}
            style={metrics.cssStyles}
            className="z-20 transition-all duration-150 pointer-events-none"
          >
            {overlay.text && overlay.text.trim() && <span>{overlay.text}</span>}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
