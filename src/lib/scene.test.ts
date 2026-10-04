/**
 * Sahne oran testleri — önizleme, PNG ve SVG aynı geometriyi kullanmalı.
 */

import { describe, expect, it } from 'vitest';
import { createMatrix } from './qr';
import { createFallbackMeasureText } from './render/measure';
import { buildScene } from './render/scene';
import { sceneToSvg } from './render/svg';
import { makeDesign, makeLogoInput, makeLogoPng } from '../test/harness';
import type { FrameType } from './types';

const measureText = createFallbackMeasureText();
const PAYLOAD = 'https://example.com';
const FRAMES: FrameType[] = ['none', 'border', 'labelBottom', 'labelTop', 'bubble', 'corners', 'badge'];

function build(frame: FrameType, outputWidth: number) {
  const matrix = createMatrix(PAYLOAD, 'M')!;
  const caption = frame === 'none' || frame === 'border' ? '' : 'Taramak için okutun';
  return buildScene({ matrix, outputWidth, design: makeDesign({ frame, caption }), logo: null, measureText });
}

describe('sahne oranları (önizleme = PNG = SVG)', () => {
  for (const frame of FRAMES) {
    it(`${frame}: farklı boyutlarda oranlar korunur`, () => {
      const small = build(frame, 512).scene;
      const large = build(frame, 2048).scene;
      expect(large.width / small.width).toBeCloseTo(4, 1);
      expect(large.height / small.height).toBeCloseTo(4, 1);
      expect(large.height / large.width).toBeCloseTo(small.height / small.width, 3);
    });
  }

  it('çıktı genişliği istenen değere oturur', () => {
    for (const frame of FRAMES) {
      const { scene } = build(frame, 1024);
      expect(scene.width).toBeCloseTo(1024, 0);
    }
  });

  it('SVG viewBox ölçüleri sahneyle aynıdır', () => {
    const { scene } = build('badge', 1000);
    const svg = sceneToSvg(scene);
    const width = Number(/width="([\d.]+)"/.exec(svg)?.[1]);
    const height = Number(/height="([\d.]+)"/.exec(svg)?.[1]);
    expect(width).toBeCloseTo(scene.width, 1);
    expect(height).toBeCloseTo(scene.height, 1);
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
  });

  it('logo oranı korunur ve ortalalanır', () => {
    const logoPng = makeLogoPng();
    const logo = makeLogoInput(logoPng);
    const matrix = createMatrix(PAYLOAD, 'H')!;
    const { scene } = buildScene({
      matrix,
      outputWidth: 1024,
      design: makeDesign({
        logo: {
          dataUrl: logo.href,
          fileName: 'logo.png',
          width: 200,
          height: 100,
          size: 0.22,
          padding: 0.03,
          clearModules: true,
        },
      }),
      logo: { href: logo.href, width: 200, height: 100 },
      measureText,
    });
    const image = scene.images[0];
    expect(image.w / image.h).toBeCloseTo(2, 2);
    expect(image.x + image.w / 2).toBeCloseTo(scene.width / 2, 1);
    expect(image.y + image.h / 2).toBeCloseTo(scene.height / 2, 1);
  });

  it('şeffaf arka plan sahnede null; çerçeveli tasarımda beyaz zemin olur', () => {
    const matrix = createMatrix(PAYLOAD, 'M')!;
    const transparentNone = buildScene({
      matrix,
      outputWidth: 512,
      design: makeDesign({ transparentBg: true }),
      logo: null,
      measureText,
    }).scene;
    const transparentBadge = buildScene({
      matrix,
      outputWidth: 512,
      design: makeDesign({ transparentBg: true, frame: 'badge', caption: 'Okut' }),
      logo: null,
      measureText,
    }).scene;
    expect(transparentNone.background).toBeNull();
    expect(transparentBadge.background).toBe('#FFFFFF');
  });

  it('etiket metni sahnede tek metin katmanı olarak bulunur', () => {
    const { scene } = build('labelBottom', 1024);
    expect(scene.texts).toHaveLength(1);
    expect(scene.texts[0].text).toBe('Taramak için okutun');
    expect(scene.texts[0].anchor).toBe('middle');
  });
});
