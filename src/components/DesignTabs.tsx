/** Tasarım sekmeleri — Çerçeve / Logo / Renk & Şekil (klavye ile gezinilebilir). */

import { useRef, useState, type KeyboardEvent } from 'react';
import { Frame, Image, Palette } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import type { DesignState, LogoState } from '../lib/types';
import { ColorShapePanel } from './ColorShapePanel';
import { FramePanel } from './FramePanel';
import { LogoPanel } from './LogoPanel';
import { cx } from './ui';

type TabId = 'frame' | 'logo' | 'color';

interface DesignTabsProps {
  design: DesignState;
  contrast: number;
  onPatch: (patch: Partial<DesignState>) => void;
  onLogoChange: (logo: LogoState | null) => void;
  onLogoUpload: (file: File) => void;
  logoBusy: boolean;
  logoError: string | null;
  onLogoErrorDismiss: () => void;
}

export function DesignTabs({
  design,
  contrast,
  onPatch,
  onLogoChange,
  onLogoUpload,
  logoBusy,
  logoError,
  onLogoErrorDismiss,
}: DesignTabsProps) {
  const { t } = useI18n();
  const [active, setActive] = useState<TabId>('frame');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Etiketler aktif dilde; anahtarlar (id) her dilde sabittir. Karşı dilde bir
  // "kicker" gösterilmez (sızıntı/tekrar olur); erişilebilir ad yalnızca etikettir.
  const tabs = [
    { id: 'frame' as const, label: t('Çerçeve', 'Frame'), icon: Frame },
    { id: 'logo' as const, label: 'Logo', icon: Image },
    { id: 'color' as const, label: t('Renk & Şekil', 'Color & Shape'), icon: Palette },
  ];

  const focusTab = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Ok tuşları, seçili sekme yerine **odaklanmış** sekmeye göre hareket eder
    // (ARIA tabs deseni). Aksi halde roving tabindex ile odak/seçim ayrışır.
    const focusedIndex = tabRefs.current.findIndex((element) => element === document.activeElement);
    const current = focusedIndex >= 0 ? focusedIndex : tabs.findIndex((tab) => tab.id === active);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(current + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <div
        role="tablist"
        aria-label={t('Tasarım seçenekleri', 'Design options')}
        onKeyDown={onKeyDown}
        className="flex gap-1 rounded-2xl border border-line bg-canvas/70 p-1"
      >
        {tabs.map((tab, index) => {
          const selected = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cx(
                'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5 text-[12.5px] font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20 sm:gap-2 sm:px-2.5 sm:text-[13px]',
                selected ? 'bg-white text-ink shadow-[0_1px_3px_rgba(37,35,56,0.12)]' : 'text-ink-soft hover:text-ink',
              )}
            >
              <Icon size={15} className="hidden min-[360px]:block" aria-hidden />
              <span className="min-w-0 text-center leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tüm paneller DOM'da kalır (aria-controls hedefleri her zaman geçerli);
          yalnızca aktif olan görünür. */}
      <div className="mt-5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            tabIndex={0}
            hidden={active !== tab.id}
            className="focus-visible:outline-none"
          >
            {tab.id === 'frame' && <FramePanel design={design} onPatch={onPatch} />}
            {tab.id === 'logo' && (
              <LogoPanel
                logo={design.logo}
                busy={logoBusy}
                error={logoError}
                onPatch={onPatch}
                onLogoChange={onLogoChange}
                onUpload={onLogoUpload}
                onDismissError={onLogoErrorDismiss}
              />
            )}
            {tab.id === 'color' && <ColorShapePanel design={design} contrast={contrast} onPatch={onPatch} />}
          </div>
        ))}
      </div>
    </section>
  );
}
