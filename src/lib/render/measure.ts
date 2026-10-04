/** Yazı ölçümü — canvas ölçüleri SVG/PNG ile aynı yerleşimi üretir. */

import { DISPLAY_FONT_STACK } from '../fonts';
import type { MeasureText } from '../types';

/** Tarayıcıda Manrope ile gerçek metin genişliği ölçer. */
export function createMeasureText(): MeasureText {
  if (typeof document === 'undefined') {
    return (text, fontSize) => text.length * fontSize * 0.55;
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return (text, fontSize) => text.length * fontSize * 0.55;
  }
  return (text: string, fontSize: number, weight: number): number => {
    ctx.font = `${weight} ${fontSize}px ${DISPLAY_FONT_STACK}`;
    return ctx.measureText(text).width;
  };
}

/** Testler için basit, deterministik ölçüm. */
export function createFallbackMeasureText(): MeasureText {
  return (text, fontSize) => text.length * fontSize * 0.55;
}
