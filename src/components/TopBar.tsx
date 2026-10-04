/** Üst çubuk — marka, dil seçici, tema denetimi, yerel rozet ve sıfırlama. */

import { RotateCcw, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { ThemeControl } from './ThemeControl';
import { Button, cx } from './ui';

export function TopBar({ onReset }: { onReset: () => void }) {
  const { locale, setLocale, t } = useI18n();
  const resetLabel = t('Tasarımı sıfırla', 'Reset design');

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur" data-testid="topbar">
      <div className="mx-auto flex min-h-16 max-w-[1240px] flex-nowrap items-center gap-x-1.5 gap-y-1 px-3 py-2 sm:gap-x-2 sm:px-6">
        <a
          href="#studio"
          aria-label={t('QRtisan — içeriğe geç', 'QRtisan — skip to content')}
          className="flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/25 max-lg:min-h-11 max-lg:min-w-11 max-lg:justify-center sm:gap-2.5"
        >
          <img src={import.meta.env.BASE_URL + "favicon.svg"} alt="" width="36" height="36" className="shrink-0 min-[480px]:hidden" />
          <img src={import.meta.env.BASE_URL + "brand/qrtisan-horizontal.png"} alt="QRtisan" width="2172" height="724" className="brand-horizontal hidden min-[480px]:block" />
        </a>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-lilac-soft px-3 py-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-lavender-deep md:inline-flex">
            <ShieldCheck size={13} aria-hidden />
            {t('Yerel · veri cihazdan çıkmaz', 'Local · data never leaves your device')}
          </span>

          <div
            role="group"
            aria-label={t('Dil seçimi', 'Language selection')}
            data-testid="locale-select"
            className="flex items-center gap-0.5 rounded-full border border-line bg-white p-0.5"
          >
            <span className="hidden pl-2 pr-0.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft sm:inline">
              {t('Dil', 'Language')}
            </span>
            <button
              type="button"
              data-testid="locale-tr"
              lang="tr"
              aria-label="Türkçe"
              aria-pressed={locale === 'tr'}
              onClick={() => setLocale('tr')}
              className={cx(
                'rounded-full px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/40 max-lg:min-h-11 max-lg:min-w-11 max-lg:px-0',
                locale === 'tr' ? 'bg-lavender text-white' : 'text-ink-soft hover:bg-lilac-soft hover:text-ink',
              )}
            >
              TR
            </button>
            <button
              type="button"
              data-testid="locale-en"
              lang="en"
              aria-label="English"
              aria-pressed={locale === 'en'}
              onClick={() => setLocale('en')}
              className={cx(
                'rounded-full px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/40 max-lg:min-h-11 max-lg:min-w-11 max-lg:px-0',
                locale === 'en' ? 'bg-lavender text-white' : 'text-ink-soft hover:bg-lilac-soft hover:text-ink',
              )}
            >
              EN
            </button>
          </div>

          <ThemeControl locale={locale} />

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onReset}
            aria-label={resetLabel}
            title={resetLabel}
            className="max-lg:min-h-11 max-lg:min-w-11 max-lg:px-0"
          >
            <RotateCcw size={13} aria-hidden />
            <span className="hidden lg:inline">{resetLabel}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
