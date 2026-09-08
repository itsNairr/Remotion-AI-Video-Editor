'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { formatTimecode } from '@/utils/time';
import {
  ChevronsLeft,
  ChevronsRight,
  Film,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Subtitles,
  Type,
  ZoomIn,
} from 'lucide-react';
import React, { useCallback, useRef } from 'react';
import { TimelineReceiptPopover } from './TimelineReceiptPopover';
import { TimelineBlockItem, TimelineTrack } from './TimelineTrack';

interface TimelineEditorProps {
  editor: UseVideoEditorReturn;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({ editor }) => {
  const laneContainerRef = useRef<HTMLDivElement>(null);

  const {
    project,
    playhead,
    updatePlayhead,
    selectedElement,
    setSelectedElement,
    nudgeItem,
    resetToSample,
  } = editor;

  const totalDuration = Math.max(1, project.durationSec);
  const currentSec = playhead.currentSec;
  const playheadPercent = (currentSec / totalDuration) * 100;

  // Handle Scrubbing on Timeline Ruler / Tracks
  const handleScrub = useCallback(
    (clientX: number) => {
      const container = laneContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      const newSec = Number((percent * totalDuration).toFixed(2));
      updatePlayhead(newSec);
    },
    [totalDuration, updatePlayhead]
  );

  const handleRulerMouseDown = (e: React.MouseEvent) => {
    handleScrub(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleScrub(moveEvent.clientX);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Convert project entities into TimelineBlockItems
  const clipItems: TimelineBlockItem[] = (
    project.clips || [
      {
        id: 'clip_01',
        name: project.title || 'Source Video',
        sourceUrl: project.sourceUrl,
        startSec: 0,
        endSec: project.durationSec,
        clipDurationSec: project.durationSec,
      },
    ]
  ).map((c) => ({
    id: c.id,
    name: c.name,
    startSec: c.startSec,
    endSec: c.endSec,
    colorClass: 'bg-blue-600/80 border-blue-400/60 text-white',
    badge: `${(c.endSec - c.startSec).toFixed(1)}s`,
  }));

  const cutItems: TimelineBlockItem[] = project.cuts.map((c) => ({
    id: c.id,
    name: c.reason || 'Trimmed Dead Air',
    startSec: c.startSec,
    endSec: c.endSec,
    colorClass: 'bg-red-600/80 border-red-400/60 text-white',
    badge: 'Cut',
    isCut: true,
    trackType: 'cuts',
  }));

  const overlayItems: TimelineBlockItem[] = project.overlays.map((o) => ({
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
  }));

  const zoomItems: TimelineBlockItem[] = project.zooms.map((z) => ({
    id: z.id,
    name: `${Math.round(z.scale * 100)}% Zoom`,
    startSec: z.startSec,
    endSec: z.endSec,
    colorClass: 'bg-amber-600/80 border-amber-400/60 text-white',
    badge: z.target_anchor || 'center',
    trackType: 'zooms',
  }));

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

  const handleMoveItem = (track: any, id: string, startSec: number, endSec: number) => {
    editor.moveItem(track, id, startSec, endSec);
  };

  const handleTrimItem = (track: any, id: string, startSec: number, endSec: number) => {
    editor.trimItem(track, id, startSec, endSec);
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
          <button
            onClick={() => updatePlayhead(Math.max(0, currentSec - 1.0))}
            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Step Back 1s"
          >
            <ChevronsLeft size={14} />
          </button>

          <button
            onClick={() => updatePlayhead(currentSec, !playhead.isPlaying)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            {playhead.isPlaying ? <Pause size={13} /> : <Play size={13} />}
            <span>{playhead.isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={() => updatePlayhead(Math.min(totalDuration, currentSec + 1.0))}
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
            ref={laneContainerRef}
            onMouseDown={handleRulerMouseDown}
            className="flex-1 h-full relative cursor-pointer overflow-hidden"
          >
            {/* Ticks */}
            <div className="absolute inset-0 flex justify-between px-2 items-center pointer-events-none">
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
          {/* Playhead Needle (Sweeps across all tracks) */}
          <div
            style={{ left: `calc(9rem + ${playheadPercent}% * (100% - 9rem) / 100)` }}
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -ml-[1px]"
          >
            {/* Needle Head */}
            <div className="w-3 h-2 bg-emerald-500 rounded-b shadow-md -mt-7" />
            {/* Line */}
            <div className="w-[2px] h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          {/* Track 1: Unified Video Clips & Cut Regions */}
          <TimelineTrack
            title="Video Track"
            icon={<Film size={13} className="text-blue-400" />}
            trackType="clips"
            items={clipItems}
            secondaryItems={cutItems}
            totalDuration={totalDuration}
            selectedElement={selectedElement}
            onSelect={handleSelect}
            onMoveItem={handleMoveItem}
            onTrimItem={handleTrimItem}
          />

          {/* Track 2: Text Overlays & Full-Screen Screens */}
          <TimelineTrack
            title="Text & Screens"
            icon={<Type size={13} className="text-emerald-400" />}
            trackType="overlays"
            items={overlayItems}
            totalDuration={totalDuration}
            selectedElement={selectedElement}
            onSelect={handleSelect}
            onMoveItem={handleMoveItem}
            onTrimItem={handleTrimItem}
          />

          {/* Track 3: Camera Zooms */}
          <TimelineTrack
            title="Camera Zooms"
            icon={<ZoomIn size={13} className="text-amber-400" />}
            trackType="zooms"
            items={zoomItems}
            totalDuration={totalDuration}
            selectedElement={selectedElement}
            onSelect={handleSelect}
            onMoveItem={handleMoveItem}
            onTrimItem={handleTrimItem}
          />

          {/* Track 4: Dynamic Captions */}
          {captionsItem.length > 0 && (
            <TimelineTrack
              title="Captions"
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
