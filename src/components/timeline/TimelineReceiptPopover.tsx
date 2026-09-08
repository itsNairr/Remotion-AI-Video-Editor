'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { SelectedElement, TextPlacement, ZoomTargetAnchor } from '@/types';
import { formatTimecode } from '@/utils/time';
import { Check, Clock, Minus, Move, Plus, Scissors, Trash2, Type, X, ZoomIn } from 'lucide-react';
import React from 'react';

interface TimelineReceiptPopoverProps {
  editor: UseVideoEditorReturn;
  selected: SelectedElement;
  onClose: () => void;
}

export const TimelineReceiptPopover: React.FC<TimelineReceiptPopoverProps> = ({
  editor,
  selected,
  onClose,
}) => {
  const { project, updateItem, removeItem, nudgeItem, setProject } = editor;

  // Find the selected entity
  let itemData: any = null;
  let title = 'Timeline Element';
  let icon = <Type size={14} className="text-emerald-400" />;

  if (selected.track === 'clips') {
    itemData = project.clips?.find((c) => c.id === selected.id);
    title = `🎬 Video Clip: ${itemData?.name || 'Clip'}`;
    icon = <Move size={14} className="text-blue-400" />;
  } else if (selected.track === 'cuts') {
    itemData = project.cuts.find((c) => c.id === selected.id);
    title = `✂️ Cut Segment: ${itemData?.reason || 'Trim'}`;
    icon = <Scissors size={14} className="text-red-400" />;
  } else if (selected.track === 'overlays') {
    itemData = project.overlays.find((o) => o.id === selected.id);
    title = itemData?.isKnockout
      ? `🔤 Knockout Text: "${itemData?.text}"`
      : `🔤 Text: "${itemData?.text}"`;
    icon = <Type size={14} className="text-emerald-400" />;
  } else if (selected.track === 'zooms') {
    itemData = project.zooms.find((z) => z.id === selected.id);
    title = `🔍 Zoom: ${Math.round((itemData?.scale || 1.25) * 100)}% on ${itemData?.target_anchor || 'center'}`;
    icon = <ZoomIn size={14} className="text-amber-400" />;
  }

  if (!itemData) return null;

  const handleDelete = () => {
    if (selected.track === 'captions') {
      setProject({ ...project, captions: undefined });
    } else if (selected.track === 'clips') {
      const updatedClips = (project.clips || []).filter((c) => c.id !== selected.id);
      setProject({
        ...project,
        clips: updatedClips,
        durationSec: updatedClips.length > 0 ? Math.max(...updatedClips.map((c) => c.endSec)) : 20,
      });
    } else {
      removeItem(selected.track, selected.id);
    }
    onClose();
  };

  return (
    <div className="p-3 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl flex flex-col gap-2.5 min-w-[280px] max-w-sm backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 z-50">
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="text-xs font-bold text-zinc-100 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            title="Delete from timeline"
            className="p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded transition cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded transition cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Timing Info & Nudges */}
      <div className="flex items-center justify-between bg-zinc-950/70 px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-zinc-300">
          <Clock size={11} className="text-zinc-500" />
          <span className="text-emerald-400">{formatTimecode(itemData.startSec)}</span>
          <span className="text-zinc-600">&rarr;</span>
          <span className="text-emerald-400">{formatTimecode(itemData.endSec)}</span>
        </div>

        {/* Nudge Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => nudgeItem(selected.track as any, selected.id, -0.2, 'start')}
            className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer"
            title="Nudge Start -0.2s"
          >
            -0.2s
          </button>
          <button
            onClick={() => nudgeItem(selected.track as any, selected.id, 0.2, 'end')}
            className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] cursor-pointer"
            title="Nudge End +0.2s"
          >
            +0.2s
          </button>
        </div>
      </div>

      {/* Property Controls Depending on Type */}
      {selected.track === 'overlays' && (
        <div className="flex flex-col gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px] w-12 shrink-0">Text:</span>
            <input
              type="text"
              value={itemData.text}
              onChange={(e) => updateItem('overlays', selected.id, { text: e.target.value })}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px]">Size:</span>
              <input
                type="number"
                value={itemData.fontSize || 36}
                onChange={(e) =>
                  updateItem('overlays', selected.id, { fontSize: Number(e.target.value) })
                }
                className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-zinc-400 text-[11px]">Color:</span>
              <input
                type="color"
                value={itemData.textColor || '#ffffff'}
                onChange={(e) => updateItem('overlays', selected.id, { textColor: e.target.value })}
                className="w-7 h-6 rounded bg-zinc-950 border border-zinc-800 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {selected.track === 'zooms' && (
        <div className="flex flex-col gap-2 pt-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Scale:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1.05"
                max="2.5"
                step="0.05"
                value={itemData.scale || 1.25}
                onChange={(e) =>
                  updateItem('zooms', selected.id, { scale: Number(e.target.value) })
                }
                className="w-24 accent-emerald-500"
              />
              <span className="font-mono text-zinc-200 text-[11px]">
                {Math.round((itemData.scale || 1.25) * 100)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Anchor:</span>
            <select
              value={itemData.target_anchor || 'center'}
              onChange={(e) =>
                updateItem('zooms', selected.id, {
                  target_anchor: e.target.value as ZoomTargetAnchor,
                })
              }
              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-300"
            >
              <option value="center">Center</option>
              <option value="speaker_face">Speaker Face</option>
              <option value="top_center">Top Center</option>
            </select>
          </div>
        </div>
      )}

      {selected.track === 'cuts' && (
        <div className="flex flex-col gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px] w-12 shrink-0">Reason:</span>
            <input
              type="text"
              value={itemData.reason || ''}
              onChange={(e) => updateItem('cuts', selected.id, { reason: e.target.value })}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};
