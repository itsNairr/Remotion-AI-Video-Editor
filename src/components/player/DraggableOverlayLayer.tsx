'use client';

import { UseVideoEditorReturn } from '@/composables/useVideoEditor';
import { TextOverlay } from '@/types';
import { getActiveOverlays } from '@/utils/editor';
import { computeTextMetrics } from '@/utils/textRendering';
import { Move } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

interface DraggableOverlayLayerProps {
  editor: UseVideoEditorReturn;
}

export const DraggableOverlayLayer: React.FC<DraggableOverlayLayerProps> = ({ editor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);

  const { project, playhead, updateItem, selectedElement, setSelectedElement } = editor;
  const activeOverlays = getActiveOverlays(playhead.currentSec, project.overlays);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, overlay: TextOverlay) => {
      e.stopPropagation();
      e.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      setActiveDragId(overlay.id);
      setSelectedElement?.({ track: 'overlays', id: overlay.id });

      const metrics = computeTextMetrics(overlay, project.width, project.height);
      const initialPercentX = overlay.posX !== undefined ? overlay.posX : (metrics.textX / project.width) * 100;
      const initialPercentY = overlay.posY !== undefined ? overlay.posY : (metrics.textY / project.height) * 100;

      setDragCoords({ x: Math.round(initialPercentX), y: Math.round(initialPercentY) });

      const onMouseMove = (moveEvent: MouseEvent) => {
        const currentRect = container.getBoundingClientRect();
        let rawPercentX = ((moveEvent.clientX - currentRect.left) / currentRect.width) * 100;
        let rawPercentY = ((moveEvent.clientY - currentRect.top) / currentRect.height) * 100;

        // Clamp inside frame
        rawPercentX = Math.max(6, Math.min(94, rawPercentX));
        rawPercentY = Math.max(6, Math.min(94, rawPercentY));

        // Smart snap to key alignments
        if (Math.abs(rawPercentX - 50) < 3.5) rawPercentX = 50; // Center X
        if (Math.abs(rawPercentY - 50) < 3.5) rawPercentY = 50; // Center Y
        if (Math.abs(rawPercentY - 82) < 3.5) rawPercentY = 82; // Bottom Center Y
        if (Math.abs(rawPercentY - 14) < 3.5) rawPercentY = 14; // Top Center Y

        const roundedX = Number(rawPercentX.toFixed(1));
        const roundedY = Number(rawPercentY.toFixed(1));

        setDragCoords({ x: roundedX, y: roundedY });

        // Update overlay in-place in editor
        updateItem('overlays', overlay.id, {
          posX: roundedX,
          posY: roundedY,
          placement: 'custom',
        });
      };

      const onMouseUp = () => {
        setActiveDragId(null);
        setDragCoords(null);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [project.width, project.height, updateItem, setSelectedElement]
  );

  if (activeOverlays.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 pointer-events-none select-none overflow-hidden"
    >
      {activeOverlays.map((overlay) => {
        const metrics = computeTextMetrics(overlay, project.width, project.height);
        const percentX = overlay.posX !== undefined ? overlay.posX : (metrics.textX / project.width) * 100;
        const percentY = overlay.posY !== undefined ? overlay.posY : (metrics.textY / project.height) * 100;

        const isDraggingThis = activeDragId === overlay.id;
        const isSelected = selectedElement?.id === overlay.id || isDraggingThis;

        return (
          <div
            key={overlay.id}
            onMouseDown={(e) => handleMouseDown(e, overlay)}
            style={{
              left: `${percentX}%`,
              top: `${percentY}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute pointer-events-auto cursor-grab active:cursor-grabbing group transition-transform ${
              isDraggingThis ? 'scale-105 z-50' : 'z-30 hover:scale-102'
            }`}
          >
            {/* Direct Manipulation Frame Handle */}
            <div
              className={`relative rounded-xl transition-all duration-150 p-2 flex items-center justify-center ${
                isSelected
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black/50 shadow-2xl bg-emerald-500/10'
                  : 'hover:ring-2 hover:ring-white/40 hover:bg-white/5'
              }`}
            >
              {/* Overlay Label & Drag Icon Bar */}
              <div
                className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5 whitespace-nowrap shadow-lg transition-all ${
                  isDraggingThis
                    ? 'bg-emerald-500 text-black'
                    : isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black/80 text-zinc-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                <Move size={10} />
                <span>
                  {isDraggingThis && dragCoords
                    ? `X: ${dragCoords.x}% · Y: ${dragCoords.y}%`
                    : overlay.text.slice(0, 16)}
                </span>
              </div>

              {/* Ghost Bounding Box that matches visual dimensions */}
              <div
                style={{
                  width: `${Math.max(80, (metrics.boxWidth / project.width) * 100 * 4.5)}px`,
                  height: `${Math.max(36, (metrics.boxHeight / project.height) * 100 * 2.5)}px`,
                }}
                className={`border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${
                  isDraggingThis
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : isSelected
                    ? 'border-emerald-500/80 bg-emerald-500/5'
                    : 'border-transparent group-hover:border-white/30'
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
