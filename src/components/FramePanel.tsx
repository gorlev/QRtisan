/** Çerçeve sekmesi — çerçeve türü, etiket metni, yuvarlaklık ve sessiz alan. */

import { useI18n } from '../i18n/I18nProvider';
import { getCaptionSuggestions } from '../lib/presets';
import type { DesignState, FrameType } from '../lib/types';
import { FrameGlyph } from './glyphs';
import { Button, Field, RadioCard, Slider, TextInput } from './ui';

interface FrameOption {
  value: FrameType;
  label: string;
  note: string;
}

const CAPTION_FRAMES: FrameType[] = ['labelBottom', 'labelTop', 'bubble', 'corners', 'badge'];
const RADIUS_FRAMES: FrameType[] = ['border', 'labelBottom', 'labelTop', 'bubble'];

/** Tarayıcılar için önerilen en küçük sessiz alan (modül). */
const RECOMMENDED_QUIET_ZONE = 4;

interface FramePanelProps {
  design: DesignState;
  onPatch: (patch: Partial<DesignState>) => void;
}

export function FramePanel({ design, onPatch }: FramePanelProps) {
  const { locale, t } = useI18n();
  const needsCaption = CAPTION_FRAMES.includes(design.frame);
  const showsRadius = RADIUS_FRAMES.includes(design.frame);

  const frameOptions: FrameOption[] = [
    { value: 'none', label: t('Yok', 'None'), note: t('Yalnızca QR kod', 'QR code only') },
    { value: 'border', label: t('İnce çerçeve', 'Thin border'), note: t('Zarif çizgi', 'Clean outline') },
    { value: 'labelBottom', label: t('Alt etiket', 'Bottom label'), note: t('Yazı altta', 'Text below') },
    { value: 'labelTop', label: t('Üst etiket', 'Top label'), note: t('Yazı üstte', 'Text above') },
    { value: 'bubble', label: t('Kabarcık', 'Bubble'), note: t('Konuşma balonu', 'Speech bubble') },
    { value: 'corners', label: t('Köşe izi', 'Corner marks'), note: t('Baskı köşeleri', 'Print marks') },
    { value: 'badge', label: t('Rozet', 'Badge'), note: t('Yuvarlak etiket', 'Rounded label') },
  ];

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2.5 text-[13px] font-bold text-ink">
          {t('Çerçeve stili', 'Frame style')}
        </legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {frameOptions.map((option) => (
            <RadioCard
              key={option.value}
              name="frame-style"
              value={option.value}
              checked={design.frame === option.value}
              onChange={() => onPatch({ frame: option.value })}
              title={option.label}
              subtitle={option.note}
            >
              <FrameGlyph frame={option.value} className="h-10 w-10 text-ink" />
            </RadioCard>
          ))}
        </div>
      </fieldset>

      {needsCaption && (
        <div className="space-y-3">
          <Field
            htmlFor="frame-caption"
            label={t('Etiket metni', 'Caption text')}
            hint={`${design.caption.length}/48`}
          >
            <TextInput
              id="frame-caption"
              value={design.caption}
              maxLength={48}
              placeholder={t('Taramak için okutun', 'Scan to open')}
              onChange={(event) => onPatch({ caption: event.target.value })}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {getCaptionSuggestions(locale).map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full border border-line bg-white"
                onClick={() => onPatch({ caption: suggestion })}
              >
                {suggestion}
              </Button>
            ))}
            {design.caption && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => onPatch({ caption: '' })}
              >
                {t('Temizle', 'Clear')}
              </Button>
            )}
          </div>
          <p className="text-[12px] leading-snug text-ink-soft">
            {t('Etiket boş bırakılırsa yalnızca QR kod çizilir.', 'Leave the caption empty to render the QR code only.')}
          </p>
        </div>
      )}

      {showsRadius && (
        <Slider
          id="frame-radius"
          label={t('Çerçeve yuvarlaklığı', 'Frame roundness')}
          min={0}
          max={100}
          value={design.frameRadius}
          format={(value) => `${value}%`}
          onChange={(frameRadius) => onPatch({ frameRadius })}
        />
      )}

      <Slider
        id="quiet-zone"
        label={t('Sessiz alan', 'Quiet zone')}
        min={0}
        max={6}
        value={design.quietZone}
        format={(value) => t(`${value} modül`, `${value} module${value === 1 ? '' : 's'}`)}
        hint={t(
          `QR çevresindeki boşluk. Okuyucular için en az ${RECOMMENDED_QUIET_ZONE} modül önerilir.`,
          `Space around the QR code. We recommend at least ${RECOMMENDED_QUIET_ZONE} modules for reliable scanning.`,
        )}
        onChange={(quietZone) => onPatch({ quietZone })}
      />
    </div>
  );
}
