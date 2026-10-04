import { describe, expect, it, vi } from 'vitest';
import {
  applyThemeToDocument,
  isThemePreference,
  prefersDarkScheme,
  readStoredPreference,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  writeStoredPreference,
} from './theme';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      map.set(key, value);
    }),
    map,
  };
}

function fakeDocument() {
  const attributes = new Map<string, string>();
  const meta = { content: '', setAttribute: vi.fn((_name: string, value: string) => (meta.content = value)) };
  const root = {
    style: { colorScheme: '' },
    setAttribute: vi.fn((name: string, value: string) => attributes.set(name, value)),
  };
  return {
    documentElement: root,
    querySelector: vi.fn((selector: string) => (selector === 'meta[name="theme-color"]' ? meta : null)),
    attributes,
    meta,
  };
}

describe('isThemePreference', () => {
  it('yalnızca üç geçerli değeri kabul eder', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('auto')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(1)).toBe(false);
  });
});

describe('readStoredPreference / writeStoredPreference', () => {
  it('kayıtlı geçerli tercihi okur', () => {
    const storage = fakeStorage({ [THEME_STORAGE_KEY]: 'dark' });
    expect(readStoredPreference(storage)).toBe('dark');
  });

  it('eksik veya bozuk değerde system varsayılanına döner', () => {
    expect(readStoredPreference(fakeStorage())).toBe('system');
    expect(readStoredPreference(fakeStorage({ [THEME_STORAGE_KEY]: 'neon' }))).toBe('system');
  });

  it('depolama yoksa veya hata verirse güvenli davranır', () => {
    expect(readStoredPreference(null)).toBe('system');
    const throwing = {
      getItem: vi.fn(() => {
        throw new Error('blocked');
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked');
      }),
    };
    expect(readStoredPreference(throwing)).toBe('system');
    expect(() => writeStoredPreference('dark', throwing)).not.toThrow();
  });

  it('yalnızca tercih anahtarını yazar', () => {
    const storage = fakeStorage();
    writeStoredPreference('light', storage);
    expect(storage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
    expect([...storage.map.keys()]).toEqual([THEME_STORAGE_KEY]);
  });
});

describe('resolveTheme', () => {
  it('system tercihinde işletim sistemini izler', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('açık tercih işletim sistemini yok sayar', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('prefersDarkScheme', () => {
  it('matchMedia sonucunu döndürür', () => {
    expect(prefersDarkScheme({ matchMedia: () => ({ matches: true }) as MediaQueryList })).toBe(true);
    expect(prefersDarkScheme({ matchMedia: () => ({ matches: false }) as MediaQueryList })).toBe(false);
  });

  it('eksik veya hatalı matchMedia\'da açık tema varsayar', () => {
    expect(prefersDarkScheme(null)).toBe(false);
    expect(
      prefersDarkScheme({
        matchMedia: () => {
          throw new Error('unsupported');
        },
      }),
    ).toBe(false);
  });
});

describe('applyThemeToDocument', () => {
  it('data-theme, tercih, color-scheme ve meta rengini uygular', () => {
    const doc = fakeDocument();
    applyThemeToDocument('system', 'dark', doc as unknown as Document);
    expect(doc.attributes.get('data-theme')).toBe('dark');
    expect(doc.attributes.get('data-theme-preference')).toBe('system');
    expect(doc.documentElement.style.colorScheme).toBe('dark');
    expect(doc.meta.content).toBe(THEME_COLORS.dark);
  });

  it('belge yoksa sessizce döner', () => {
    expect(() => applyThemeToDocument('light', 'light', null)).not.toThrow();
  });
});
