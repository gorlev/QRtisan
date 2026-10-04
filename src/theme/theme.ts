/**
 * Tema tercihi mantığı — React'ten bağımsız, test edilebilir.
 *
 * Tercih üç değerden biridir: `light`, `dark`, `system`. `system` seçiliyken
 * işletim sistemi şeması canlı izlenir; açık bir seçim yapıldıysa işletim
 * sistemi değişimleri görünümü etkilemez.
 *
 * Yalnızca tema tercihi `localStorage`'a yazılır. QR içeriği, logo veya tasarım
 * hiçbir zaman kalıcı depolamaya yazılmaz.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/** Eski anahtar adı geriye dönük uyumluluk için korunur; mevcut tercihler sıfırlanmaz. */
export const THEME_STORAGE_KEY = 'kare-theme';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** `meta[name="theme-color"]` ve tarayıcı çubuğu için çözülen tema renkleri. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#F5F6FA',
  dark: '#12111D',
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function defaultStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    // Gizli mod veya engellenmiş depolama: tercih varsayılana döner.
    return null;
  }
}

/** Depodan tercihi okur; eksik/bozuksa güvenli varsayılan `system` döner. */
export function readStoredPreference(storage: StorageLike | null = defaultStorage()): ThemePreference {
  if (!storage) return 'system';
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

/** Tercihi depoya yazar; depolama kullanılamıyorsa sessizce vazgeçer. */
export function writeStoredPreference(
  preference: ThemePreference,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Kota/gizli mod: tercih yalnızca bu oturumda bellekte kalır.
  }
}

/** Tercih + işletim sistemi durumundan gerçek (çözülen) temayı üretir. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

/** `matchMedia` desteklenmiyorsa veya hata verirse açık tema varsayılır. */
export function prefersDarkScheme(view: Pick<Window, 'matchMedia'> | null | undefined): boolean {
  if (!view || typeof view.matchMedia !== 'function') return false;
  try {
    return view.matchMedia(THEME_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * Çözülen temayı belgeye uygular: `data-theme`, `data-theme-preference`,
 * `color-scheme` (yerel denetimler için) ve `theme-color` meta etiketi.
 */
export function applyThemeToDocument(
  preference: ThemePreference,
  resolved: ResolvedTheme,
  doc: Document | null = typeof document === 'undefined' ? null : document,
): void {
  if (!doc) return;
  const root = doc.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);
  root.style.colorScheme = resolved;
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);
}
