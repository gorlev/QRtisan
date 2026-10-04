/** Dışa aktarma paneli — PNG ve SVG indirme (çerçeve + etiket + logo dahil). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileImage, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { localizeErrorMessage } from '../i18n/messages';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DEFAULT_EXPORT_WIDTH, EXPORT_WIDTHS, SVG_REFERENCE_WIDTH } from '../lib/defaults';
import { ensureDisplayFontReady } from '../lib/fonts';
import { localizeExportError } from '../lib/render/exportErrors';
import { buildFileName, downloadBlob, downloadText, sceneToPngBlob } from '../lib/render/export';
import { getEmbeddedFontCss } from '../lib/render/fontEmbed';
import { buildScene } from '../lib/render/scene';
import { sceneToSvg } from '../lib/render/svg';
import type { DesignState, MeasureText, QrMatrix } from '../lib/types';
import { Button, Select } from './ui';

interface ExportPanelProps {
  matrix: QrMatrix | null;
  design: DesignState;
  measureText: MeasureText;
  logoImage: HTMLImageElement | null;
  payload: string;
  /** Geçerli matris yoksa (içerik hatası veya kapasite aşımı). */
  disabled: boolean;
  /** Logo okunuyor/çözülüyor — dışa aktarma kilitli. */
  logoPending: boolean;
  /** Logo görseli açılamadı — dışa aktarma kilitli. */
  logoError: string | null;
}

type BusyKind = 'png' | 'svg';

/**
 * Yapılandırılmış sonuç durumu: metin aktif dilde **render anında** üretilir,
 * böylece dil değişince eski dilde bayat metin kalmaz. Hata nesnesi ham
 * haliyle saklanır; kullanıcıya `localizeExportError` ile çevrilir.
 */
type ExportResult =
  | { tone: 'ok'; kind: 'png'; width: number; height: number }
  | { tone: 'ok'; kind: 'svg' }
  | { tone: 'error'; error: unknown };

/** Matris içeriğini ucuz bir imzaya indirger; başarı durumunu girdiye bağlamak için. */
function hashMatrix(matrix: QrMatrix | null): string {
  if (!matrix) return 'none';
  let hash = matrix.size;
  for (let index = 0; index < matrix.data.length; index += 1) {
    hash = (hash * 31 + matrix.data[index]) | 0;
  }
  return `${matrix.size}:${hash}`;
}

export function ExportPanel({
  matrix,
  design,
  measureText,
  logoImage,
  payload,
  disabled,
  logoPending,
  logoError,
}: ExportPanelProps) {
  const { locale, t } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 64rem)');
  const [pngSize, setPngSize] = useState<number>(DEFAULT_EXPORT_WIDTH);
  const [busyKind, setBusyKind] = useState<BusyKind | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);

  const localizedLogoError = localizeErrorMessage(logoError, locale);

  // Sonuç yalnızca bu tam girdi kümesine aittir; dil de anahtardadır. Dil
  // değişince bayat başarı/hata metni düşer ve süren async iş eski dilde
  // durum yazamaz. Meşgul durumu ayrı tutulur ki dil değişince anında
  // yeni dile çevrilsin.
  const inputKey = useMemo(
    () =>
      JSON.stringify({
        payload,
        pngSize,
        disabled,
        logoPending,
        logoError,
        matrix: hashMatrix(matrix),
        design,
        locale,
      }),
    [payload, pngSize, disabled, logoPending, logoError, matrix, design, locale],
  );
  const inputKeyRef = useRef(inputKey);

  useEffect(() => {
    inputKeyRef.current = inputKey;
    setResult(null);
  }, [inputKey]);

  const logoInput = useMemo(() => {
    if (!design.logo || !logoImage) return null;
    return {
      href: design.logo.dataUrl,
      width: logoImage.naturalWidth || logoImage.width,
      height: logoImage.naturalHeight || logoImage.height,
    };
  }, [design.logo, logoImage]);

  const locked = disabled || logoPending || Boolean(logoError);
  const busy = busyKind !== null;

  const exportPng = async () => {
    if (!matrix || locked || busy) return;
    const startedKey = inputKeyRef.current;
    setBusyKind('png');
    try {
      // Metrikler yazı tipi yüklenmeden ölçülürse etiket yerleşimi kayar.
      await ensureDisplayFontReady();
      if (design.logo && !logoImage) throw new Error('Logo henüz hazır değil.');
      const { scene } = buildScene({ matrix, outputWidth: pngSize, design, logo: logoInput, measureText });
      const blob = await sceneToPngBlob(scene, { resolveImage: () => logoImage });
      downloadBlob(blob, buildFileName('qrtisan-qr', 'png'));
      if (inputKeyRef.current !== startedKey) return;
      setResult({ tone: 'ok', kind: 'png', width: Math.round(scene.width), height: Math.round(scene.height) });
    } catch (error) {
      if (inputKeyRef.current !== startedKey) return;
      setResult({ tone: 'error', error });
    } finally {
      setBusyKind((current) => (current === 'png' ? null : current));
    }
  };

  const exportSvg = async () => {
    if (!matrix || locked || busy) return;
    const startedKey = inputKeyRef.current;
    setBusyKind('svg');
    try {
      await ensureDisplayFontReady();
      if (design.logo && !logoImage) throw new Error('Logo henüz hazır değil.');
      const fontCss = await getEmbeddedFontCss();
      const { scene } = buildScene({
        matrix,
        outputWidth: SVG_REFERENCE_WIDTH,
        design,
        logo: logoInput,
        measureText,
      });
      // Gizlilik minimizasyonu: ham yük (ör. Wi-Fi parolası) SVG başlığına
      // kopyalanmaz; veri yalnızca QR matrisinde kodlu olarak bulunur.
      const svg = sceneToSvg(scene, { fontCss, title: t('QR kod', 'QR code') });
      downloadText(svg, buildFileName('qrtisan-qr', 'svg'));
      if (inputKeyRef.current !== startedKey) return;
      setResult({ tone: 'ok', kind: 'svg' });
    } catch (error) {
      if (inputKeyRef.current !== startedKey) return;
      setResult({ tone: 'error', error });
    } finally {
      setBusyKind((current) => (current === 'svg' ? null : current));
    }
  };

  const hint = localizedLogoError
    ? { tone: 'error' as const, message: localizedLogoError }
    : logoPending
      ? {
          tone: 'busy' as const,
          message: t(
            'Logo hazırlanıyor; hazır olduğunda dışa aktarabilirsiniz.',
            'Preparing the logo — exporting will be available once it is ready.',
          ),
        }
      : disabled
        ? {
            tone: 'idle' as const,
            message: t(
              'Geçerli bir QR kod oluştuğunda dışa aktarma açılır.',
              'Export becomes available once there is a valid QR code.',
            ),
          }
        : {
            tone: 'idle' as const,
            message: t(
              'Dosyalar tarayıcınızda üretilir; hiçbir veri yüklenmez.',
              'Files are generated in your browser — nothing is uploaded.',
            ),
          };

  const busyMessage =
    busyKind === 'png'
      ? t('PNG hazırlanıyor…', 'Preparing PNG…')
      : busyKind === 'svg'
        ? t('SVG hazırlanıyor…', 'Preparing SVG…')
        : null;

  const resultMessage =
    result?.tone === 'ok'
      ? result.kind === 'png'
        ? t(
            `PNG indirildi — ${result.width}×${result.height} px.`,
            `PNG downloaded — ${result.width}×${result.height} px.`,
          )
        : t('SVG indirildi — ölçeklenebilir vektör.', 'SVG downloaded — scalable vector.')
      : result?.tone === 'error'
        ? localizeExportError(result.error, locale)
        : null;

  // Kilitli/bekleyen durumda önceki başarı mesajı gösterilmez; ipucu kazanır.
  const shownTone = locked ? hint.tone : busyKind ? 'busy' : result?.tone ?? hint.tone;
  const shownMessage = locked ? hint.message : busyMessage ?? resultMessage ?? hint.message;

  const statusToneClass =
    shownTone === 'error'
      ? 'font-medium text-red-600'
      : shownTone === 'ok'
        ? 'font-medium text-[#1c6353]'
        : shownTone === 'busy'
          ? 'font-medium text-ink-soft'
          : 'text-ink-soft';

  const pngButton = (
    <Button
      type="button"
      variant="primary"
      className="flex-1"
      disabled={locked || busy}
      onClick={() => void exportPng()}
    >
      {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Download size={15} aria-hidden />}
      {t('PNG indir', 'Download PNG')}
    </Button>
  );

  const svgLabel = t('SVG indir (vektör)', 'Download SVG (vector)');
  const svgButton = (
    <Button
      type="button"
      variant="secondary"
      className="w-full lg:w-auto"
      aria-label={svgLabel}
      title={svgLabel}
      disabled={locked || busy}
      onClick={() => void exportSvg()}
    >
      <FileImage size={15} aria-hidden />
      <span className="lg:hidden">{svgLabel}</span>
      <span className="hidden lg:inline">SVG</span>
    </Button>
  );

  if (isDesktop) {
    const explanation = t(
      'Çerçeve, etiket ve logo dahil; indirilen dosya önizlemeyle birebir aynıdır.',
      'Frame, caption, and logo included — the downloaded file matches the preview exactly.',
    );
    return (
      <section className="card export-card p-2.5" data-testid="export-panel">
        <h2 className="sr-only">{t('Dışa aktar', 'Export')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="min-w-[8rem] flex-1">
            <span className="sr-only">{t('PNG boyutu', 'PNG size')}</span>
            <Select
              className="export-select"
              value={pngSize}
              disabled={locked || busy}
              onChange={(event) => setPngSize(Number(event.target.value))}
              aria-label={t('PNG çıktı boyutu', 'PNG output size')}
            >
              {EXPORT_WIDTHS.map((size) => (
                <option key={size} value={size}>
                  {t(`${size} px genişlik`, `${size} px wide`)}
                </option>
              ))}
            </Select>
          </label>
          {pngButton}
          {svgButton}
        </div>

        <p role="status" aria-live="polite" className={`mt-1 text-[12px] ${statusToneClass}`}>
          {shownMessage}
        </p>

        {/* Açıklama her boyutta erişilebilir; kısa ekranlarda görsel ayrıntı gizlenir. */}
        <p className="sr-only">{explanation}</p>
        <details className="export-details mt-1 text-[11.5px] text-ink-soft">
          <summary className="inline cursor-pointer select-none rounded font-medium hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender/40">
            {t('Dosya bilgisi', 'File info')}
          </summary>
          <p className="mt-1 leading-relaxed">{explanation}</p>
        </details>
      </section>
    );
  }

  return (
    <section className="card p-5 sm:p-6" data-testid="export-panel">
      <header className="mb-4">
        <h2 className="text-[15px] font-extrabold tracking-tight text-ink">{t('Dışa aktar', 'Export')}</h2>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">
          {t(
            'Çerçeve, etiket ve logo dahil; indirilen dosya önizlemeyle birebir aynıdır.',
            'Frame, caption, and logo included — the downloaded file matches the preview exactly.',
          )}
        </p>
      </header>

      <div className="flex items-end gap-3">
        <label className="flex-1">
          <span className="mb-1.5 block text-[12.5px] font-bold text-ink">{t('PNG boyutu', 'PNG size')}</span>
          <Select
            value={pngSize}
            disabled={locked || busy}
            onChange={(event) => setPngSize(Number(event.target.value))}
            aria-label={t('PNG çıktı boyutu', 'PNG output size')}
          >
            {EXPORT_WIDTHS.map((size) => (
              <option key={size} value={size}>
                {`${size} px`}
              </option>
            ))}
          </Select>
        </label>
        {pngButton}
      </div>

      <div className="mt-2.5">{svgButton}</div>

      <p role="status" aria-live="polite" className={`mt-3 text-[12px] ${statusToneClass}`}>
        {shownMessage}
      </p>
    </section>
  );
}
