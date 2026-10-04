/** Sahneyi bağımsız (self-contained) SVG metnine çevirir. */

import type { Scene } from './scene-types';

export interface SvgOptions {
  /** SVG içine gömülecek @font-face kuralları (opsiyonel). */
  fontCss?: string;
  title?: string;
}

const fmt = (n: number): string => {
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded);
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function sceneToSvg(scene: Scene, options: SvgOptions = {}): string {
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(scene.width)}" height="${fmt(scene.height)}" viewBox="0 0 ${fmt(scene.width)} ${fmt(scene.height)}" role="img" aria-label="${escapeXml(options.title ?? 'QR kod')}">`,
  );

  if (options.fontCss) {
    parts.push(`<defs><style type="text/css"><![CDATA[${options.fontCss}]]></style></defs>`);
  }

  if (scene.background) {
    parts.push(`<rect width="${fmt(scene.width)}" height="${fmt(scene.height)}" fill="${scene.background}"/>`);
  }

  for (const path of scene.paths) {
    const rule = path.fillRule === 'evenodd' ? ' fill-rule="evenodd"' : '';
    parts.push(`<path d="${path.d}" fill="${path.fill}"${rule}/>`);
  }

  for (const stroke of scene.strokes) {
    parts.push(
      `<path d="${stroke.d}" fill="none" stroke="${stroke.color}" stroke-width="${fmt(stroke.width)}" stroke-linecap="${stroke.cap ?? 'butt'}" stroke-linejoin="${stroke.join ?? 'miter'}"/>`,
    );
  }

  for (const rect of scene.rects) {
    const rx = rect.rx ? ` rx="${fmt(rect.rx)}"` : '';
    parts.push(
      `<rect x="${fmt(rect.x)}" y="${fmt(rect.y)}" width="${fmt(rect.w)}" height="${fmt(rect.h)}"${rx} fill="${rect.fill}"/>`,
    );
  }

  for (const image of scene.images) {
    parts.push(
      `<image href="${escapeXml(image.href)}" x="${fmt(image.x)}" y="${fmt(image.y)}" width="${fmt(image.w)}" height="${fmt(image.h)}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  for (const text of scene.texts) {
    parts.push(
      `<text x="${fmt(text.x)}" y="${fmt(text.y)}" font-family="${escapeXml(text.family)}" font-size="${fmt(text.size)}" font-weight="${text.weight}" fill="${text.fill}" text-anchor="${text.anchor}" dominant-baseline="central">${escapeXml(text.text)}</text>`,
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}
