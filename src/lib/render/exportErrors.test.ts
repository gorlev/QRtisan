import { describe, expect, it } from 'vitest';
import { localizeExportError } from './exportErrors';

describe('localizeExportError', () => {
  it('bilinen PNG/tuval/Path2D hatalarını doğal TR/EN metne eşler', () => {
    expect(localizeExportError(new Error('PNG üretilemedi.'), 'en')).toBe(
      'Could not generate the PNG file.',
    );
    expect(localizeExportError(new Error('PNG üretilemedi.'), 'tr')).toBe('PNG üretilemedi.');
    expect(localizeExportError('Tuval oluşturulamadı.', 'en')).toBe(
      'Could not create the export canvas.',
    );
    expect(localizeExportError('Tuval oluşturulamadı.', 'tr')).toBe('Tuval oluşturulamadı.');
    expect(localizeExportError(new Error('Path2D desteklenmiyor.'), 'en')).toBe(
      'This browser cannot render the export.',
    );
    expect(localizeExportError(new Error('Path2D desteklenmiyor.'), 'tr')).toBe(
      'Bu tarayıcı dışa aktarmayı çizemiyor.',
    );
  });

  it('bilinmeyen hatalarda ham mesajı sızdırmadan güvenli genel mesaj döner', () => {
    const secret = 'TypeError: cannot read properties of undefined at foo.ts:42';
    const en = localizeExportError(new Error(secret), 'en');
    const tr = localizeExportError(new Error(secret), 'tr');
    expect(en).toBe('Export failed. Please try again.');
    expect(tr).toBe('Dışa aktarma tamamlanamadı; lütfen tekrar deneyin.');
    expect(en).not.toContain(secret);
    expect(tr).not.toContain(secret);
    expect(en).not.toContain('TypeError');
  });

  it('null/undefined/boş/ilgisiz girdide güvenli yerelleştirilmiş mesaj döner', () => {
    for (const input of [null, undefined, {}, 0, '', ['x']] as unknown[]) {
      expect(localizeExportError(input, 'en')).toBe('Export failed. Please try again.');
      expect(localizeExportError(input, 'tr')).toBe('Dışa aktarma tamamlanamadı; lütfen tekrar deneyin.');
    }
  });

  it('bilinen logo hazır mesajını da yerelleştirir', () => {
    expect(localizeExportError('Logo henüz hazır değil.', 'en')).toBe('The logo is not ready yet.');
    expect(localizeExportError('The logo is not ready yet.', 'tr')).toBe('Logo henüz hazır değil.');
  });
});
