import { describe, expect, it } from 'vitest';
import { collectWarnings, type WarningInput } from './warnings';
import { makeDesign } from '../test/harness';

function input(overrides: Partial<WarningInput> = {}): WarningInput {
  return {
    design: makeDesign(),
    fg: '#252338',
    bg: '#FFFFFF',
    contrast: 15,
    payloadLength: 40,
    matrixSize: 33,
    logoBoxRatio: 0,
    captionLength: 0,
    ...overrides,
  };
}

const ids = (warnings: ReturnType<typeof collectWarnings>) => warnings.map((warning) => warning.id);

describe('collectWarnings', () => {
  it('temiz tasarımda uyarı üretmez', () => {
    expect(collectWarnings(input())).toHaveLength(0);
  });

  it('düşük kontrastı hata olarak işaretler', () => {
    const warnings = collectWarnings(input({ contrast: 2.1 }));
    expect(ids(warnings)).toContain('contrast-low');
    expect(warnings[0].severity).toBe('danger');
  });

  it('sınırda kontrastı uyarı olarak işaretler', () => {
    expect(ids(collectWarnings(input({ contrast: 3.8 })))).toContain('contrast-borderline');
  });

  it('ters renkleri uyarır', () => {
    const warnings = collectWarnings(
      input({ design: makeDesign({ fg: '#FFFFFF', bg: '#252338' }), fg: '#FFFFFF', bg: '#252338' }),
    );
    expect(ids(warnings)).toContain('inverted');
  });

  it('şeffaf zeminde bilgi verir', () => {
    const warnings = collectWarnings(input({ design: makeDesign({ transparentBg: true }) }));
    expect(ids(warnings)).toContain('transparent-bg');
  });

  it('logoda H seviyesini ve büyük logoyu bildirir', () => {
    const design = makeDesign({
      logo: {
        dataUrl: 'data:image/png;base64,xx',
        fileName: 'logo.png',
        width: 128,
        height: 128,
        size: 0.3,
        padding: 0.035,
        clearModules: true,
      },
    });
    const warnings = collectWarnings(input({ design, logoBoxRatio: 0.3 }));
    expect(ids(warnings)).toContain('logo-ec');
    expect(ids(warnings)).toContain('logo-large');
  });

  it('yoğun matrisi uyarır', () => {
    expect(ids(collectWarnings(input({ matrixSize: 77 })))).toContain('density-high');
    expect(ids(collectWarnings(input({ matrixSize: 57 })))).toContain('density-medium');
  });

  it('dar sessiz alanı uyarır', () => {
    expect(ids(collectWarnings(input({ design: makeDesign({ quietZone: 2 }) })))).toContain('quiet-zone');
  });

  it('sessiz alan ayrıntısını sayıya göre doğal İngilizceyle üretir', () => {
    const detailAt = (quietZone: number) =>
      collectWarnings(input({ design: makeDesign({ quietZone }) }), 'en').find(
        (warning) => warning.id === 'quiet-zone',
      )?.detail;

    expect(detailAt(0)).toBe(
      'There is no clear space around this QR. At least 4 modules are recommended for readers.',
    );
    expect(detailAt(1)).toBe(
      'There is only 1 module of empty space around the QR. At least 4 modules are recommended for readers.',
    );
    expect(detailAt(2)).toBe(
      'There are only 2 modules of empty space around the QR. At least 4 modules are recommended for readers.',
    );
  });

  it('uzun içerik ve etiketi bildirir', () => {
    const warnings = collectWarnings(input({ payloadLength: 1000, captionLength: 50 }));
    expect(ids(warnings)).toContain('payload-long');
    expect(ids(warnings)).toContain('caption-long');
  });

  it('yoğun içerikte yuvarlak modülleri bilgilendirir', () => {
    const warnings = collectWarnings(
      input({ design: makeDesign({ dot: 'dots' }), matrixSize: 57 }),
    );
    expect(ids(warnings)).toContain('dot-style-dense');
  });

  it('otomatik hata düzeltme düşürüldüğünde bilgilendirir', () => {
    const warnings = collectWarnings(
      input({ autoDowngraded: { requested: 'H', used: 'Q' } }),
    );
    expect(ids(warnings)).toContain('auto-downgraded');
    const downgrade = warnings.find((warning) => warning.id === 'auto-downgraded');
    expect(downgrade?.severity).toBe('info');
    expect(downgrade?.detail).toContain('H');
    expect(downgrade?.detail).toContain('Q');
  });

  it('düşürme yoksa düşürme uyarısı üretmez', () => {
    expect(ids(collectWarnings(input()))).not.toContain('auto-downgraded');
  });
});

describe('collectWarnings yerelleştirme', () => {
  it('kimlik ve önem derecelerini dilden bağımsız sabit tutar', () => {
    const cases: Partial<WarningInput>[] = [
      { contrast: 2.1 },
      { contrast: 3.8 },
      { design: makeDesign({ transparentBg: true }) },
      { design: makeDesign({ quietZone: 2 }) },
      { matrixSize: 77 },
      { payloadLength: 1000, captionLength: 50 },
      { autoDowngraded: { requested: 'H', used: 'Q' } },
    ];
    for (const overrides of cases) {
      const tr = collectWarnings(input(overrides));
      const en = collectWarnings(input(overrides), 'en');
      expect(en.map((warning) => [warning.id, warning.severity])).toEqual(
        tr.map((warning) => [warning.id, warning.severity]),
      );
      expect(en.length).toBeGreaterThan(0);
      expect(en.map((warning) => warning.title)).not.toEqual(tr.map((warning) => warning.title));
    }
  });

  it('başlık ve ayrıntıları İngilizce üretir', () => {
    const en = collectWarnings(input({ contrast: 2.1, payloadLength: 1000, captionLength: 50 }), 'en');
    const low = en.find((warning) => warning.id === 'contrast-low');
    expect(low?.title).toBe('Contrast is too low');
    expect(low?.detail).toContain('2.1:1');
    expect(low?.detail).toContain('4.5:1');
    expect(en.find((warning) => warning.id === 'payload-long')?.detail).toContain('1000 characters');
    expect(en.find((warning) => warning.id === 'caption-long')?.title).toBe('Caption is long');
  });

  it('sayısal birimleri yerelleştirir', () => {
    const en = collectWarnings(input({ matrixSize: 77, design: makeDesign({ quietZone: 2 }) }), 'en');
    expect(en.find((warning) => warning.id === 'density-high')?.detail).toContain('77×77 modules');
    expect(en.find((warning) => warning.id === 'density-high')?.detail).toContain('Version 15');
    expect(en.find((warning) => warning.id === 'quiet-zone')?.detail).toContain('At least 4 modules');

    const tr = collectWarnings(input({ matrixSize: 77, design: makeDesign({ quietZone: 2 }) }));
    expect(tr.find((warning) => warning.id === 'density-high')?.detail).toContain('modül');
    expect(tr.find((warning) => warning.id === 'quiet-zone')?.detail).toContain('modül');
  });

  it('otomatik düşürme ayrıntısını seviyeleri koruyarak çevirir', () => {
    const en = collectWarnings(input({ autoDowngraded: { requested: 'H', used: 'Q' } }), 'en');
    const downgrade = en.find((warning) => warning.id === 'auto-downgraded');
    expect(downgrade?.detail).toContain('level H');
    expect(downgrade?.detail).toContain('level Q');
  });

  it('logo uyarılarını İngilizce üretir', () => {
    const design = makeDesign({
      logo: {
        dataUrl: 'data:image/png;base64,xx',
        fileName: 'logo.png',
        width: 128,
        height: 128,
        size: 0.3,
        padding: 0.035,
        clearModules: true,
      },
    });
    const en = collectWarnings(input({ design, logoBoxRatio: 0.3 }), 'en');
    expect(en.find((warning) => warning.id === 'logo-ec')?.detail).toContain('30%');
    expect(en.find((warning) => warning.id === 'logo-large')?.detail).toContain('30% of the QR width');
  });
});
