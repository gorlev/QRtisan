/** QRtisan — ana uygulama düzeni (masaüstü rayı + mobil stüdyo dallanması). */

import { useMemo, useRef, type ReactNode } from 'react';
import { ContentPanel } from './components/ContentPanel';
import { DesignTabs } from './components/DesignTabs';
import { ExportPanel } from './components/ExportPanel';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { MobileStudio } from './components/MobileStudio';
import { PresetGallery } from './components/PresetGallery';
import { PreviewPanel } from './components/PreviewPanel';
import { TopBar } from './components/TopBar';
import { useI18n } from './i18n/I18nProvider';
import { deriveLogoReadiness } from './hooks/logoReadiness';
import { useImageElement } from './hooks/useImageElement';
import { useMobileStudioLayout } from './hooks/useMobileStudioLayout';
import { useStickyRailHeight } from './hooks/useStickyRailHeight';
import { useStudio } from './hooks/useStudio';
import { createMeasureText } from './lib/render/measure';

export default function App() {
  const studio = useStudio();
  const { t } = useI18n();
  const isMobile = useMobileStudioLayout();
  const measureText = useMemo(() => createMeasureText(), []);
  const railRef = useRef<HTMLDivElement>(null);
  const previewColumnRef = useRef<HTMLDivElement>(null);
  useStickyRailHeight({ railRef, containerRef: previewColumnRef, enabled: !isMobile });
  const imageState = useImageElement(studio.design.logo?.dataUrl ?? null);
  const logoReadiness = useMemo(
    () => deriveLogoReadiness(studio.design.logo, imageState, studio.logoPhase),
    [studio.design.logo, imageState, studio.logoPhase],
  );
  // Reddedilen bir yükleme denemesi mevcut tasarımı geçersiz kılmaz; yalnızca
  // seçili logonun çözülememesi dışa aktarmayı kilitler.
  const logoUploadError = studio.logoError;
  const logoDecodeError = logoReadiness.error;

  // Paneller tek kez oluşturulur; iki düzen dalından yalnızca biri DOM'a bağlanır.
  const contentPanel: ReactNode = (
    <ContentPanel
      mode={studio.mode}
      content={studio.content}
      evaluation={studio.evaluation}
      matrixError={studio.matrixError}
      onModeChange={studio.setMode}
      onPatchContent={studio.patchContent}
      onPatchEmail={studio.patchEmail}
      onPatchWifi={studio.patchWifi}
    />
  );
  const designPanel: ReactNode = (
    <DesignTabs
      design={studio.design}
      contrast={studio.contrast}
      onPatch={studio.patchDesign}
      onLogoChange={studio.setLogo}
      onLogoUpload={studio.uploadLogo}
      logoBusy={logoReadiness.pending}
      logoError={logoUploadError ?? logoDecodeError}
      onLogoErrorDismiss={studio.dismissLogoError}
    />
  );
  const presetsPanel: ReactNode = (
    <PresetGallery activePresetId={studio.activePresetId} onApply={studio.applyPreset} />
  );
  const exportPanel: ReactNode = (
    <ExportPanel
      matrix={studio.matrix}
      design={studio.design}
      measureText={measureText}
      logoImage={imageState.image}
      payload={studio.evaluation.payload}
      disabled={!studio.matrix}
      logoPending={logoReadiness.pending}
      logoError={logoDecodeError}
    />
  );

  return (
    <div
      className={`min-h-dvh bg-canvas text-ink${isMobile ? ' mobile-dock-clearance' : ''}`}
    >
      <a href="#studio" className="skip-link">
        {t('İçeriğe geç', 'Skip to editor')}
      </a>
      <TopBar onReset={studio.resetDesign} />
      {/* Mobilde büyük tanıtım başlığı gösterilmez: stüdyo, mini canlı QR ile
          doğrudan üst çubuğun altında başlar. Masaüstü başlığı değişmez. */}
      {!isMobile && <Hero />}

      {isMobile ? (
        <main id="studio" className="mx-auto max-w-[1240px] px-4 sm:px-6" data-testid="mobile-main">
          <MobileStudio
            contentPanel={contentPanel}
            designPanel={designPanel}
            presetsPanel={presetsPanel}
            exportPanel={exportPanel}
            matrix={studio.matrix}
            design={studio.design}
            measureText={measureText}
            logoImage={imageState.image}
            logoPending={logoReadiness.pending}
            logoError={logoDecodeError}
            errorMessage={studio.evaluation.primaryError}
            matrixError={studio.matrixError}
            warnings={studio.warnings}
          />
        </main>
      ) : (
        <main id="studio" className="mx-auto max-w-[1240px] px-4 sm:px-6">
          <div
            className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
            data-testid="studio-grid"
          >
            <div className="order-1 lg:col-start-1 lg:row-start-1" data-testid="editor-column">
              {contentPanel}
            </div>

            {/*
              Sarmalayıcı masaüstünde iki satırlık grid alanının tamamına yayılır
              (lg:self-stretch); içindeki .preview-rail bu uzun alan içinde,
              useStickyRailHeight ile ölçülen kesin yükseklikte sticky kalır.
              Ayrıntı: src/styles/preview-layout.css.
            */}
            <div
              ref={previewColumnRef}
              className="order-2 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-stretch"
              data-testid="preview-column"
            >
              <div ref={railRef} className="preview-rail" data-testid="preview-rail">
                <PreviewPanel
                  matrix={studio.matrix}
                  design={studio.design}
                  measureText={measureText}
                  logoImage={imageState.image}
                  warnings={studio.warnings}
                  errorMessage={studio.evaluation.primaryError}
                  matrixError={studio.matrixError}
                  errorLevel={studio.errorLevel}
                  logoPending={logoReadiness.pending}
                  logoError={logoDecodeError}
                />
                {exportPanel}
              </div>
            </div>

            <div className="order-3 pb-20 lg:col-start-1 lg:row-start-2" data-testid="design-column">
              {designPanel}
              {presetsPanel}
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
