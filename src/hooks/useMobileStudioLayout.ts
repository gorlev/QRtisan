/**
 * Mobil stüdyo düzeni — 1024px altında tek sütunlu mobil deneyim.
 *
 * App, masaüstü/mobil dallanmasını bu kancayla yapar. Medya sorgusu
 * `matchMedia` ile canlı izlenir; ilk render'da doğru değer döner.
 */

import { useEffect, useState } from 'react';

/** Tailwind `lg` (64rem = 1024px) sınırının hemen altı. */
export const MOBILE_STUDIO_MEDIA_QUERY = '(max-width: 1023.98px)';

function matchesMobile(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(MOBILE_STUDIO_MEDIA_QUERY).matches;
}

export function useMobileStudioLayout(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(matchesMobile);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(MOBILE_STUDIO_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
