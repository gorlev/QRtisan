/** Logo hazır olma durumu — saf türetme (test edilebilir). */

import { LOGO_DECODE_ERROR } from '../i18n/messages';
import type { LogoState } from '../lib/types';
import type { ImageState } from './useImageElement';

export interface LogoReadiness {
  hasLogo: boolean;
  /** Görsel çizime ve dışa aktarmaya hazır. */
  ready: boolean;
  /** Okuma/çözme sürüyor; dışa aktarma kilitli olmalı. */
  pending: boolean;
  /** Görsel açılamadıysa kullanıcıya gösterilecek mesaj. */
  error: string | null;
}

export type LogoReadPhase = 'idle' | 'reading';

export function deriveLogoReadiness(
  logo: LogoState | null,
  image: ImageState,
  readPhase: LogoReadPhase = 'idle',
): LogoReadiness {
  const hasLogo = Boolean(logo);
  const matches = Boolean(logo) && image.src === logo?.dataUrl;
  const imageReady = matches && image.status === 'ready';
  const imageFailed = matches && image.status === 'error';
  const reading = readPhase === 'reading';
  const ready = reading ? false : !hasLogo || imageReady;
  const pending = reading || (hasLogo && !imageReady && !imageFailed);
  const error = imageFailed ? LOGO_DECODE_ERROR : null;
  return { hasLogo, ready, pending, error };
}
