/** Taranabilirlik uyarıları — kontrast, yoğunluk, logo ve sessiz alan kuralları. */

import { relativeLuminance } from './colors';
import { translate, type Locale } from './locale';
import { guessVersion } from './qr';
import type { DesignState, ErrorLevel } from './types';

export type WarningSeverity = 'danger' | 'warning' | 'info';

export interface ScanWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
}

export interface WarningInput {
  design: DesignState;
  fg: string;
  bg: string;
  contrast: number;
  payloadLength: number;
  matrixSize: number | null;
  logoBoxRatio: number;
  captionLength: number;
  /** Otomatik hata düzeltme düşürüldüyse bilgilendirme için. */
  autoDowngraded?: { requested: ErrorLevel; used: ErrorLevel } | null;
}

const MIN_QUIET_ZONE = 4;

/** Sessiz alan ayrıntısını sayıya göre doğal tekil/çoğul İngilizceyle üretir. */
function quietZoneDetail(locale: Locale, count: number): string {
  const min = MIN_QUIET_ZONE;
  if (count === 0) {
    return translate(
      locale,
      `QR çevresinde hiç boşluk yok. Okuyucular için en az ${min} modül önerilir.`,
      `There is no clear space around this QR. At least ${min} modules are recommended for readers.`,
    );
  }
  if (count === 1) {
    return translate(
      locale,
      `QR çevresinde yalnızca 1 modül boşluk var. Okuyucular için en az ${min} modül önerilir.`,
      `There is only 1 module of empty space around the QR. At least ${min} modules are recommended for readers.`,
    );
  }
  return translate(
    locale,
    `QR çevresinde yalnızca ${count} modül boşluk var. Okuyucular için en az ${min} modül önerilir.`,
    `There are only ${count} modules of empty space around the QR. At least ${min} modules are recommended for readers.`,
  );
}

/**
 * Taranabilirlik uyarılarını üretir.
 *
 * `id` ve `severity` her dilde sabittir; yalnızca başlık ve ayrıntı metni
 * dile göre değişir. Böylece UI tarafı kimliklere göre davranabilir.
 */
export function collectWarnings(input: WarningInput, locale: Locale = 'tr'): ScanWarning[] {
  const { design, fg, bg, contrast, payloadLength, matrixSize, logoBoxRatio, captionLength } = input;
  const warnings: ScanWarning[] = [];

  if (input.autoDowngraded) {
    warnings.push({
      id: 'auto-downgraded',
      severity: 'info',
      title: translate(
        locale,
        'Hata düzeltme otomatik düşürüldü',
        'Error correction lowered automatically',
      ),
      detail: translate(
        locale,
        `İçerik ${input.autoDowngraded.requested} seviyesine sığmadığı için ${input.autoDowngraded.used} seviyesi kullanıldı. Daha yüksek dayanıklılık için metni kısaltın.`,
        `Content didn't fit level ${input.autoDowngraded.requested}, so level ${input.autoDowngraded.used} was used. Shorten the text for higher resilience.`,
      ),
    });
  }

  if (contrast < 3) {
    warnings.push({
      id: 'contrast-low',
      severity: 'danger',
      title: translate(locale, 'Kontrast çok düşük', 'Contrast is too low'),
      detail: translate(
        locale,
        `Ön plan ve arka plan birbirine çok yakın (${contrast.toFixed(1)}:1). Çoğu okuyucu kodu ayırt edemez. En az 4.5:1 hedefleyin.`,
        `Foreground and background are too close (${contrast.toFixed(1)}:1). Most readers can't distinguish the code. Aim for at least 4.5:1.`,
      ),
    });
  } else if (contrast < 4.5) {
    warnings.push({
      id: 'contrast-borderline',
      severity: 'warning',
      title: translate(locale, 'Kontrast sınırda', 'Contrast is borderline'),
      detail: translate(
        locale,
        `Kontrast ${contrast.toFixed(1)}:1. Baskıda veya ekran görüntüsünde taranmayabilir; 4.5:1 ve üzeri önerilir.`,
        `Contrast is ${contrast.toFixed(1)}:1. It may not scan in print or on a screenshot; 4.5:1 or higher is recommended.`,
      ),
    });
  }

  if (!design.transparentBg) {
    if (relativeLuminance(fg) > relativeLuminance(bg)) {
      warnings.push({
        id: 'inverted',
        severity: 'warning',
        title: translate(locale, 'Renkler ters', 'Colors are inverted'),
        detail: translate(
          locale,
          'Açık modüller koyu arka plan üzerinde. Bazı eski okuyucular bunu desteklemez; mutlaka telefonunuzla deneyin.',
          "Light modules on a dark background. Some older readers don't support this; test with your phone.",
        ),
      });
    }
  } else {
    warnings.push({
      id: 'transparent-bg',
      severity: 'info',
      title: translate(locale, 'Arka plan şeffaf', 'Transparent background'),
      detail: translate(
        locale,
        'Koyu veya desenli yüzeylerde taranmayabilir. Baskıda beyaz zemin kullanın.',
        'May not scan on dark or patterned surfaces. Use a white background for print.',
      ),
    });
  }

  if (design.logo) {
    warnings.push({
      id: 'logo-ec',
      severity: 'info',
      title: translate(
        locale,
        'Hata düzeltme H seviyesine sabitlendi',
        'Error correction locked at H',
      ),
      detail: translate(
        locale,
        'Logo, modüllerin bir kısmını kapattığı için en yüksek hata düzeltme (%30) kullanılıyor.',
        'Because the logo covers some modules, the highest error correction (30%) is used.',
      ),
    });
    if (logoBoxRatio > 0.26) {
      warnings.push({
        id: 'logo-large',
        severity: 'warning',
        title: translate(locale, 'Logo büyük', 'Logo is large'),
        detail: translate(
          locale,
          `Logo QR genişliğinin %${Math.round(logoBoxRatio * 100)} kadarını kaplıyor. %26'nın altına indirmeyi deneyin.`,
          `The logo covers ${Math.round(logoBoxRatio * 100)}% of the QR width. Try reducing it below 26%.`,
        ),
      });
    }
  }

  if (matrixSize !== null) {
    if (matrixSize >= 65) {
      warnings.push({
        id: 'density-high',
        severity: 'warning',
        title: translate(locale, 'Veri yoğun', 'Data is dense'),
        detail: translate(
          locale,
          `Sürüm ${guessVersion(matrixSize)} (${matrixSize}×${matrixSize} modül). Küçük baskılarda okunması zorlaşır; daha kısa bir adres veya bağlantı kısaltıcı kullanın.`,
          `Version ${guessVersion(matrixSize)} (${matrixSize}×${matrixSize} modules). It can be hard to read when printed small; use a shorter URL or a link shortener.`,
        ),
      });
    } else if (matrixSize >= 49) {
      warnings.push({
        id: 'density-medium',
        severity: 'info',
        title: translate(locale, 'Orta yoğunluk', 'Medium density'),
        detail: translate(
          locale,
          `${matrixSize}×${matrixSize} modül. Kartvizit boyutundan küçük baskılarda dikkatli olun.`,
          `${matrixSize}×${matrixSize} modules. Be careful with prints smaller than a business card.`,
        ),
      });
    }
  }

  if (design.quietZone < MIN_QUIET_ZONE) {
    warnings.push({
      id: 'quiet-zone',
      severity: 'warning',
      title: translate(locale, 'Sessiz alan dar', 'Quiet zone is narrow'),
      detail: quietZoneDetail(locale, design.quietZone),
    });
  }

  if (design.dot !== 'square' && matrixSize !== null && matrixSize >= 49) {
    warnings.push({
      id: 'dot-style-dense',
      severity: 'info',
      title: translate(
        locale,
        'Yoğun içerik + yuvarlak modüller',
        'Dense content + round modules',
      ),
      detail: translate(
        locale,
        'Çok yoğun QR kodlarda kare modüller daha güvenilir taranır.',
        'Square modules scan more reliably in very dense QR codes.',
      ),
    });
  }

  if (payloadLength > 900) {
    warnings.push({
      id: 'payload-long',
      severity: 'warning',
      title: translate(locale, 'İçerik uzun', 'Content is long'),
      detail: translate(
        locale,
        `${payloadLength} karakter. Uzun içerik modülleri küçültür; kısa metinler daha kolay taranır.`,
        `${payloadLength} characters. Long content shrinks the modules; shorter text scans more easily.`,
      ),
    });
  }

  if (captionLength > 32) {
    warnings.push({
      id: 'caption-long',
      severity: 'info',
      title: translate(locale, 'Etiket uzun', 'Caption is long'),
      detail: translate(
        locale,
        'Etiket otomatik küçültülür; kısa bir etiket daha okunaklı görünür.',
        'The caption is scaled down automatically; a short caption looks more legible.',
      ),
    });
  }

  return warnings;
}
