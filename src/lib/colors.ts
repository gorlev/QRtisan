/** Renk yardımcıları: kontrast, parlaklık, okunabilir metin rengi ve hazır paletler. */

import { translate, type Locale } from './locale';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface ColorPreset {
  value: string;
  name: string;
}

export interface PalettePair {
  name: string;
  fg: string;
  bg: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { value: '#252338', name: 'Gece mürekkebi' },
  { value: '#0E0E1A', name: 'Siyah' },
  { value: '#4A5568', name: 'Kurşun' },
  { value: '#8070D8', name: 'Lavanta' },
  { value: '#5B4BB8', name: 'Derin lavanta' },
  { value: '#1F6F5C', name: 'Çam yeşili' },
  { value: '#B23A48', name: 'Kiremit' },
  { value: '#EAE5FB', name: 'Lila' },
  { value: '#B9E7D4', name: 'Nane' },
  { value: '#F5F6FA', name: 'Bulut' },
  { value: '#FFFFFF', name: 'Beyaz' },
];

/** Aynı değerlerin İngilizce adları — kimlik (value) değişmez. */
export const COLOR_PRESETS_EN: ColorPreset[] = [
  { value: '#252338', name: 'Midnight' },
  { value: '#0E0E1A', name: 'Black' },
  { value: '#4A5568', name: 'Slate' },
  { value: '#8070D8', name: 'Lavender' },
  { value: '#5B4BB8', name: 'Deep lavender' },
  { value: '#1F6F5C', name: 'Pine green' },
  { value: '#B23A48', name: 'Terracotta' },
  { value: '#EAE5FB', name: 'Lilac' },
  { value: '#B9E7D4', name: 'Mint' },
  { value: '#F5F6FA', name: 'Cloud' },
  { value: '#FFFFFF', name: 'White' },
];

/** Hazır renkler — `value` her dilde sabit, yalnızca ad yerelleşir. */
export function getColorPresets(locale: Locale = 'tr'): ColorPreset[] {
  return locale === 'en' ? COLOR_PRESETS_EN : COLOR_PRESETS;
}

/** Erişilebilir kontrastı garanti eden hazır ön/arka plan çiftleri. */
export const PALETTE_PAIRS: PalettePair[] = [
  { name: 'Mürekkep / Beyaz', fg: '#252338', bg: '#FFFFFF' },
  { name: 'Lavanta / Beyaz', fg: '#8070D8', bg: '#FFFFFF' },
  { name: 'Derin lavanta / Lila', fg: '#4A3AA8', bg: '#EAE5FB' },
  { name: 'Beyaz / Gece', fg: '#FFFFFF', bg: '#252338' },
  { name: 'Mürekkep / Nane', fg: '#252338', bg: '#B9E7D4' },
  { name: 'Beyaz / Lavanta', fg: '#FFFFFF', bg: '#8070D8' },
];

/** Aynı çiftlerin İngilizce adları — fg/bg değerleri değişmez. */
export const PALETTE_PAIRS_EN: PalettePair[] = [
  { name: 'Ink / White', fg: '#252338', bg: '#FFFFFF' },
  { name: 'Lavender / White', fg: '#8070D8', bg: '#FFFFFF' },
  { name: 'Deep lavender / Lilac', fg: '#4A3AA8', bg: '#EAE5FB' },
  { name: 'White / Midnight', fg: '#FFFFFF', bg: '#252338' },
  { name: 'Ink / Mint', fg: '#252338', bg: '#B9E7D4' },
  { name: 'White / Lavender', fg: '#FFFFFF', bg: '#8070D8' },
];

/** Hazır palet çiftleri — fg/bg her dilde sabit, yalnızca ad yerelleşir. */
export function getPalettePairs(locale: Locale = 'tr'): PalettePair[] {
  return locale === 'en' ? PALETTE_PAIRS_EN : PALETTE_PAIRS;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** #abc / #aabbcc / abc biçimlerini #aabbcc'ye çevirir; geçersizse null. */
export function normalizeHex(input: string): string | null {
  const value = input.trim();
  const match = HEX_RE.exec(value);
  if (!match) return null;
  let hex = match[1].toLowerCase();
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return `#${hex}`;
}

export function hexToRgb(input: string): Rgb | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** WCAG bağıl parlaklık. Geçersiz renkte 0 döner. */
export function relativeLuminance(color: string): number {
  const rgb = hexToRgb(color);
  if (!rgb) return 0;
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** WCAG kontrast oranı (1 – 21). Geçersiz renkte 1 döner. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export function isDark(color: string): boolean {
  return relativeLuminance(color) < 0.4;
}

export function isLight(color: string): boolean {
  return !isDark(color);
}

/** Verilen zemin üzerinde okunabilir metin rengi. */
export function readableTextOn(background: string): string {
  return isDark(background) ? '#FFFFFF' : '#252338';
}

/** Kontrastı kısa bir etiketle açıklar. */
export function contrastLabel(ratio: number, locale: Locale = 'tr'): string {
  if (ratio >= 7) return translate(locale, 'mükemmel', 'excellent');
  if (ratio >= 4.5) return translate(locale, 'iyi', 'good');
  if (ratio >= 3) return translate(locale, 'sınırda', 'borderline');
  return translate(locale, 'yetersiz', 'poor');
}

export function formatContrast(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

/** Kullanıcının seçtiği ön/arka planı değerlendirir. */
export function evaluateContrast(fg: string, bg: string, transparentBg: boolean): number {
  if (transparentBg) return contrastRatio(fg, '#FFFFFF');
  return contrastRatio(fg, bg);
}
