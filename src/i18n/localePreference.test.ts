import { describe, expect, it, vi } from 'vitest';
import {
  detectPreferredLocale,
  LOCALE_STORAGE_KEY,
  matchLocaleTag,
  readStoredLocalePreference,
  resolveInitialLocale,
  SYSTEM_FALLBACK_LOCALE,
  writeStoredLocalePreference,
} from './localePreference';

/** Basit bellek içi depolama — gerçek localStorage davranışını taklit eder. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    dump: () => Object.fromEntries(data),
  };
}

describe('matchLocaleTag', () => {
  it('birincil dili büyük/küçük harf duyarsız eşler', () => {
    expect(matchLocaleTag('tr-TR')).toBe('tr');
    expect(matchLocaleTag('TR')).toBe('tr');
    expect(matchLocaleTag('tr_TR')).toBe('tr');
    expect(matchLocaleTag('en-GB')).toBe('en');
    expect(matchLocaleTag('EN-us')).toBe('en');
    expect(matchLocaleTag(' tr-TR ')).toBe('tr');
  });

  it('desteklenmeyen ve geçersiz etiketlerde null döner', () => {
    expect(matchLocaleTag('de-DE')).toBe(null);
    expect(matchLocaleTag('')).toBe(null);
    expect(matchLocaleTag('trx')).toBe(null);
    expect(matchLocaleTag(null)).toBe(null);
    expect(matchLocaleTag(undefined)).toBe(null);
    expect(matchLocaleTag(42)).toBe(null);
  });
});

describe('detectPreferredLocale', () => {
  it('navigator.languages öncelik sırasındaki ilk desteklenen dili seçer', () => {
    expect(detectPreferredLocale({ languages: ['tr-TR', 'en-GB'] })).toBe('tr');
    expect(detectPreferredLocale({ languages: ['en-GB', 'tr-TR'] })).toBe('en');
    expect(detectPreferredLocale({ languages: ['de-DE', 'fr-FR', 'en-US'] })).toBe('en');
    expect(detectPreferredLocale({ languages: ['de-DE', 'TR-tr'] })).toBe('tr');
  });

  it('liste dolu ama hiçbiri desteklenmiyorsa İngilizceye düşer', () => {
    expect(detectPreferredLocale({ languages: ['de-DE', 'fr-FR'] })).toBe('en');
    // `language` yedeği yalnızca `languages` boşken kullanılır.
    expect(detectPreferredLocale({ languages: ['de-DE'], language: 'tr-TR' })).toBe('en');
  });

  it('languages boş/eksikse navigator.language yedeğini kullanır', () => {
    expect(detectPreferredLocale({ languages: [], language: 'tr-TR' })).toBe('tr');
    expect(detectPreferredLocale({ languages: undefined, language: 'en-GB' })).toBe('en');
    expect(detectPreferredLocale({ language: 'TR' })).toBe('tr');
  });

  it('hiçbir sistem bilgisi yoksa İngilizceye düşer', () => {
    expect(detectPreferredLocale(null)).toBe(SYSTEM_FALLBACK_LOCALE);
    expect(detectPreferredLocale(undefined)).toBe('en');
    expect(detectPreferredLocale({})).toBe('en');
    expect(detectPreferredLocale({ languages: [], language: 'de-DE' })).toBe('en');
    expect(detectPreferredLocale({ languages: [], language: null })).toBe('en');
  });
});

describe('readStoredLocalePreference', () => {
  it('yalnızca geçerli açık tercihi döndürür', () => {
    expect(readStoredLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'tr' }))).toBe('tr');
    expect(readStoredLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'en' }))).toBe('en');
  });

  it('eksik veya geçersiz değerleri yok sayar', () => {
    expect(readStoredLocalePreference(memoryStorage())).toBe(null);
    expect(readStoredLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'de' }))).toBe(null);
    expect(readStoredLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: '' }))).toBe(null);
    expect(readStoredLocalePreference(memoryStorage({ [LOCALE_STORAGE_KEY]: 'TR' }))).toBe(null);
  });

  it('depolama yoksa veya erişim engelliyse null döner', () => {
    expect(readStoredLocalePreference(null)).toBe(null);
    expect(readStoredLocalePreference(undefined)).toBe(null);
    expect(
      readStoredLocalePreference({
        getItem: vi.fn(() => {
          throw new Error('blocked');
        }),
      }),
    ).toBe(null);
  });
});

describe('writeStoredLocalePreference', () => {
  it('açık tercihi depoya yazar', () => {
    const storage = memoryStorage();
    writeStoredLocalePreference(storage, 'en');
    expect(storage.dump()).toEqual({ [LOCALE_STORAGE_KEY]: 'en' });
    writeStoredLocalePreference(storage, 'tr');
    expect(storage.dump()).toEqual({ [LOCALE_STORAGE_KEY]: 'tr' });
  });

  it('depolama engelliyse sessizce vazgeçer', () => {
    expect(() =>
      writeStoredLocalePreference(
        {
          setItem: vi.fn(() => {
            throw new Error('quota');
          }),
        },
        'tr',
      ),
    ).not.toThrow();
    expect(() => writeStoredLocalePreference(null, 'tr')).not.toThrow();
    expect(() => writeStoredLocalePreference(undefined, 'en')).not.toThrow();
  });
});

describe('resolveInitialLocale', () => {
  it('kayıtlı geçerli tercih sistemi geçersiz kılar', () => {
    expect(
      resolveInitialLocale({
        storage: memoryStorage({ [LOCALE_STORAGE_KEY]: 'en' }),
        navigator: { languages: ['tr-TR'] },
      }),
    ).toEqual({ locale: 'en', explicit: true });
    expect(
      resolveInitialLocale({
        storage: memoryStorage({ [LOCALE_STORAGE_KEY]: 'tr' }),
        navigator: { languages: ['en-US'] },
      }),
    ).toEqual({ locale: 'tr', explicit: true });
  });

  it('kayıt yoksa veya geçersizse sistem dilini çözer ve açık saymaz', () => {
    expect(
      resolveInitialLocale({
        storage: memoryStorage(),
        navigator: { languages: ['tr-TR'] },
      }),
    ).toEqual({ locale: 'tr', explicit: false });
    expect(
      resolveInitialLocale({
        storage: memoryStorage({ [LOCALE_STORAGE_KEY]: 'de' }),
        navigator: { languages: ['en-US'] },
      }),
    ).toEqual({ locale: 'en', explicit: false });
  });

  it('depolama engelliyken sistem diline düşer', () => {
    expect(
      resolveInitialLocale({
        storage: {
          getItem: () => {
            throw new Error('blocked');
          },
        },
        navigator: { languages: ['tr-TR'] },
      }),
    ).toEqual({ locale: 'tr', explicit: false });
  });

  it('sistem bilgisi yoksa (SSR) İngilizceye düşer', () => {
    expect(resolveInitialLocale(null)).toEqual({ locale: 'en', explicit: false });
    expect(resolveInitialLocale(undefined)).toEqual({ locale: 'en', explicit: false });
    expect(resolveInitialLocale({})).toEqual({ locale: 'en', explicit: false });
    expect(resolveInitialLocale({ navigator: null })).toEqual({ locale: 'en', explicit: false });
  });
});
