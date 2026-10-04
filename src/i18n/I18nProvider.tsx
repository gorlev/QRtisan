/**
 * Arayüz dili bağlamı — kayıtlı açık tercih varsa o, yoksa sistem dili.
 *
 * İlk ziyarette `navigator.languages` öncelik sırasına göre ilk desteklenen dil
 * (tr/en) seçilir; sistem dili desteklenmiyorsa İngilizceye düşülür. Otomatik
 * seçim `kare-locale` anahtarına yazılmaz; yalnızca `setLocale` çağrısı tercihi
 * kalıcılaştırır. `kare-locale` eski anahtar adıdır; geriye dönük uyumluluk
 * için korunur (mevcut tercihler sıfırlanmaz). Açık tercih yokken sistem dil
 * değişimleri canlı izlenir;
 * kullanıcı seçim yaptıktan sonra arayüz sabitlenir. QR içeriği, tasarım, logo
 * ve tema asla burada tutulmaz. `document.lang` ve `document.title` aktif dile
 * göre güncellenir. Sağlayıcı dışında çağrılırsa İngilizce varsayılanı döner
 * (birim testleri ve izole bileşenler için).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { translate, type Locale } from '../lib/locale';
import {
  resolveInitialLocale,
  SYSTEM_FALLBACK_LOCALE,
  writeStoredLocalePreference,
} from './localePreference';

export type { Locale };
export { LOCALE_STORAGE_KEY } from './localePreference';

export interface I18nApi {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** İlk argüman Türkçe, ikincisi İngilizce metindir. */
  t: (tr: string, en: string) => string;
}

const FALLBACK: I18nApi = {
  locale: 'en',
  setLocale: () => {},
  t: (_tr, en) => en,
};

const I18nContext = createContext<I18nApi>(FALLBACK);

const TITLES: Record<Locale, string> = {
  tr: 'QRtisan — Tarayıcıda QR Kod Tasarımı',
  en: 'QRtisan — QR Code Design in Your Browser',
};

/** `localStorage` erişimi engelliyse `null` döner (gizli mod vb.). */
function readStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function resolveEnvironment(): { locale: Locale; explicit: boolean } {
  if (typeof window === 'undefined') {
    // Sunucu/SSR: sistem bilgisi yok, güvenli varsayılan İngilizce.
    return { locale: SYSTEM_FALLBACK_LOCALE, explicit: false };
  }
  return resolveInitialLocale({ storage: readStorage(), navigator: window.navigator });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(resolveEnvironment);
  const [locale, setLocaleState] = useState<Locale>(initial.locale);
  const explicitChoice = useRef(initial.explicit);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = TITLES[locale];
  }, [locale]);

  // Açık tercih yokken sistem dili değişimlerini izle; kullanıcı seçince dur.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onLanguageChange = () => {
      if (explicitChoice.current) return;
      const environment = resolveEnvironment();
      if (environment.explicit) explicitChoice.current = true;
      setLocaleState(environment.locale);
    };
    window.addEventListener('languagechange', onLanguageChange);
    return () => window.removeEventListener('languagechange', onLanguageChange);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    explicitChoice.current = true;
    setLocaleState(next);
    writeStoredLocalePreference(readStorage(), next);
  }, []);

  const value = useMemo<I18nApi>(
    () => ({
      locale,
      setLocale,
      t: (tr, en) => translate(locale, tr, en),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nApi {
  return useContext(I18nContext);
}
