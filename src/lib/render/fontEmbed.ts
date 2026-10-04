/**
 * SVG çıktısına gömülen yerel yazı tipi.
 *
 * Manrope'un **tüm** paketlenmiş alt kümeleri (latin, latin-ext, cyrillic,
 * cyrillic-ext, greek, vietnamese) kendi `unicode-range` bildirimleriyle
 * gömülür. Türkçe karakterler (İ, ş, ğ, Ş, Ğ) `latin-ext` içinde olduğundan
 * yalnızca `latin` gömmek SVG'de karışık yazı tipi görünümüne yol açar.
 *
 * Dosyalar paketin içinden okunur; dış ağ isteği yapılmaz.
 */

import cyrillicUrl from '@fontsource-variable/manrope/files/manrope-cyrillic-wght-normal.woff2?url';
import cyrillicExtUrl from '@fontsource-variable/manrope/files/manrope-cyrillic-ext-wght-normal.woff2?url';
import greekUrl from '@fontsource-variable/manrope/files/manrope-greek-wght-normal.woff2?url';
import latinUrl from '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url';
import latinExtUrl from '@fontsource-variable/manrope/files/manrope-latin-ext-wght-normal.woff2?url';
import vietnameseUrl from '@fontsource-variable/manrope/files/manrope-vietnamese-wght-normal.woff2?url';
import { DISPLAY_FONT_FAMILY, MANROPE_SUBSETS } from '../fonts';

/** Alt küme adı → paket içi woff2 yolu (Vite tarafından çözülür). */
export const SUBSET_URLS: Record<string, string> = {
  'cyrillic-ext': cyrillicExtUrl,
  cyrillic: cyrillicUrl,
  greek: greekUrl,
  vietnamese: vietnameseUrl,
  'latin-ext': latinExtUrl,
  latin: latinUrl,
};

export interface EmbeddedFontFace {
  subset: string;
  unicodeRange: string;
  base64: string;
}

/** @font-face kurallarını üretir (saf fonksiyon — testlerde doğrudan kullanılır). */
export function buildFontCss(faces: EmbeddedFontFace[]): string {
  return faces
    .map(
      (face) =>
        `@font-face{font-family:'${DISPLAY_FONT_FAMILY}';font-style:normal;font-weight:200 800;font-display:swap;src:url(data:font/woff2;base64,${face.base64}) format('woff2');unicode-range:${face.unicodeRange};}`,
    )
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadFace(subset: string, unicodeRange: string): Promise<EmbeddedFontFace> {
  const url = SUBSET_URLS[subset];
  if (!url) throw new Error(`Bilinmeyen yazı tipi alt kümesi: ${subset}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Yazı tipi alt kümesi okunamadı: ${subset}`);
  const buffer = await response.arrayBuffer();
  return { subset, unicodeRange, base64: bytesToBase64(new Uint8Array(buffer)) };
}

let cached: Promise<string> | null = null;

/**
 * Tüm alt kümeleri gömülü olarak içeren CSS'i döndürür.
 * Bazı alt kümeler okunamazsa kalanlarla devam edilir; hiçbiri okunamazsa
 * boş dizge döner ve SVG sistem yazı tipiyle çizilir.
 */
export function getEmbeddedFontCss(): Promise<string> {
  cached ??= (async () => {
    const results = await Promise.allSettled(
      MANROPE_SUBSETS.map((subset) => loadFace(subset.name, subset.unicodeRange)),
    );
    const faces = results
      .filter((result): result is PromiseFulfilledResult<EmbeddedFontFace> => result.status === 'fulfilled')
      .map((result) => result.value);
    return buildFontCss(faces);
  })().catch(() => '');
  return cached;
}
