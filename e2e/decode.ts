/** E2E için bağımsız PNG çözücü (yalnızca pngjs + jsQR). */

import jsQR from 'jsqr';
import { PNG } from 'pngjs';

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
