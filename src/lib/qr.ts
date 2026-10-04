/** QR matrisi üretimi — node-qrcode'un kendi kodlayıcısı kullanılır. */

import QRCode from 'qrcode';
import { utf8ByteLength } from './content';
import { translate, type Locale } from './locale';
import type { DesignState, ErrorLevel, QrMatrix } from './types';

/** Hata düzeltme seviyeleri, güçlüden zayıfa. */
export const ERROR_LEVEL_ORDER: ErrorLevel[] = ['H', 'Q', 'M', 'L'];

/** Logolu tasarımlarda hata düzeltme her zaman H'ye sabitlenir. */
export function resolveErrorLevel(design: DesignState, payloadLength: number): ErrorLevel {
  if (design.logo) return 'H';
  if (design.errorLevel !== 'auto') return design.errorLevel;
  if (payloadLength > 500) return 'H';
  if (payloadLength > 220) return 'Q';
  return 'M';
}

export type MatrixFailureReason = 'empty' | 'too-long' | 'encode';

export type MatrixResult =
  | { ok: true; matrix: QrMatrix; level: ErrorLevel }
  | { ok: false; reason: MatrixFailureReason; message: string };

function toMatrix(qr: QRCode.QRCode): QrMatrix | null {
  const size = qr.modules.size;
  const data = qr.modules.data as unknown as Uint8Array;
  if (!size || !data || data.length < size * size) return null;
  return { size, data };
}

/**
 * Matrisi üretir; başarısızlığı sessizce yutmaz.
 *
 * `too-long`, içeriğin bu hata düzeltme seviyesinde sığmadığını bildirir ve
 * kullanıcıya gösterilebilecek yerelleştirilmiş bir mesaj taşır.
 */
export function createMatrixResult(value: string, level: ErrorLevel, locale: Locale = 'tr'): MatrixResult {
  if (!value) {
    return {
      ok: false,
      reason: 'empty',
      message: translate(locale, 'QR kod üretmek için içerik girin.', 'Enter content to generate a QR code.'),
    };
  }
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: level });
    const matrix = toMatrix(qr);
    if (!matrix) {
      return {
        ok: false,
        reason: 'encode',
        message: translate(
          locale,
          'QR kod matrisi oluşturulamadı.',
          'The QR code could not be created.',
        ),
      };
    }
    return { ok: true, matrix, level };
  } catch (error) {
    const raw = error instanceof Error ? error.message : '';
    if (/too big|overflow|too long|Invalid data/i.test(raw)) {
      const bytes = utf8ByteLength(value);
      return {
        ok: false,
        reason: 'too-long',
        message: translate(
          locale,
          `İçerik ${level} hata düzeltme seviyesinde sığmıyor (${bytes} bayt). Metni kısaltın.`,
          `Content doesn't fit at error correction level ${level} (${bytes} bytes). Shorten the text.`,
        ),
      };
    }
    return {
      ok: false,
      reason: 'encode',
      message: translate(
        locale,
        'QR kod üretilemedi; içeriği kontrol edin.',
        'The QR code could not be generated; check the content.',
      ),
    };
  }
}

/** Kolaylık sarmalayıcı (kısa sabit içerik, testler). Kullanıcı akışı için `resolveMatrix` kullanın. */
export function createMatrix(value: string, level: ErrorLevel): QrMatrix | null {
  const result = createMatrixResult(value, level);
  return result.ok ? result.matrix : null;
}

export interface ResolvedMatrix {
  matrix: QrMatrix | null;
  /** Kullanılan (veya denenip başarısız olunan) seviye. */
  level: ErrorLevel;
  /** Otomatik seçimde istenen seviye. */
  requestedLevel: ErrorLevel;
  downgraded: boolean;
  /** Kullanıcıya gösterilecek eylem çağrısı (matris yoksa). */
  error: string | null;
  /** Otomatik düşürme bilgisi (uyarı listesine eklenir). */
  note: string | null;
}

/**
 * İçerik + tasarımdan nihai matrisi çözer.
 *
 * - Hata düzeltme kullanıcı tarafından seçildiyse veya logo varsa seviye
 *   kilitlidir; sığmazsa eylem çağrısı döner.
 * - "Otomatik" seçimde içerik istenen seviyeye sığmazsa, sığan en yüksek
 *   seviyeye inilir ve bu durum `note` ile bildirilir (sessizce yutulmaz).
 */
export function resolveMatrix(payload: string, design: DesignState, locale: Locale = 'tr'): ResolvedMatrix {
  const requestedLevel = resolveErrorLevel(design, payload.length);
  const locked = Boolean(design.logo) || design.errorLevel !== 'auto';

  if (!payload) {
    return {
      matrix: null,
      level: requestedLevel,
      requestedLevel,
      downgraded: false,
      error: null,
      note: null,
    };
  }

  const first = createMatrixResult(payload, requestedLevel, locale);
  if (first.ok) {
    return {
      matrix: first.matrix,
      level: requestedLevel,
      requestedLevel,
      downgraded: false,
      error: null,
      note: null,
    };
  }

  if (!locked) {
    const weaker = ERROR_LEVEL_ORDER.slice(ERROR_LEVEL_ORDER.indexOf(requestedLevel) + 1);
    for (const level of weaker) {
      const attempt = createMatrixResult(payload, level, locale);
      if (attempt.ok) {
        return {
          matrix: attempt.matrix,
          level,
          requestedLevel,
          downgraded: true,
          error: null,
          note: translate(
            locale,
            `İçerik otomatik seçilen ${requestedLevel} seviyesine sığmadı; hata düzeltme ${level} seviyesine düşürüldü.`,
            `Content didn't fit the auto-selected ${requestedLevel} level; error correction was lowered to ${level}.`,
          ),
        };
      }
    }
    return {
      matrix: null,
      level: requestedLevel,
      requestedLevel,
      downgraded: false,
      error: translate(
        locale,
        `İçerik bir QR koduna sığmıyor (${utf8ByteLength(payload)} bayt). Metni kısaltın.`,
        `Content doesn't fit in a QR code (${utf8ByteLength(payload)} bytes). Shorten the text.`,
      ),
      note: null,
    };
  }

  const reason = design.logo
    ? translate(
        locale,
        'Logo kullanıldığı için hata düzeltme en yüksek seviyede sabit; metni kısaltın veya logoyu kaldırın.',
        'A logo locks error correction at the highest level; shorten the text or remove the logo.',
      )
    : translate(
        locale,
        'Metni kısaltın veya daha düşük bir hata düzeltme seviyesi seçin.',
        'Shorten the text or choose a lower error correction level.',
      );
  return {
    matrix: null,
    level: requestedLevel,
    requestedLevel,
    downgraded: false,
    error: translate(
      locale,
      `İçerik ${requestedLevel} hata düzeltme seviyesinde sığmıyor (${utf8ByteLength(payload)} bayt). ${reason}`,
      `Content doesn't fit at error correction level ${requestedLevel} (${utf8ByteLength(payload)} bytes). ${reason}`,
    ),
    note: null,
  };
}

export function isDarkModule(matrix: QrMatrix, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) return false;
  return matrix.data[y * matrix.size + x] === 1;
}

/** Üç bulucu desenin (finder) 8×8 bölgesi — özel köşe çizimi için atlanır. */
export function isFinderZone(x: number, y: number, size: number): boolean {
  const inTop = y < 8;
  const inBottom = y >= size - 8;
  const inLeft = x < 8;
  const inRight = x >= size - 8;
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft);
}

/** Bilgi amaçlı: yaklaşık QR sürümü. */
export function guessVersion(size: number): number {
  return Math.max(1, Math.round((size - 17) / 4));
}
