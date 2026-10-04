import { describe, expect, it } from 'vitest';
import { circlePath, eyeInnerPath, eyeOuterRingPath, modulePath, roundedRectPath } from './shapes';
import type { DotType, EyeInnerType, EyeOuterType } from './types';

const DOT_STYLES: DotType[] = [
  'square',
  'rounded',
  'extra-rounded',
  'dots',
  'classy',
  'classy-rounded',
  'diamond',
];

const EYE_STYLES: Array<EyeOuterType & EyeInnerType> = ['square', 'rounded', 'dot'];

describe('modulePath', () => {
  it('her stil kapalı bir yol üretir', () => {
    for (const style of DOT_STYLES) {
      const d = modulePath(style, 10, 20, 8);
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
      expect(d.length).toBeGreaterThan(10);
    }
  });

  it('kare tam modülü kaplar', () => {
    expect(modulePath('square', 0, 0, 10)).toBe('M0,0H10V10H0Z');
  });

  it('nokta stilinde yay komutu kullanılır', () => {
    expect(modulePath('dots', 0, 0, 10)).toContain('A');
  });

  it('elmas dört köşe noktası çizer', () => {
    expect(modulePath('diamond', 0, 0, 10).match(/L/g)).toHaveLength(3);
  });
});

describe('eyeOuterRingPath', () => {
  it('halka iki alt yol içerir (evenodd delik)', () => {
    for (const style of EYE_STYLES) {
      const d = eyeOuterRingPath(style, 0, 0, 10);
      expect(d.match(/M/g)).toHaveLength(2);
    }
  });

  it('kare halka 7m dış kutu ve 5m delik kullanır', () => {
    const d = eyeOuterRingPath('square', 0, 0, 10);
    expect(d).toContain('M0,0H70V70H0Z');
    expect(d).toContain('M10,10H60V60H10Z');
  });

  it('daire stili 3.5m ve 2.5m yarıçap kullanır', () => {
    const d = eyeOuterRingPath('dot', 0, 0, 10);
    expect(d).toContain('A35,35');
    expect(d).toContain('A25,25');
  });
});

describe('eyeInnerPath', () => {
  it('göz şekilleri 3m kutuda kalır', () => {
    for (const style of EYE_STYLES) {
      const d = eyeInnerPath(style, 0, 0, 10);
      expect(d.startsWith('M')).toBe(true);
      expect(d.endsWith('Z')).toBe(true);
    }
  });

  it('kare göz 3m kenar uzunluğundadır', () => {
    expect(eyeInnerPath('square', 0, 0, 10)).toBe('M0,0H30V30H0Z');
  });

  it('daire göz 1.5m yarıçap kullanır', () => {
    expect(eyeInnerPath('dot', 0, 0, 10)).toContain('A15,15');
  });
});

describe('yardımcı yollar', () => {
  it('daire yolu iki yay ile çizilir', () => {
    expect(circlePath(5, 5, 4).match(/A/g)).toHaveLength(2);
  });

  it('yarıçaplar yarı boyuta kırpılır', () => {
    const d = roundedRectPath(0, 0, 10, 10, [50, 50, 50, 50]);
    expect(d).toContain('A5,5');
  });

  it('sıfır yarıçap temiz dikdörtgen yolu üretir', () => {
    const d = roundedRectPath(0, 0, 10, 10, [0, 0, 0, 0]);
    expect(d).toBe('M0,0H10V10H0Z');
  });

  it('küçük yarıçaplar yay komutu kullanır', () => {
    const d = roundedRectPath(0, 0, 10, 10, [0.02, 0, 0, 0]);
    expect(d).toContain('A0.02,0.02');
  });
});
