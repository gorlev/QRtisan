/**
 * Yazı tipi regresyon testleri.
 *
 * Kök neden: SVG'ye yalnızca `latin` alt kümesi gömülürse Türkçe İ, ş, ğ, Ş, Ğ
 * glifleri bulunamaz ve SVG karışık (fallback) yazı tipleriyle çizilir. Bu
 * testler hem cmap kapsamını (fontkit ile gerçek dosyalar üzerinden) hem de
 * üretilen @font-face kurallarını doğrular.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { openSync } from 'fontkit';
import {
  DISPLAY_FONT_FAMILY,
  DISPLAY_FONT_STACK,
  MANROPE_SUBSETS,
  TURKISH_CAPTION_SAMPLE,
} from './fonts';
import { buildFontCss, SUBSET_URLS } from './render/fontEmbed';
import { fitCaption } from './geometry';
import { createFallbackMeasureText } from './render/measure';
import { buildScene } from './render/scene';
import { createMatrix } from './qr';
import { makeDesign } from '../test/harness';

const FONT_DIR = path.join(process.cwd(), 'node_modules/@fontsource-variable/manrope/files');

/** Vitest `?url` yolunu dosya sistemi yoluna çevirir. */
function resolveAssetUrl(url: string): string {
  if (url.startsWith('/node_modules/') || url.startsWith('/src/')) {
    return path.join(process.cwd(), url);
  }
  if (url.startsWith('/@fs/')) return url.slice('/@fs'.length);
  return url;
}

const fontCache = new Map<string, ReturnType<typeof openSync>>();

function openSubset(name: string) {
  const cached = fontCache.get(name);
  if (cached) return cached;
  const font = openSync(path.join(FONT_DIR, `manrope-${name}-wght-normal.woff2`));
  fontCache.set(name, font);
  return font;
}

function rangeCovers(unicodeRange: string, codePoint: number): boolean {
  return unicodeRange.split(',').some((part) => {
    const match = /^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i.exec(part.trim());
    if (!match) return false;
    const start = parseInt(match[1], 16);
    const end = match[2] ? parseInt(match[2], 16) : start;
    return codePoint >= start && codePoint <= end;
  });
}

function glyphFor(codePoint: number) {
  for (const subset of MANROPE_SUBSETS) {
    const glyph = openSubset(subset.name).glyphForCodePoint(codePoint);
    if (glyph.id !== 0) return { subset: subset.name, glyph };
  }
  return null;
}

function advanceWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    if (char === ' ') {
      width += 500;
      continue;
    }
    const found = glyphFor(char.codePointAt(0) ?? 0);
    width += found?.glyph.advanceWidth ?? 0;
  }
  return width;
}

describe('Manrope alt kümeleri', () => {
  it('paketlenen her alt küme dosyası mevcut', () => {
    for (const subset of MANROPE_SUBSETS) {
      const url = SUBSET_URLS[subset.name];
      expect(url, subset.name).toBeTruthy();
      expect(existsSync(resolveAssetUrl(url)), `${subset.name}: ${url}`).toBe(true);
    }
  });

  it('unicode-range bildirimleri örnek Türkçe metni kapsar', () => {
    for (const char of TURKISH_CAPTION_SAMPLE) {
      if (char === ' ') continue;
      const codePoint = char.codePointAt(0) ?? 0;
      const covered = MANROPE_SUBSETS.some((subset) => rangeCovers(subset.unicodeRange, codePoint));
      expect(covered, `unicode-range kapsamıyor: ${char}`).toBe(true);
    }
  });

  it('latin alt kümesi Türkçe glifleri içermez (regresyon kökü)', () => {
    const latin = openSubset('latin');
    for (const char of ['İ', 'ş', 'ğ', 'Ş', 'Ğ']) {
      expect(latin.glyphForCodePoint(char.codePointAt(0) ?? 0).id, char).toBe(0);
    }
    // latin-ext bu glifleri sağlar
    const latinExt = openSubset('latin-ext');
    for (const char of ['İ', 'ş', 'ğ', 'Ş', 'Ğ']) {
      expect(latinExt.glyphForCodePoint(char.codePointAt(0) ?? 0).id, char).not.toBe(0);
    }
  });

  it('gömülen alt kümelerin birleşimi tüm Türkçe glifleri içerir', () => {
    for (const char of TURKISH_CAPTION_SAMPLE) {
      if (char === ' ') continue;
      const found = glyphFor(char.codePointAt(0) ?? 0);
      expect(found, `glif bulunamadı: ${char}`).not.toBeNull();
      expect(found?.glyph.advanceWidth).toBeGreaterThan(0);
    }
  });

  it('Türkçe glifler doğru alt kümeden gelir', () => {
    const expected: Array<[string, string]> = [
      ['İ', 'latin-ext'],
      ['ş', 'latin-ext'],
      ['ğ', 'latin-ext'],
      ['Ş', 'latin-ext'],
      ['Ğ', 'latin-ext'],
      ['ı', 'latin'],
      ['ö', 'latin'],
      ['ü', 'latin'],
      ['ç', 'latin'],
    ];
    for (const [char, subset] of expected) {
      const found = glyphFor(char.codePointAt(0) ?? 0);
      expect(found, char).not.toBeNull();
      expect(found?.subset, char).toBe(subset);
      expect(found?.glyph.id, char).not.toBe(0);
      expect(found?.glyph.advanceWidth, char).toBeGreaterThan(0);
    }
  });

  it('gerçek metriklerle uzun Türkçe etiket kutuya sığdırılır', () => {
    const unitsPerEm = openSubset('latin').unitsPerEm;
    const measure = (text: string, fontSize: number) => (advanceWidth(text) / unitsPerEm) * fontSize;
    const baseSize = 68;
    // 1000px QR'da alt etiket şeridinin kullanılabilir genişliği (~990 birim)
    const maxWidth = 990;

    const longCaption = 'İletişim — görüşelim ve bizi takip edin';
    const fitted = fitCaption(longCaption, baseSize, maxWidth, measure);
    expect(fitted.fontSize).toBeLessThan(baseSize);
    expect(fitted.fontSize).toBeGreaterThanOrEqual(baseSize * 0.45 - 0.001);
    expect(fitted.width).toBeLessThanOrEqual(maxWidth + 1);

    // UI'daki üst sınır: 48 karakterlik Türkçe etiket de sığmalı
    const maxCaption = 'İletişim — görüşelim, bizi takip edin ve okutun';
    expect(maxCaption.length).toBeLessThanOrEqual(48);
    const worstCase = fitCaption(maxCaption, baseSize, maxWidth, measure);
    expect(worstCase.width).toBeLessThanOrEqual(maxWidth + 1);
    expect(worstCase.fontSize).toBeGreaterThanOrEqual(baseSize * 0.45 - 0.001);

    const short = fitCaption(TURKISH_CAPTION_SAMPLE, baseSize, 4000, measure);
    expect(short.fontSize).toBe(baseSize);
  });
});

describe('SVG @font-face üretimi', () => {
  it('her alt küme için unicode-range içeren kural üretir', () => {
    const css = buildFontCss(
      MANROPE_SUBSETS.map((subset) => ({
        subset: subset.name,
        unicodeRange: subset.unicodeRange,
        base64: 'AAAA',
      })),
    );
    expect(css.match(/@font-face/g)).toHaveLength(MANROPE_SUBSETS.length);
    for (const subset of MANROPE_SUBSETS) {
      expect(css).toContain(`unicode-range:${subset.unicodeRange};`);
    }
    expect(css).toContain(`font-family:'${DISPLAY_FONT_FAMILY}'`);
    // Eski, yanlış aile adı kullanılmamalı
    expect(css).not.toContain("font-family:'Manrope';");
  });
});

describe('yazı tipi sabitleri (sürüklenme koruması)', () => {
  it('aile adı ve yığın tutarlıdır', () => {
    expect(DISPLAY_FONT_STACK.startsWith(`'${DISPLAY_FONT_FAMILY}'`)).toBe(true);
  });

  it('index.css aynı aile adını kullanır', () => {
    const css = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
    expect(css).toContain(`--font-sans: '${DISPLAY_FONT_FAMILY}'`);
  });

  it('sahne metni ölçümle aynı yığını kullanır', () => {
    const matrix = createMatrix('https://example.com', 'M')!;
    const { scene } = buildScene({
      matrix,
      outputWidth: 512,
      design: makeDesign({ frame: 'badge', caption: TURKISH_CAPTION_SAMPLE }),
      logo: null,
      measureText: createFallbackMeasureText(),
    });
    expect(scene.texts).toHaveLength(1);
    expect(scene.texts[0].family).toBe(DISPLAY_FONT_STACK);
  });
});
