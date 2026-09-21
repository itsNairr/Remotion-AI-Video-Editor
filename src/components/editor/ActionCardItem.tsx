'use client';

import { ActionCard, TextPlacement, ZoomTargetAnchor, ZoomTransition } from '@/types';
import { formatTimecode } from '@/utils/time';
import { Check, Pencil, Scissors, Subtitles, Trash2, Type, ZoomIn } from 'lucide-react';
import React, { useState } from 'react';

interface ActionCardItemProps {
  card: ActionCard;
  onDelete: (card: ActionCard) => void;
  onUpdate: (card: ActionCard, updates: Record<string, unknown>) => void;
  onNudge: (card: ActionCard, deltaSec: number, edge: 'start' | 'end') => void;
}

export const ActionCardItem: React.FC<ActionCardItemProps> = ({ card, onDelete, onUpdate, onNudge }) => {
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editStart, setEditStart] = useState(card.startSec);
  const [editEnd, setEditEnd] = useState(card.endSec);

  // Cuts
  const [editReason, setEditReason] = useState<string>(String(card.details?.reason ?? card.description ?? ''));

  // Overlays (Explicit typography & design properties)
  const [editText, setEditText] = useState<string>(String(card.details?.text ?? ''));
  const [editPlacement, setEditPlacement] = useState<TextPlacement>((card.details?.placement as TextPlacement) || 'center');
  const [editTextColor, setEditTextColor] = useState<string>(String(card.details?.textColor ?? '#ffffff'));
  const [editBgColor, setEditBgColor] = useState<string>(String(card.details?.bgColor ?? 'rgba(0, 0, 0, 0.75)'));
  const [editFontFamily, setEditFontFamily] = useState<string>(String(card.details?.fontFamily ?? 'Inter, system-ui, sans-serif'));
  const [editFontSize, setEditFontSize] = useState<number>(Number(card.details?.fontSize ?? 36));
  const [editFontWeight, setEditFontWeight] = useState<string>(String(card.details?.fontWeight ?? 'bold'));
  const [editIsKnockout, setEditIsKnockout] = useState<boolean>(Boolean(card.details?.isKnockout));

  // Zooms
  const [editScale, setEditScale] = useState<number>(Number(card.details?.scale ?? 1.25));
  const [editAnchor, setEditAnchor] = useState<ZoomTargetAnchor>((card.details?.target_anchor as ZoomTargetAnchor) || 'center');
  const [editTransition, setEditTransition] = useState<ZoomTransition>((card.details?.transition as ZoomTransition) || 'instant_jump');

  // Captions
  const [editCaptionStyle, setEditCaptionStyle] = useState<string>(String(card.details?.style ?? 'karaoke_bounce'));
  const [editHighlightColor, setEditHighlightColor] = useState<string>(String(card.details?.highlight_color ?? '#FFDD00'));

  const handleSave = () => {
    onUpdate(card, {
      startSec: editStart,
      endSec: editEnd,
      reason: editReason,
      text: editText,
      placement: editPlacement,
      textColor: editTextColor,
      bgColor: editBgColor,
      fontFamily: editFontFamily,
      fontSize: editFontSize,
      fontWeight: editFontWeight,
      isKnockout: editIsKnockout,
      scale: editScale,
      target_anchor: editAnchor,
      transition: editTransition,
      style: editCaptionStyle,
      highlight_color: editHighlightColor,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditStart(card.startSec);
    setEditEnd(card.endSec);
    setEditReason(String(card.details?.reason ?? card.description ?? ''));
    setEditText(String(card.details?.text ?? ''));
    setEditPlacement((card.details?.placement as TextPlacement) || 'center');
    setEditTextColor(String(card.details?.textColor ?? '#ffffff'));
    setEditBgColor(String(card.details?.bgColor ?? 'rgba(0, 0, 0, 0.75)'));
    setEditFontFamily(String(card.details?.fontFamily ?? 'Inter, system-ui, sans-serif'));
    setEditFontSize(Number(card.details?.fontSize ?? 36));
    setEditFontWeight(String(card.details?.fontWeight ?? 'bold'));
    setEditIsKnockout(Boolean(card.details?.isKnockout));
    setEditScale(Number(card.details?.scale ?? 1.25));
    setEditAnchor((card.details?.target_anchor as ZoomTargetAnchor) || 'center');
    setEditTransition((card.details?.transition as ZoomTransition) || 'instant_jump');
    setEditCaptionStyle(String(card.details?.style ?? 'karaoke_bounce'));
    setEditHighlightColor(String(card.details?.highlight_color ?? '#FFDD00'));
    setIsEditing(false);
  };

  const getIcon = () => {
    switch (card.type) {
      case 'cut':
        return <Scissors size={14} className="text-red-400" />;
      case 'overlay':
        return <Type size={14} className="text-blue-400" />;
      case 'zoom':
        return <ZoomIn size={14} className="text-amber-400" />;
      case 'captions':
        return <Subtitles size={14} className="text-emerald-400" />;
    }
  };

  const getTypeBadgeClass = () => {
    switch (card.type) {
      case 'cut':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'overlay':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'zoom':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'captions':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
  };

  return (
    <div className="group p-3.5 bg-zinc-900/70 hover:bg-zinc-800/60 border border-zinc-800 rounded-xl transition-all flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`p-1.5 rounded-lg border flex items-center justify-center ${getTypeBadgeClass()}`}>
            {getIcon()}
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-zinc-200">{card.title}</span>
            <span className="text-[11px] font-mono text-zinc-400">
              {card.type === 'captions' ? (
                <span className="text-emerald-400 font-sans">Global Track</span>
              ) : (
                `[${formatTimecode(card.startSec)} → ${formatTimecode(card.endSec)}]`
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            title="Edit action"
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isEditing
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Pencil size={13} />
          </button>

          <button
            onClick={() => onDelete(card)}
            title="Delete action"
            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Inline Edit Form */}
      {isEditing ? (
        <div className="p-3 bg-zinc-950/90 rounded-xl border border-zinc-700/60 flex flex-col gap-2.5 text-xs text-zinc-300">
          {/* Time range (if not captions) */}
          {card.type !== 'captions' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Start Time (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editStart}
                  onChange={(e) => setEditStart(parseFloat(e.target.value) || 0)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">End Time (s)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editEnd}
                  onChange={(e) => setEditEnd(parseFloat(e.target.value) || 0)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>
            </div>
          )}

          {/* Cut: Reason */}
          {card.type === 'cut' && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Cut Reason / Tag</span>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Removed dead air"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </label>
          )}

          {/* Overlay: Direct typography & design controls */}
          {card.type === 'overlay' && (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Text</span>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Text to display"
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Placement</span>
                  <select
                    value={editPlacement}
                    onChange={(e) => setEditPlacement(e.target.value as TextPlacement)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="center">Center</option>
                    <option value="top_left">Top Left</option>
                    <option value="top_center">Top Center</option>
                    <option value="top_right">Top Right</option>
                    <option value="bottom_left">Bottom Left</option>
                    <option value="bottom_center">Bottom Center</option>
                    <option value="bottom_right">Bottom Right</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Font Family</span>
                  <select
                    value={editFontFamily}
                    onChange={(e) => setEditFontFamily(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Inter, system-ui, sans-serif">Inter (Sans)</option>
                    <option value="Times New Roman, serif">Times New Roman (Serif)</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Impact, sans-serif">Impact</option>
                    <option value="Courier New, monospace">Courier New (Mono)</option>
                    <option value="Georgia, serif">Georgia</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Font Size (px)</span>
                  <input
                    type="number"
                    min="14"
                    max="120"
                    value={editFontSize}
                    onChange={(e) => setEditFontSize(parseInt(e.target.value, 10) || 36)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Text Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={editTextColor.startsWith('#') ? editTextColor : '#ffffff'}
                      onChange={(e) => setEditTextColor(e.target.value)}
                      className="w-6 h-6 rounded border border-zinc-700 bg-zinc-900 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={editTextColor}
                      onChange={(e) => setEditTextColor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-1.5 py-1 text-[11px] text-white font-mono"
                    />
                  </div>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Bg Color</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={editBgColor.startsWith('#') ? editBgColor : '#000000'}
                      onChange={(e) => setEditBgColor(e.target.value)}
                      className="w-6 h-6 rounded border border-zinc-700 bg-zinc-900 cursor-pointer p-0"
                    />
                    <input
                      type="text"
                      value={editBgColor}
                      onChange={(e) => setEditBgColor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-1.5 py-1 text-[11px] text-white font-mono"
                    />
                  </div>
                </label>
              </div>

              {/* Inverted Knockout Toggle */}
              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsKnockout}
                  onChange={(e) => setEditIsKnockout(e.target.checked)}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-xs text-zinc-300">
                  Inverted Knockout (Video plays inside text letters)
                </span>
              </label>
            </div>
          )}

          {/* Zoom: Scale, Target Anchor, Transition */}
          {card.type === 'zoom' && (
            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Scale</span>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="3"
                  value={editScale}
                  onChange={(e) => setEditScale(parseFloat(e.target.value) || 1.15)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Anchor</span>
                <select
                  value={editAnchor}
                  onChange={(e) => setEditAnchor(e.target.value as ZoomTargetAnchor)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="center">Center</option>
                  <option value="speaker_face">Speaker Face</option>
                  <option value="top_center">Top Center</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Transition</span>
                <select
                  value={editTransition}
                  onChange={(e) => setEditTransition(e.target.value as ZoomTransition)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="instant_jump">Instant Jump</option>
                  <option value="smooth_ease_in">Smooth Ease In</option>
                </select>
              </label>
            </div>
          )}

          {/* Captions: Style, Highlight Color */}
          {card.type === 'captions' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Subtitle Style</span>
                <select
                  value={editCaptionStyle}
                  onChange={(e) => setEditCaptionStyle(e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="karaoke_bounce">Karaoke Bounce</option>
                  <option value="minimal_box">Minimal Box</option>
                  <option value="clean_sans">Clean Sans</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Highlight Color</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editHighlightColor}
                    onChange={(e) => setEditHighlightColor(e.target.value)}
                    className="w-7 h-7 rounded border border-zinc-700 bg-zinc-900 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={editHighlightColor}
                    onChange={(e) => setEditHighlightColor(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </label>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800">
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-md shadow-emerald-950/40 transition cursor-pointer"
            >
              <Check size={12} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      ) : (
        /* Description */
        <p className="text-xs text-zinc-400 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/60 font-mono break-all">
          {card.description}
        </p>
      )}

      {/* Micro-controls: Nudge Boundaries */}
      {!isEditing && (
        card.type !== 'captions' ? (
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/40 text-[11px] text-zinc-400">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Trim Edge:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNudge(card, -0.2, 'start')}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-[10px] transition cursor-pointer"
                title="Shift start -0.2s"
              >
                -0.2s
              </button>
              <button
                onClick={() => onNudge(card, 0.2, 'start')}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-[10px] transition cursor-pointer"
                title="Shift start +0.2s"
              >
                +0.2s
              </button>
              <span className="text-zinc-600">|</span>
              <button
                onClick={() => onNudge(card, -0.2, 'end')}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-[10px] transition cursor-pointer"
                title="Shift end -0.2s"
              >
                End -0.2s
              </button>
              <button
                onClick={() => onNudge(card, 0.2, 'end')}
                className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono text-[10px] transition cursor-pointer"
                title="Shift end +0.2s"
              >
                End +0.2s
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-1 border-t border-zinc-800/40 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Track: All Segments</span>
            <span className="text-emerald-400 font-mono">Word-by-word synced</span>
          </div>
        )
      )}
    </div>
  );
};
