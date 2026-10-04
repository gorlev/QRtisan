/**
 * Sticky önizleme rayının yüksekliğini CSS değişkenleriyle ölçer.
 *
 * `--preview-rail-top` / `--preview-rail-height` değerleri; üst çubuğun gerçek
 * alt kenarı, kapsayıcı bloğun alt kenarı (grid alanı) ve viewport yüksekliği
 * kullanılarak hesaplanır (bkz. lib/layout.ts). Böylece ray, sayfa sonuna
 * yaklaşırken üst çubuğun altına kaymaz; kapsayıcı küçüldükçe kısalır.
 *
 * Ölçümler pasif scroll/resize dinleyicileriyle RAF'ta birleştirilir; ayrıca
 * üst çubuk ve kapsayıcı için ResizeObserver kullanılır. Altbilgi yüksekliği
 * asla sabitlenmez.
 */

import { useLayoutEffect, type RefObject } from 'react';
import { computeRailMetrics } from '../lib/layout';

interface Options {
  railRef: RefObject<HTMLElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  /** Yalnızca bu sorgu eşleşirken ölçüm uygulanır (varsayılan: lg ve üzeri). */
  query?: string;
  /** Masaüstü dalı bağlı mı? Dal değişiminde ölçüm yeniden kurulur. */
  enabled?: boolean;
}

const DEFAULT_QUERY = '(min-width: 64rem)';

export function useStickyRailHeight({
  railRef,
  containerRef,
  query = DEFAULT_QUERY,
  enabled = true,
}: Options): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    const rail = railRef.current;
    const container = containerRef.current;
    if (!rail || !container) return;

    let frame = 0;
    let lastTop = '';
    let lastHeight = '';

    const apply = () => {
      frame = 0;
      const header = document.querySelector('header');
      const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      const containerBottom = container.getBoundingClientRect().bottom;
      const { top, height } = computeRailMetrics({
        headerBottom,
        containerBottom,
        viewportHeight: window.innerHeight,
      });
      const topValue = `${top}px`;
      const heightValue = `${height}px`;
      if (topValue !== lastTop) {
        rail.style.setProperty('--preview-rail-top', topValue);
        lastTop = topValue;
      }
      if (heightValue !== lastHeight) {
        rail.style.setProperty('--preview-rail-height', heightValue);
        lastHeight = heightValue;
      }
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(apply);
    };

    const mediaQuery =
      typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    const onMediaChange = () => {
      if (!mediaQuery || mediaQuery.matches) schedule();
    };

    apply();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    mediaQuery?.addEventListener('change', onMediaChange);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(container);
      const header = document.querySelector('header');
      if (header) observer.observe(header);
    }

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      mediaQuery?.removeEventListener('change', onMediaChange);
      observer?.disconnect();
    };
  }, [railRef, containerRef, query, enabled]);
}
