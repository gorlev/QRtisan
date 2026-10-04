/** Renk & Şekil sekmesi — ön/arka plan, kontrast, modül ve köşe şekilleri. */

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Lock, Sun } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import {
  contrastLabel,
  formatContrast,
  getColorPresets,
  getPalettePairs,
  normalizeHex,
} from '../lib/colors';
import type { DesignState, DotType, EyeInnerType, EyeOuterType, ErrorLevelChoice } from '../lib/types';
import { EyeGlyph, ModuleShapeGlyph } from './glyphs';
import { cx, Field, RadioCard, Select, SwatchButton, Switch } from './ui';

function ColorField({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}) {
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleText = (raw: string) => {
    setDraft(raw);
    const hex = normalizeHex(raw);
    if (hex) onChange(hex);
  };

  return (
    <div className={cx('space-y-2.5', disabled && 'opacity-50')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-bold text-ink">{label}</span>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-picker`}
            type="color"
            value={value}
            disabled={disabled}
            aria-label={t(`${label} renk seçici`, `${label} color picker`)}
            onChange={(event) => onChange(event.target.value)}
            className="color-input"
          />
          <input
            id={id}
            value={draft}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            aria-label={t(`${label} hex kodu`, `${label} hex code`)}
            onChange={(event) => handleText(event.target.value)}
            onBlur={() => {
              if (!normalizeHex(draft)) setDraft(value);
            }}
            className="w-[96px] rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-[11.5px] uppercase tracking-wide text-ink focus:border-lavender focus:outline-none focus-visible:ring-4 focus-visible:ring-lavender/15"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {getColorPresets(locale).map((preset) => (
          <SwatchButton
            key={`${id}-${preset.value}`}
            color={preset.value}
            name={preset.name}
            selected={value.toLowerCase() === preset.value.toLowerCase()}
            onSelect={() => onChange(preset.value)}
          />
        ))}
      </div>
    </div>
  );
}

interface ColorShapePanelProps {
  design: DesignState;
  contrast: number;
  onPatch: (patch: Partial<DesignState>) => void;
}

export function ColorShapePanel({ design, contrast, onPatch }: ColorShapePanelProps) {
  const { locale, t } = useI18n();

  const dotOptions: Array<{ value: DotType; label: string }> = [
    { value: 'square', label: t('Kare', 'Square') },
    { value: 'rounded', label: t('Yumuşak', 'Soft') },
    { value: 'extra-rounded', label: t('Çok yuvarlak', 'Extra round') },
    { value: 'dots', label: t('Nokta', 'Dots') },
    { value: 'classy', label: 'Classy' },
    { value: 'classy-rounded', label: t('Classy yumuşak', 'Classy soft') },
    { value: 'diamond', label: t('Elmas', 'Diamond') },
  ];

  const eyeOptions: Array<{ value: EyeOuterType; label: string }> = [
    { value: 'square', label: t('Kare', 'Square') },
    { value: 'rounded', label: t('Yuvarlak', 'Rounded') },
    { value: 'dot', label: t('Daire', 'Circle') },
  ];

  const ecOptions: Array<{ value: ErrorLevelChoice; label: string }> = [
    { value: 'auto', label: t('Otomatik (önerilen)', 'Automatic (recommended)') },
    { value: 'L', label: 'L — %7' },
    { value: 'M', label: 'M — %15' },
    { value: 'Q', label: 'Q — %25' },
    { value: 'H', label: 'H — %30' },
  ];

  const contrastTone =
    contrast >= 4.5
      ? 'border-mint bg-mint/30 text-[#1c6353]'
      : contrast >= 3
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <ColorField
          id="color-fg"
          label={t('Ön plan (modüller)', 'Foreground (modules)')}
          value={design.fg}
          onChange={(fg) => onPatch({ fg })}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="h-px flex-1 bg-line" />
          <button
            type="button"
            onClick={() => onPatch({ fg: design.bg, bg: design.fg })}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft transition hover:border-lavender/50 hover:text-lavender-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20"
          >
            <ArrowLeftRight size={12} aria-hidden />
            {t('Renkleri ters çevir', 'Swap colors')}
          </button>
          <span className="h-px flex-1 bg-line" />
        </div>
        <ColorField
          id="color-bg"
          label={t('Arka plan', 'Background')}
          value={design.bg}
          disabled={design.transparentBg}
          onChange={(bg) => onPatch({ bg })}
        />
        <Switch
          id="transparent-bg"
          label={t('Şeffaf arka plan', 'Transparent background')}
          checked={design.transparentBg}
          hint={t(
            "PNG'de saydam zemin. Koyu yüzeylerde taranmayabilir.",
            'Transparent background in PNG. May not scan on dark surfaces.',
          )}
          onChange={(transparentBg) => onPatch({ transparentBg })}
        />
        <div
          data-testid="contrast-readout"
          className={cx(
            'flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-[12.5px] font-bold',
            contrastTone,
          )}
          role="status"
          aria-live="polite"
        >
          <span className="flex items-center gap-2">
            <Sun size={14} aria-hidden />
            {t('Kontrast', 'Contrast')}
          </span>
          <span className="font-mono text-[11.5px] font-medium tabular-nums">
            {formatContrast(contrast)} · {contrastLabel(contrast, locale)}
          </span>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2.5 text-[13px] font-bold text-ink">
          {t('Hazır paletler', 'Ready-made palettes')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {getPalettePairs(locale).map((pair) => {
            const selected =
              design.fg.toLowerCase() === pair.fg.toLowerCase() &&
              design.bg.toLowerCase() === pair.bg.toLowerCase();
            return (
              <button
                key={pair.name}
                type="button"
                aria-pressed={selected}
                onClick={() => onPatch({ fg: pair.fg, bg: pair.bg, transparentBg: false })}
                className={cx(
                  'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition',
                  selected
                    ? 'border-lavender bg-lilac-soft ring-2 ring-lavender/20'
                    : 'border-line bg-white hover:border-lavender/45',
                )}
              >
                <span className="flex shrink-0 overflow-hidden rounded-md border border-line">
                  <span className="h-5 w-5" style={{ backgroundColor: pair.fg }} />
                  <span className="h-5 w-5" style={{ backgroundColor: pair.bg }} />
                </span>
                <span className="text-[11.5px] font-bold leading-tight text-ink">{pair.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2.5 text-[13px] font-bold text-ink">{t('Modül şekli', 'Module shape')}</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {dotOptions.map((option) => (
            <RadioCard
              key={option.value}
              name="dot-style"
              value={option.value}
              checked={design.dot === option.value}
              onChange={() => onPatch({ dot: option.value })}
              title={option.label}
            >
              <ModuleShapeGlyph dot={option.value} className="h-8 w-8 text-ink" />
            </RadioCard>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-2.5 text-[13px] font-bold text-ink">{t('Köşe çerçevesi', 'Corner frame')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {eyeOptions.map((option) => (
              <RadioCard
                key={`outer-${option.value}`}
                name="eye-outer"
                value={option.value}
                checked={design.eyeOuter === option.value}
                onChange={() => onPatch({ eyeOuter: option.value })}
                title={option.label}
              >
                <EyeGlyph outer={option.value} inner="square" className="h-7 w-7 text-ink" />
              </RadioCard>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2.5 text-[13px] font-bold text-ink">{t('Köşe gözü', 'Corner center')}</legend>
          <div className="grid grid-cols-3 gap-2">
            {eyeOptions.map((option) => (
              <RadioCard
                key={`inner-${option.value}`}
                name="eye-inner"
                value={option.value}
                checked={design.eyeInner === option.value}
                onChange={() => onPatch({ eyeInner: option.value as EyeInnerType })}
                title={option.label}
              >
                <EyeGlyph outer="rounded" inner={option.value} className="h-7 w-7 text-ink" />
              </RadioCard>
            ))}
          </div>
        </fieldset>
      </div>

      <Field
        htmlFor="ec-level"
        label={t('Hata düzeltme', 'Error correction')}
        hint={design.logo ? t('logo nedeniyle H', 'H because of the logo') : undefined}
      >
        <Select
          id="ec-level"
          value={design.errorLevel}
          disabled={Boolean(design.logo)}
          onChange={(event) => onPatch({ errorLevel: event.target.value as ErrorLevelChoice })}
        >
          {ecOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>
      {design.logo && (
        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden />
          {t(
            'Logo varken okunabilirlik için H seviyesi zorunludur. Logoyu kaldırırsanız seçim yeniden açılır.',
            'Level H is required for readability when a logo is present. Remove the logo to change it again.',
          )}
        </p>
      )}
    </div>
  );
}
