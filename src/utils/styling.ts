import { TextOverlay, TextPlacement } from '@/types/editor';

/**
 * Returns Tailwind positioning classes based on text placement
 */
export function getPositionClasses(placement?: TextPlacement | string): string {
  switch (placement) {
    case 'top_left':
      return 'top-8 left-8 items-start justify-start';
    case 'top_center':
      return 'top-8 left-1/2 -translate-x-1/2 items-center justify-start';
    case 'top_right':
      return 'top-8 right-8 items-end justify-start';
    case 'center':
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center';
    case 'bottom_left':
      return 'bottom-10 left-8 items-start justify-end';
    case 'bottom_right':
      return 'bottom-10 right-8 items-end justify-end';
    case 'bottom_center':
    default:
      return 'bottom-10 left-1/2 -translate-x-1/2 items-center justify-end';
  }
}

/**
 * Returns animation class for entrance
 */
export function getAnimationClasses(animation?: string): string {
  switch (animation) {
    case 'pop':
      return 'animate-in zoom-in-75 duration-200';
    case 'fade':
      return 'animate-in fade-in duration-300';
    case 'slide_up':
      return 'animate-in slide-in-from-bottom-4 duration-250';
    case 'none':
    default:
      return '';
  }
}
