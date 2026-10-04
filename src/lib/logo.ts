/** Logo dosyası okuma ve sınırları — dosya tarayıcıdan dışarı çıkmaz. */

import { translate, type Locale } from './locale';
import type { LogoState } from './types';

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const MAX_LOGO_DIMENSION = 4000;
export const MIN_LOGO_DIMENSION = 24;
export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const ACCEPT_ATTRIBUTE = ACCEPTED_LOGO_TYPES.join(',');

export const DEFAULT_LOGO_SIZE = 0.22;
export const DEFAULT_LOGO_PADDING = 0.035;

/** Logo yükleme hatasının kararlı kimliği — UI bunu saklayıp her an yerelleştirebilir. */
export type LogoErrorCode =
  | 'unsupported-type'
  | 'too-large'
  | 'empty'
  | 'read-failed'
  | 'decode-failed'
  | 'too-small'
  | 'too-large-dimensions';

/** Hata mesajındaki sayısal değerler; kimlikle birlikte saklanır. */
export interface LogoErrorParams {
  /** `too-large`: dosya boyutu (bayt). */
  bytes?: number;
  /** `too-small`: en küçük kenar (piksel). */
  min?: number;
  /** `too-large-dimensions`: en büyük kenar (piksel). */
  max?: number;
}

/** Dilden bağımsız hata tanımı — UI bunu saklayıp dil değişince çevirir. */
export interface LogoErrorDescriptor {
  code: LogoErrorCode;
  params?: LogoErrorParams;
}

export type LogoReadResult =
  | { ok: true; logo: LogoState }
  | {
      ok: false;
      /** Aktif dile göre üretilmiş hazır mesaj (geriye dönük). */
      error: string;
      /** Kalıcı saklama için kararlı kod. */
      errorCode: LogoErrorCode;
      errorParams?: LogoErrorParams;
    };

export type LogoReadFailure = Extract<LogoReadResult, { ok: false }>;

/** `localizeLogoError` girdisi: tanım, okuma sonucu ya da eski usul mesaj. */
export type LogoErrorLike = LogoErrorDescriptor | LogoReadResult | string;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read-failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('decode-failed'));
    image.src = src;
  });
}

/**
 * Dosya boyutunu okunur biçime çevirir. Birimler (B/KB/MB) diller arası
 * aynıdır; `_locale` parametresi API bütünlüğü için kabul edilir.
 */
export function formatBytes(bytes: number, _locale: Locale = 'tr'): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const LOGO_ERROR_BUILDERS: Record<
  LogoErrorCode,
  (locale: Locale, params: LogoErrorParams) => string
> = {
  'unsupported-type': (locale) =>
    translate(
      locale,
      'Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz.',
      'You can only upload PNG, JPEG, or WebP files.',
    ),
  'too-large': (locale, params) => {
    const size = formatBytes(params.bytes ?? MAX_LOGO_BYTES, locale);
    const max = formatBytes(MAX_LOGO_BYTES, locale);
    return translate(
      locale,
      `Dosyanız ${size}; üst sınır ${max}.`,
      `Your file is ${size}; the maximum is ${max}.`,
    );
  },
  empty: (locale) => translate(locale, 'Dosya boş görünüyor.', 'The file looks empty.'),
  'read-failed': (locale) =>
    translate(locale, 'Dosya okunamadı, tekrar deneyin.', "Couldn't read the file. Try again."),
  'decode-failed': (locale) =>
    translate(
      locale,
      'Görsel açılamadı, dosya bozuk olabilir.',
      "Couldn't open the image; the file may be corrupted.",
    ),
  'too-small': (locale, params) => {
    const min = params.min ?? MIN_LOGO_DIMENSION;
    return translate(
      locale,
      `Logo en az ${min}×${min} piksel olmalı.`,
      `The logo must be at least ${min}×${min} pixels.`,
    );
  },
  'too-large-dimensions': (locale, params) => {
    const max = params.max ?? MAX_LOGO_DIMENSION;
    return translate(
      locale,
      `Logo en fazla ${max}×${max} piksel olabilir.`,
      `The logo can be at most ${max}×${max} pixels.`,
    );
  },
};

/**
 * Logo hatasını aktif dile çevirir.
 *
 * UI, `readLogoFile` sonucundaki `errorCode`/`errorParams` alanlarını (ya da
 * doğrudan sonucu) saklamalı; dil değişince bu yardımcıyı yeniden çağırması
 * yeterlidir. Eski usul düz metin yalnızca bilinen sabit mesajlarda eşlenir;
 * tanınmayan metin olduğu gibi döner (rastgele metin yeniden yazılmaz).
 */
/** Tanınan bir logo hata kodu mu? (prototip zincirine güvenmeden.) */
function isLogoErrorCode(value: unknown): value is LogoErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(LOGO_ERROR_BUILDERS, value);
}

/** Bozuk/eksik parametreleri güvenle normalize eder. */
function asLogoErrorParams(value: unknown): LogoErrorParams {
  return value && typeof value === 'object' ? (value as LogoErrorParams) : {};
}

/** Tanınmayan girdide gösterilecek genel, yerelleştirilmiş logo hatası. */
function genericLogoError(locale: Locale): string {
  return translate(locale, 'Logo yüklenemedi.', 'The logo could not be loaded.');
}

/** Eski usul düz metni bilinen sabitlerle eşler; aksi hâlde genel hata döner. */
function legacyTextOrGeneric(value: unknown, locale: Locale): string {
  if (typeof value === 'string') {
    const code = LEGACY_LOGO_ERROR_CODES.get(value);
    if (code) return LOGO_ERROR_BUILDERS[code](locale, {});
  }
  return genericLogoError(locale);
}

export function localizeLogoError(error: LogoErrorLike, locale: Locale = 'tr'): string {
  const input: unknown = error;

  if (typeof input === 'string') {
    const code = LEGACY_LOGO_ERROR_CODES.get(input);
    return code ? LOGO_ERROR_BUILDERS[code](locale, {}) : input;
  }

  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    if ('ok' in record) {
      if (record.ok) return '';
      if (isLogoErrorCode(record.errorCode)) {
        return LOGO_ERROR_BUILDERS[record.errorCode](locale, asLogoErrorParams(record.errorParams));
      }
      return legacyTextOrGeneric(record.error, locale);
    }
    if (isLogoErrorCode(record.code)) {
      return LOGO_ERROR_BUILDERS[record.code](locale, asLogoErrorParams(record.params));
    }
    return genericLogoError(locale);
  }

  return genericLogoError(locale);
}

/** `readLogoFile` öncesi sürümlerden kalan sabit mesajlar (ör. localStorage). */
const LEGACY_LOGO_ERROR_CODES = new Map<string, LogoErrorCode>([
  ['Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz.', 'unsupported-type'],
  ['Dosya boş görünüyor.', 'empty'],
  ['Dosya okunamadı, tekrar deneyin.', 'read-failed'],
  ['Görsel açılamadı, dosya bozuk olabilir.', 'decode-failed'],
  [`Logo en az ${MIN_LOGO_DIMENSION}×${MIN_LOGO_DIMENSION} piksel olmalı.`, 'too-small'],
  [`Logo en fazla ${MAX_LOGO_DIMENSION}×${MAX_LOGO_DIMENSION} piksel olabilir.`, 'too-large-dimensions'],
]);

/**
 * Yüklenen raster logoyu doğrular ve data URL'e çevirir.
 * Yalnızca PNG/JPEG/WebP kabul edilir (SVG, betik çalıştırma riski nedeniyle reddedilir).
 *
 * Hata durumunda dönen `error` aktif dile göre üretilir; kalıcı saklama için
 * `errorCode` + `errorParams` kullanın ve `localizeLogoError` ile çevirin.
 */
export async function readLogoFile(file: File, locale: Locale = 'tr'): Promise<LogoReadResult> {
  const fail = (code: LogoErrorCode, params?: LogoErrorParams): LogoReadResult => ({
    ok: false,
    error: LOGO_ERROR_BUILDERS[code](locale, params ?? {}),
    errorCode: code,
    errorParams: params,
  });

  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) return fail('unsupported-type');
  if (file.size > MAX_LOGO_BYTES) return fail('too-large', { bytes: file.size });
  if (file.size === 0) return fail('empty');

  let dataUrl: string;
  try {
    dataUrl = await readAsDataUrl(file);
  } catch {
    return fail('read-failed');
  }

  let image: HTMLImageElement;
  try {
    image = await loadImage(dataUrl);
  } catch {
    return fail('decode-failed');
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width < MIN_LOGO_DIMENSION || height < MIN_LOGO_DIMENSION) {
    return fail('too-small', { min: MIN_LOGO_DIMENSION });
  }
  if (width > MAX_LOGO_DIMENSION || height > MAX_LOGO_DIMENSION) {
    return fail('too-large-dimensions', { max: MAX_LOGO_DIMENSION });
  }

  return {
    ok: true,
    logo: {
      dataUrl,
      fileName: file.name,
      width,
      height,
      size: DEFAULT_LOGO_SIZE,
      padding: DEFAULT_LOGO_PADDING,
      clearModules: true,
    },
  };
}
