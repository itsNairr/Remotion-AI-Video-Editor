'use client';

import { SelectedElement, TimelineTrackType } from '@/types';
import { Scissors, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';

export interface TimelineBlockItem {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
  colorClass: string;
  badge?: string;
  trackType?: TimelineTrackType | 'captions';
  isCut?: boolean;
  trackIndex?: number;
}

interface TimelineTrackProps {
  title: string;
  icon: React.ReactNode;
  trackType: TimelineTrackType | 'captions';
  trackIndex?: number;
  trackBadge?: string;
  canDeleteTrack?: boolean;
  onDeleteTrack?: () => void;
  items: TimelineBlockItem[];
  totalDuration: number;
  selectedElement: SelectedElement | null;
  onSelect: (track: any, id: string) => void;
  onMoveItem?: (track: any, id: string, startSec: number, endSec: number, newTrackIndex?: number) => void;
  onTrimItem?: (track: any, id: string, startSec: number, endSec: number, newTrackIndex?: number) => void;
}

export const TimelineTrack: React.FC<TimelineTrackProps> = ({
  title,
  icon,
  trackType,
  trackIndex = 0,
  trackBadge,
  canDeleteTrack,
  onDeleteTrack,
  items,
  totalDuration,
  selectedElement,
  onSelect,
  onMoveItem,
  onTrimItem,
}) => {
  const laneRef = useRef<HTMLDivElement>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTimePreview, setDragTimePreview] = useState<{ start: number; end: number } | null>(null);

  // General Drag Handler: Handles both Body Moving and Left/Right Edge Trimming
  const handleItemMouseDown = (
    e: React.MouseEvent,
    item: TimelineBlockItem,
    targetTrack: TimelineTrackType | 'captions',
    mode: 'move' | 'trim_start' | 'trim_end'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const lane = laneRef.current;
    if (!lane) return;

    const startClientX = e.clientX;
    const initialStart = item.startSec;
    const initialEnd = item.endSec;
    const itemDuration = Math.max(0.1, initialEnd - initialStart);
    const trackWidth = lane.getBoundingClientRect().width;
    const duration = Math.max(0.1, totalDuration);

    setDraggingItemId(item.id);
    setDragTimePreview({ start: initialStart, end: initialEnd });
    onSelect(targetTrack, item.id);

    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startClientX;
      if (Math.abs(deltaPx) > 3) hasMoved = true;

      const deltaSec = (deltaPx / trackWidth) * duration;

      if (mode === 'move') {
        const minStart = 0;
        const maxStart = Math.max(0, duration - itemDuration);
        const newStart = Math.max(minStart, Math.min(maxStart, initialStart + deltaSec));
        const newEnd = newStart + itemDuration;

        const roundedStart = Number(newStart.toFixed(2));
        const roundedEnd = Number(newEnd.toFixed(2));

        setDragTimePreview({ start: roundedStart, end: roundedEnd });
        onMoveItem?.(targetTrack, item.id, roundedStart, roundedEnd);
      } else if (mode === 'trim_start') {
        const maxStart = initialEnd - 0.2;
        const newStart = Math.max(0, Math.min(maxStart, initialStart + deltaSec));
        const roundedStart = Number(newStart.toFixed(2));

        setDragTimePreview({ start: roundedStart, end: initialEnd });
        onTrimItem?.(targetTrack, item.id, roundedStart, initialEnd);
      } else if (mode === 'trim_end') {
        const minEnd = initialStart + 0.2;
        const newEnd = Math.min(duration, Math.max(minEnd, initialEnd + deltaSec));
        const roundedEnd = Number(newEnd.toFixed(2));

        setDragTimePreview({ start: initialStart, end: roundedEnd });
        onTrimItem?.(targetTrack, item.id, initialStart, roundedEnd);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      setDraggingItemId(null);
      setDragTimePreview(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const renderBlock = (item: TimelineBlockItem, isSecondary = false) => {
    const duration = Math.max(0.1, totalDuration);
    const isDragging = draggingItemId === item.id;
    const currentStart = isDragging && dragTimePreview ? dragTimePreview.start : item.startSec;
    const currentEnd = isDragging && dragTimePreview ? dragTimePreview.end : item.endSec;

    const leftPercent = (currentStart / duration) * 100;
    const widthPercent = Math.max(1.5, ((currentEnd - currentStart) / duration) * 100);

    const targetTrack = item.trackType || trackType;
    const isSelected = selectedElement?.id === item.id;

    // Standard Video Clip or Overlay Block
    return (
      <div
        key={item.id}
        onMouseDown={(e) => handleItemMouseDown(e, item, targetTrack, 'move')}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
        }}
        className={`absolute top-1 bottom-1 rounded-md px-1.5 flex items-center justify-between text-[10px] font-medium border shadow-sm transition-[shadow,border-color] cursor-grab active:cursor-grabbing select-none overflow-hidden ${
          item.colorClass
        } ${
          isSelected
            ? 'ring-2 ring-white border-white scale-[1.01] z-20 shadow-lg'
            : 'hover:brightness-110'
        }`}
        title={`${item.name} [${currentStart.toFixed(1)}s → ${currentEnd.toFixed(1)}s] (Drag to move, or drag edges to trim)`}
      >
        {/* Left Trim Handle */}
        <div
          onMouseDown={(e) => handleItemMouseDown(e, item, targetTrack, 'trim_start')}
          className="w-2 h-full -ml-1 bg-white/30 hover:bg-white rounded-l cursor-ew-resize transition-all shrink-0 z-30"
          title="Drag left edge to trim start"
        />

        {/* Block Content Label */}
        <div className="flex items-center gap-1.5 truncate px-1 pointer-events-none">
          <span className="truncate text-white font-semibold">{item.name}</span>
          {item.badge && (
            <span className="px-1 rounded bg-black/40 text-[9px] text-zinc-300 shrink-0 font-mono">
              {item.badge}
            </span>
          )}
          {isDragging && (
            <span className="px-1 rounded bg-white text-[9px] text-black font-bold shrink-0 font-mono animate-pulse">
              {currentStart.toFixed(1)}s → {currentEnd.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Right Trim Handle */}
        <div
          onMouseDown={(e) => handleItemMouseDown(e, item, targetTrack, 'trim_end')}
          className="w-2 h-full -mr-1 bg-white/30 hover:bg-white rounded-r cursor-ew-resize transition-all shrink-0 z-30"
          title="Drag right edge to trim end"
        />
      </div>
    );
  };

  return (
    <div className="flex items-center h-10 border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors group">
      {/* Track Header Label */}
      <div className="w-36 shrink-0 px-3 flex items-center justify-between border-r border-zinc-800/80 text-[11px] font-semibold text-zinc-300">
        <div className="flex items-center gap-1.5 truncate">
          <span className="shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
          {trackBadge && (
            <span className="px-1.5 py-0.5 bg-zinc-800/90 text-zinc-400 border border-zinc-700/60 rounded text-[9px] font-mono font-bold shrink-0">
              {trackBadge}
            </span>
          )}
        </div>
        {canDeleteTrack && onDeleteTrack && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTrack();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 hover:bg-zinc-800 rounded transition cursor-pointer text-zinc-500 shrink-0"
            title="Delete this track"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Track Canvas Lane */}
      <div
        ref={laneRef}
        className="flex-1 h-full relative overflow-hidden bg-zinc-950/40"
      >
        {/* Primary Track Items (e.g. Video Clips or Overlays) */}
        {items.map((item) => renderBlock(item))}
      </div>
    </div>
  );
};
