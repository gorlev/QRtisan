/**
 * Dil tercihi çözümlemesi — saf mantık, React'ten ve global durumdan bağımsız.
 *
 * İlk ziyarette kayıtlı geçerli bir açık tercih (`kare-locale` = `tr` | `en`;
 * eski anahtar adı geriye dönük uyumluluk için korunur)
 * varsa o kullanılır. Tercih yoksa veya geçersizse sistem dili çözümlenir:
 * `navigator.languages` öncelik sırasındaki ilk desteklenen dil (birincil etiket,
 * büyük/küçük harf duyarsız) kazanır; liste boşsa `navigator.language` denenir;
 * hiçbiri desteklenmiyorsa İngilizceye düşülür.
 *
 * Otomatik çözümlenen dil asla depoya yazılmaz — yalnızca kullanıcının açık
 * seçimi (`writeStoredLocalePreference`) kalıcılaşır. Böylece kullanıcı seçim
 * yapana kadar sonraki ziyaretler sistem dilini izleyebilir.
 */

import { isLocale, type Locale } from '../lib/locale';

/** Yalnızca dil tercihi için kullanılan depolama anahtarı. Eski ad geriye dönük uyumluluk için korunur. */
export const LOCALE_STORAGE_KEY = 'kare-locale';

/** Sistem dili desteklenmiyorsa (veya bilinmiyorsa) kullanılan güvenli varsayılan. */
export const SYSTEM_FALLBACK_LOCALE: Locale = 'en';

/** `navigator` benzeri dil bilgisi kaynağı. */
export interface NavigatorLanguageLike {
  languages?: readonly string[] | null;
  language?: string | null;
}

export type LocaleStorageReader = Pick<Storage, 'getItem'>;
export type LocaleStorageWriter = Pick<Storage, 'setItem'>;

export interface LocaleEnvironment {
  storage?: LocaleStorageReader | null;
  navigator?: NavigatorLanguageLike | null;
}

/**
 * Ham dil etiketini desteklenen dile eşler: `tr-TR` → `tr`, `en-GB` → `en`.
 * Birincil alt etiket karşılaştırılır; büyük/küçük harf ve `-`/`_` ayıracı
 * farkı gözetilmez. Desteklenmeyen veya geçersiz etiketlerde `null` döner.
 */
export function matchLocaleTag(tag: unknown): Locale | null {
  if (typeof tag !== 'string') return null;
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'tr') return 'tr';
  if (primary === 'en') return 'en';
  return null;
}

/**
 * Sistem dilini çözer. `navigator.languages` doluysa yalnızca o liste taranır
 * (ilk desteklenen kazanır); liste boş/eksikse `navigator.language` denenir.
 * Hiçbir desteklenen dil yoksa İngilizceye düşülür.
 */
export function detectPreferredLocale(
  navigatorLike?: NavigatorLanguageLike | null,
): Locale {
  const languages = navigatorLike?.languages;
  if (languages && languages.length > 0) {
    for (const tag of languages) {
      const match = matchLocaleTag(tag);
      if (match) return match;
    }
    // Liste dolu ama hiçbiri desteklenmiyor: İngilizce.
    return SYSTEM_FALLBACK_LOCALE;
  }
  return matchLocaleTag(navigatorLike?.language) ?? SYSTEM_FALLBACK_LOCALE;
}

/** Depodaki geçerli açık tercihi okur; yok/geçersiz/engelliyse `null` döner. */
export function readStoredLocalePreference(
  storage?: LocaleStorageReader | null,
): Locale | null {
  if (!storage) return null;
  try {
    const stored = storage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    // Depolama engelli (gizli mod vb.): tercih yok sayılır.
    return null;
  }
}

/** Açık tercihi depoya yazar; depolama kullanılamıyorsa sessizce vazgeçer. */
export function writeStoredLocalePreference(
  storage: LocaleStorageWriter | null | undefined,
  locale: Locale,
): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Kota/gizli mod: tercih yalnızca bu oturumda bellekte kalır.
  }
}

/**
 * Başlangıç dilini ve bunun açık bir kullanıcı tercihinden gelip gelmediğini
 * çözer. Depolama yoksa/engelliyse sistem diline düşer; o da yoksa İngilizce.
 */
export function resolveInitialLocale(
  environment?: LocaleEnvironment | null,
): { locale: Locale; explicit: boolean } {
  const stored = readStoredLocalePreference(environment?.storage);
  if (stored) return { locale: stored, explicit: true };
  return { locale: detectPreferredLocale(environment?.navigator), explicit: false };
}
