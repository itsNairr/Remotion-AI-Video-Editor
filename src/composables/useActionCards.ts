'use client';

import { ActionCard, CaptionsConfig, ZoomTargetAnchor, ZoomTransition } from '@/types';
import { useMemo } from 'react';
import { UseVideoEditorReturn } from './useVideoEditor';

export function useActionCards(editor: UseVideoEditorReturn) {
  const { project, setProject, removeItem, updateItem, nudgeItem, updateCaptions } = editor;

  const actionCards: ActionCard[] = useMemo(() => {
    const cards: ActionCard[] = [];

    // Map cuts
    project.cuts.forEach((cut) => {
      cards.push({
        id: `card_${cut.id}`,
        type: 'cut',
        title: cut.ripple ? 'Ripple Cut Segment' : 'Cut Segment',
        description: cut.reason || 'Cut dead air',
        startSec: cut.startSec,
        endSec: cut.endSec,
        associatedId: cut.id,
        createdAt: 0,
        details: {
          reason: cut.reason,
          ripple: cut.ripple,
        },
      });
    });

    // Map text overlays with explicit design properties
    project.overlays.forEach((overlay) => {
      cards.push({
        id: `card_${overlay.id}`,
        type: 'overlay',
        title: overlay.isKnockout
          ? `Inverted Knockout Text (${overlay.placement || 'center'})`
          : `Text Overlay (${overlay.placement || 'center'})`,
        description: `"${overlay.text}" [${overlay.fontFamily || 'Inter'}]`,
        startSec: overlay.startSec,
        endSec: overlay.endSec,
        associatedId: overlay.id,
        createdAt: 0,
        details: {
          text: overlay.text,
          placement: overlay.placement,
          textColor: overlay.textColor,
          bgColor: overlay.bgColor,
          fontFamily: overlay.fontFamily,
          fontSize: overlay.fontSize,
          fontWeight: overlay.fontWeight,
          isKnockout: overlay.isKnockout,
        },
      });
    });

    // Map zooms
    project.zooms.forEach((zoom) => {
      cards.push({
        id: `card_${zoom.id}`,
        type: 'zoom',
        title: `Camera Zoom (${zoom.target_anchor || 'center'})`,
        description: `${Math.round(zoom.scale * 100)}% zoom [${zoom.transition || 'instant'}]`,
        startSec: zoom.startSec,
        endSec: zoom.endSec,
        associatedId: zoom.id,
        createdAt: 0,
        details: {
          scale: zoom.scale,
          target_anchor: zoom.target_anchor || 'center',
          transition: zoom.transition || 'instant_jump',
        },
      });
    });

    // Map global captions
    if (project.captions?.enabled) {
      cards.push({
        id: 'card_captions',
        type: 'captions',
        title: 'Dynamic Subtitles',
        description: `Style: ${project.captions.style} (${project.captions.highlight_color})`,
        startSec: 0,
        endSec: project.durationSec,
        associatedId: 'captions',
        createdAt: 0,
        details: {
          style: project.captions.style,
          highlight_color: project.captions.highlight_color,
          max_words_per_line: project.captions.max_words_per_line,
        },
      });
    }

    return cards.sort((a, b) => a.startSec - b.startSec);
  }, [project.cuts, project.overlays, project.zooms, project.captions, project.durationSec]);

  const deleteCard = (card: ActionCard) => {
    if (card.type === 'cut') {
      removeItem('cuts', card.associatedId);
    } else if (card.type === 'overlay') {
      removeItem('overlays', card.associatedId);
    } else if (card.type === 'zoom') {
      removeItem('zooms', card.associatedId);
    } else if (card.type === 'captions') {
      setProject((prev) => ({ ...prev, captions: undefined }));
    }
  };

  const updateCard = (card: ActionCard, updates: Record<string, unknown>) => {
    if (card.type === 'cut') {
      updateItem('cuts', card.associatedId, {
        ...(updates.startSec !== undefined && { startSec: Number(updates.startSec) }),
        ...(updates.endSec !== undefined && { endSec: Number(updates.endSec) }),
        ...(updates.reason !== undefined && { reason: updates.reason }),
      });
    } else if (card.type === 'overlay') {
      updateItem('overlays', card.associatedId, {
        ...(updates.startSec !== undefined && { startSec: Number(updates.startSec) }),
        ...(updates.endSec !== undefined && { endSec: Number(updates.endSec) }),
        ...(updates.text !== undefined && { text: updates.text }),
        ...(updates.placement !== undefined && { placement: updates.placement }),
        ...(updates.textColor !== undefined && { textColor: updates.textColor }),
        ...(updates.bgColor !== undefined && { bgColor: updates.bgColor }),
        ...(updates.fontFamily !== undefined && { fontFamily: updates.fontFamily }),
        ...(updates.fontSize !== undefined && { fontSize: Number(updates.fontSize) }),
        ...(updates.fontWeight !== undefined && { fontWeight: updates.fontWeight }),
        ...(updates.isKnockout !== undefined && { isKnockout: Boolean(updates.isKnockout) }),
      });
    } else if (card.type === 'zoom') {
      updateItem('zooms', card.associatedId, {
        ...(updates.startSec !== undefined && { startSec: Number(updates.startSec) }),
        ...(updates.endSec !== undefined && { endSec: Number(updates.endSec) }),
        ...(updates.scale !== undefined && { scale: Number(updates.scale) }),
        ...(updates.target_anchor !== undefined && { target_anchor: updates.target_anchor as ZoomTargetAnchor }),
        ...(updates.transition !== undefined && { transition: updates.transition as ZoomTransition }),
      });
    } else if (card.type === 'captions') {
      updateCaptions({
        ...(updates.style !== undefined && { style: updates.style as CaptionsConfig['style'] }),
        ...(updates.highlight_color !== undefined && { highlight_color: String(updates.highlight_color) }),
        ...(updates.max_words_per_line !== undefined && { max_words_per_line: Number(updates.max_words_per_line) }),
      });
    }
  };

  const nudgeCard = (card: ActionCard, deltaSec: number, edge: 'start' | 'end') => {
    if (card.type === 'cut') {
      nudgeItem('cuts', card.associatedId, deltaSec, edge);
    } else if (card.type === 'overlay') {
      nudgeItem('overlays', card.associatedId, deltaSec, edge);
    } else if (card.type === 'zoom') {
      nudgeItem('zooms', card.associatedId, deltaSec, edge);
    }
  };

  return {
    actionCards,
    deleteCard,
    updateCard,
    nudgeCard,
  };
}
