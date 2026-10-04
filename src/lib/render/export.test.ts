import { describe, expect, it } from 'vitest';
import { buildFileName } from './export';

describe('buildFileName', () => {
  it('QRtisan marka ön ekiyle PNG dosya adı üretir', () => {
    const date = new Date(2026, 9, 4, 9, 5);
    expect(buildFileName('qrtisan-qr', 'png', date)).toBe('qrtisan-qr-20261004-0905.png');
  });

  it('SVG uzantısında ay ve saat/dakika sıfır dolgusunu korur', () => {
    const date = new Date(2026, 0, 9, 8, 7);
    expect(buildFileName('qrtisan-qr', 'svg', date)).toBe('qrtisan-qr-20260109-0807.svg');
  });

  it('dosya adına QR yükü veya gizli içerik bilgisi koymaz', () => {
    const date = new Date(2026, 9, 4, 23, 59);
    const name = buildFileName('qrtisan-qr', 'png', date);
    expect(name).toBe('qrtisan-qr-20261004-2359.png');
    expect(name).not.toMatch(/https?|wifi|mailto/i);
  });
});
