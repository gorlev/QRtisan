/**
 * Tema sağlayıcısı — tercihi bağlamda tutar, işletim sistemi şemasını yalnızca
 * `system` tercihinde canlı izler ve çözülen temayı `<html>` öğesine uygular.
 *
 * İlk boyama `index.html` içindeki satır içi betikle yapılır; bu sağlayıcı
 * devraldığı durumu React çalışma anında güncel tutar (tema sıçraması olmaz).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeToDocument,
  prefersDarkScheme,
  readStoredPreference,
  resolveTheme,
  THEME_MEDIA_QUERY,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme';

export interface ThemeContextValue {
  /** Kullanıcının seçimi (`system` olabilir). */
  preference: ThemePreference;
  /** Ekranda gerçekten görünen tema. */
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

export type { ResolvedTheme, ThemePreference } from './theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return prefersDarkScheme(typeof window === 'undefined' ? null : window);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());
  const resolved = resolveTheme(preference, systemDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(THEME_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    // Bağlanırken güncel değeri eşitle (etkinlik yalnızca değişimde tetiklenir).
    setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // Açık bir tercih varsa `resolved` işletim sistemini yok sayar; bu yüzden
  // sistem değişimleri yalnızca `system` tercihinde DOM'a yansır.
  useEffect(() => {
    applyThemeToDocument(preference, resolved);
  }, [preference, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStoredPreference(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme yalnızca ThemeProvider içinde kullanılabilir.');
  return context;
}
