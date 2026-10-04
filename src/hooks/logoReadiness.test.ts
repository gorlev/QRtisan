/** Logo hazır olma türetmesi — yarış durumları. */

import { describe, expect, it } from 'vitest';
import { deriveLogoReadiness } from './logoReadiness';
import type { ImageState } from './useImageElement';
import type { LogoState } from '../lib/types';

const LOGO: LogoState = {
  dataUrl: 'data:image/png;base64,YENI',
  fileName: 'yeni.png',
  width: 64,
  height: 64,
  size: 0.22,
  padding: 0.03,
  clearModules: true,
};

const image = (overrides: Partial<ImageState> = {}): ImageState => ({
  image: null,
  src: null,
  status: 'idle',
  ...overrides,
});

const fakeImage = {} as HTMLImageElement;

describe('deriveLogoReadiness', () => {
  it('logo yoksa hazırdır ve beklemez', () => {
    expect(deriveLogoReadiness(null, image())).toEqual({
      hasLogo: false,
      ready: true,
      pending: false,
      error: null,
    });
  });

  it('dosya okunurken beklemede kalır', () => {
    const result = deriveLogoReadiness(null, image(), 'reading');
    expect(result.pending).toBe(true);
    expect(result.ready).toBe(false);
  });

  it('eski görsel yeni kaynakla eşleşmezse hazır sayılmaz (değiştirme yarışı)', () => {
    const result = deriveLogoReadiness(
      LOGO,
      image({ image: fakeImage, src: 'data:image/png;base64,ESKI', status: 'ready' }),
    );
    expect(result.ready).toBe(false);
    expect(result.pending).toBe(true);
    expect(result.error).toBeNull();
  });

  it('yeni görsel yüklenirken beklemededir', () => {
    const result = deriveLogoReadiness(LOGO, image({ src: LOGO.dataUrl, status: 'loading' }));
    expect(result.ready).toBe(false);
    expect(result.pending).toBe(true);
  });

  it('eşleşen görsel hazırsa dışa aktarılabilir', () => {
    const result = deriveLogoReadiness(LOGO, image({ image: fakeImage, src: LOGO.dataUrl, status: 'ready' }));
    expect(result.ready).toBe(true);
    expect(result.pending).toBe(false);
    expect(result.error).toBeNull();
  });

  it('görsel açılamazsa hata verir ve beklemede kalmaz', () => {
    const result = deriveLogoReadiness(LOGO, image({ src: LOGO.dataUrl, status: 'error' }));
    expect(result.ready).toBe(false);
    expect(result.pending).toBe(false);
    expect(result.error).toMatch(/açılamadı/);
  });

  it('logo kaldırıldığında eski yükleme durumu kilitlemez', () => {
    const result = deriveLogoReadiness(null, image({ src: LOGO.dataUrl, status: 'loading' }));
    expect(result.ready).toBe(true);
    expect(result.pending).toBe(false);
  });
});
