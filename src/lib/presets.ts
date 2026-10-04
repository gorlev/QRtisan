/** Hazır tasarımlar — her biri gerçek mini QR olarak önizlenir. */

import type { Locale } from './locale';
import type { DesignState } from './types';

export interface QrPreset {
  id: string;
  name: string;
  note: string;
  design: Partial<DesignState>;
}

export const PRESET_SAMPLE = 'https://example.com';

export const QR_PRESETS: QrPreset[] = [
  {
    id: 'sade',
    name: 'Sade',
    note: 'Kare modüller, çerçevesiz',
    design: {
      fg: '#252338',
      bg: '#FFFFFF',
      transparentBg: false,
      dot: 'square',
      eyeOuter: 'square',
      eyeInner: 'square',
      frame: 'none',
      caption: '',
      frameRadius: 0,
    },
  },
  {
    id: 'lavanta',
    name: 'Lavanta',
    note: 'İnce çerçeve, yumuşak modüller',
    design: {
      fg: '#8070D8',
      bg: '#FFFFFF',
      transparentBg: false,
      dot: 'rounded',
      eyeOuter: 'rounded',
      eyeInner: 'rounded',
      frame: 'border',
      caption: '',
      frameRadius: 60,
    },
  },
  {
    id: 'gece',
    name: 'Gece',
    note: 'Koyu zemin, açık modüller',
    design: {
      fg: '#FFFFFF',
      bg: '#252338',
      transparentBg: false,
      dot: 'extra-rounded',
      eyeOuter: 'dot',
      eyeInner: 'dot',
      frame: 'none',
      caption: '',
      frameRadius: 0,
    },
  },
  {
    id: 'nane',
    name: 'Nane',
    note: 'Rozet etiketli, nane zemini',
    design: {
      fg: '#252338',
      bg: '#B9E7D4',
      transparentBg: false,
      dot: 'dots',
      eyeOuter: 'rounded',
      eyeInner: 'dot',
      frame: 'badge',
      caption: 'Okut & keşfet',
      frameRadius: 40,
    },
  },
  {
    id: 'bilet',
    name: 'Bilet',
    note: 'Alt etiketli, classy modüller',
    design: {
      fg: '#252338',
      bg: '#F5F6FA',
      transparentBg: false,
      dot: 'classy',
      eyeOuter: 'rounded',
      eyeInner: 'rounded',
      frame: 'labelBottom',
      caption: 'GİRİŞ • 2026',
      frameRadius: 30,
    },
  },
  {
    id: 'kabarcik',
    name: 'Kabarcık',
    note: 'Konuşma balonu çerçevesi',
    design: {
      fg: '#5B4BB8',
      bg: '#EAE5FB',
      transparentBg: false,
      dot: 'rounded',
      eyeOuter: 'dot',
      eyeInner: 'dot',
      frame: 'bubble',
      caption: 'Bize ulaşın',
      frameRadius: 55,
    },
  },
  {
    id: 'koseler',
    name: 'Köşe izi',
    note: 'Dört köşede baskı izi',
    design: {
      fg: '#252338',
      bg: '#FFFFFF',
      transparentBg: false,
      dot: 'square',
      eyeOuter: 'square',
      eyeInner: 'dot',
      frame: 'corners',
      caption: '',
      frameRadius: 0,
    },
  },
  {
    id: 'etiket',
    name: 'Üst etiket',
    note: 'Üstte etiket, yuvarlak modüller',
    design: {
      fg: '#8070D8',
      bg: '#FFFFFF',
      transparentBg: false,
      dot: 'extra-rounded',
      eyeOuter: 'rounded',
      eyeInner: 'rounded',
      frame: 'labelTop',
      caption: 'MENÜ',
      frameRadius: 45,
    },
  },
];

export const CAPTION_SUGGESTIONS = ['Taramak için okutun', 'Menü', 'Bize ulaşın', 'Wi-Fi şifresi'];

export const CAPTION_SUGGESTIONS_EN = ['Scan to open', 'Menu', 'Get in touch', 'Wi-Fi password'];

/** İngilizce görünen adlar; `design` ayarları `QR_PRESETS` ile aynı kalır. */
const PRESET_TEXT_EN: Record<string, { name: string; note: string; caption?: string }> = {
  sade: { name: 'Plain', note: 'Square modules, no frame' },
  lavanta: { name: 'Lavender', note: 'Thin frame, soft modules' },
  gece: { name: 'Night', note: 'Dark background, light modules' },
  nane: { name: 'Mint', note: 'Badge frame, mint background', caption: 'Scan & explore' },
  bilet: { name: 'Ticket', note: 'Bottom caption, classy modules', caption: 'ADMISSION • 2026' },
  kabarcik: { name: 'Bubble', note: 'Speech bubble frame', caption: 'Get in touch' },
  koseler: { name: 'Corner marks', note: 'Print marks in four corners' },
  etiket: { name: 'Top label', note: 'Label on top, rounded modules', caption: 'MENU' },
};

/**
 * Hazır tasarımlar — `id` ve `design` ayarları her dilde aynıdır; yalnızca
 * ad/açıklama ve varsa örnek etiket çevrilir. Kullanıcının kendi etiketi dil
 * değişince otomatik çevrilmez; çeviri yalnızca preset uygulanırken uygulanır.
 */
export function getQrPresets(locale: Locale = 'tr'): QrPreset[] {
  if (locale !== 'en') return QR_PRESETS;
  return QR_PRESETS.map((preset) => {
    const text = PRESET_TEXT_EN[preset.id];
    if (!text) return preset;
    return {
      ...preset,
      name: text.name,
      note: text.note,
      design: {
        ...preset.design,
        ...(text.caption !== undefined ? { caption: text.caption } : {}),
      },
    };
  });
}

/** Etiket önerileri — kullanıcı yazmadıysa dil değişiminde yeni öneriler gösterilir. */
export function getCaptionSuggestions(locale: Locale = 'tr'): string[] {
  return locale === 'en' ? CAPTION_SUGGESTIONS_EN : CAPTION_SUGGESTIONS;
}
