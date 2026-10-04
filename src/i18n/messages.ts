/**
 * Saklanan hata tanımlarını aktif dile çeviren ince yardımcı.
 *
 * Logo yükleme hatası `useStudio` içinde dilden bağımsız `{code, params}`
 * olarak saklanır; çekirdek `localizeLogoError` ile her dilde yeniden üretilir.
 * Seçili logonun çözülememesi (logoReadiness) ise kanonik Türkçe bir sabittir;
 * burada hedef dile eşlenir. Bilinmeyen metin olduğu gibi bırakılır.
 */

import { localizeLogoError } from '../lib/logo';
import type { Locale } from '../lib/locale';

/** Seçili logo görseli çözülemediğinde gösterilen kanonik mesaj. */
export const LOGO_DECODE_ERROR = 'Logo görüntüsü açılamadı; kaldırıp yeniden yükleyin.';
export const LOGO_DECODE_ERROR_EN = 'The logo image could not be loaded. Remove it and try again.';

/** Saklanan hata metnini aktif dile çevirir (bilinmeyen metin değişmez). */
export function localizeErrorMessage(message: string | null | undefined, locale: Locale): string | null {
  if (!message) return null;
  if (message === LOGO_DECODE_ERROR) return locale === 'en' ? LOGO_DECODE_ERROR_EN : LOGO_DECODE_ERROR;
  if (message === LOGO_DECODE_ERROR_EN) return locale === 'en' ? LOGO_DECODE_ERROR_EN : LOGO_DECODE_ERROR;
  return localizeLogoError(message, locale);
}

/** Metin, seçili logonun çözülemediğini bildiren hata mı? */
export function isLogoDecodeError(message: string | null | undefined): boolean {
  if (!message) return false;
  return message === LOGO_DECODE_ERROR || message === LOGO_DECODE_ERROR_EN;
}
