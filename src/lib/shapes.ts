/**
 * Modül ve köşe (finder) şekillerinin SVG path üretimi.
 *
 * Tek kaynak kural: tüm şekiller SVG `d` dizgisi olarak üretilir; tarayıcıda
 * Path2D, dışa aktarımda `<path>` olarak aynı geometri kullanılır.
 */

import type { DotType, EyeInnerType, EyeOuterType } from './types';

const round = (n: number): number => Math.round(n * 1000) / 1000;

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/**
 * Köşe yarıçapları verilen dikdörtgen yolu.
 * Sıfır yarıçap, arc komutunun düz çizgiye indirgenmesine yol açtığı için
 * çok küçük bir değere (0.001) yükseltilir.
 */
export function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  radii: [number, number, number, number],
): string {
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = radii.map((r) => clamp(r, 0, max));
  if (tl < 0.01 && tr < 0.01 && br < 0.01 && bl < 0.01) {
    return `M${round(x)},${round(y)}H${round(x + w)}V${round(y + h)}H${round(x)}Z`;
  }
  // Sıfır yarıçap, arc komutunun düz çizgiye indirgenmesine yol açtığı için
  // çok küçük bir değere (0.001) yükseltilir.
  const [tlA, trA, brA, blA] = [tl, tr, br, bl].map((r) => Math.max(0.001, r));
  return [
    `M${round(x + tlA)},${round(y)}`,
    `H${round(x + w - trA)}`,
    `A${round(trA)},${round(trA)} 0 0 1 ${round(x + w)},${round(y + trA)}`,
    `V${round(y + h - brA)}`,
    `A${round(brA)},${round(brA)} 0 0 1 ${round(x + w - brA)},${round(y + h)}`,
    `H${round(x + blA)}`,
    `A${round(blA)},${round(blA)} 0 0 1 ${round(x)},${round(y + h - blA)}`,
    `V${round(y + tlA)}`,
    `A${round(tlA)},${round(tlA)} 0 0 1 ${round(x + tlA)},${round(y)}`,
    'Z',
  ].join('');
}

export function circlePath(cx: number, cy: number, r: number): string {
  return [
    `M${round(cx - r)},${round(cy)}`,
    `A${round(r)},${round(r)} 0 1 0 ${round(cx + r)},${round(cy)}`,
    `A${round(r)},${round(r)} 0 1 0 ${round(cx - r)},${round(cy)}`,
    'Z',
  ].join('');
}

/** Bir modülün (kenar uzunluğu m olan kare hücre) şekli. */
export function modulePath(style: DotType, x: number, y: number, m: number): string {
  switch (style) {
    case 'square':
      return `M${round(x)},${round(y)}H${round(x + m)}V${round(y + m)}H${round(x)}Z`;
    case 'rounded':
      return roundedRectPath(x, y, m, m, [0.25 * m, 0.25 * m, 0.25 * m, 0.25 * m]);
    case 'extra-rounded':
      return roundedRectPath(x, y, m, m, [0.3 * m, 0.3 * m, 0.3 * m, 0.3 * m]);
    case 'dots':
      return circlePath(x + m / 2, y + m / 2, 0.5 * m);
    case 'classy':
      return roundedRectPath(x, y, m, m, [0.5 * m, 0, 0.5 * m, 0]);
    case 'classy-rounded':
      return roundedRectPath(x, y, m, m, [0.5 * m, 0.15 * m, 0.5 * m, 0.15 * m]);
    case 'diamond': {
      const half = 0.54 * m;
      const cx = x + m / 2;
      const cy = y + m / 2;
      return `M${round(cx)},${round(cy - half)}L${round(cx + half)},${round(cy)}L${round(cx)},${round(cy + half)}L${round(cx - half)},${round(cy)}Z`;
    }
    default:
      return `M${round(x)},${round(y)}H${round(x + m)}V${round(y + m)}H${round(x)}Z`;
  }
}

/**
 * 7×7 bulucu desen çerçevesi (halka). İç delik aynı yolun ikinci alt yolu
 * olduğundan `evenodd` dolgu kuralıyla delinir.
 */
export function eyeOuterRingPath(style: EyeOuterType, x: number, y: number, m: number): string {
  const size = 7 * m;
  if (style === 'dot') {
    const outer = circlePath(x + size / 2, y + size / 2, 3.5 * m);
    const inner = circlePath(x + size / 2, y + size / 2, 2.5 * m);
    return `${outer} ${inner}`;
  }
  if (style === 'rounded') {
    const outer = roundedRectPath(x, y, size, size, [2.2 * m, 2.2 * m, 2.2 * m, 2.2 * m]);
    const inner = roundedRectPath(x + m, y + m, 5 * m, 5 * m, [1.5 * m, 1.5 * m, 1.5 * m, 1.5 * m]);
    return `${outer} ${inner}`;
  }
  const outer = roundedRectPath(x, y, size, size, [0, 0, 0, 0]);
  const inner = roundedRectPath(x + m, y + m, 5 * m, 5 * m, [0, 0, 0, 0]);
  return `${outer} ${inner}`;
}

/** Bulucu desenin 3×3 iç gözü. */
export function eyeInnerPath(style: EyeInnerType, x: number, y: number, m: number): string {
  const size = 3 * m;
  if (style === 'dot') {
    return circlePath(x + size / 2, y + size / 2, 1.5 * m);
  }
  if (style === 'rounded') {
    return roundedRectPath(x, y, size, size, [0.85 * m, 0.85 * m, 0.85 * m, 0.85 * m]);
  }
  return roundedRectPath(x, y, size, size, [0, 0, 0, 0]);
}
