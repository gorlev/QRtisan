/** Hazır tasarım galerisi — her kart gerçek bir mini QR olarak çizilir. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { DEFAULT_DESIGN } from '../lib/defaults';
import { ensureDisplayFontReady, isDisplayFontReady } from '../lib/fonts';
import { getQrPresets, PRESET_SAMPLE, type QrPreset } from '../lib/presets';
import { createMatrixResult } from '../lib/qr';
import { renderSceneToCanvas } from '../lib/render/canvas';
import { createMeasureText } from '../lib/render/measure';
import { buildScene } from '../lib/render/scene';
import { cx, Panel, PanelHeader } from './ui';

const THUMB_WIDTH = 240;

interface PresetGalleryProps {
  activePresetId: string | null;
  onApply: (preset: QrPreset) => void;
}

export function PresetGallery({ activePresetId, onApply }: PresetGalleryProps) {
  const { locale, t } = useI18n();
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const measureText = useMemo(() => createMeasureText(), []);
  const [fontsReady, setFontsReady] = useState(() => isDisplayFontReady());

  // Kimlikler ve tasarım ayarları sabit; yalnızca ad/açıklama/etiket yerelleşir.
  const presets = useMemo(() => getQrPresets(locale), [locale]);

  useEffect(() => {
    let mounted = true;
    void ensureDisplayFontReady().then(() => {
      if (mounted) setFontsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    presets.forEach((preset, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const design = { ...DEFAULT_DESIGN, ...preset.design, logo: null };
      const result = createMatrixResult(PRESET_SAMPLE, 'M');
      if (!result.ok) return;
      const { scene } = buildScene({
        matrix: result.matrix,
        outputWidth: THUMB_WIDTH,
        design,
        logo: null,
        measureText,
      });
      canvas.width = Math.max(1, Math.round(scene.width));
      canvas.height = Math.max(1, Math.round(scene.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderSceneToCanvas(ctx, scene);
    });
  }, [fontsReady, measureText, presets]);

  return (
    <Panel className="mt-6">
      <PanelHeader
        step="04"
        title={t('Hazır tasarımlar', 'Ready-made designs')}
        hint={t('Tek tıkla uygulayın; içeriğiniz korunur.', 'Apply with one click — your content stays intact.')}
        action={<Sparkles size={16} className="mt-1 text-lavender" aria-hidden />}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {presets.map((preset, index) => {
          const active = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onApply(preset)}
              className={cx(
                'group relative flex flex-col gap-2 rounded-2xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20',
                active
                  ? 'border-lavender bg-lilac-soft ring-2 ring-lavender/20'
                  : 'border-line bg-white hover:border-lavender/45 hover:bg-lilac-soft/40',
              )}
            >
              <span className="block overflow-hidden rounded-xl border border-line bg-white">
                <canvas
                  ref={(element) => {
                    canvasRefs.current[index] = element;
                  }}
                  className="block h-auto w-full"
                  role="img"
                  aria-label={t(`${preset.name} tasarım örneği`, `${preset.name} design sample`)}
                />
              </span>
              <span className="px-0.5 pb-0.5">
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                  {preset.name}
                  {active && <Check size={12} strokeWidth={3} className="text-lavender" aria-hidden />}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">{preset.note}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
