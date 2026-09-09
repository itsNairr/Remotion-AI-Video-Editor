'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { formatTimecode } from '@/utils/time';
import { Player, PlayerRef } from '@remotion/player';
import { ChevronsLeft, ChevronsRight, Maximize2, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DraggableOverlayLayer } from './DraggableOverlayLayer';
import { VideoComposition } from './VideoComposition';

interface RemotionPlayerProps {
  editor: UseVideoEditorReturn;
}

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({ editor }) => {
  const { playhead, togglePlay, seekTo, updatePlayhead } = editor;
  const fps = editor.project.fps;
  const durationFrames = Math.max(1, Math.round(editor.project.durationSec * fps));

  // Sync playhead from Player events
  useEffect(() => {
    const player = editor.playerRef.current;
    if (!player) return;

    const onFrameUpdate = (e: any) => {
      const frame = e?.detail?.frame ?? player.getCurrentFrame();
      updatePlayhead(frame / fps);
    };

    const onTimeUpdate = (e: any) => {
      const frame = e?.detail?.frame ?? player.getCurrentFrame();
      updatePlayhead(frame / fps);
    };

    const onPlay = () => {
      const frame = player.getCurrentFrame();
      updatePlayhead(frame / fps, true);
    };

    const onPause = () => {
      const frame = player.getCurrentFrame();
      updatePlayhead(frame / fps, false);
    };

    const onEnded = () => {
      seekTo(0);
      updatePlayhead(0, false);
    };

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('timeupdate', onTimeUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onEnded);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('timeupdate', onTimeUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onEnded);
    };
  }, [editor, fps, updatePlayhead, seekTo]);

  // High-precision RAF sync loop while playing to guarantee smooth 60fps needle motion
  useEffect(() => {
    if (!playhead.isPlaying) return;

    let rafId: number;
    const loop = () => {
      const player = editor.playerRef.current;
      if (player && player.isPlaying()) {
        const frame = player.getCurrentFrame();
        updatePlayhead(frame / fps, true);
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [playhead.isPlaying, editor, fps, updatePlayhead]);

  // Force redraw paused canvas when project elements change
  useEffect(() => {
    const player = editor.playerRef.current;
    if (player && !player.isPlaying()) {
      const frame = Math.round(playhead.currentSec * fps);
      player.seekTo(frame);
    }
  }, [editor.project, playhead.currentSec, fps]);

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Player Canvas Header */}
      <div className="px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Live Preview Canvas
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            {editor.project.width}x{editor.project.height} @ {editor.project.fps}fps
          </span>
        </div>

        <div className="text-xs font-mono font-medium text-zinc-400">
          <span className="text-emerald-400 font-bold">{formatTimecode(playhead.currentSec)}</span> /{' '}
          {formatTimecode(editor.project.durationSec)}
        </div>
      </div>

      {/* Remotion Player Container */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <Player
          ref={editor.playerRef}
          component={VideoComposition}
          inputProps={{ state: editor.project }}
          durationInFrames={durationFrames}
          fps={editor.project.fps}
          compositionWidth={editor.project.width}
          compositionHeight={editor.project.height}
          style={{
            width: '100%',
            height: '100%',
          }}
          acknowledgeRemotionLicense
          controls={false}
          loop
          autoPlay={false}
          clickToPlay
          errorFallback={({ error }) => (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-zinc-300">
              <span className="text-sm font-semibold text-red-400">Media Playback Notice</span>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">{error?.message || 'Playback error'}</p>
            </div>
          )}
        />

        {/* Direct Click & Drag Frame Manipulation Layer */}
        <DraggableOverlayLayer editor={editor} />
      </div>

      {/* Scrubber & Controls Footer */}
      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800/60 flex flex-col gap-3">
        {/* Scrubber Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-12">
            {formatTimecode(playhead.currentSec)}
          </span>
          <input
            type="range"
            min={0}
            max={editor.project.durationSec}
            step={0.05}
            value={playhead.currentSec}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition"
          />
          <span className="text-[11px] font-mono text-zinc-500 w-12 text-right">
            {formatTimecode(editor.project.durationSec)}
          </span>
        </div>

        {/* Playback Buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {/* Rewind (<<) */}
            <button
              onClick={() => seekTo(Math.max(0, playhead.currentSec - 1.0))}
              title="Rewind 1s [<<]"
              className="px-2.5 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 border border-zinc-700/50 cursor-pointer"
            >
              <ChevronsLeft size={16} />
              <span className="text-[11px] font-mono">1s</span>
            </button>

            {/* Play / Pause Toggle Button */}
            <button
              onClick={togglePlay}
              title={playhead.isPlaying ? 'Pause video' : 'Play video'}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer ${
                playhead.isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40 ring-1 ring-amber-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40 ring-1 ring-emerald-400/40'
              }`}
            >
              {playhead.isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{playhead.isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Fast Forward (>>) */}
            <button
              onClick={() => seekTo(Math.min(editor.project.durationSec, playhead.currentSec + 1.0))}
              title="Fast forward 1s [>>]"
              className="px-2.5 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 border border-zinc-700/50 cursor-pointer"
            >
              <span className="text-[11px] font-mono">1s</span>
              <ChevronsRight size={16} />
            </button>

            {/* Restart */}
            <button
              onClick={() => seekTo(0)}
              title="Restart from beginning (00:00)"
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition border border-zinc-700/40 cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {editor.project.cuts.length} Cuts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {editor.project.overlays.length} Overlays
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {editor.project.zooms.length} Zooms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
