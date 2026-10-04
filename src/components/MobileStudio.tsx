/**
 * Mobil stüdyo — kompakt canlı QR kanıtı, İçerik/Tasarım adımları ve
 * tam ekran önizleme/indirme sayfası.
 *
 * Tasarım ilkeleri:
 * - Mini ve büyük QR, masaüstü önizlemesiyle **aynı** `buildScene` +
 *   `renderSceneToCanvas` hattından çizilir. Sahte matris üretilmez; CSS
 *   filtresi veya renk ters çevirme uygulanmaz.
 * - `contentPanel` / `designPanel` / `presetsPanel` slotları App tarafından
 *   sağlanır ve adım değişiminde DOM'da kalır (durum korunur).
 * - `exportPanel` yalnızca açılan `<dialog>` içinde, bir kez render edilir.
 * - Mobil CSS bu dosyadan içe aktarılır; masaüstü düzeniyle çakışmaz.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Loader2,
  Palette,
  ScanLine,
  Type,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { useElementWidth } from '../hooks/useElementWidth';
import { ensureDisplayFontReady, isDisplayFontReady } from '../lib/fonts';
import { renderSceneToCanvas } from '../lib/render/canvas';
import { buildScene } from '../lib/render/scene';
import type { DesignState, MeasureText, QrMatrix } from '../lib/types';
import type { ScanWarning } from '../lib/warnings';
import { Button, cx } from './ui';
import '../styles/mobile-studio.css';

/** App entegrasyon sözleşmesi — tüm stüdyo durumu üst bileşende kalır. */
export interface MobileStudioProps {
  /** İçerik paneli (App'in ContentPanel'i). Adımlar arasında DOM'da kalır. */
  contentPanel: ReactNode;
  /** Tasarım paneli (App'in DesignTabs'i). */
  designPanel: ReactNode;
  /** Hazır tasarım galerisi (App'in PresetGallery'si). */
  presetsPanel: ReactNode;
  /** Dışa aktarma paneli — yalnızca açılan önizleme sayfasında render edilir. */
  exportPanel: ReactNode;
  /** Geçerli QR matrisi; yoksa önizleme yer tutucu gösterir. */
  matrix: QrMatrix | null;
  design: DesignState;
  /** Masaüstü önizlemesiyle aynı gerçek metin ölçüm fonksiyonu. */
  measureText: MeasureText;
  logoImage: HTMLImageElement | null;
  logoPending: boolean;
  logoError: string | null;
  /** İçerik doğrulama hatası (alan bazlı). */
  errorMessage: string | null;
  /** İçerik geçerli ama QR kapasitesine sığmıyor. */
  matrixError: string | null;
  warnings: ScanWarning[];
}

type MobileStep = 'content' | 'design';

/** Mini QR'ın çizim çözünürlüğü (CSS'te 104px gösterilir). */
const MINI_RENDER_WIDTH = 128;

interface MobileArtworkProps {
  variant: 'mini' | 'large';
  matrix: QrMatrix | null;
  design: DesignState;
  measureText: MeasureText;
  logoImage: HTMLImageElement | null;
  logoPending: boolean;
  logoError: string | null;
  errorMessage: string | null;
  matrixError: string | null;
  /** Büyük varyant: tam sahnenin (çerçeve+etiket+sessiz alan) sığması gereken yükseklik (px). */
  availableHeight?: number;
  /** Büyük varyant: ölçüm için kullanılabilir kapsayıcı genişliği (px). */
  availableWidth?: number;
}

/**
 * Mini ve büyük önizlemenin ortak gerçek QR tuvali.
 *
 * `variant` yalnızca sunumu ve çizim genişliğini etkiler; sahne kurulumu ve
 * logo/etiket/çerçeve çizimi masaüstü önizlemesiyle birebir aynıdır. Yazı tipi
 * hazır olana kadar yeniden çizim bekletilir (yarış durumu yok).
 */
export function MobileArtwork({
  variant,
  matrix,
  design,
  measureText,
  logoImage,
  logoPending,
  logoError,
  errorMessage,
  matrixError,
  availableHeight,
  availableWidth,
}: MobileArtworkProps) {
  const { t } = useI18n();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageWidth = useElementWidth(stageRef, variant === 'mini' ? MINI_RENDER_WIDTH : 320);
  const [fontsReady, setFontsReady] = useState(() => isDisplayFontReady());
  // Gerçek sahne en-boy oranı: kare varsayılmaz; çerçeve/etiket yüksekliği
  // ölçülür ve büyük önizleme kırpılmadan kullanılabilir alana sığdırılır.
  const [sceneAspect, setSceneAspect] = useState<number | null>(null);
  const [chromeHeight, setChromeHeight] = useState(variant === 'large' ? 26 : 0);

  useEffect(() => {
    let mounted = true;
    void ensureDisplayFontReady().then(() => {
      if (mounted) setFontsReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Kart dolgusu ve kenarlığı sahnenin dışında kalır; ölçekleme hesabına katılır.
  useEffect(() => {
    if (variant !== 'large') return;
    const element = stageRef.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const next =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    setChromeHeight((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
  }, [variant, stageWidth]);

  const logoInput = useMemo(() => {
    if (!design.logo || !logoImage) return null;
    return {
      href: design.logo.dataUrl,
      width: logoImage.naturalWidth || logoImage.width,
      height: logoImage.naturalHeight || logoImage.height,
    };
  }, [design.logo, logoImage]);

  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  // Büyük varyantta kapsayıcı genişliği ölçülen gövdeden gelir; kartın kendi
  // (küçülmüş) genişliğine geri besleme yapılmaz — aksi halde fit kilitlenir.
  const containerWidth =
    variant === 'large' && availableWidth ? availableWidth : stageWidth;
  const fitHeight =
    variant === 'large' && availableHeight
      ? Math.max(140, availableHeight - chromeHeight - 2)
      : null;
  const displayWidth =
    fitHeight && sceneAspect ? Math.min(containerWidth, fitHeight * sceneAspect) : containerWidth;
  const renderWidth =
    variant === 'mini'
      ? Math.round(MINI_RENDER_WIDTH * dpr)
      : Math.round(Math.min(Math.max(displayWidth, 200), 640) * dpr);

  useEffect(() => {
    if (!matrix) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { scene } = buildScene({
      matrix,
      outputWidth: renderWidth,
      design,
      logo: logoInput,
      measureText,
    });
    canvas.width = Math.max(1, Math.round(scene.width));
    canvas.height = Math.max(1, Math.round(scene.height));
    const nextAspect = scene.width / scene.height;
    setSceneAspect((prev) => (prev && Math.abs(prev - nextAspect) < 0.001 ? prev : nextAspect));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderSceneToCanvas(ctx, scene, { resolveImage: () => logoImage });
  }, [matrix, renderWidth, design, logoInput, measureText, logoImage, fontsReady]);

  const hasMatrix = Boolean(matrix);
  const placeholderMessage =
    matrixError ??
    errorMessage ??
    t('QR kod üretmek için içerik girin.', 'Enter content to generate a QR code.');
  const testIdPrefix = variant === 'mini' ? 'mobile-live' : 'mobile-sheet';

  return (
    <div
      ref={stageRef}
      data-testid={`${testIdPrefix}-art`}
      className={cx(
        'mobile-artwork',
        `mobile-artwork--${variant}`,
        hasMatrix && design.transparentBg && 'mobile-artwork--checker',
      )}
      style={
        variant === 'large' && fitHeight && sceneAspect
          ? { maxWidth: `${Math.floor(displayWidth)}px` }
          : undefined
      }
    >
      {hasMatrix ? (
        <canvas
          ref={canvasRef}
          data-testid={`${testIdPrefix}-canvas`}
          className="mobile-artwork__canvas"
          role="img"
          aria-label={t('Oluşturulan QR kod önizlemesi', 'Generated QR code preview')}
        />
      ) : (
        <div className="mobile-artwork__empty" data-testid={`${testIdPrefix}-empty`}>
          {matrixError ? (
            <AlertTriangle size={variant === 'mini' ? 18 : 24} className="mobile-artwork__empty-icon" aria-hidden />
          ) : (
            <ScanLine size={variant === 'mini' ? 18 : 24} className="mobile-artwork__empty-icon" aria-hidden />
          )}
          <p className="mobile-artwork__empty-title">
            {matrixError
              ? t('QR kod oluşturulamadı', 'QR code could not be created')
              : t('Önizleme bekleniyor', 'Waiting for preview')}
          </p>
          {variant === 'large' && (
            <p role={matrixError ? 'alert' : undefined} className="mobile-artwork__empty-text">
              {placeholderMessage}
            </p>
          )}
        </div>
      )}

      {hasMatrix && logoPending && (
        <span
          role="status"
          aria-live="polite"
          className="mobile-artwork__status"
          data-testid={`${testIdPrefix}-logo-pending`}
        >
          <Loader2 size={12} className="mobile-artwork__spin" aria-hidden />
          <span className="mobile-artwork__status-text">
            {t('Logo hazırlanıyor…', 'Preparing logo…')}
          </span>
        </span>
      )}

      {hasMatrix && !logoPending && logoError && (
        <span
          aria-hidden="true"
          className="mobile-artwork__status mobile-artwork__status--error"
          data-testid={`${testIdPrefix}-logo-error`}
        >
          <AlertTriangle size={12} aria-hidden />
          <span className="mobile-artwork__status-text">{t('Logo yüklenemedi', 'Logo failed to load')}</span>
        </span>
      )}
    </div>
  );
}

/** Metin girişi/klavye odaktayken alt çubuğu gizler; odaklanan alanı kapatmaz. */
const TEXT_INPUT_TYPES = new Set(['text', 'email', 'url', 'password', 'search', 'tel', 'number']);

function useEditableFocus(): boolean {
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const isTextEntry = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      if (target.tagName === 'TEXTAREA') return true;
      if (target.tagName === 'INPUT') {
        return TEXT_INPUT_TYPES.has((target as HTMLInputElement).type);
      }
      return false;
    };
    const onFocusIn = (event: FocusEvent) => setEditing(isTextEntry(event.target));
    const onFocusOut = () => setEditing(false);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return editing;
}

/** Görsel klavye açık mı? (visualViewport daralması) */
function useVisualKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const hidden = window.innerHeight - viewport.height;
      setOpen(hidden > 140 || viewport.height < window.innerHeight * 0.7);
    };
    update();
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);

  return open;
}

export function MobileStudio({
  contentPanel,
  designPanel,
  presetsPanel,
  exportPanel,
  matrix,
  design,
  measureText,
  logoImage,
  logoPending,
  logoError,
  errorMessage,
  matrixError,
  warnings,
}: MobileStudioProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<MobileStep>('content');
  const [sheetOpen, setSheetOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [sheetBodyHeight, setSheetBodyHeight] = useState<number | null>(null);
  const [sheetBodyWidth, setSheetBodyWidth] = useState<number | null>(null);

  const editing = useEditableFocus();
  const keyboardOpen = useVisualKeyboardOpen();
  const dockHidden = editing || keyboardOpen;

  // Canlı kanıt, gerçek üst çubuk yüksekliğinin altında sabitlenir; sabit bir
  // değere güvenmek yerine ResizeObserver ile ölçülür (65px güvenli varsayılan).
  useEffect(() => {
    const update = () => {
      const header = document.querySelector('[data-testid="topbar"]');
      const height = header ? header.getBoundingClientRect().height : 65;
      rootRef.current?.style.setProperty('--mobile-topbar-height', `${Math.round(height * 100) / 100}px`);
    };
    update();
    const header = document.querySelector('[data-testid="topbar"]');
    const observer =
      typeof ResizeObserver !== 'undefined' && header ? new ResizeObserver(update) : null;
    if (header && observer) observer.observe(header);
    window.addEventListener('resize', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Büyük önizleme, gövdenin gerçek kullanılabilir alanına göre ölçeklenir;
  // tüm sahne (çerçeve+etiket+sessiz alan) ilk görünümde eksiksiz sığar.
  useEffect(() => {
    if (!sheetOpen) return;
    const body = sheetBodyRef.current;
    if (!body) return;
    const update = () => {
      const style = getComputedStyle(body);
      const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
      setSheetBodyWidth(Math.max(160, body.clientWidth - paddingX));
      setSheetBodyHeight(Math.max(120, body.clientHeight - paddingY));
    };
    update();
    // showModal etkisinden sonraki ilk boyamada kesin ölçüm.
    const frame = window.requestAnimationFrame(update);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(body);
    window.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [sheetOpen]);

  const openSheet = useCallback(() => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement ? active : null;
    setSheetOpen(true);
  }, []);

  // Yerel <dialog>: showModal odak tuzağını, inert arka planı ve Esc'i sağlar.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (sheetOpen && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!sheetOpen && dialog.open) {
      dialog.close();
    }
  }, [sheetOpen]);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
    const opener = openerRef.current;
    if (opener && document.contains(opener)) {
      // Kapatınca sayfa zıplamasın: odak, kaydırma yapmadan tetikleyiciye döner.
      opener.focus({ preventScroll: true });
    }
    openerRef.current = null;
  }, []);

  const highestSeverity = warnings.reduce<ScanWarning['severity'] | null>((highest, warning) => {
    if (!highest) return warning.severity;
    const order = { danger: 3, warning: 2, info: 1 } as const;
    return order[warning.severity] > order[highest] ? warning.severity : highest;
  }, null);
  const leadingWarning = highestSeverity
    ? warnings.find((warning) => warning.severity === highestSeverity)
    : null;

  // Ekran okuyucuya dışa vurulan durum: geçersiz matriste "sorun yok" denmez.
  const warningSummary = !matrix
    ? t(
        'Geçerli bir QR kod yok; taranabilirlik kontrolü yapılmadı.',
        'No valid QR code; the scanability check was skipped.',
      )
    : warnings.length > 0
      ? t(
          `${warnings.length} taranabilirlik uyarısı. En önemlisi: ${leadingWarning?.title ?? ''}`,
          `${warnings.length} scanability warning${warnings.length === 1 ? '' : 's'}. Most important: ${leadingWarning?.title ?? ''}`,
        )
      : t('Taranabilirlik kontrolü: sorun görünmüyor.', 'Scanability check: no issues found.');

  const liveButtonLabel = !matrix
    ? t('Canlı QR önizlemesini büyüt ve indir', 'Open the live QR preview and download')
    : warnings.length > 0
      ? t(
          `Canlı QR önizlemesini büyüt ve indir — ${warnings.length} taranabilirlik uyarısı: ${leadingWarning?.title ?? ''}`,
          `Open the live QR preview and download — ${warnings.length} scanability warning${warnings.length === 1 ? '' : 's'}: ${leadingWarning?.title ?? ''}`,
        )
      : t(
          'Canlı QR önizlemesini büyüt ve indir — taranabilirlik sorunu yok',
          'Open the live QR preview and download — no scanability issues',
        );

  return (
    <div
      ref={rootRef}
      className="mobile-studio"
      data-testid="mobile-studio"
      data-step={step}
      data-sheet-open={sheetOpen ? 'true' : undefined}
    >
      {/* Canlı kanıt: üst çubuk altında sabit kalır, dokununca büyük önizlemeyi açar. */}
      <section className="mobile-live" data-testid="mobile-live-proof">
        <button
          type="button"
          className="mobile-live__open"
          data-testid="mobile-live-open"
          aria-haspopup="dialog"
          aria-label={liveButtonLabel}
          onClick={openSheet}
        >
          <span className="mobile-live__art">
            <MobileArtwork
              variant="mini"
              matrix={matrix}
              design={design}
              measureText={measureText}
              logoImage={logoImage}
              logoPending={logoPending}
              logoError={logoError}
              errorMessage={errorMessage}
              matrixError={matrixError}
            />
          </span>

          <span className="mobile-live__meta">
            <span className="mobile-live__row">
              <span className="mobile-live__badge" data-testid="mobile-live-badge">
                <span className="mobile-live__pulse" aria-hidden />
                {t('canlı', 'live')}
              </span>
              {matrix ? (
                <span
                  className={cx(
                    'mobile-live__warnings',
                    warnings.length > 0 ? 'mobile-live__warnings--alert' : 'mobile-live__warnings--ok',
                  )}
                  data-testid="mobile-warning-count"
                  aria-hidden="true"
                >
                  {warnings.length > 0 ? (
                    <>
                      <AlertTriangle size={12} aria-hidden /> {warnings.length}
                    </>
                  ) : (
                    <>
                      <Check size={12} strokeWidth={3} aria-hidden /> {t('sorun yok', 'no issues')}
                    </>
                  )}
                </span>
              ) : null}
            </span>
            <span className="mobile-live__label">
              {matrix ? t('Canlı QR', 'Live QR') : t('Önizleme bekleniyor', 'Waiting for preview')}
            </span>
            <span className="mobile-live__hint">
              {t('Dokun: büyüt ve indir', 'Tap to enlarge & download')}
            </span>
          </span>

          <span className="mobile-live__action" aria-hidden="true">
            <ChevronRight size={16} />
          </span>
        </button>
      </section>

      {/* Dinamik taranabilirlik durumu düğme dışında, canlı bölge olarak duyurulur. */}
      <p className="sr-only" role="status" aria-live="polite" data-testid="mobile-warning-status">
        {warningSummary}
      </p>

      {/* Adımlar: paneller DOM'da kalır, yalnızca görünürlük değişir. */}
      <div className="mobile-steps" role="group" aria-label={t('Düzenleme adımları', 'Editing steps')}>
        <button
          type="button"
          data-testid="mobile-step-content"
          aria-pressed={step === 'content'}
          className={cx('mobile-steps__button', step === 'content' && 'is-active')}
          onClick={() => setStep('content')}
        >
          <Type size={15} aria-hidden />
          {t('İçerik', 'Content')}
        </button>
        <button
          type="button"
          data-testid="mobile-step-design"
          aria-pressed={step === 'design'}
          className={cx('mobile-steps__button', step === 'design' && 'is-active')}
          onClick={() => setStep('design')}
        >
          <Palette size={15} aria-hidden />
          {t('Tasarım', 'Design')}
        </button>
      </div>

      <div className="mobile-studio__panel" data-testid="mobile-panel-content" hidden={step !== 'content'}>
        {contentPanel}
      </div>
      <div className="mobile-studio__panel" data-testid="mobile-panel-design" hidden={step !== 'design'}>
        {designPanel}
        {presetsPanel}
      </div>

      <div className="mobile-studio__dock-spacer" aria-hidden="true" />

      {/* Alt eylem çubuğu: güvenli alan dolgulu, yazarken gizlenir. */}
      <div
        className="mobile-dock"
        data-testid="mobile-dock"
        data-hidden={dockHidden ? 'true' : undefined}
        inert={dockHidden || undefined}
      >
        <div className="mobile-dock__inner">
          <Button
            type="button"
            variant="primary"
            className="mobile-dock__primary"
            data-testid="mobile-open-preview"
            aria-haspopup="dialog"
            onClick={openSheet}
          >
            <ScanLine size={18} aria-hidden />
            {t('Önizle ve indir', 'Preview & download')}
          </Button>
        </div>
      </div>

      {/* Tam ekran önizleme/indirme sayfası — yerel <dialog> ile modal. */}
      <dialog
        ref={dialogRef}
        className="mobile-sheet"
        data-testid="mobile-sheet"
        aria-labelledby="mobile-sheet-title"
        onClose={handleSheetClose}
      >
        {sheetOpen && (
          <div className="mobile-sheet__inner">
            <header className="mobile-sheet__header">
              <div className="mobile-sheet__heading">
                <span className="mobile-sheet__eyebrow">{t('Canlı önizleme', 'Live preview')}</span>
                <h2 id="mobile-sheet-title" className="mobile-sheet__title">
                  {t('Büyük önizleme ve indirme', 'Large preview & download')}
                </h2>
              </div>
              <button
                type="button"
                className="mobile-sheet__close"
                data-testid="mobile-sheet-close"
                aria-label={t('Kapat', 'Close')}
                onClick={() => setSheetOpen(false)}
              >
                <X size={20} aria-hidden />
              </button>
            </header>

            <div className="mobile-sheet__body" ref={sheetBodyRef} data-testid="mobile-sheet-body">
              <MobileArtwork
                variant="large"
                matrix={matrix}
                design={design}
                measureText={measureText}
                logoImage={logoImage}
                logoPending={logoPending}
                logoError={logoError}
                errorMessage={errorMessage}
                matrixError={matrixError}
                availableHeight={sheetBodyHeight ?? undefined}
                availableWidth={sheetBodyWidth ?? undefined}
              />

              <p className="mobile-sheet__hint">
                {t(
                  'İndirilen dosya bu önizlemeyle birebir aynıdır.',
                  'The downloaded file matches this preview exactly.',
                )}
              </p>

              {/* Uzun uyarılar katlanır; büyük QR'ı ekrandan itmez. */}
              <details className="mobile-sheet__warnings" data-testid="mobile-sheet-warnings">
                <summary className="mobile-sheet__summary">
                  <AlertTriangle size={14} aria-hidden />
                  <span className="mobile-sheet__summary-label">
                    {warnings.length > 0
                      ? t(
                          `Taranabilirlik uyarıları (${warnings.length})`,
                          `Scanability warnings (${warnings.length})`,
                        )
                      : t('Taranabilirlik kontrolü', 'Scanability check')}
                  </span>
                  <ChevronRight size={14} className="mobile-sheet__summary-chevron" aria-hidden />
                </summary>
                <div className="mobile-sheet__warning-list">
                  {!matrix ? (
                    <p className="mobile-sheet__warning-note">
                      {t(
                        'Taranabilirlik kontrolü, geçerli bir QR kod oluştuğunda yapılır.',
                        'The scanability check runs once a valid QR code exists.',
                      )}
                    </p>
                  ) : warnings.length === 0 ? (
                    <p className="mobile-sheet__warning-note mobile-sheet__warning-note--ok">
                      <Check size={14} strokeWidth={3} aria-hidden />
                      {t('Taranabilirlik kontrolü: sorun görünmüyor.', 'Scanability check: no issues found.')}
                    </p>
                  ) : (
                    <ul className="mobile-sheet__warning-items">
                      {warnings.map((warning) => (
                        <li
                          key={warning.id}
                          className={cx(
                            'mobile-sheet__warning',
                            `mobile-sheet__warning--${warning.severity}`,
                          )}
                        >
                          <AlertTriangle size={14} className="mobile-sheet__warning-icon" aria-hidden />
                          <div>
                            <p className="mobile-sheet__warning-title">{warning.title}</p>
                            <p className="mobile-sheet__warning-detail">{warning.detail}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>

              {/* İndirme denetimleri gövde akışında: sayfa gerektiğinde onlara kaydırılır,
                  böylece kısa/yatay ekranda büyük QR kırpılmaz. */}
              <div className="mobile-sheet__export" data-testid="mobile-sheet-export">
                {exportPanel}
              </div>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
