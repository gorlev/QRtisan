import { describe, expect, it } from 'vitest';
import {
  contrastLabel,
  contrastRatio,
  evaluateContrast,
  formatContrast,
  getColorPresets,
  getPalettePairs,
  hexToRgb,
  isDark,
  normalizeHex,
  readableTextOn,
  relativeLuminance,
  toHex,
} from './colors';

describe('normalizeHex / hexToRgb', () => {
  it('kısa hex biçimini genişletir', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
    expect(normalizeHex('ABC')).toBe('#aabbcc');
    expect(normalizeHex('#A1B2C3')).toBe('#a1b2c3');
  });

  it('geçersiz değerlerde null döner', () => {
    expect(normalizeHex('kırmızı')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('')).toBeNull();
  });

  it('rgb ayrıştırır', () => {
    expect(hexToRgb('#252338')).toEqual({ r: 0x25, g: 0x23, b: 0x38 });
    expect(hexToRgb('nope')).toBeNull();
  });

  it('toHex sınırları kırpar', () => {
    expect(toHex({ r: 300, g: -5, b: 16 })).toBe('#ff0010');
  });
});

describe('parlaklık ve kontrast', () => {
  it('siyah/beyaz kontrastı 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  it('geçersiz renkte güvenli değer döner', () => {
    expect(relativeLuminance('yok')).toBe(0);
    expect(contrastRatio('yok', 'yok')).toBeCloseTo(1, 5);
  });

  it('koyu/açık ayrımı yapar', () => {
    expect(isDark('#252338')).toBe(true);
    expect(isDark('#ffffff')).toBe(false);
  });

  it('okunabilir metin rengi seçer', () => {
    expect(readableTextOn('#252338')).toBe('#FFFFFF');
    expect(readableTextOn('#FFFFFF')).toBe('#252338');
    expect(readableTextOn('#B9E7D4')).toBe('#252338');
  });

  it('kontrast etiketi ve biçimi', () => {
    expect(contrastLabel(12)).toBe('mükemmel');
    expect(contrastLabel(5)).toBe('iyi');
    expect(contrastLabel(3.4)).toBe('sınırda');
    expect(contrastLabel(2)).toBe('yetersiz');
    expect(formatContrast(4.567)).toBe('4.6:1');
  });

  it('şeffaf zeminde beyaza göre değerlendirir', () => {
    expect(evaluateContrast('#252338', '#000000', true)).toBeCloseTo(
      contrastRatio('#252338', '#ffffff'),
      5,
    );
  });
});

describe('renk yerelleştirme', () => {
  it('kontrast etiketlerini İngilizce üretir', () => {
    expect(contrastLabel(12, 'en')).toBe('excellent');
    expect(contrastLabel(5, 'en')).toBe('good');
    expect(contrastLabel(3.4, 'en')).toBe('borderline');
    expect(contrastLabel(2, 'en')).toBe('poor');
  });

  it('hazır renklerde değerler sabit, adlar yerelleşir', () => {
    const tr = getColorPresets('tr');
    const en = getColorPresets('en');
    expect(en).toHaveLength(tr.length);
    expect(en.map((preset) => preset.value)).toEqual(tr.map((preset) => preset.value));
    expect(en.map((preset) => preset.name)).not.toEqual(tr.map((preset) => preset.name));
    expect(en[0]).toEqual({ value: '#252338', name: 'Midnight' });
    expect(en[10]).toEqual({ value: '#FFFFFF', name: 'White' });
  });

  it('palet çiftlerinde fg/bg sabit, adlar yerelleşir', () => {
    const tr = getPalettePairs('tr');
    const en = getPalettePairs('en');
    expect(en).toHaveLength(tr.length);
    expect(en.map((pair) => [pair.fg, pair.bg])).toEqual(tr.map((pair) => [pair.fg, pair.bg]));
    expect(en.map((pair) => pair.name)).not.toEqual(tr.map((pair) => pair.name));
    expect(en[0]).toEqual({ name: 'Ink / White', fg: '#252338', bg: '#FFFFFF' });
    expect(en[3]).toEqual({ name: 'White / Midnight', fg: '#FFFFFF', bg: '#252338' });
  });
});
