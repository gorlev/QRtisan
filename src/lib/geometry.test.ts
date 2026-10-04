import { describe, expect, it } from 'vitest';
import { computeLayout, fitCaption, type LayoutInput } from './geometry';
import { createFallbackMeasureText } from './render/measure';
import type { FrameType } from './types';

const measureText = createFallbackMeasureText();

function layout(frame: FrameType, overrides: Partial<LayoutInput> = {}) {
  return computeLayout({
    qrSize: 1000,
    frame,
    caption: '',
    frameRadius: 45,
    fg: '#252338',
    bg: '#FFFFFF',
    transparentBg: false,
    measureText,
    ...overrides,
  });
}

describe('computeLayout', () => {
  it('çerçevesiz yerleşim tam QR boyutundadır', () => {
    const result = layout('none');
    expect(result.width).toBe(1000);
    expect(result.height).toBe(1000);
    expect(result.qrX).toBe(0);
    expect(result.background).toBe('#FFFFFF');
    expect(result.chrome.strokes).toHaveLength(0);
    expect(result.chrome.rects).toHaveLength(0);
  });

  it('şeffaf zeminde arka planı null yapar (çerçevesiz)', () => {
    expect(layout('none', { transparentBg: true }).background).toBeNull();
  });

  it('ince çerçeve QR çevresine boşluk ve çizgi ekler', () => {
    const result = layout('border');
    expect(result.width).toBeCloseTo(1140, 5);
    expect(result.qrX).toBeCloseTo(70, 5);
    expect(result.chrome.strokes).toHaveLength(1);
    expect(result.chrome.strokes[0].color).toBe('#252338');
  });

  it('beyaz ön planda çerçeve çizgisini görünür kılar', () => {
    const result = layout('border', { fg: '#FFFFFF', bg: '#FFFFFF' });
    expect(result.chrome.strokes[0].color).toBe('#252338');
  });

  it('şeffaf zeminde çerçeveli tasarım beyaz zemin kullanır', () => {
    const result = layout('labelBottom', { transparentBg: true, caption: 'Menü' });
    expect(result.background).toBe('#FFFFFF');
  });

  it('alt etiket metni ve şeridi üretir', () => {
    const result = layout('labelBottom', { caption: 'Taramak için okutun' });
    expect(result.chrome.rects).toHaveLength(1);
    expect(result.chrome.texts).toHaveLength(1);
    expect(result.chrome.texts[0].text).toBe('Taramak için okutun');
    expect(result.height).toBeGreaterThan(result.width);
    expect(result.qrY).toBeCloseTo(60, 5);
  });

  it('etiket boşsa yalnızca iç boşluk bırakır', () => {
    const result = layout('labelBottom', { caption: '   ' });
    expect(result.chrome.rects).toHaveLength(0);
    expect(result.chrome.texts).toHaveLength(0);
    expect(result.width).toBeCloseTo(1100, 5);
  });

  it('üst etikette şerit QR üstünde kalır', () => {
    const result = layout('labelTop', { caption: 'MENÜ' });
    expect(result.chrome.rects[0].y).toBeLessThan(result.qrY);
    expect(result.chrome.texts[0].text).toBe('MENÜ');
  });

  it('kabarcıkta kuyruk ve çerçeve çizgisi vardır', () => {
    const result = layout('bubble', { caption: 'Bize ulaşın' });
    expect(result.chrome.strokes).toHaveLength(1);
    expect(result.chrome.paths).toHaveLength(1);
    expect(result.chrome.texts).toHaveLength(1);
    expect(result.height).toBeGreaterThan(result.width);
  });

  it('köşe izlerinde dört ayrı işaret çizer', () => {
    const result = layout('corners');
    expect(result.chrome.strokes).toHaveLength(1);
    expect(result.chrome.strokes[0].d.match(/M/g)).toHaveLength(4);
  });

  it('rozet hap biçiminde ve okunabilir metin renginde', () => {
    const result = layout('badge', { caption: 'Okut & keşfet' });
    const rect = result.chrome.rects[0];
    expect(rect.rx).toBeCloseTo(rect.h / 2, 5);
    expect(result.chrome.texts[0].fill).toBe('#FFFFFF');
  });

  it('yerleşim QR boyutuyla orantılı ölçeklenir', () => {
    const small = layout('bubble', { caption: 'Ölçek testi' });
    const large = computeLayout({
      qrSize: 2000,
      frame: 'bubble',
      caption: 'Ölçek testi',
      frameRadius: 45,
      fg: '#252338',
      bg: '#FFFFFF',
      transparentBg: false,
      measureText,
    });
    expect(large.width / small.width).toBeCloseTo(2, 3);
    expect(large.chrome.texts[0].size / small.chrome.texts[0].size).toBeCloseTo(2, 3);
  });
});

describe('fitCaption', () => {
  it('kısa metni küçültmez', () => {
    const result = fitCaption('Menü', 68, 900, measureText);
    expect(result.fontSize).toBe(68);
  });

  it('orta uzunlukta metni kutuya sığdırır', () => {
    const result = fitCaption('Menü etiketi', 68, 300, measureText);
    expect(result.fontSize).toBeLessThan(68);
    expect(result.width).toBeLessThanOrEqual(301);
  });

  it('çok uzun metinde bile %55 sınırının altına inmez', () => {
    const long = 'Çok uzun bir etiket metni buraya yazıldı ve taşması gerekiyor';
    const result = fitCaption(long, 68, 300, measureText);
    expect(result.fontSize).toBeLessThan(68);
    expect(result.fontSize).toBeGreaterThanOrEqual(68 * 0.45 - 0.001);
  });

  it('48 karakterlik etiket 1000px QR şeridine sığar', () => {
    const caption = 'K'.repeat(48);
    const s = 10;
    const bandW = 1120 - 2 * 2.5 * s;
    const result = fitCaption(caption, 6.8 * s, bandW - 8 * s, measureText);
    expect(result.width).toBeLessThanOrEqual(bandW - 8 * s + 1);
  });
});
