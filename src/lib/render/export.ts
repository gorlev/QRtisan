/** PNG/SVG dışa aktarma ve indirme yardımcıları (yalnızca tarayıcı). */

import { renderSceneToCanvas, type CanvasRenderDeps } from './canvas';
import type { Scene } from './scene-types';

/** Sahneyi gerçek bir PNG blob'una dönüştürür. */
export async function sceneToPngBlob(scene: Scene, deps: CanvasRenderDeps = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(scene.width));
  canvas.height = Math.max(1, Math.round(scene.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tuval oluşturulamadı.');
  renderSceneToCanvas(ctx, scene, deps);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG üretilemedi.'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, filename: string, mime = 'image/svg+xml;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

export function buildFileName(prefix: string, extension: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${prefix}-${stamp}.${extension}`;
}
