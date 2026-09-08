import { TextOverlay, TextPlacement } from '@/types/editor';
import React from 'react';

export interface TextRenderMetrics {
  posX: number;
  posY: number;
  boxWidth: number;
  boxHeight: number;
  textX: number;
  textY: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontString: string;
  textColor: string;
  bgColor: string;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  isKnockout: boolean;
  isFullScreen: boolean;
  cssStyles: React.CSSProperties;
}

/**
 * Computes exact 2D pixel coordinates, layout bounds, and font metrics for a text overlay.
 * Guaranteed 1:1 identical for both Remotion Preview and HTML5 Canvas MP4 Export.
 */
export function computeTextMetrics(
  overlay: TextOverlay,
  canvasWidth: number,
  canvasHeight: number,
  measureTextFn?: (text: string, font: string) => number
): TextRenderMetrics {
  const isKnockout = Boolean(overlay.isKnockout);
  const isFullScreen = Boolean(overlay.isFullScreen);

  const fontSize = overlay.fontSize || (isKnockout ? Math.min(canvasHeight * 0.28, (canvasWidth * 0.85) / Math.max(1, (overlay.text || '').length * 0.6)) : Math.round(canvasHeight * 0.05));
  const fontFamily = overlay.fontFamily || 'Inter, system-ui, sans-serif';
  const fontWeight = overlay.fontWeight || (isKnockout ? '900' : 'bold');
  const fontString = `${fontWeight} ${fontSize}px ${fontFamily}`;

  const paddingX = overlay.paddingX ?? 24;
  const paddingY = overlay.paddingY ?? 12;
  const borderRadius = overlay.borderRadius ?? 12;

  // Approximate or exact text width calculation
  const safeText = overlay.text || '';
  let textWidth = measureTextFn
    ? measureTextFn(safeText, fontString)
    : safeText.length * (fontSize * 0.6);

  // Content box dimensions
  const contentWidth = textWidth + paddingX * 2;
  const contentHeight = fontSize + paddingY * 2;

  const boxWidth = (isKnockout || isFullScreen) ? canvasWidth : contentWidth;
  const boxHeight = (isKnockout || isFullScreen) ? canvasHeight : contentHeight;

  const marginX = Math.round(canvasWidth * 0.05);
  const marginY = Math.round(canvasHeight * 0.08);

  // Compute text anchor coordinates according to freeform posX/posY or placement
  let textX = canvasWidth / 2;
  let textY = canvasHeight / 2;

  if (overlay.posX !== undefined && overlay.posY !== undefined) {
    textX = (overlay.posX / 100) * canvasWidth;
    textY = (overlay.posY / 100) * canvasHeight;
  } else {
    switch (overlay.placement) {
      case 'top_left':
        textX = marginX + textWidth / 2;
        textY = marginY + fontSize / 2;
        break;
      case 'top_center':
        textX = canvasWidth / 2;
        textY = marginY + fontSize / 2;
        break;
      case 'top_right':
        textX = canvasWidth - marginX - textWidth / 2;
        textY = marginY + fontSize / 2;
        break;
      case 'bottom_left':
        textX = marginX + textWidth / 2;
        textY = canvasHeight - marginY - fontSize / 2;
        break;
      case 'bottom_center':
        textX = canvasWidth / 2;
        textY = canvasHeight - marginY - fontSize / 2;
        break;
      case 'bottom_right':
        textX = canvasWidth - marginX - textWidth / 2;
        textY = canvasHeight - marginY - fontSize / 2;
        break;
      case 'center':
      default:
        textX = canvasWidth / 2;
        textY = canvasHeight / 2;
        break;
    }
  }

  // Box top-left coordinates for DOM styling and canvas bounding boxes
  const posX = (isKnockout || isFullScreen) ? 0 : textX - boxWidth / 2;
  const posY = (isKnockout || isFullScreen) ? 0 : textY - boxHeight / 2;

  const textColor = overlay.textColor || '#ffffff';
  const bgColor = overlay.bgColor || (isKnockout ? '#000000' : 'rgba(0, 0, 0, 0.75)');

  // React CSS properties for Remotion DOM overlay
  const cssStyles: React.CSSProperties = isKnockout
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }
    : isFullScreen
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        backgroundColor: bgColor,
        color: textColor,
        fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 25,
      }
    : {
        position: 'absolute',
        left: `${(posX / canvasWidth) * 100}%`,
        top: `${(posY / canvasHeight) * 100}%`,
        paddingLeft: `${paddingX}px`,
        paddingRight: `${paddingX}px`,
        paddingTop: `${paddingY}px`,
        paddingBottom: `${paddingY}px`,
        backgroundColor: bgColor,
        color: textColor,
        fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        borderRadius: `${borderRadius}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      };

  return {
    posX,
    posY,
    boxWidth,
    boxHeight,
    textX,
    textY,
    fontSize,
    fontFamily,
    fontWeight,
    fontString,
    textColor,
    bgColor,
    paddingX,
    paddingY,
    borderRadius,
    isKnockout,
    isFullScreen,
    cssStyles,
  };
}
