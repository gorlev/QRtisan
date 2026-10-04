/**
 * Yazı tipleri — tamamı yerel olarak paketlenir (@fontsource), dış ağ isteği yoktur.
 *
 * Tek kaynak kuralı: tuval ölçümü, sahne metinleri ve SVG'ye gömülen yüz aynı
 * aile adını (`Manrope Variable`) kullanır. Böylece önizleme, PNG ve SVG
 * metrikleri birebir aynı olur ve sabitler birbirinden ayrışamaz.
 */

export const DISPLAY_FONT_FAMILY = 'Manrope Variable';

/** Canvas `font`, sahne metinleri ve SVG `font-family` için ortak yığın. */
export const DISPLAY_FONT_STACK = `'${DISPLAY_FONT_FAMILY}', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif`;

export interface FontSubset {
  /** @fontsource alt küme adı (dosya adıyla aynı). */
  name: string;
  /** Google Fonts `unicode-range` bildirimi. */
  unicodeRange: string;
}

/**
 * Paketlenen tüm Manrope alt kümeleri.
 *
 * Türkçe için kritik olan İ, ş, ğ, Ş, Ğ karakterleri `latin-ext` içindedir;
 * yalnızca `latin` gömülürse SVG'de bu glifler sistem yazı tipine düşer.
 * Bu yüzden alt kümelerin tamamı kendi unicode-range'leriyle gömülür.
 */
export const MANROPE_SUBSETS: FontSubset[] = [
  {
    name: 'cyrillic-ext',
    unicodeRange: 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  },
  {
    name: 'cyrillic',
    unicodeRange: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  },
  {
    name: 'greek',
    unicodeRange: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF',
  },
  {
    name: 'vietnamese',
    unicodeRange:
      'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
  },
  {
    name: 'latin-ext',
    unicodeRange:
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  },
  {
    name: 'latin',
    unicodeRange:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
];

/** Türkçe etiket regresyon testlerinde kullanılan örnek. */
export const TURKISH_CAPTION_SAMPLE = 'İletişim — görüşelim';

/**
 * Ölçüm/çizim öncesi Manrope'un gerçekten yüklü olduğundan emin olur.
 *
 * `document.fonts.ready` yalnızca istenmiş yüzleri bekler; bu yüzden kullanılan
 * ağırlıklar açıkça `load` edilir. Hata durumunda sessizce devam edilir ve
 * sistem yazı tipi kullanılır.
 */
export async function ensureDisplayFontReady(weights: number[] = [700, 800]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const fontSet = document.fonts;
  try {
    await Promise.all(weights.map((weight) => fontSet.load(`${weight} 100px ${DISPLAY_FONT_STACK}`)));
  } catch {
    // Yazı tipi yüklenemezse sistem yazı tipiyle devam edilir.
  }
  try {
    await fontSet.ready;
  } catch {
    // yoksay
  }
}

/** Senkron kontrol: yazı tipi zaten yüklüyse ilk karede doğru ölçüm yapılabilir. */
export function isDisplayFontReady(): boolean {
  if (typeof document === 'undefined' || !document.fonts) return false;
  try {
    return document.fonts.check(`700 16px ${DISPLAY_FONT_STACK}`);
  } catch {
    return false;
  }
}
