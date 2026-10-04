/** Sahneyi Canvas 2D bağlamına çizer (tarayıcı ve Node testleri için ortak). */

import { roundedRectPath } from '../shapes';
import type { Scene } from './scene-types';

export interface CanvasRenderDeps {
  /** Node testlerinde @napi-rs/canvas Path2D'si enjekte edilir. */
  Path2D?: typeof Path2D;
  /** data URL → çizilebilir görsel çözücü. */
  resolveImage?: (href: string) => CanvasImageSource | null;
}

export function renderSceneToCanvas(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  deps: CanvasRenderDeps = {},
): void {
  const PathCtor = deps.Path2D ?? (typeof Path2D !== 'undefined' ? Path2D : undefined);
  if (!PathCtor) throw new Error('Path2D desteklenmiyor.');

  ctx.save();
  ctx.clearRect(0, 0, scene.width, scene.height);

  if (scene.background) {
    ctx.fillStyle = scene.background;
    ctx.fillRect(0, 0, scene.width, scene.height);
  }

  for (const path of scene.paths) {
    ctx.fillStyle = path.fill;
    ctx.fill(new PathCtor(path.d), path.fillRule ?? 'nonzero');
  }

  for (const stroke of scene.strokes) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = stroke.cap ?? 'butt';
    ctx.lineJoin = stroke.join ?? 'miter';
    ctx.stroke(new PathCtor(stroke.d));
  }

  for (const rect of scene.rects) {
    const radius = rect.rx ?? 0;
    ctx.fillStyle = rect.fill;
    ctx.fill(new PathCtor(roundedRectPath(rect.x, rect.y, rect.w, rect.h, [radius, radius, radius, radius])));
  }

  for (const image of scene.images) {
    const element = deps.resolveImage?.(image.href);
    if (element) {
      ctx.drawImage(element, image.x, image.y, image.w, image.h);
    }
  }

  for (const text of scene.texts) {
    ctx.font = `${text.weight} ${text.size}px ${text.family}`;
    ctx.textAlign = text.anchor === 'middle' ? 'center' : text.anchor;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = text.fill;
    ctx.fillText(text.text, text.x, text.y);
  }

  ctx.restore();
}
