/**
 * Yerleşim (layout) hesabı — çerçeve, etiket ve dış ölçüler.
 *
 * Tüm ölçüler QR kenar uzunluğuna (qrSize) oranlıdır; bu yüzden önizleme,
 * PNG ve SVG çıktıları birebir aynı geometriyi kullanır.
 */

import { contrastRatio, readableTextOn } from './colors';
import { DISPLAY_FONT_STACK } from './fonts';
import type { ScenePath, SceneRect, SceneStroke, SceneText } from './render/scene-types';
import { roundedRectPath } from './shapes';
import type { FrameType, MeasureText } from './types';

export interface LayoutChrome {
  paths: ScenePath[];
  strokes: SceneStroke[];
  rects: SceneRect[];
  texts: SceneText[];
}

export interface Layout {
  width: number;
  height: number;
  qrX: number;
  qrY: number;
  qrSize: number;
  /** null = şeffaf zemin. */
  background: string | null;
  chrome: LayoutChrome;
}

export interface LayoutInput {
  qrSize: number;
  frame: FrameType;
  caption: string;
  frameRadius: number;
  fg: string;
  bg: string;
  transparentBg: boolean;
  measureText: MeasureText;
}

export const CAPTION_WEIGHT = 700;

function emptyChrome(): LayoutChrome {
  return { paths: [], strokes: [], rects: [], texts: [] };
}

/** Uzun etiketleri kutuya sığdırır; okunabilirlik için en fazla %55 küçültür. */
export function fitCaption(
  text: string,
  baseSize: number,
  maxWidth: number,
  measureText: MeasureText,
): { fontSize: number; width: number } {
  if (maxWidth <= 0) return { fontSize: baseSize, width: 0 };
  const measured = measureText(text, baseSize, CAPTION_WEIGHT);
  if (measured <= maxWidth || measured === 0) {
    return { fontSize: baseSize, width: measured };
  }
  const scale = maxWidth / measured;
  const fontSize = baseSize * Math.max(0.45, Math.min(1, scale));
  return { fontSize, width: measureText(text, fontSize, CAPTION_WEIGHT) };
}

function captionPrimitive(
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
): SceneText {
  return {
    text,
    x,
    y,
    size,
    fill,
    weight: CAPTION_WEIGHT,
    family: DISPLAY_FONT_STACK,
    anchor: 'middle',
  };
}

/** Arka planla neredeyse aynı renkteki çerçeve çizgilerini görünür hale getirir. */
function visibleStroke(color: string, background: string): string {
  return contrastRatio(color, background) < 1.4 ? readableTextOn(background) : color;
}

function plainLayout(qrSize: number, background: string | null, padRatio = 5): Layout {
  const s = qrSize / 100;
  const pad = padRatio * s;
  return {
    width: qrSize + pad * 2,
    height: qrSize + pad * 2,
    qrX: pad,
    qrY: pad,
    qrSize,
    background,
    chrome: emptyChrome(),
  };
}

export function computeLayout(input: LayoutInput): Layout {
  const { qrSize, frame, frameRadius, fg, bg, transparentBg, measureText } = input;
  const caption = input.caption.trim();
  const s = qrSize / 100;
  const frameBg = transparentBg ? '#FFFFFF' : bg;
  const chrome = emptyChrome();

  if (frame === 'none') {
    return {
      width: qrSize,
      height: qrSize,
      qrX: 0,
      qrY: 0,
      qrSize,
      background: transparentBg ? null : bg,
      chrome,
    };
  }

  if (frame === 'border') {
    const pad = 7 * s;
    const width = qrSize + pad * 2;
    const height = width;
    const radius = (2 + (frameRadius / 100) * 14) * s;
    const inset = 1.2 * s;
    const strokeWidth = 1.7 * s;
    chrome.strokes.push({
      d: roundedRectPathD(inset, inset, width - inset * 2, height - inset * 2, Math.max(radius - inset, 1)),
      color: visibleStroke(fg, frameBg),
      width: strokeWidth,
      cap: 'butt',
      join: 'round',
    });
    return { width, height, qrX: pad, qrY: pad, qrSize, background: frameBg, chrome };
  }

  if (frame === 'labelBottom' || frame === 'labelTop') {
    if (!caption) return plainLayout(qrSize, frameBg);
    const padX = 6 * s;
    const width = qrSize + padX * 2;
    const bandH = 15 * s;
    const bandRadius = (frameRadius / 100) * (bandH / 2);
    const bandX = 2.5 * s;
    const bandW = width - bandX * 2;
    const gap = 4.5 * s;
    const bandFill = fg;
    const textColor = readableTextOn(bandFill);

    if (frame === 'labelTop') {
      const bandY = 3.5 * s;
      const qrY = bandY + bandH + gap;
      const height = qrY + qrSize + 6 * s;
      chrome.rects.push({ x: bandX, y: bandY, w: bandW, h: bandH, rx: bandRadius, fill: bandFill });
      const fitted = fitCaption(caption, 6.8 * s, bandW - 8 * s, measureText);
      chrome.texts.push(captionPrimitive(caption, width / 2, bandY + bandH / 2, fitted.fontSize, textColor));
      return { width, height, qrX: padX, qrY, qrSize, background: frameBg, chrome };
    }

    const qrY = 6 * s;
    const bandY = qrY + qrSize + gap;
    const height = bandY + bandH + 3.5 * s;
    chrome.rects.push({ x: bandX, y: bandY, w: bandW, h: bandH, rx: bandRadius, fill: bandFill });
    const fitted = fitCaption(caption, 6.8 * s, bandW - 8 * s, measureText);
    chrome.texts.push(captionPrimitive(caption, width / 2, bandY + bandH / 2, fitted.fontSize, textColor));
    return { width, height, qrX: padX, qrY, qrSize, background: frameBg, chrome };
  }

  if (frame === 'bubble') {
    const pad = 7 * s;
    const width = qrSize + pad * 2;
    const inset = 3.5 * s;
    const outlineW = width - inset * 2;
    const outlineBottom = inset + outlineW;
    const radius = (6 + (frameRadius / 100) * 12) * s;
    const strokeColor = visibleStroke(fg, frameBg);
    chrome.strokes.push({
      d: roundedRectPathD(inset, inset, outlineW, outlineW, radius),
      color: strokeColor,
      width: 1.5 * s,
      cap: 'butt',
      join: 'round',
    });
    const tailH = 6.5 * s;
    const tailW = 13 * s;
    const cx = width / 2;
    const tailD = `M${cx - tailW / 2},${outlineBottom}H${cx + tailW / 2}L${cx + 2.2 * s},${outlineBottom + tailH - 2.2 * s}Q${cx},${outlineBottom + tailH} ${cx - 2.2 * s},${outlineBottom + tailH - 2.2 * s}Z`;
    chrome.paths.push({ d: tailD, fill: strokeColor });
    const captionH = caption ? 15 * s : 0;
    const height = outlineBottom + tailH + captionH + 3.5 * s;
    if (caption) {
      const fitted = fitCaption(caption, 6.5 * s, width - 6 * s, measureText);
      chrome.texts.push(
        captionPrimitive(caption, width / 2, outlineBottom + tailH + captionH / 2, fitted.fontSize, readableTextOn(frameBg)),
      );
    }
    return { width, height, qrX: pad, qrY: pad, qrSize, background: frameBg, chrome };
  }

  if (frame === 'corners') {
    const pad = 7 * s;
    const width = qrSize + pad * 2;
    const markLen = 9 * s;
    const thickness = 1.7 * s;
    const m = 3 * s;
    const w = width;
    const h = qrSize + pad * 2;
    const d = [
      `M${m},${m + markLen}V${m}H${m + markLen}`,
      `M${w - m - markLen},${m}H${w - m}V${m + markLen}`,
      `M${w - m},${h - m - markLen}V${h - m}H${w - m - markLen}`,
      `M${m + markLen},${h - m}H${m}V${h - m - markLen}`,
    ].join(' ');
    chrome.strokes.push({
      d,
      color: visibleStroke(fg, frameBg),
      width: thickness,
      cap: 'butt',
      join: 'miter',
    });
    const captionH = caption ? 16 * s : 0;
    const height = qrSize + pad * 2 + captionH;
    if (caption) {
      const fitted = fitCaption(caption, 6.5 * s, width - 6 * s, measureText);
      chrome.texts.push(
        captionPrimitive(caption, width / 2, qrSize + pad * 2 + captionH / 2, fitted.fontSize, readableTextOn(frameBg)),
      );
    }
    return { width, height, qrX: pad, qrY: pad, qrSize, background: frameBg, chrome };
  }

  // badge
  if (!caption) return plainLayout(qrSize, frameBg);
  const pad = 6 * s;
  const width = qrSize + pad * 2;
  const qrY = 6 * s;
  const gap = 4.5 * s;
  const badgeH = 12.5 * s;
  const badgeY = qrY + qrSize + gap;
  const height = badgeY + badgeH + 6 * s;
  const badgeFill = fg;
  const textColor = readableTextOn(badgeFill);
  const measured = measureText(caption, 6.4 * s, CAPTION_WEIGHT);
  const badgeW = Math.min(measured + 11 * s, width - 4 * s);
  const fitted = fitCaption(caption, 6.4 * s, badgeW - 8 * s, measureText);
  const badgeX = (width - badgeW) / 2;
  chrome.rects.push({
    x: badgeX,
    y: badgeY,
    w: badgeW,
    h: badgeH,
    rx: badgeH / 2,
    fill: badgeFill,
  });
  chrome.texts.push(captionPrimitive(caption, width / 2, badgeY + badgeH / 2, fitted.fontSize, textColor));
  return { width, height, qrX: pad, qrY, qrSize, background: frameBg, chrome };
}

/** geometry.ts içinde kısa yol: yuvarlatılmış dikdörtgen path'i. */
function roundedRectPathD(x: number, y: number, w: number, h: number, r: number): string {
  return roundedRectPath(x, y, w, h, [r, r, r, r]);
}
