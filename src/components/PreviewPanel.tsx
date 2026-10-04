/**
 * Canlı önizleme — gerçek QR matrisi, çerçeve, etiket ve logo ile birlikte.
 *
 * Masaüstünde kart, sticky rayın esnek üst parçasıdır: sahne asla kaymaz,
 * tam eser (çerçeve/etiket/sessiz alan/logo dahil) mevcut genişlik ve
 * yüksekliğe oran korunarak sığdırılır. Taranabilirlik uyarıları ve
 * açıklamaları doğrudan görünür; uzun listeler kendi alanında kayar.
 * Mobilde (<64rem) doğal akış
 * korunur: eser genişlikten ölçeklenir, tam liste satır içinde görünür.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ScanLine } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { useElementSize } from '../hooks/useElementSize';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ensureDisplayFontReady, isDisplayFontReady } from '../lib/fonts';
import { fitArtwork } from '../lib/layout';
import { buildScene } from '../lib/render/scene';
import { renderSceneToCanvas } from '../lib/render/canvas';
import { WarningList } from './WarningList';
import type { ScanWarning } from '../lib/warnings';
import type { DesignState, ErrorLevel, MeasureText, QrMatrix } from '../lib/types';
import { cx } from './ui';

interface PreviewPanelProps {
  matrix: QrMatrix | null;
  design: DesignState;
  measureText: MeasureText;
  logoImage: HTMLImageElement | null;
  warnings: ScanWarning[];
  /** İçerik doğrulama hatası (alan bazlı). */
  errorMessage: string | null;
  /** İçerik geçerli ama QR kapasitesine sığmıyor. */
  matrixError: string | null;
  errorLevel: ErrorLevel;
  logoPending: boolean;
  logoError: string | null;
}

/** Sahne dolgusu (16) + 1px kenarlık; sahne dış boyutu = eser + 2×bu değer. */
const STAGE_INSET = 17;

export function PreviewPanel({
  matrix,
  design,
  measureText,
  logoImage,
  warnings,
  errorMessage,
  matrixError,
  errorLevel,
  logoPending,
  logoError,
}: PreviewPanelProps) {
  const { t } = useI18n();
  const isDesktop = useMediaQuery('(min-width: 64rem)');
  const areaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const area = useElementSize(areaRef);
  const [fontsReady, setFontsReady] = useState(() => isDisplayFontReady());
  const [metrics, setMetrics] = useState<{ moduleCount: number; matrixSize: number } | null>(null);
  const [sceneSize, setSceneSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    void ensureDisplayFontReady().then(() => {
      if (mounted) setFontsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const logoInput = useMemo(() => {
    if (!design.logo || !logoImage) return null;
    return {
      href: design.logo.dataUrl,
      width: logoImage.naturalWidth || logoImage.width,
      height: logoImage.naturalHeight || logoImage.height,
    };
  }, [design.logo, logoImage]);

  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const renderWidth = Math.round(Math.min(Math.max(area.width || 420, 220), 720) * dpr);

  useEffect(() => {
    if (!matrix) {
      setMetrics(null);
      setSceneSize(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { scene, metrics: nextMetrics } = buildScene({
      matrix,
      outputWidth: renderWidth,
      design,
      logo: logoInput,
      measureText,
    });
    const width = Math.max(1, Math.round(scene.width));
    const height = Math.max(1, Math.round(scene.height));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderSceneToCanvas(ctx, scene, { resolveImage: () => logoImage });
    setMetrics({ moduleCount: nextMetrics.moduleCount, matrixSize: nextMetrics.matrixSize });
    setSceneSize((previous) =>
      previous && previous.width === width && previous.height === height ? previous : { width, height },
    );
  }, [matrix, renderWidth, design, logoInput, measureText, logoImage, fontsReady]);

  // Görüntüleme boyutu bitmap çiziminden bağımsızdır: tam eser, sahne alanına
  // oran korunarak sığdırılır. Böylece hiçbir ata tarafından kırpılmaz.
  const fit = useMemo(() => {
    if (!isDesktop || !sceneSize) return null;
    return fitArtwork({
      containerWidth: area.width,
      containerHeight: area.height,
      sceneWidth: sceneSize.width,
      sceneHeight: sceneSize.height,
      inset: STAGE_INSET,
    });
  }, [isDesktop, sceneSize, area.width, area.height]);

  const version = metrics ? Math.max(1, Math.round((metrics.matrixSize - 17) / 4)) : null;
  const placeholderMessage =
    matrixError ??
    errorMessage ??
    t('QR kod üretmek için içerik girin.', 'Enter content to generate a QR code.');

  const metadataText = metrics
    ? t(
        `${metrics.matrixSize}×${metrics.matrixSize} modül · sürüm ${version} · hata düzeltme ${errorLevel}`,
        `${metrics.matrixSize}×${metrics.matrixSize} modules · version ${version} · error correction ${errorLevel}`,
      )
    : t('gerçek qr matrisi', 'real qr matrix');

  const hintText = t(
    'Baskıdan veya paylaşımdan önce telefonunuzla okutmayı deneyin.',
    'Try scanning it with your phone before printing or sharing.',
  );

  const warningCount = warnings.length;

  // Ekran okuyucu duyurusu; görünen özet metinlerinden farklıdır.
  const liveSummary = !matrix
    ? t(
        'Taranabilirlik kontrolü yapılmadı: geçerli bir QR kod yok.',
        'Scanability check skipped: no valid QR code yet.',
      )
    : warningCount > 0
      ? t(
          `${warningCount} taranabilirlik uyarısı: ${warnings.map((warning) => warning.title).join(', ')}`,
          `${warningCount} scanability warning${warningCount === 1 ? '' : 's'}: ${warnings
            .map((warning) => warning.title)
            .join(', ')}`,
        )
      : t('Taranabilirlik kontrolü: sorun görünmüyor.', 'Scanability check: no issues found.');

  return (
    <section className="card preview-card relative flex min-h-0 flex-col overflow-hidden" data-testid="preview-card">
      <header className="preview-header flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-4 py-2.5 sm:px-5 lg:py-3">
        <h2 className="shrink-0 text-[15px] font-extrabold tracking-tight text-ink">
          {t('Önizleme', 'Preview')}
        </h2>
        {isDesktop && (
          <span className="min-w-0 flex-1 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">
            {metadataText}
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-mint bg-mint/30 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[#1c6353]">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#2f9c7d]" aria-hidden />
          {t('canlı', 'live')}
        </span>
      </header>

      <div className="preview-card__body flex min-h-0 flex-1 flex-col gap-2 px-4 pt-3 sm:px-5">
        <div
          ref={areaRef}
          className="preview-stage-area relative flex min-h-0 min-w-0 flex-1 items-center justify-center"
          data-testid="preview-stage-area"
        >
          {matrix ? (
            <div
              className={cx('stage-dots preview-stage relative rounded-2xl border border-line p-5 sm:p-6 lg:p-4')}
              style={
                fit ? { width: fit.width + STAGE_INSET * 2, height: fit.height + STAGE_INSET * 2 } : undefined
              }
              data-testid="preview-stage"
            >
              <span className="stage-corner stage-corner--tl" aria-hidden />
              <span className="stage-corner stage-corner--tr" aria-hidden />
              <span className="stage-corner stage-corner--bl" aria-hidden />
              <span className="stage-corner stage-corner--br" aria-hidden />

              {logoPending && (
                <span
                  role="status"
                  aria-live="polite"
                  className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink-soft shadow-[0_2px_8px_rgba(37,35,56,0.12)]"
                >
                  <Loader2 size={12} className="animate-spin" aria-hidden />
                  {t('Logo hazırlanıyor…', 'Preparing logo…')}
                </span>
              )}

              {logoError && (
                <span
                  aria-hidden="true"
                  className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 shadow-[0_2px_8px_rgba(37,35,56,0.12)]"
                >
                  <AlertTriangle size={12} aria-hidden />
                  {t('Logo yüklenemedi', 'Logo failed to load')}
                </span>
              )}

              <div
                className={cx(
                  'relative overflow-hidden rounded-lg shadow-[0_10px_30px_-14px_rgba(37,35,56,0.45)]',
                  design.transparentBg && 'checker',
                  !fit && 'w-full',
                )}
                style={fit ? { width: fit.width, height: fit.height } : undefined}
              >
                <canvas
                  ref={canvasRef}
                  className={fit ? 'block h-full w-full' : 'block h-auto w-full'}
                  role="img"
                  aria-label={t('Oluşturulan QR kod önizlemesi', 'Generated QR code preview')}
                />
              </div>
            </div>
          ) : (
            <div className="flex max-w-[34ch] flex-col items-center gap-2 py-10 text-center">
              {matrixError ? (
                <AlertTriangle size={22} className="text-amber-500" aria-hidden />
              ) : (
                <ScanLine size={22} className="text-lavender" aria-hidden />
              )}
              <p className="text-[13px] font-bold text-ink">
                {matrixError
                  ? t('QR kod oluşturulamadı', 'QR code could not be created')
                  : t('Önizleme bekleniyor', 'Waiting for preview')}
              </p>
              <p role={matrixError ? 'alert' : undefined} className="text-[12.5px] leading-relaxed text-ink-soft">
                {placeholderMessage}
              </p>
            </div>
          )}
        </div>

        {!isDesktop && (
          <>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-soft">{metadataText}</p>
            <p className="text-[12px] leading-relaxed text-ink-soft">{hintText}</p>
          </>
        )}


      </div>

      <div className="preview-warnings shrink-0 border-t border-line px-4 py-2.5 sm:px-5 lg:py-2">
        <p className="sr-only" role="status" aria-live="polite">
          {liveSummary}
        </p>

        <div className="space-y-2.5" data-testid="preview-scanability">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {t('Taranabilirlik kontrolü', 'Scanability check')}
          </h3>
          {isDesktop && <p className="text-[12px] leading-relaxed text-ink-soft">{hintText}</p>}
          <WarningList warnings={warnings} hasMatrix={Boolean(matrix)} />
        </div>
      </div>
    </section>
  );
}
