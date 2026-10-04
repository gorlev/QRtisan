/**
 * Dil yardımcıları — saf çekirdek katmanı, React'ten ve global durumdan bağımsız.
 *
 * Tüm yerelleştirilebilir metinler bu modüldeki `translate` ile seçilir; dil
 * tercihi çağrı sahibinde (UI/hook) tutulur ve her saf fonksiyona son parametre
 * olarak geçirilir. Böylece aynı girdi her dilde aynı yükü/matrisi üretir.
 */

export type Locale = 'tr' | 'en';

export const LOCALES: readonly Locale[] = ['tr', 'en'];

/** Varsayılan dil — mevcut davranışla geriye dönük uyum için Türkçe. */
export const DEFAULT_LOCALE: Locale = 'tr';

/** Türkçe ve İngilizce metinden aktif dili seçer. */
export function translate(locale: Locale, tr: string, en: string): string {
  return locale === 'en' ? en : tr;
}

/** Bilinmeyen bir değerin geçerli bir dil kodu olup olmadığını denetler. */
export function isLocale(value: unknown): value is Locale {
  return value === 'tr' || value === 'en';
}
