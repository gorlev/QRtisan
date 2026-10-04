import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatBytes,
  localizeLogoError,
  MAX_LOGO_BYTES,
  MAX_LOGO_DIMENSION,
  MIN_LOGO_DIMENSION,
  readLogoFile,
} from './logo';

function fakeFile(overrides: Partial<File> = {}): File {
  return { type: 'image/png', size: 128, name: 'logo.png', ...overrides } as File;
}

function stubFileReader(mode: 'load' | 'error' = 'load') {
  class Reader {
    result: string | ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsDataURL() {
      if (mode === 'error') {
        queueMicrotask(() => this.onerror?.());
        return;
      }
      this.result = 'data:image/png;base64,AAAA';
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('FileReader', Reader);
}

function stubImage(size: { width: number; height: number } | 'error') {
  class FakeImage {
    naturalWidth = 0;
    naturalHeight = 0;
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      if (size === 'error') {
        queueMicrotask(() => this.onerror?.());
        return;
      }
      this.naturalWidth = size.width;
      this.naturalHeight = size.height;
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', FakeImage);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readLogoFile hata kodları', () => {
  it('desteklenmeyen türü reddeder', async () => {
    const result = await readLogoFile(fakeFile({ type: 'image/svg+xml' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('unsupported-type');
      expect(result.error).toMatch(/PNG, JPEG/);
    }
  });

  it('İngilizce hata mesajı üretir', async () => {
    const result = await readLogoFile(fakeFile({ type: 'image/svg+xml' }), 'en');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('You can only upload PNG, JPEG, or WebP files.');
      expect(result.errorCode).toBe('unsupported-type');
    }
  });

  it('boyut aşımında doğal ve dinamik hata döner', async () => {
    const size = 3 * 1024 * 1024;
    const result = await readLogoFile(fakeFile({ size }), 'en');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('too-large');
      expect(result.errorParams?.bytes).toBe(size);
      expect(result.error).toBe('Your file is 3.0 MB; the maximum is 2.0 MB.');
    }
  });

  it('boyut aşımında üst sınırı yerelleştirir', async () => {
    const size = 3 * 1024 * 1024;
    const result = await readLogoFile(fakeFile({ size }), 'tr');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Dosyanız 3.0 MB; üst sınır 2.0 MB.');
    }
  });

  it('boş dosyayı reddeder', async () => {
    const result = await readLogoFile(fakeFile({ size: 0 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('empty');
      expect(result.error).toBe('Dosya boş görünüyor.');
    }
  });

  it('okuma hatasını kodlar', async () => {
    stubFileReader('error');
    const result = await readLogoFile(fakeFile());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('read-failed');
      expect(result.error).toBe('Dosya okunamadı, tekrar deneyin.');
    }
  });

  it('bozuk görseli kodlar', async () => {
    stubFileReader('load');
    stubImage('error');
    const result = await readLogoFile(fakeFile(), 'en');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('decode-failed');
      expect(result.error).toBe("Couldn't open the image; the file may be corrupted.");
    }
  });

  it('küçük ve büyük görsel sınırlarını uygular', async () => {
    stubFileReader('load');
    stubImage({ width: MIN_LOGO_DIMENSION - 1, height: 64 });
    const small = await readLogoFile(fakeFile());
    expect(small.ok).toBe(false);
    if (!small.ok) {
      expect(small.errorCode).toBe('too-small');
      expect(small.error).toContain(`${MIN_LOGO_DIMENSION}×${MIN_LOGO_DIMENSION}`);
    }

    stubImage({ width: 64, height: MAX_LOGO_DIMENSION + 1 });
    const large = await readLogoFile(fakeFile(), 'en');
    expect(large.ok).toBe(false);
    if (!large.ok) {
      expect(large.errorCode).toBe('too-large-dimensions');
      expect(large.error).toContain(`${MAX_LOGO_DIMENSION}×${MAX_LOGO_DIMENSION} pixels`);
    }
  });

  it('geçerli görselde logoyu döndürür', async () => {
    stubFileReader('load');
    stubImage({ width: 64, height: 48 });
    const result = await readLogoFile(fakeFile());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.logo.fileName).toBe('logo.png');
      expect(result.logo.width).toBe(64);
      expect(result.logo.height).toBe(48);
      expect(result.logo.dataUrl).toMatch(/^data:image\/png/);
    }
  });
});

describe('localizeLogoError', () => {
  it('tanımdan iki dilde mesaj üretir', () => {
    expect(localizeLogoError({ code: 'unsupported-type' }, 'tr')).toMatch(/PNG, JPEG/);
    expect(localizeLogoError({ code: 'unsupported-type' }, 'en')).toBe(
      'You can only upload PNG, JPEG, or WebP files.',
    );
    expect(
      localizeLogoError({ code: 'too-small', params: { min: MIN_LOGO_DIMENSION } }, 'en'),
    ).toBe(`The logo must be at least ${MIN_LOGO_DIMENSION}×${MIN_LOGO_DIMENSION} pixels.`);
  });

  it('okuma sonucundan mesajı çevirir', async () => {
    const result = await readLogoFile(fakeFile({ type: 'image/svg+xml' }), 'tr');
    expect(localizeLogoError(result, 'en')).toBe('You can only upload PNG, JPEG, or WebP files.');
    expect(localizeLogoError(result, 'tr')).toBe('Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz.');
  });

  it('bilinen eski usul metni eşler, bilinmeyeni olduğu gibi bırakır', () => {
    expect(localizeLogoError('Dosya boş görünüyor.', 'en')).toBe('The file looks empty.');
    expect(localizeLogoError('özel bir hata', 'en')).toBe('özel bir hata');
  });

  it('bozuk/eksik girdide asla fırlatmaz, genel hata döner', () => {
    type LogoErrorInput = Parameters<typeof localizeLogoError>[0];
    const invalid = [
      null,
      undefined,
      42,
      {},
      { code: 'bilinmeyen' },
      { ok: false, errorCode: 'bilinmeyen' },
      { ok: false, error: 'bilinen değil' },
    ] as unknown as LogoErrorInput[];

    for (const value of invalid) {
      expect(() => localizeLogoError(value, 'en')).not.toThrow();
    }
    expect(localizeLogoError({ code: 'bilinmeyen' } as unknown as LogoErrorInput, 'en')).toBe(
      'The logo could not be loaded.',
    );
    expect(localizeLogoError(null as unknown as LogoErrorInput, 'tr')).toBe('Logo yüklenemedi.');
  });

  it('bozuk sonuçtaki bilinen eski usul metni eşler', () => {
    type LogoErrorInput = Parameters<typeof localizeLogoError>[0];
    const malformed = {
      ok: false,
      errorCode: 'bilinmeyen',
      error: 'Dosya boş görünüyor.',
    } as unknown as LogoErrorInput;
    expect(localizeLogoError(malformed, 'en')).toBe('The file looks empty.');
  });
});

describe('formatBytes', () => {
  it('birimleri korur ve dil parametresini kabul eder', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(MAX_LOGO_BYTES, 'en')).toBe('2.0 MB');
    expect(formatBytes(MAX_LOGO_BYTES, 'tr')).toBe('2.0 MB');
  });
});
