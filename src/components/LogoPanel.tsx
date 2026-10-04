/** Logo sekmesi — yerel raster logo yükleme, boyut, boşluk ve kaldırma. */

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { FileImage, Loader2, Lock, Trash2, Upload, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { isLogoDecodeError, localizeErrorMessage } from '../i18n/messages';
import { ACCEPT_ATTRIBUTE, formatBytes, MAX_LOGO_BYTES } from '../lib/logo';
import type { DesignState, LogoState } from '../lib/types';
import { Button, Callout, cx, Slider, Switch } from './ui';

interface LogoPanelProps {
  logo: LogoState | null;
  /** Dosya okunuyor veya görsel çözülüyor. */
  busy: boolean;
  error: string | null;
  onLogoChange: (logo: LogoState | null) => void;
  onUpload: (file: File) => void;
  onPatch: (patch: Partial<DesignState>) => void;
  /** Alan hatasını kapatır (mevcut logoyu/tasarımı değiştirmez). */
  onDismissError: () => void;
}

export function LogoPanel({ logo, busy, error, onLogoChange, onUpload, onPatch, onDismissError }: LogoPanelProps) {
  const { locale, t } = useI18n();
  const [dragging, setDragging] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file || busy) return;
    onUpload(file);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  };

  // Çözülemeyen seçili logo kapatılamaz (yeniden görünürdü); X doğrudan
  // bozuk logoyu kaldırır. Yükleme reddi ise yalnızca uyarıyı temizler.
  const decodeError = isLogoDecodeError(error);
  const message = localizeErrorMessage(error, locale);

  const errorNotice = message && (
    <p role="alert" className="flex items-start gap-2 text-[12.5px] font-medium text-red-600">
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        onClick={() => (decodeError ? onLogoChange(null) : onDismissError())}
        aria-label={
          decodeError ? t('Bozuk logoyu kaldır', 'Remove failed logo') : t('Logo hatasını kapat', 'Dismiss logo error')
        }
        className="shrink-0 rounded-md p-0.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      >
        <X size={14} aria-hidden />
      </button>
    </p>
  );

  return (
    <div className="space-y-5">
      {!logo ? (
        <div className="space-y-3">
          <label
            onDragOver={(event) => {
              if (busy) return;
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            aria-disabled={busy}
            className={cx(
              'flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-dashed px-5 py-8 text-center transition',
              busy && 'cursor-not-allowed opacity-70',
              dragging
                ? 'border-lavender bg-lilac-soft'
                : 'border-line bg-canvas/60 hover:border-lavender/50 hover:bg-lilac-soft/50',
            )}
          >
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              disabled={busy}
              onChange={onInputChange}
              aria-describedby="logo-help"
            />
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lilac text-lavender-deep">
              {busy ? <Loader2 size={19} className="animate-spin" aria-hidden /> : <Upload size={19} aria-hidden />}
            </span>
            <span className="text-[13.5px] font-bold text-ink">
              {busy ? t('Dosya okunuyor…', 'Reading file…') : t('Logoyu buraya bırakın veya seçin', 'Drop a logo here or choose a file')}
            </span>
            <span id="logo-help" className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-ink-soft">
              PNG · JPEG · WebP — {t('en fazla', 'up to')} {formatBytes(MAX_LOGO_BYTES, locale)}
            </span>
          </label>
          {errorNotice}
          <p className="text-[12px] leading-relaxed text-ink-soft">
            {t(
              'Dosya yalnızca tarayıcınızda işlenir; yüklenmez, kaydedilmez.',
              'Files are processed only in your browser — never uploaded or stored.',
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-canvas/60 p-3.5">
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
              <img src={logo.dataUrl} alt="" className="h-full w-full object-contain" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-ink" title={logo.fileName}>
                {logo.fileName}
              </p>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-soft">
                {logo.width}×{logo.height} px · {formatBytes(Math.round(logo.dataUrl.length * 0.75), locale)}
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onLogoChange(null)}>
              <Trash2 size={14} aria-hidden />
              {t('Kaldır', 'Remove')}
            </Button>
          </div>
          <div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => replaceInputRef.current?.click()}
            >
              <Upload size={14} aria-hidden />
              {t('Logoyu değiştir', 'Replace logo')}
            </Button>
            <input
              ref={replaceInputRef}
              id="logo-replace"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              disabled={busy}
              onChange={onInputChange}
            />
          </div>
          {busy && (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-[12.5px] font-medium text-ink-soft">
              <Loader2 size={13} className="animate-spin" aria-hidden />
              {t('Logo işleniyor…', 'Processing logo…')}
            </p>
          )}
          {errorNotice}

          <Slider
            id="logo-size"
            label={t('Logo boyutu', 'Logo size')}
            min={14}
            max={32}
            value={Math.round(logo.size * 100)}
            format={(value) => `%${value}`}
            hint={t(
              'QR genişliğine oranı. %26 üzerinde okunabilirlik düşer.',
              'Share of the QR width. Above 26% scanability drops.',
            )}
            onChange={(value) => onPatch({ logo: { ...logo, size: value / 100 } })}
          />
          <Slider
            id="logo-padding"
            label={t('Logo iç boşluğu', 'Logo padding')}
            min={1.5}
            max={8}
            step={0.5}
            value={Math.round(logo.padding * 1000) / 10}
            format={(value) => `%${value}`}
            onChange={(value) => onPatch({ logo: { ...logo, padding: value / 100 } })}
          />
          <Switch
            id="logo-clear"
            label={t('Altındaki modülleri temizle', 'Clear modules behind logo')}
            checked={logo.clearModules}
            hint={t(
              'Kapalıysa logo modüllerin üzerine biner; taranabilirlik azalabilir.',
              'When off, the logo sits on top of the modules and may reduce scanability.',
            )}
            onChange={(clearModules) => onPatch({ logo: { ...logo, clearModules } })}
          />
        </div>
      )}

      <Callout tone="info" icon={<Lock size={15} aria-hidden />} title={t('Hata düzeltme otomatik', 'Error correction is automatic')}>
        {t('Logo kullanıldığında hata düzeltme ', 'With a logo, error correction is locked to level ')}
        <strong>{t('H (%30)', 'H (30%)')}</strong>
        {t(
          ' seviyesine sabitlenir; böylece kapanan modüller telafi edilir.',
          ' to compensate for covered modules.',
        )}
      </Callout>

      <div className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-soft">
        <FileImage size={14} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          {t(
            "Kare olmayan logolar oranı korunarak ortalanır. Şeffaf zeminli PNG'ler en iyi sonucu verir.",
            'Non-square logos are centered with their aspect ratio preserved. PNGs with a transparent background work best.',
          )}
        </p>
      </div>
    </div>
  );
}
