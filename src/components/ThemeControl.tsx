/**
 * Tema denetimi — açık / koyu / sistem tercihini seçtirir.
 *
 * Seçili değer her zaman **tercihi** gösterir (çözülen temayı değil), böylece
 * kullanıcı `system` seçtiğinde neyi tercih ettiğini bilir. Doğal Türkçe ve
 * İngilizce etiketler `locale` prop'u ile gelir; i18n bağlamı gerekmez.
 *
 * Kompakt yerel `select` kullanır: mobil üst çubukta da yer kaplamaz ve klavye
 * ile erişilebilir kalır.
 */

import { ChevronDown, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';

export type ThemeControlLocale = 'tr' | 'en';

const OPTIONS: Array<{ value: ThemePreference; tr: string; en: string }> = [
  { value: 'light', tr: 'Açık', en: 'Light' },
  { value: 'dark', tr: 'Koyu', en: 'Dark' },
  { value: 'system', tr: 'Sistem', en: 'System' },
];

export function ThemeControl({ locale = 'tr' }: { locale?: ThemeControlLocale }) {
  const { preference, resolved, setPreference } = useTheme();
  const isTurkish = locale === 'tr';
  const Icon = preference === 'light' ? Sun : preference === 'dark' ? Moon : Monitor;
  const selectedLabel = OPTIONS.find((option) => option.value === preference)?.[locale] ?? preference;
  const resolvedLabel = resolved === 'dark' ? (isTurkish ? 'koyu' : 'dark') : isTurkish ? 'açık' : 'light';
  const label = isTurkish ? 'Tema tercihi' : 'Theme preference';
  const title = isTurkish
    ? `Tema: ${selectedLabel} · şu an ${resolvedLabel}`
    : `Theme: ${selectedLabel} · currently ${resolvedLabel}`;

  return (
    <div
      className="theme-control relative inline-flex shrink-0 items-center"
      data-testid="theme-control"
      data-theme-preference={preference}
      data-theme-resolved={resolved}
    >
      <Icon size={14} aria-hidden className="pointer-events-none absolute left-2.5 text-ink-soft" />
      <select
        value={preference}
        onChange={(event) => setPreference(event.target.value as ThemePreference)}
        aria-label={label}
        title={title}
        className="theme-select appearance-none rounded-xl border border-line bg-panel py-1.5 pl-8 pr-7 text-[12.5px] font-bold text-ink shadow-[0_1px_2px_rgba(37,35,56,0.06)] transition hover:border-lavender/50 focus:border-lavender focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20 max-lg:h-11 max-lg:min-w-[44px] max-lg:py-0 max-lg:pl-7 max-lg:pr-6"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option[locale]}
          </option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden className="pointer-events-none absolute right-2 text-ink-soft" />
    </div>
  );
}
