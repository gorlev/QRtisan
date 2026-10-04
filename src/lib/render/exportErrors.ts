/**
 * Dışa aktarma (PNG/SVG) hatalarını aktif dile çevirir.
 *
 * Çekirdek çizim modülleri (`export.ts`, `canvas.ts`) dilden bağımsız, sabit iç
 * mesajlarla hata fırlatır. UI ham `error.message` göstermemeli; bunun yerine bu
 * yardımcıyı çağırıp bilinen mesajları doğal TR/EN metne eşlemeli, tanınmayan
 * girdilerde ise güvenli ve yerelleştirilmiş genel bir metne düşmelidir.
 */

import { translate, type Locale } from '../locale';

interface LocalizedText {
  tr: string;
  en: string;
}

/** Çekirdek modüllerden gelebilen bilinen iç mesajlar (TR ve EN varyantları). */
const KNOWN_EXPORT_ERRORS: Record<string, LocalizedText> = {
  'Tuval oluşturulamadı.': {
    tr: 'Tuval oluşturulamadı.',
    en: 'Could not create the export canvas.',
  },
  'PNG üretilemedi.': {
    tr: 'PNG üretilemedi.',
    en: 'Could not generate the PNG file.',
  },
  'Path2D desteklenmiyor.': {
    tr: 'Bu tarayıcı dışa aktarmayı çizemiyor.',
    en: 'This browser cannot render the export.',
  },
  'Logo henüz hazır değil.': {
    tr: 'Logo henüz hazır değil.',
    en: 'The logo is not ready yet.',
  },
  'The logo is not ready yet.': {
    tr: 'Logo henüz hazır değil.',
    en: 'The logo is not ready yet.',
  },
};

/** Tanınmayan girdide gösterilen güvenli, yerelleştirilmiş genel hata. */
function genericExportError(locale: Locale): string {
  return translate(
    locale,
    'Dışa aktarma tamamlanamadı; lütfen tekrar deneyin.',
    'Export failed. Please try again.',
  );
}

/** Error benzeri değerden mesajı güvenle çıkarır (ham metin UI'a taşınmaz). */
function readErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

/** Bilinen mesajı prototip zincirine güvenmeden arar. */
function lookupKnown(message: string): LocalizedText | undefined {
  return Object.prototype.hasOwnProperty.call(KNOWN_EXPORT_ERRORS, message)
    ? KNOWN_EXPORT_ERRORS[message]
    : undefined;
}

/**
 * Dışa aktarma hatasını aktif dile çevirir. Bilinen iç mesajlar doğal TR/EN
 * karşılığına eşlenir; bilinmeyen, `null` ya da eksik girdilerde genel mesaj
 * döner. Ham iç `error.message` hiçbir durumda doğrudan döndürülmez.
 */
export function localizeExportError(error: unknown, locale: Locale = 'tr'): string {
  const known = lookupKnown(readErrorMessage(error));
  return known ? translate(locale, known.tr, known.en) : genericExportError(locale);
}
