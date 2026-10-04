/** Taranabilirlik uyarıları listesi. */

import { AlertTriangle, Check, Info } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import type { ScanWarning } from '../lib/warnings';
import { cx } from './ui';

const TONES = {
  danger: {
    wrapper: 'border-red-200 bg-red-50 text-red-800',
    icon: AlertTriangle,
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
    icon: AlertTriangle,
  },
  info: {
    wrapper: 'border-line bg-canvas text-ink-soft',
    icon: Info,
  },
} as const;

export function WarningList({ warnings, hasMatrix }: { warnings: ScanWarning[]; hasMatrix: boolean }) {
  const { t } = useI18n();
  const okMessage = t('Taranabilirlik kontrolü: sorun görünmüyor.', 'Scanability check: no issues found.');

  if (!hasMatrix) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-line bg-canvas px-3.5 py-3 text-[12.5px] font-medium text-ink-soft">
        <Info size={14} className="shrink-0" aria-hidden />
        {t(
          'Taranabilirlik kontrolü, geçerli bir QR kod oluştuğunda yapılır.',
          'The scanability check runs once a valid QR code exists.',
        )}
      </p>
    );
  }

  if (warnings.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-mint bg-mint/30 px-3.5 py-3 text-[12.5px] font-bold text-[#1c6353]">
        <Check size={14} strokeWidth={3} aria-hidden />
        {okMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {warnings.map((warning) => {
        const tone = TONES[warning.severity];
        const Icon = tone.icon;
        return (
          <li
            key={warning.id}
            className={cx('flex items-start gap-2.5 rounded-xl border px-3.5 py-3', tone.wrapper)}
          >
            <Icon size={14} className="mt-0.5 shrink-0" aria-hidden />
            <div className="text-[12.5px] leading-relaxed">
              <p className="font-bold">{warning.title}</p>
              <p>{warning.detail}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
