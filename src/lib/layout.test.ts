import { describe, expect, it } from 'vitest';
import { computeRailMetrics, fitArtwork, RAIL_MAX_HEIGHT } from './layout';

describe('computeRailMetrics', () => {
  it('üst çubuğun altından başlar ve viewport altına güvenlik boşluğu bırakır', () => {
    expect(computeRailMetrics({ headerBottom: 65, containerBottom: 5000, viewportHeight: 900 })).toEqual({
      top: 77,
      height: 811,
    });
  });

  it('kapsayıcı bloğu viewport altından önce bitiyorsa ona göre kısalır', () => {
    expect(computeRailMetrics({ headerBottom: 65, containerBottom: 500, viewportHeight: 900 })).toEqual({
      top: 77,
      height: 423,
    });
  });

  it('altbilgiye yaklaşınca üst çubuğun altına kaymaz, yalnızca kısalır', () => {
    const early = computeRailMetrics({ headerBottom: 65, containerBottom: 800, viewportHeight: 600 });
    const late = computeRailMetrics({ headerBottom: 65, containerBottom: 400, viewportHeight: 600 });
    expect(early.top).toBe(77);
    expect(late.top).toBe(77);
    expect(early.height).toBe(511);
    // min(viewportBottom − gap, containerBottom) − top = min(588, 400) − 77
    expect(late.height).toBe(323);
  });

  it('çok uzun ekranlarda tavanı aşmaz', () => {
    expect(
      computeRailMetrics({ headerBottom: 65, containerBottom: 5000, viewportHeight: 3000 }).height,
    ).toBe(RAIL_MAX_HEIGHT);
  });

  it('negatif/yetersiz alanda 0 döner ve taşmaz', () => {
    expect(computeRailMetrics({ headerBottom: 200, containerBottom: 100, viewportHeight: 150 })).toEqual({
      top: 212,
      height: 0,
    });
  });
});

describe('fitArtwork', () => {
  it('kare eseri genişlikle sınırlıyorsa genişliğe sığdırır', () => {
    expect(fitArtwork({ containerWidth: 400, containerHeight: 600, sceneWidth: 300, sceneHeight: 300 })).toEqual({
      width: 400,
      height: 400,
      scale: 400 / 300,
    });
  });

  it('dikey eseri yükseklikle sınırlıyorsa yüksekliğe sığdırır ve oranı korur', () => {
    const fit = fitArtwork({ containerWidth: 400, containerHeight: 300, sceneWidth: 300, sceneHeight: 450 });
    expect(fit).not.toBeNull();
    expect(fit!.height).toBe(300);
    expect(fit!.width).toBe(200);
    expect(fit!.width / fit!.height).toBeCloseTo(300 / 450, 5);
  });

  it('sahne dolgusunu her iki kenardan düşer', () => {
    const fit = fitArtwork({
      containerWidth: 300,
      containerHeight: 300,
      sceneWidth: 100,
      sceneHeight: 100,
      inset: 25,
    });
    expect(fit!.width).toBe(250);
    expect(fit!.height).toBe(250);
  });

  it('geçersiz girdide null döner', () => {
    expect(fitArtwork({ containerWidth: 0, containerHeight: 100, sceneWidth: 100, sceneHeight: 100 })).toBeNull();
    expect(fitArtwork({ containerWidth: 100, containerHeight: 100, sceneWidth: 0, sceneHeight: 100 })).toBeNull();
    expect(
      fitArtwork({ containerWidth: 100, containerHeight: 100, sceneWidth: 100, sceneHeight: 100, inset: 60 }),
    ).toBeNull();
  });
});
