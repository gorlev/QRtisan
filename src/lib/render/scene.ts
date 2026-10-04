/**
 * Sahne kurucu — QR matrisi + tasarım + logo → çizilebilir sahne.
 *
 * Önizleme, PNG ve SVG aynı sahneyi kullandığı için birebir aynı görünür.
 */

import { computeLayout } from '../geometry';
import { isDarkModule, isFinderZone } from '../qr';
import { eyeInnerPath, eyeOuterRingPath, modulePath } from '../shapes';
import type { DesignState, MeasureText, QrMatrix } from '../types';
import type { Scene, ScenePath, SceneRect } from './scene-types';

export interface LogoImageInput {
  href: string;
  width: number;
  height: number;
}

export interface BuildSceneInput {
  matrix: QrMatrix;
  /** Nihai görüntü genişliği (px). Yerleşim buna göre ölçeklenir. */
  outputWidth: number;
  design: DesignState;
  logo: LogoImageInput | null;
  measureText: MeasureText;
}

export interface SceneMetrics {
  moduleSize: number;
  moduleCount: number;
  matrixSize: number;
  /** Logonun QR genişliğine oranı. */
  logoBoxRatio: number;
  /** Gerçek çıktı ölçüsü (oransal yuvarlama sonrası). */
  outputWidth: number;
  outputHeight: number;
  /** QR görsel alanının sol üst köşesi (sessiz alan dahil). */
  qrX: number;
  qrY: number;
}

export interface BuiltScene {
  scene: Scene;
  metrics: SceneMetrics;
}

const REFERENCE_WIDTH = 1000;

export function buildScene(input: BuildSceneInput): BuiltScene {
  const { matrix, outputWidth, design, logo, measureText } = input;

  const layoutInput = {
    frame: design.frame,
    caption: design.caption,
    frameRadius: design.frameRadius,
    fg: design.fg,
    bg: design.bg,
    transparentBg: design.transparentBg,
    measureText,
  };

  const reference = computeLayout({ ...layoutInput, qrSize: REFERENCE_WIDTH });
  const qrSize = (outputWidth * REFERENCE_WIDTH) / reference.width;
  const layout = computeLayout({ ...layoutInput, qrSize });

  const moduleCount = matrix.size + design.quietZone * 2;
  const moduleSize = qrSize / moduleCount;
  const matrixX = layout.qrX + design.quietZone * moduleSize;
  const matrixY = layout.qrY + design.quietZone * moduleSize;
  const matrixPx = matrix.size * moduleSize;

  // Logo kutusu (matris merkezinde)
  let logoBox: { x: number; y: number; size: number; pad: number } | null = null;
  if (design.logo && logo) {
    const size = design.logo.size * matrixPx;
    const pad = design.logo.padding * matrixPx;
    logoBox = {
      x: matrixX + matrixPx / 2 - size / 2,
      y: matrixY + matrixPx / 2 - size / 2,
      size,
      pad,
    };
  }

  const clearBox =
    logoBox && design.logo?.clearModules
      ? {
          x0: logoBox.x - logoBox.pad,
          y0: logoBox.y - logoBox.pad,
          x1: logoBox.x + logoBox.size + logoBox.pad,
          y1: logoBox.y + logoBox.size + logoBox.pad,
        }
      : null;

  const paths: ScenePath[] = [];
  let modulesD = '';
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (isFinderZone(x, y, matrix.size)) continue;
      if (!isDarkModule(matrix, x, y)) continue;
      const mx = matrixX + x * moduleSize;
      const my = matrixY + y * moduleSize;
      if (
        clearBox &&
        mx + moduleSize > clearBox.x0 &&
        mx < clearBox.x1 &&
        my + moduleSize > clearBox.y0 &&
        my < clearBox.y1
      ) {
        continue;
      }
      modulesD += modulePath(design.dot, mx, my, moduleSize);
    }
  }
  if (modulesD) paths.push({ d: modulesD, fill: design.fg });

  const eyeOrigins: Array<[number, number]> = [
    [0, 0],
    [matrix.size - 7, 0],
    [0, matrix.size - 7],
  ];
  for (const [gx, gy] of eyeOrigins) {
    const ex = matrixX + gx * moduleSize;
    const ey = matrixY + gy * moduleSize;
    paths.push({
      d: eyeOuterRingPath(design.eyeOuter, ex, ey, moduleSize),
      fill: design.fg,
      fillRule: 'evenodd',
    });
    paths.push({
      d: eyeInnerPath(design.eyeInner, ex + 2 * moduleSize, ey + 2 * moduleSize, moduleSize),
      fill: design.fg,
    });
  }

  const rects: SceneRect[] = [...layout.chrome.rects];
  const images: Scene['images'] = [];

  if (logoBox && logo) {
    if (design.logo?.clearModules) {
      const background = design.transparentBg ? '#FFFFFF' : design.bg;
      rects.push({
        x: logoBox.x - logoBox.pad,
        y: logoBox.y - logoBox.pad,
        w: logoBox.size + logoBox.pad * 2,
        h: logoBox.size + logoBox.pad * 2,
        rx: logoBox.size * 0.08,
        fill: background,
      });
    }
    const scale = Math.min(logoBox.size / Math.max(logo.width, 1), logoBox.size / Math.max(logo.height, 1));
    const w = Math.max(logo.width, 1) * scale;
    const h = Math.max(logo.height, 1) * scale;
    images.push({
      href: logo.href,
      x: logoBox.x + logoBox.size / 2 - w / 2,
      y: logoBox.y + logoBox.size / 2 - h / 2,
      w,
      h,
    });
  }

  const scene: Scene = {
    width: layout.width,
    height: layout.height,
    background: layout.background,
    paths,
    strokes: layout.chrome.strokes,
    rects,
    images,
    texts: layout.chrome.texts,
  };

  return {
    scene,
    metrics: {
      moduleSize,
      moduleCount,
      matrixSize: matrix.size,
      logoBoxRatio: logoBox ? logoBox.size / matrixPx : 0,
      outputWidth: layout.width,
      outputHeight: layout.height,
      qrX: layout.qrX,
      qrY: layout.qrY,
    },
  };
}
