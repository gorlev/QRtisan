/** data URL'den HTMLImageElement yükler; kaynak değişince eski görseli hemen temizler. */

import { useEffect, useState } from 'react';

export type ImageStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ImageState {
  image: HTMLImageElement | null;
  /** Durumun ait olduğu kaynak (yarış durumlarını ayırt etmek için). */
  src: string | null;
  status: ImageStatus;
}

export function useImageElement(src: string | null): ImageState {
  const [state, setState] = useState<ImageState>(() => ({
    image: null,
    src: null,
    status: src ? 'loading' : 'idle',
  }));

  useEffect(() => {
    if (!src) {
      setState({ image: null, src: null, status: 'idle' });
      return;
    }
    let cancelled = false;
    // Kaynak değişir değişmez eski görseli bırak: aksi halde yeni logo
    // çözülene kadar eski logo ile dışa aktarma yapılabilirdi.
    setState({ image: null, src, status: 'loading' });

    const element = new Image();
    element.decoding = 'async';
    element.onload = () => {
      if (!cancelled) setState({ image: element, src, status: 'ready' });
    };
    element.onerror = () => {
      if (!cancelled) setState({ image: null, src, status: 'error' });
    };
    element.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return state;
}
