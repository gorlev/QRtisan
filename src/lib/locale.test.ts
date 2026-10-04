import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, isLocale, LOCALES, translate } from './locale';

describe('translate', () => {
  it('dile göre metin seçer', () => {
    expect(translate('tr', 'Merhaba', 'Hello')).toBe('Merhaba');
    expect(translate('en', 'Merhaba', 'Hello')).toBe('Hello');
  });
});

describe('isLocale', () => {
  it('yalnızca desteklenen dilleri kabul eder', () => {
    expect(isLocale('tr')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('varsayılan dil Türkçedir', () => {
    expect(DEFAULT_LOCALE).toBe('tr');
    expect(LOCALES).toEqual(['tr', 'en']);
  });
});
