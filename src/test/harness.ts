/** Test yardımcıları: sahneyi PNG'ye çiz ve ZXing + jsQR ile çöz. */

import { createCanvas, loadImage, Path2D } from '@napi-rs/canvas';
import { BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { renderSceneToCanvas } from '../lib/render/canvas';
import { isFinderZone } from '../lib/qr';
import type { Scene } from '../lib/render/scene-types';
import { DEFAULT_DESIGN } from '../lib/defaults';
import type { DesignState, QrMatrix } from '../lib/types';

export interface RenderResult {
  buffer: Buffer;
  width: number;
  height: number;
}

/** Sahneyi @napi-rs/canvas ile gerçek bir PNG'ye çizer. */
export async function renderSceneToPng(
  scene: Scene,
  images: Record<string, Buffer> = {},
): Promise<RenderResult> {
  const loaded = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
  for (const [href, data] of Object.entries(images)) {
    loaded.set(href, await loadImage(data));
  }
  const canvas = createCanvas(Math.round(scene.width), Math.round(scene.height));
  const ctx = canvas.getContext('2d');
  renderSceneToCanvas(ctx as unknown as CanvasRenderingContext2D, scene, {
    Path2D: Path2D as unknown as typeof globalThis.Path2D,
    resolveImage: (href) => (loaded.get(href) ?? null) as unknown as CanvasImageSource | null,
  });
  return { buffer: canvas.toBuffer('image/png'), width: canvas.width, height: canvas.height };
}

/** PNG'yi beyaz zemin üzerine yerleştirip jsQR ile çözer. */
export function decodePng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const rgba = new Uint8ClampedArray(png.data.length);
  for (let i = 0; i < png.data.length; i += 4) {
    const alpha = png.data[i + 3] / 255;
    rgba[i] = Math.round(png.data[i] * alpha + 255 * (1 - alpha));
    rgba[i + 1] = Math.round(png.data[i + 1] * alpha + 255 * (1 - alpha));
    rgba[i + 2] = Math.round(png.data[i + 2] * alpha + 255 * (1 - alpha));
    rgba[i + 3] = 255;
  }
  const result = jsQR(rgba, png.width, png.height, { inversionAttempts: 'attemptBoth' });
  return result?.data ?? null;
}

/**
 * PNG'yi ZXing (telefon kameralarının çoğunun kullandığı motor) ile çözer.
 * Dekoratif modül şekillerinde jsQR'dan belirgin biçimde daha hoşgörülüdür.
 */
export function decodePngZxing(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const luminance = new Uint8ClampedArray(png.width * png.height);
  for (let i = 0; i < luminance.length; i += 1) {
    const alpha = png.data[i * 4 + 3] / 255;
    const r = png.data[i * 4] * alpha + 255 * (1 - alpha);
    const g = png.data[i * 4 + 1] * alpha + 255 * (1 - alpha);
    const b = png.data[i * 4 + 2] * alpha + 255 * (1 - alpha);
    luminance[i] = (r * 33 + g * 34 + b * 33) / 100;
  }
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(new RGBLuminanceSource(luminance, png.width, png.height)),
  );
  const reader = new MultiFormatReader();
  reader.setHints(new Map([[DecodeHintType.TRY_HARDER, true]]));
  try {
    return reader.decode(bitmap).getText();
  } catch {
    return null;
  }
}

/** Testler için tasarım nesnesi. */
export function makeDesign(overrides: Partial<DesignState> = {}): DesignState {
  return { ...DEFAULT_DESIGN, ...overrides };
}

/**
 * Çizilen PNG'de her modülün merkez pikselinin QR matrisiyle uyuşup
 * uyuşmadığını sayar. Bulucu desen bölgeleri (özel köşe çizimi) atlanır.
 * Sıfır sonuç, matrisin piksel düzeyinde doğru çizildiğini kanıtlar.
 */
export function countModuleCenterMismatches(
  buffer: Buffer,
  matrix: QrMatrix,
  options: { moduleSize: number; quietZone: number; qrX?: number; qrY?: number },
): number {
  const png = PNG.sync.read(buffer);
  const originX = (options.qrX ?? 0) + options.quietZone * options.moduleSize;
  const originY = (options.qrY ?? 0) + options.quietZone * options.moduleSize;
  let mismatch = 0;
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (isFinderZone(x, y, matrix.size)) continue;
      const px = Math.round(originX + (x + 0.5) * options.moduleSize);
      const py = Math.round(originY + (y + 0.5) * options.moduleSize);
      const offset = (py * png.width + px) * 4;
      const alpha = png.data[offset + 3] / 255;
      const luminance =
        (png.data[offset] * alpha + 255 * (1 - alpha)) * 0.33 +
        (png.data[offset + 1] * alpha + 255 * (1 - alpha)) * 0.34 +
        (png.data[offset + 2] * alpha + 255 * (1 - alpha)) * 0.33;
      const dark = luminance < 128;
      if (dark !== (matrix.data[y * matrix.size + x] === 1)) mismatch += 1;
    }
  }
  return mismatch;
}

/** 128×128 yuvarlak lavanta logo üretir (raster). */
export function makeLogoPng(): Buffer {
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#8070D8';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', size / 2, size / 2 + 4);
  return canvas.toBuffer('image/png');
}

export function makeLogoInput(buffer: Buffer): { href: string; width: number; height: number; buffer: Buffer } {
  const href = `data:image/png;base64,${buffer.toString('base64')}`;
  return { href, width: 128, height: 128, buffer };
}
