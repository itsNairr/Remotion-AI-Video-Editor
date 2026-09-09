'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { formatTimecode } from '@/utils/time';
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Film,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Scissors,
  Subtitles,
  Type,
  ZoomIn,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TimelineReceiptPopover } from './TimelineReceiptPopover';
import { TimelineBlockItem, TimelineTrack } from './TimelineTrack';

interface TimelineEditorProps {
  editor: UseVideoEditorReturn;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ editor }) => {
  const tracksLaneRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);

  const {
    project,
    playhead,
    seekTo,
    togglePlay,
    splitClip,
    selectedElement,
    setSelectedElement,
    resetToSample,
    addTrack,
    removeTrack,
  } = editor;

  const totalDuration = Math.max(1, project.durationSec);
  const currentSec = playhead.currentSec;
  const playheadPercent = Math.max(0, Math.min(100, (currentSec / totalDuration) * 100));

  // 'S' key shortcut for split at playhead
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        splitClip(currentSec);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSec, splitClip]);

  // Handle Scrubbing on Timeline Ruler / Tracks
  const handleScrubStart = (e: React.MouseEvent) => {
    const lane = tracksLaneRef.current;
    if (!lane) return;

    setIsScrubbing(true);
    const rect = lane.getBoundingClientRect();
    const updateTimeFromX = (clientX: number) => {
      const offsetX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const targetSec = (offsetX / rect.width) * totalDuration;
      seekTo(Number(targetSec.toFixed(2)));
    };

    updateTimeFromX(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      updateTimeFromX(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const CLIP_COLOR_PALETTES = [
    'bg-blue-600/85 border-blue-400/70 text-white',
    'bg-indigo-600/85 border-indigo-400/70 text-white',
    'bg-violet-600/85 border-violet-400/70 text-white',
    'bg-sky-600/85 border-sky-400/70 text-white',
  ];

  // Dynamic Stacked Tracks Configuration
  const videoTrackCount = Math.max(
    project.trackConfig?.videoTrackCount || 2,
    ...(project.clips || []).map((c) => (c.trackIndex || 0) + 1)
  );

  const overlayTrackCount = Math.max(
    project.trackConfig?.overlayTrackCount || 2,
    ...project.overlays.map((o) => (o.trackIndex || 0) + 1)
  );

  const zoomTrackCount = Math.max(
    project.trackConfig?.zoomTrackCount || 1,
    ...project.zooms.map((z) => (z.trackIndex || 0) + 1)
  );

  // Group clips into stacked video tracks
  const videoTracks = Array.from({ length: videoTrackCount }, (_, vIdx) => {
    const trackClips = (project.clips || []).filter((c) => (c.trackIndex || 0) === vIdx);
    const items: TimelineBlockItem[] = trackClips.map((c, idx) => ({
      id: c.id,
      name: c.name || `Clip ${idx + 1}`,
      startSec: c.startSec,
      endSec: c.endSec,
      colorClass: CLIP_COLOR_PALETTES[(idx + vIdx * 2) % CLIP_COLOR_PALETTES.length],
      badge: `${(c.endSec - c.startSec).toFixed(1)}s`,
      trackType: 'clips',
      trackIndex: vIdx,
    }));
    return {
      index: vIdx,
      title: vIdx === 0 ? 'Video Track' : `Video Overlay`,
      badge: `V${vIdx + 1}`,
      items,
      canDelete: vIdx > 0 && trackClips.length === 0,
    };
  });

  // Group overlays into stacked text & screens tracks
  const overlayTracks = Array.from({ length: overlayTrackCount }, (_, tIdx) => {
    const trackOverlays = project.overlays.filter((o) => (o.trackIndex || 0) === tIdx);
    const items: TimelineBlockItem[] = trackOverlays.map((o) => ({
      id: o.id,
      name: o.text || (o.isFullScreen ? (o.bgColor === '#ffffff' ? 'White Screen' : 'Color Screen') : 'Overlay'),
      startSec: o.startSec,
      endSec: o.endSec,
      colorClass: o.isKnockout
        ? 'bg-zinc-800 border-emerald-400/80 text-emerald-300'
        : o.isFullScreen
        ? 'bg-zinc-700 border-zinc-400 text-white'
        : 'bg-emerald-600/80 border-emerald-400/60 text-white',
      badge: o.isKnockout ? 'Knockout' : o.isFullScreen ? 'Full Screen' : o.placement,
      trackType: 'overlays',
      trackIndex: tIdx,
    }));
    return {
      index: tIdx,
      title: tIdx === 0 ? 'Text & Screens' : `Text & Screens`,
      badge: `T${tIdx + 1}`,
      items,
      canDelete: tIdx > 0 && trackOverlays.length === 0,
    };
  });

  // Group zooms into stacked zoom tracks
  const zoomTracks = Array.from({ length: zoomTrackCount }, (_, zIdx) => {
    const trackZooms = project.zooms.filter((z) => (z.trackIndex || 0) === zIdx);
    const items: TimelineBlockItem[] = trackZooms.map((z) => ({
      id: z.id,
      name: `${Math.round(z.scale * 100)}% Zoom`,
      startSec: z.startSec,
      endSec: z.endSec,
      colorClass: 'bg-amber-600/80 border-amber-400/60 text-white',
      badge: z.target_anchor || 'center',
      trackType: 'zooms',
      trackIndex: zIdx,
    }));
    return {
      index: zIdx,
      title: 'Camera Zooms',
      badge: `Z${zIdx + 1}`,
      items,
      canDelete: zIdx > 0 && trackZooms.length === 0,
    };
  });

  const captionsItem: TimelineBlockItem[] = project.captions?.enabled
    ? [
        {
          id: 'captions_global',
          name: `Dynamic Subtitles (${project.captions.style})`,
          startSec: 0,
          endSec: totalDuration,
          colorClass: 'bg-teal-600/70 border-teal-400/60 text-white',
          badge: project.captions.highlight_color,
          trackType: 'captions' as const,
        },
      ]
    : [];

  const handleSelect = (track: any, id: string) => {
    setSelectedElement({ track, id });
  };

  const handleMoveItem = (track: any, id: string, startSec: number, endSec: number, newTrackIndex?: number) => {
    editor.moveItem(track, id, startSec, endSec, newTrackIndex);
  };

  const handleTrimItem = (track: any, id: string, startSec: number, endSec: number, newTrackIndex?: number) => {
    editor.trimItem(track, id, startSec, endSec, newTrackIndex);
  };

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Timeline Controls Header */}
      <div className="px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Stackable Timeline
            </span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 text-xs font-mono">
            <span className="text-emerald-400 font-bold">{formatTimecode(currentSec)}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Quick Transport Controls */}
        <div className="flex items-center gap-2">
          {/* Split at Playhead Razor Tool */}
          <button
            onClick={() => splitClip(currentSec)}
            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-700/60 shadow-sm cursor-pointer"
            title="Split video clip at playhead position (or press 'S')"
          >
            <Scissors size={13} className="text-emerald-400" />
            <span>Split</span>
          </button>

          {/* Add Stacked Track Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAddTrackMenu(!showAddTrackMenu)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-zinc-700/60 shadow-sm cursor-pointer"
              title="Add a new stacked track lane"
            >
              <Plus size={13} className="text-emerald-400" />
              <span>Track</span>
              <ChevronDown size={11} className="text-zinc-500" />
            </button>

            {showAddTrackMenu && (
              <div
                className="absolute left-0 top-full mt-1.5 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 z-50 flex flex-col backdrop-blur-md"
                onMouseLeave={() => setShowAddTrackMenu(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Add Stacked Track
                </div>
                <button
                  onClick={() => {
                    addTrack('clips');
                    setShowAddTrackMenu(false);
                  }}
                  className="px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-xs text-left text-zinc-200 hover:text-blue-400 transition cursor-pointer"
                >
                  <Film size={12} className="text-blue-400" />
                  <span>+ Video Track (Overlay)</span>
                </button>
                <button
                  onClick={() => {
                    addTrack('overlays');
                    setShowAddTrackMenu(false);
                  }}
                  className="px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-xs text-left text-zinc-200 hover:text-emerald-400 transition cursor-pointer"
                >
                  <Type size={12} className="text-emerald-400" />
                  <span>+ Text & Screen Track</span>
                </button>
                <button
                  onClick={() => {
                    addTrack('zooms');
                    setShowAddTrackMenu(false);
                  }}
                  className="px-3 py-1.5 hover:bg-zinc-800 flex items-center gap-2 text-xs text-left text-zinc-200 hover:text-amber-400 transition cursor-pointer"
                >
                  <ZoomIn size={12} className="text-amber-400" />
                  <span>+ Camera Zoom Track</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-zinc-800 mx-0.5" />

          <button
            onClick={() => seekTo(Math.max(0, currentSec - 1.0))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Step Back 1s"
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            onClick={togglePlay}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            {playhead.isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{playhead.isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => seekTo(Math.min(totalDuration, currentSec + 1.0))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Step Forward 1s"
          >
            <ChevronsRight size={14} />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          <button
            onClick={resetToSample}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
            title="Reset Sample Timeline"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Track Workspace */}
      <div className="flex flex-col relative select-none">
        {/* Time Ruler Header */}
        <div className="flex items-center h-7 bg-zinc-900/80 border-b border-zinc-800/80 text-[10px] font-mono text-zinc-400">
          <div className="w-36 shrink-0 px-3 border-r border-zinc-800/80 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Ruler / Track
          </div>

          {/* Scrubbable Time Ruler */}
          <div
            onMouseDown={handleScrubStart}
            className="flex-1 h-full relative cursor-pointer overflow-hidden group"
          >
            {/* Ticks */}
            <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none text-zinc-500">
              <span>00:00</span>
              <span>{formatTimecode(totalDuration * 0.25)}</span>
              <span>{formatTimecode(totalDuration * 0.5)}</span>
              <span>{formatTimecode(totalDuration * 0.75)}</span>
              <span>{formatTimecode(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Stacked Tracks Container */}
        <div className="flex flex-col relative">
          {/* Overlay container covering EXACTLY the tracks lane (left-36 right-0) */}
          <div
            ref={tracksLaneRef}
            className="absolute top-0 bottom-0 left-36 right-0 pointer-events-none z-30"
          >
            {/* Draggable Playhead Needle */}
            <div
              style={{ left: `${playheadPercent}%` }}
              onMouseDown={handleScrubStart}
              className="absolute top-0 bottom-0 -ml-[8px] w-[16px] flex flex-col items-center pointer-events-auto cursor-ew-resize select-none group"
            >
              {/* Playhead Needle Head - Sits in the Ruler bar above */}
              <div
                className={`w-4 h-7 -mt-7 bg-emerald-500 hover:bg-emerald-400 rounded-b shadow-lg flex flex-col items-center justify-center gap-0.5 transition-all cursor-grab active:cursor-grabbing border border-emerald-300/50 ${
                  isScrubbing ? 'scale-110 bg-emerald-400 ring-2 ring-emerald-300/80' : ''
                }`}
                title={`Playhead: ${formatTimecode(currentSec)} (Drag to scrub)`}
              >
                <div className="w-1.5 h-[1px] bg-white/80 rounded-full" />
                <div className="w-1.5 h-[1px] bg-white/80 rounded-full" />
                <div className="w-1.5 h-[1px] bg-white/80 rounded-full" />
              </div>

              {/* Glowing Needle Line */}
              <div
                className={`w-[2px] flex-1 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] transition-colors ${
                  isScrubbing ? 'bg-emerald-300 w-[2.5px]' : ''
                }`}
              />

              {/* Floating timecode badge while scrubbing */}
              {isScrubbing && (
                <div className="absolute -top-12 px-2 py-0.5 bg-zinc-900 border border-emerald-500 text-emerald-400 text-[10px] font-mono font-bold rounded shadow-xl pointer-events-none whitespace-nowrap z-50">
                  {formatTimecode(currentSec)}
                </div>
              )}
            </div>
          </div>

          {/* Stacked Video Tracks */}
          {videoTracks.map((vt) => (
            <TimelineTrack
              key={`vt_${vt.index}`}
              title={vt.title}
              trackBadge={vt.badge}
              icon={<Film size={13} className="text-blue-400" />}
              trackType="clips"
              trackIndex={vt.index}
              canDeleteTrack={vt.canDelete}
              onDeleteTrack={() => removeTrack('clips', vt.index)}
              items={vt.items}
              totalDuration={totalDuration}
              selectedElement={selectedElement}
              onSelect={handleSelect}
              onMoveItem={handleMoveItem}
              onTrimItem={handleTrimItem}
            />
          ))}

          {/* Stacked Text & Screens Tracks */}
          {overlayTracks.map((ot) => (
            <TimelineTrack
              key={`ot_${ot.index}`}
              title={ot.title}
              trackBadge={ot.badge}
              icon={<Type size={13} className="text-emerald-400" />}
              trackType="overlays"
              trackIndex={ot.index}
              canDeleteTrack={ot.canDelete}
              onDeleteTrack={() => removeTrack('overlays', ot.index)}
              items={ot.items}
              totalDuration={totalDuration}
              selectedElement={selectedElement}
              onSelect={handleSelect}
              onMoveItem={handleMoveItem}
              onTrimItem={handleTrimItem}
            />
          ))}

          {/* Stacked Camera Zooms Tracks */}
          {zoomTracks.map((zt) => (
            <TimelineTrack
              key={`zt_${zt.index}`}
              title={zt.title}
              trackBadge={zt.badge}
              icon={<ZoomIn size={13} className="text-amber-400" />}
              trackType="zooms"
              trackIndex={zt.index}
              canDeleteTrack={zt.canDelete}
              onDeleteTrack={() => removeTrack('zooms', zt.index)}
              items={zt.items}
              totalDuration={totalDuration}
              selectedElement={selectedElement}
              onSelect={handleSelect}
              onMoveItem={handleMoveItem}
              onTrimItem={handleTrimItem}
            />
          ))}

          {/* Track: Dynamic Captions */}
          {captionsItem.length > 0 && (
            <TimelineTrack
              title="Captions"
              trackBadge="CC"
              icon={<Subtitles size={13} className="text-teal-400" />}
              trackType="captions"
              items={captionsItem}
              totalDuration={totalDuration}
              selectedElement={selectedElement}
              onSelect={handleSelect}
              onMoveItem={handleMoveItem}
              onTrimItem={handleTrimItem}
            />
          )}
        </div>
      </div>

      {/* Floating In-Timeline Receipt Popover */}
      {selectedElement && (
        <div className="absolute top-12 right-6 z-50">
          <TimelineReceiptPopover
            editor={editor}
            selected={selectedElement}
            onClose={() => setSelectedElement(null)}
          />
        </div>
      )}
    </div>
  );
};
