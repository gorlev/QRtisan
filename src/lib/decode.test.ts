/**
 * Uçtan uca tarama testleri.
 *
 * Gerçek QR matrisi üretilir, sahne Canvas 2D ile PNG'ye çizilir (veya SVG
 * üretilip rasterleştirilir) ve bağımsız çözücülerle geri okunur:
 *
 * - ZXing (@zxing/library): telefon kameralarının çoğunun kullandığı motor.
 * - jsQR: daha katı bir çözücü.
 *
 * Her senaryoda ayrıca modül merkezleri QR matrisiyle karşılaştırılır; bu,
 * görüntünün doğru matristen üretildiğini piksel düzeyinde kanıtlar. Çözücü
 * motorlarının piksel hizalama/aliasing kaynaklı bilinen katılıkları nedeniyle
 * dekoratif şekillerde "en az bir çözücü okumalı", sade tasarımlarda
 * "her iki çözücü de okumalı" ölçütü uygulanır.
 */

import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { utf8ByteLength } from './content';
import { createMatrix, isDarkModule, resolveMatrix } from './qr';
import { createFallbackMeasureText } from './render/measure';
import { buildScene } from './render/scene';
import { sceneToSvg } from './render/svg';
import type { DesignState, DotType, ErrorLevel, EyeInnerType, EyeOuterType, FrameType } from './types';
import {
  countModuleCenterMismatches,
  decodePng,
  decodePngZxing,
  makeDesign,
  makeLogoInput,
  makeLogoPng,
  renderSceneToPng,
} from '../test/harness';

const measureText = createFallbackMeasureText();

const PAYLOADS: Record<string, string> = {
  url: 'https://example.com/qrtisan-qr?kaynak=test',
  text: 'Merhaba dünya — QRtisan testi 123',
  email: 'mailto:merhaba@example.com?subject=Deneme',
  wifi: 'WIFI:T:WPA;S:KafeMisafir;P:gizli123;;',
};

interface RoundTripOptions {
  width?: number;
  level?: ErrorLevel;
  withLogo?: boolean;
}

async function roundTrip(payload: string, design: DesignState, options: RoundTripOptions = {}) {
  const matrix = createMatrix(payload, options.level ?? 'M');
  expect(matrix).not.toBeNull();
  const logoPng = options.withLogo ? makeLogoPng() : null;
  const logo = logoPng ? makeLogoInput(logoPng) : null;
  const { scene, metrics } = buildScene({
    matrix: matrix!,
    outputWidth: options.width ?? 1024,
    design,
    logo: logo ? { href: logo.href, width: logo.width, height: logo.height } : null,
    measureText,
  });
  const rendered = await renderSceneToPng(scene, logo ? { [logo.href]: logo.buffer } : {});
  return {
    decodedZxing: decodePngZxing(rendered.buffer),
    decodedJsQr: decodePng(rendered.buffer),
    centerMismatches: countModuleCenterMismatches(rendered.buffer, matrix!, {
      moduleSize: metrics.moduleSize,
      quietZone: design.quietZone,
      qrX: metrics.qrX,
      qrY: metrics.qrY,
    }),
    scene,
    metrics,
    rendered,
    matrix: matrix!,
  };
}

type RoundTrip = Awaited<ReturnType<typeof roundTrip>>;

function expectAtLeastOneDecoder(result: RoundTrip, payload: string) {
  const js = result.decodedJsQr === payload;
  const zx = result.decodedZxing === payload;
  expect(js || zx, `jsQR=${js ? 'ok' : 'yok'} · ZXing=${zx ? 'ok' : 'yok'}`).toBe(true);
}

function expectBothDecoders(result: RoundTrip, payload: string) {
  expect(result.decodedJsQr, 'jsQR').toBe(payload);
  expect(result.decodedZxing, 'ZXing').toBe(payload);
}

function withLogo(overrides: Partial<DesignState> = {}): DesignState {
  const logoPng = makeLogoPng();
  const logo = makeLogoInput(logoPng);
  return makeDesign({
    logo: {
      dataUrl: logo.href,
      fileName: 'logo.png',
      width: 128,
      height: 128,
      size: 0.22,
      padding: 0.035,
      clearModules: true,
    },
    ...overrides,
  });
}

describe('QR matrisi', () => {
  it('gerçek matris üretir (bulucu desenler doğru)', () => {
    const matrix = createMatrix('https://example.com', 'H');
    expect(matrix).not.toBeNull();
    expect(matrix!.size).toBeGreaterThanOrEqual(21);
    expect(matrix!.data).toHaveLength(matrix!.size * matrix!.size);
    expect(isDarkModule(matrix!, 0, 0)).toBe(true);
    expect(isDarkModule(matrix!, 6, 6)).toBe(true);
    expect(isDarkModule(matrix!, 7, 7)).toBe(false);
  });

  it('boş içerikte null döner', () => {
    expect(createMatrix('', 'M')).toBeNull();
  });

  it('uzun içerikte matris büyür', () => {
    const short = createMatrix('a', 'M')!;
    const long = createMatrix('a'.repeat(600), 'M')!;
    expect(long.size).toBeGreaterThan(short.size);
  });
});

describe('içerik türleri taranabilir', () => {
  for (const [name, payload] of Object.entries(PAYLOADS)) {
    it(`${name} yükü her iki çözücüyle geri okunur`, async () => {
      const result = await roundTrip(payload, makeDesign());
      expect(result.centerMismatches).toBe(0);
      expectBothDecoders(result, payload);
    });
  }
});

describe('modül şekilleri', () => {
  const styles: DotType[] = [
    'square',
    'rounded',
    'extra-rounded',
    'dots',
    'classy',
    'classy-rounded',
    'diamond',
  ];
  for (const style of styles) {
    it(`${style} doğru çizilir ve en az bir çözücüyle okunur`, async () => {
      const result = await roundTrip(PAYLOADS.url, makeDesign({ dot: style }));
      expect(result.centerMismatches).toBe(0);
      expectAtLeastOneDecoder(result, PAYLOADS.url);
    });
  }

  it('sade kare modüller iki çözücüyle de okunur', async () => {
    const result = await roundTrip(
      PAYLOADS.url,
      makeDesign({ dot: 'square', eyeOuter: 'square', eyeInner: 'square' }),
      { width: 640 },
    );
    expect(result.centerMismatches).toBe(0);
    expectBothDecoders(result, PAYLOADS.url);
  });
});

describe('köşe şekilleri', () => {
  const styles: Array<EyeOuterType & EyeInnerType> = ['square', 'rounded', 'dot'];
  for (const outer of styles) {
    for (const inner of styles) {
      it(`${outer} / ${inner} doğru çizilir ve okunur`, async () => {
        const result = await roundTrip(
          PAYLOADS.url,
          makeDesign({ eyeOuter: outer, eyeInner: inner, dot: 'square' }),
        );
        expect(result.centerMismatches).toBe(0);
        expectBothDecoders(result, PAYLOADS.url);
      });
    }
  }
});

describe('çerçeveler', () => {
  const frames: FrameType[] = ['none', 'border', 'labelBottom', 'labelTop', 'bubble', 'corners', 'badge'];
  for (const frame of frames) {
    it(`${frame} çerçevesi taranabilir`, async () => {
      const caption = frame === 'none' || frame === 'border' ? '' : 'Taramak için okutun';
      const result = await roundTrip(PAYLOADS.url, makeDesign({ frame, caption }));
      expect(result.centerMismatches).toBe(0);
      expectBothDecoders(result, PAYLOADS.url);
      if (frame === 'labelBottom' || frame === 'labelTop' || frame === 'bubble' || frame === 'badge') {
        expect(result.scene.height).toBeGreaterThan(result.scene.width);
      }
      if (frame === 'none') {
        expect(result.rendered.width).toBe(1024);
        expect(result.scene.height).toBe(result.scene.width);
      }
    });
  }
});

describe('logo', () => {
  it('logolu QR taranabilir kalır ve oranı bildirir', async () => {
    const result = await roundTrip(PAYLOADS.url, withLogo(), { level: 'H', withLogo: true });
    expectBothDecoders(result, PAYLOADS.url);
    expect(result.metrics.logoBoxRatio).toBeCloseTo(0.22, 2);
    expect(result.scene.rects.some((rect) => rect.fill === '#FFFFFF')).toBe(true);
  });

  it('modülleri temizlemeden de taranabilir', async () => {
    const design = withLogo({ logo: { ...withLogo().logo!, size: 0.18, padding: 0.02, clearModules: false } });
    const result = await roundTrip(PAYLOADS.text, design, { level: 'H', withLogo: true });
    expectAtLeastOneDecoder(result, PAYLOADS.text);
    expect(result.scene.rects.some((rect) => rect.fill === '#FFFFFF')).toBe(false);
  });
});

describe('çok baytlı içerik ve otomatik seviye', () => {
  it('otomatik seviyeye düşürülen Türkçe içerik taranabilir', async () => {
    const payload = `İletişim — görüşelim! ${'ü'.repeat(630)}`;
    expect(utf8ByteLength(payload)).toBeGreaterThan(1273);
    expect(utf8ByteLength(payload)).toBeLessThanOrEqual(1663);

    const resolved = resolveMatrix(payload, makeDesign());
    expect(resolved.matrix).not.toBeNull();
    expect(resolved.downgraded).toBe(true);

    const design = makeDesign({ dot: 'square', eyeOuter: 'square', eyeInner: 'square' });
    // 161×161 modül (sürüm ~36) yalnızca yeterli çözünürlükte taranabilir;
    // uygulama bu durumu "veri yoğun" uyarısıyla bildirir.
    const { scene, metrics } = buildScene({
      matrix: resolved.matrix!,
      outputWidth: 3000,
      design,
      logo: null,
      measureText,
    });
    const rendered = await renderSceneToPng(scene);
    expect(
      countModuleCenterMismatches(rendered.buffer, resolved.matrix!, {
        moduleSize: metrics.moduleSize,
        quietZone: design.quietZone,
        qrX: metrics.qrX,
        qrY: metrics.qrY,
      }),
    ).toBe(0);
    expect(decodePngZxing(rendered.buffer) ?? decodePng(rendered.buffer)).toBe(payload);
  });

  it('emoji içeren içerik taranabilir', async () => {    const payload = 'QRtisan 🚀 — taranabilir mi?';
    const result = await roundTrip(payload, makeDesign({ dot: 'square' }));
    expect(result.decodedZxing ?? result.decodedJsQr).toBe(payload);
  });
});

describe('renkler ve zemin', () => {  it('şeffaf zemin beyaz üzerinde taranabilir', async () => {
    const result = await roundTrip(PAYLOADS.url, makeDesign({ transparentBg: true }));
    expect(result.scene.background).toBeNull();
    expect(result.centerMismatches).toBe(0);
    expectBothDecoders(result, PAYLOADS.url);
  });

  it('ters renkler (açık modül / koyu zemin) taranabilir', async () => {
    const result = await roundTrip(PAYLOADS.url, makeDesign({ fg: '#FFFFFF', bg: '#252338' }));
    expect(result.decodedJsQr).toBe(PAYLOADS.url);
  });

  it('yoğun içerik yüksek hata düzeltmeyle taranabilir', async () => {
    const payload = `https://example.com/${'uzun-yol-'.repeat(40)}`;
    const result = await roundTrip(payload, makeDesign({ dot: 'square' }), { level: 'H', width: 1400 });
    expect(result.matrix.size).toBeGreaterThan(60);
    expect(result.centerMismatches).toBe(0);
    expect(result.decodedJsQr).toBe(payload);
  });
});

describe('dışa aktarma boyutları', () => {
  for (const width of [512, 1024, 2048]) {
    it(`${width}px PNG (çerçeve + logo) taranabilir kalır`, async () => {
      const design = withLogo({ frame: 'badge', caption: 'Okut & keşfet', fg: '#8070D8', dot: 'rounded' });
      const result = await roundTrip(PAYLOADS.url, design, { level: 'H', withLogo: true, width });
      expect(result.rendered.width).toBe(width);
      expectAtLeastOneDecoder(result, PAYLOADS.url);
    });
  }
});

describe('SVG çıktısı', () => {
  it('çerçeve + etiket + logo içerir ve rasterleştirilince çözülür', async () => {
    const logoPng = makeLogoPng();
    const logo = makeLogoInput(logoPng);
    const matrix = createMatrix(PAYLOADS.url, 'H')!;
    const design = makeDesign({
      frame: 'badge',
      caption: 'Okut & keşfet',
      fg: '#8070D8',
      logo: {
        dataUrl: logo.href,
        fileName: 'logo.png',
        width: 128,
        height: 128,
        size: 0.22,
        padding: 0.035,
        clearModules: true,
      },
    });
    const { scene } = buildScene({
      matrix,
      outputWidth: 1024,
      design,
      logo: { href: logo.href, width: logo.width, height: logo.height },
      measureText,
    });
    const svg = sceneToSvg(scene, { title: PAYLOADS.url });

    expect(svg).toContain('<image href="data:image/png;base64,');
    expect(svg).toContain('Okut &amp; keşfet');
    expect(svg).toContain('width="1024"');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('aria-label="https://example.com/qrtisan-qr?kaynak=test"');

    const raster = await sharp(Buffer.from(svg)).png().toBuffer();
    const decodedJs = decodePng(raster) === PAYLOADS.url;
    const decodedZx = decodePngZxing(raster) === PAYLOADS.url;
    expect(decodedJs || decodedZx, `jsQR=${decodedJs} · ZXing=${decodedZx}`).toBe(true);
  });

  it('çerçevesiz nokta modüllü SVG de çözülür', async () => {
    const matrix = createMatrix(PAYLOADS.wifi, 'M')!;
    const { scene } = buildScene({
      matrix,
      outputWidth: 800,
      design: makeDesign({ dot: 'dots', eyeOuter: 'dot', eyeInner: 'dot' }),
      logo: null,
      measureText,
    });
    const raster = await sharp(Buffer.from(sceneToSvg(scene))).png().toBuffer();
    const decodedJs = decodePng(raster) === PAYLOADS.wifi;
    const decodedZx = decodePngZxing(raster) === PAYLOADS.wifi;
    expect(decodedJs || decodedZx, `jsQR=${decodedJs} · ZXing=${decodedZx}`).toBe(true);
  });
});
