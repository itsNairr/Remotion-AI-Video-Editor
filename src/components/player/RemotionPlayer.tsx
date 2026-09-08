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
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);

  const durationFrames = Math.max(1, Math.round(editor.project.durationSec * editor.project.fps));

  const updatePlayheadRef = useRef(editor.updatePlayhead);
  updatePlayheadRef.current = editor.updatePlayhead;
  const fps = editor.project.fps;

  // Sync playhead from Player events
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate = () => {
      const frame = player.getCurrentFrame();
      const sec = frame / fps;
      setCurrentSec(sec);
      updatePlayheadRef.current(sec);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, [fps]);

  // Force redraw paused canvas when project elements change
  useEffect(() => {
    const player = playerRef.current;
    if (player && !player.isPlaying()) {
      const frame = Math.round(currentSec * fps);
      player.seekTo(frame);
    }
  }, [editor.project, currentSec, fps]);

  const togglePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    if (player.isPlaying()) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sec = parseFloat(e.target.value);
    setCurrentSec(sec);
    const frame = Math.round(sec * editor.project.fps);
    playerRef.current?.seekTo(frame);
    editor.updatePlayhead(sec);
  };

  const handleRestart = () => {
    playerRef.current?.seekTo(0);
    setCurrentSec(0);
    editor.updatePlayhead(0);
  };

  const handleStepBack = (deltaSec = 1.0) => {
    const nextSec = Math.max(0, currentSec - deltaSec);
    setCurrentSec(nextSec);
    const frame = Math.round(nextSec * editor.project.fps);
    playerRef.current?.seekTo(frame);
    editor.updatePlayhead(nextSec);
  };

  const handleStepForward = (deltaSec = 1.0) => {
    const nextSec = Math.min(editor.project.durationSec, currentSec + deltaSec);
    setCurrentSec(nextSec);
    const frame = Math.round(nextSec * editor.project.fps);
    playerRef.current?.seekTo(frame);
    editor.updatePlayhead(nextSec);
  };

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
          <span className="text-emerald-400 font-bold">{formatTimecode(currentSec)}</span> /{' '}
          {formatTimecode(editor.project.durationSec)}
        </div>
      </div>

      {/* Remotion Player Container */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <Player
          ref={playerRef}
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
            {formatTimecode(currentSec)}
          </span>
          <input
            type="range"
            min={0}
            max={editor.project.durationSec}
            step={0.05}
            value={currentSec}
            onChange={handleSeek}
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
              onClick={() => handleStepBack(1.0)}
              title="Rewind 1s [<<]"
              className="px-2.5 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 border border-zinc-700/50"
            >
              <ChevronsLeft size={16} />
              <span className="text-[11px] font-mono">1s</span>
            </button>

            {/* Play / Pause Toggle Button */}
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pause video' : 'Play video'}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md transition active:scale-95 ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40 ring-1 ring-amber-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40 ring-1 ring-emerald-400/40'
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Fast Forward (>>) */}
            <button
              onClick={() => handleStepForward(1.0)}
              title="Fast forward 1s [>>]"
              className="px-2.5 py-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition active:scale-95 border border-zinc-700/50"
            >
              <span className="text-[11px] font-mono">1s</span>
              <ChevronsRight size={16} />
            </button>

            {/* Restart */}
            <button
              onClick={handleRestart}
              title="Restart from beginning (00:00)"
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs transition border border-zinc-700/40"
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
