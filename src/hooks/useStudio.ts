/** Uygulama durumu — içerik, tasarım ve türetilen QR verisi. */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { DEFAULT_CONTENT, evaluateContent, type ContentEvaluation } from '../lib/content';
import { evaluateContrast } from '../lib/colors';
import { DEFAULT_DESIGN } from '../lib/defaults';
import { localizeLogoError, readLogoFile, type LogoErrorDescriptor } from '../lib/logo';
import type { Locale } from '../lib/locale';
import type { QrPreset } from '../lib/presets';
import { resolveMatrix } from '../lib/qr';
import { collectWarnings, type ScanWarning } from '../lib/warnings';
import type {
  ContentFields,
  ContentMode,
  DesignState,
  EmailFields,
  ErrorLevel,
  LogoState,
  QrMatrix,
  StudioState,
  WifiFields,
} from '../lib/types';

export { DEFAULT_DESIGN };

const initialState: StudioState = {
  mode: 'url',
  // Tek doğruluk kaynağı: örnek adres önceden yazılmaz (bkz. DEFAULT_CONTENT).
  content: { ...DEFAULT_CONTENT },
  design: DEFAULT_DESIGN,
};

/** Logo dosyası okunurken dışa aktarmayı kilitlemek için. */
export type LogoPhase = 'idle' | 'reading';

export interface StudioApi {
  mode: ContentMode;
  content: ContentFields;
  design: DesignState;
  evaluation: ContentEvaluation;
  matrix: QrMatrix | null;
  errorLevel: ErrorLevel;
  requestedLevel: ErrorLevel;
  matrixDowngraded: boolean;
  /** İçerik geçerli ama matris üretilemediyse eylem çağrısı. */
  matrixError: string | null;
  contrast: number;
  warnings: ScanWarning[];
  activePresetId: string | null;
  logoPhase: LogoPhase;
  /** Son logo yükleme denemesi reddedildiyse alan hatası — aktif dilde. */
  logoError: string | null;
  /** Alan hatasını temizler; mevcut logoyu/tasarımı değiştirmez. */
  dismissLogoError: () => void;
  setMode: (mode: ContentMode) => void;
  patchContent: (patch: Partial<ContentFields>) => void;
  patchEmail: (patch: Partial<EmailFields>) => void;
  patchWifi: (patch: Partial<WifiFields>) => void;
  patchDesign: (patch: Partial<DesignState>) => void;
  applyPreset: (preset: QrPreset) => void;
  uploadLogo: (file: File) => Promise<void>;
  setLogo: (logo: LogoState | null) => void;
  resetDesign: () => void;
}

/**
 * @param localeOverride Testler/izole kullanım için; verilmezse I18nProvider
 *   bağlamındaki dil kullanılır.
 */
export function useStudio(localeOverride?: Locale): StudioApi {
  const { locale: contextLocale } = useI18n();
  const locale = localeOverride ?? contextLocale;

  const [mode, setModeState] = useState<ContentMode>(initialState.mode);
  const [content, setContent] = useState<ContentFields>(initialState.content);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [logoPhase, setLogoPhase] = useState<LogoPhase>('idle');
  // Hata dilden bağımsız saklanır; dil değişince aynı hata yeni dilde gösterilir.
  const [logoError, setLogoError] = useState<LogoErrorDescriptor | null>(null);
  // Sıfırlama/kaldırma uçuştaki logo okumasını geçersiz kılar; yeni okuma son
  // sözü söyler. Epoch değişmediyse geç gelen sonuç tasarımı geri getiremez.
  const uploadEpoch = useRef(0);

  const evaluation = useMemo(() => evaluateContent(mode, content, locale), [mode, content, locale]);

  const resolved = useMemo(
    () => resolveMatrix(evaluation.payload, design, locale),
    [evaluation.payload, design, locale],
  );

  const contrast = useMemo(
    () => evaluateContrast(design.fg, design.bg, design.transparentBg),
    [design.fg, design.bg, design.transparentBg],
  );

  const warnings = useMemo(
    () =>
      collectWarnings(
        {
          design,
          fg: design.fg,
          bg: design.bg,
          contrast,
          payloadLength: evaluation.payload.length,
          matrixSize: resolved.matrix?.size ?? null,
          logoBoxRatio: design.logo?.size ?? 0,
          captionLength: design.caption.trim().length,
          autoDowngraded: resolved.downgraded
            ? { requested: resolved.requestedLevel, used: resolved.level }
            : null,
        },
        locale,
      ),
    [design, contrast, evaluation.payload.length, resolved, locale],
  );

  const logoErrorMessage = useMemo(
    () => (logoError ? localizeLogoError(logoError, locale) : null),
    [logoError, locale],
  );

  const setMode = useCallback((next: ContentMode) => setModeState(next), []);
  const patchContent = useCallback((patch: Partial<ContentFields>) => {
    setContent((prev) => ({ ...prev, ...patch }));
  }, []);
  const patchEmail = useCallback((patch: Partial<EmailFields>) => {
    setContent((prev) => ({ ...prev, email: { ...prev.email, ...patch } }));
  }, []);
  const patchWifi = useCallback((patch: Partial<WifiFields>) => {
    setContent((prev) => ({ ...prev, wifi: { ...prev.wifi, ...patch } }));
  }, []);
  const patchDesign = useCallback((patch: Partial<DesignState>) => {
    setDesign((prev) => ({ ...prev, ...patch }));
    setActivePresetId(null);
  }, []);
  const applyPreset = useCallback((preset: QrPreset) => {
    setDesign((prev) => ({ ...prev, ...preset.design, logo: prev.logo }));
    setActivePresetId(preset.id);
  }, []);
  const setLogo = useCallback((logo: LogoState | null) => {
    // Uçuştaki okuma artık bu duruma yazamaz.
    uploadEpoch.current += 1;
    setDesign((prev) => ({ ...prev, logo }));
    setLogoError(null);
    setLogoPhase('idle');
    setActivePresetId(null);
  }, []);
  const uploadLogo = useCallback(async (file: File) => {
    const epoch = uploadEpoch.current + 1;
    uploadEpoch.current = epoch;
    setLogoPhase('reading');
    setLogoError(null);
    try {
      const result = await readLogoFile(file);
      if (uploadEpoch.current !== epoch) return;
      if (result.ok) {
        setDesign((prev) => ({ ...prev, logo: result.logo }));
        setActivePresetId(null);
      } else {
        setLogoError({ code: result.errorCode, params: result.errorParams });
      }
    } finally {
      if (uploadEpoch.current === epoch) setLogoPhase('idle');
    }
  }, []);
  const resetDesign = useCallback(() => {
    // Sıfırlama, uçuştaki logo okumasını geçersiz kılar; önceden yerleşmiş
    // geçerli logo bilinçli olarak korunur.
    uploadEpoch.current += 1;
    setDesign((prev) => ({ ...DEFAULT_DESIGN, logo: prev.logo }));
    setActivePresetId(null);
    setLogoError(null);
    setLogoPhase('idle');
  }, []);
  const dismissLogoError = useCallback(() => setLogoError(null), []);

  return {
    mode,
    content,
    design,
    evaluation,
    matrix: resolved.matrix,
    errorLevel: resolved.level,
    requestedLevel: resolved.requestedLevel,
    matrixDowngraded: resolved.downgraded,
    matrixError: resolved.error,
    contrast,
    warnings,
    activePresetId,
    logoPhase,
    logoError: logoErrorMessage,
    dismissLogoError,
    setMode,
    patchContent,
    patchEmail,
    patchWifi,
    patchDesign,
    applyPreset,
    uploadLogo,
    setLogo,
    resetDesign,
  };
}
