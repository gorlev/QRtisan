/**
 * Kapasite ve hata düzeltme çözümü testleri.
 *
 * QR kapasitesi **bayt** cinsindendir; çok baytlı içerik (Türkçe, emoji, CJK)
 * karakter sayısından bağımsız olarak daha hızlı dolar. Bu testler taşma
 * durumunun sessizce yutulmadığını ve otomatik seviyenin güvenli biçimde
 * düşürüldüğünü doğrular.
 */

import { describe, expect, it } from 'vitest';
import { utf8ByteLength } from './content';
import { ERROR_LEVEL_ORDER, createMatrixResult, resolveErrorLevel, resolveMatrix } from './qr';
import type { LogoState } from './types';
import { makeDesign } from '../test/harness';

const LOGO: LogoState = {
  dataUrl: 'data:image/png;base64,AAAA',
  fileName: 'logo.png',
  width: 64,
  height: 64,
  size: 0.22,
  padding: 0.03,
  clearModules: true,
};

// 637 × 'ü' = 1274 bayt → H kapasitesinin (1273) hemen üstü, Q (1663) altı.
const HEAVY_TURKISH = 'ü'.repeat(637);

describe('resolveErrorLevel', () => {
  it('uzunluğa göre otomatik seviye seçer', () => {
    expect(resolveErrorLevel(makeDesign(), 100)).toBe('M');
    expect(resolveErrorLevel(makeDesign(), 300)).toBe('Q');
    expect(resolveErrorLevel(makeDesign(), 600)).toBe('H');
  });

  it('kullanıcı seçimini ve logo kilidini korur', () => {
    expect(resolveErrorLevel(makeDesign({ errorLevel: 'L' }), 600)).toBe('L');
    expect(resolveErrorLevel(makeDesign({ logo: LOGO }), 10)).toBe('H');
  });
});

describe('createMatrixResult', () => {
  it('sığmayan çok baytlı içerikte eylem çağrısı döner', () => {
    const result = createMatrixResult(HEAVY_TURKISH, 'H');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('too-long');
      expect(result.message).toMatch(/sığmıyor/);
      expect(result.message).toContain('1274');
    }
  });

  it('boş içerikte "empty" döner', () => {
    const result = createMatrixResult('', 'M');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('empty');
  });

  it('sığan içerikte matris ve seviye döner', () => {
    const result = createMatrixResult('merhaba', 'M');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.level).toBe('M');
      expect(result.matrix.size).toBeGreaterThanOrEqual(21);
    }
  });
});

describe('resolveMatrix', () => {
  it('otomatik seçimde sığan en yüksek seviyeye düşürür ve not verir', () => {
    const resolved = resolveMatrix(HEAVY_TURKISH, makeDesign());
    expect(resolved.matrix).not.toBeNull();
    expect(resolved.requestedLevel).toBe('H');
    expect(resolved.level).toBe('Q');
    expect(resolved.downgraded).toBe(true);
    expect(resolved.note).toMatch(/H seviyesine sığmadı/);
    expect(resolved.error).toBeNull();
  });

  it('700 × ü de otomatik seviyede üretilir', () => {
    const resolved = resolveMatrix('ü'.repeat(700), makeDesign());
    expect(resolved.matrix).not.toBeNull();
    expect(resolved.downgraded).toBe(true);
  });

  it('logo varken H kilitlidir; aşımda logoyu kaldırmayı önerir', () => {
    const resolved = resolveMatrix(HEAVY_TURKISH, makeDesign({ logo: LOGO }));
    expect(resolved.matrix).toBeNull();
    expect(resolved.downgraded).toBe(false);
    expect(resolved.error).toMatch(/logoyu kaldırın/);
  });

  it('kullanıcı seviye seçtiyse otomatik düşürme yapmaz', () => {
    const resolved = resolveMatrix(HEAVY_TURKISH, makeDesign({ errorLevel: 'H' }));
    expect(resolved.matrix).toBeNull();
    expect(resolved.error).toMatch(/daha düşük bir hata düzeltme seviyesi/);
  });

  it('hiçbir seviyeye sığmayan içerikte net hata verir (emoji/CJK)', () => {
    const cjk = '中'.repeat(1200); // 3600 bayt > L kapasitesi (2953)
    expect(utf8ByteLength(cjk)).toBe(3600);
    const resolved = resolveMatrix(cjk, makeDesign());
    expect(resolved.matrix).toBeNull();
    expect(resolved.error).toMatch(/sığmıyor/);
    expect(resolved.error).toContain('3600');
  });

  it('1200 ASCII karakter otomatik H ile üretilir (düşürme yok)', () => {
    const resolved = resolveMatrix('a'.repeat(1200), makeDesign());
    expect(resolved.matrix).not.toBeNull();
    expect(resolved.level).toBe('H');
    expect(resolved.downgraded).toBe(false);
  });

  it('boş içerikte hata üretmez', () => {
    const resolved = resolveMatrix('', makeDesign());
    expect(resolved.matrix).toBeNull();
    expect(resolved.error).toBeNull();
    expect(resolved.note).toBeNull();
  });

  it('seviye sırası güçlüden zayıfa tanımlıdır', () => {
    expect(ERROR_LEVEL_ORDER).toEqual(['H', 'Q', 'M', 'L']);
  });
});

describe('yerelleştirilmiş matris mesajları', () => {
  it('boş ve sığmayan içerik mesajlarını İngilizce üretir', () => {
    const empty = createMatrixResult('', 'M', 'en');
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.reason).toBe('empty');
      expect(empty.message).toBe('Enter content to generate a QR code.');
    }

    const heavy = createMatrixResult(HEAVY_TURKISH, 'H', 'en');
    expect(heavy.ok).toBe(false);
    if (!heavy.ok) {
      expect(heavy.reason).toBe('too-long');
      expect(heavy.message).toContain('1274 bytes');
      expect(heavy.message).toMatch(/doesn't fit/);
    }
  });

  it('matris ve seviyeler dilden bağımsız aynıdır', () => {
    const tr = resolveMatrix(HEAVY_TURKISH, makeDesign(), 'tr');
    const en = resolveMatrix(HEAVY_TURKISH, makeDesign(), 'en');
    expect(tr.matrix).not.toBeNull();
    expect(en.matrix).not.toBeNull();
    if (tr.matrix && en.matrix) {
      expect(en.matrix.size).toBe(tr.matrix.size);
      expect(Array.from(en.matrix.data)).toEqual(Array.from(tr.matrix.data));
    }
    expect(en.level).toBe(tr.level);
    expect(en.requestedLevel).toBe(tr.requestedLevel);
    expect(en.downgraded).toBe(tr.downgraded);
    expect(en.note).toMatch(/lowered to Q/);
    expect(tr.note).toMatch(/düşürüldü/);
  });

  it('kilitli seviye hatalarını İngilizce üretir', () => {
    const logo = resolveMatrix(HEAVY_TURKISH, makeDesign({ logo: LOGO }), 'en');
    expect(logo.error).toMatch(/remove the logo/);
    expect(logo.error).toContain('H');

    const user = resolveMatrix(HEAVY_TURKISH, makeDesign({ errorLevel: 'H' }), 'en');
    expect(user.error).toMatch(/lower error correction level/);
  });

  it('hiçbir seviyeye sığmayan içerikte İngilizce bayt bilgisi verir', () => {
    const resolved = resolveMatrix('中'.repeat(1200), makeDesign(), 'en');
    expect(resolved.matrix).toBeNull();
    expect(resolved.error).toContain('3600 bytes');
    expect(resolved.error).toMatch(/doesn't fit/);
  });
});
