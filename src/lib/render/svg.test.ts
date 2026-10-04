import { describe, expect, it } from 'vitest';
import { escapeXml, sceneToSvg } from './svg';
import type { Scene } from './scene-types';

function sceneWithImage(href: string): Scene {
  return {
    width: 100,
    height: 100,
    background: null,
    paths: [],
    strokes: [],
    rects: [],
    images: [{ href, x: 10, y: 20, w: 30, h: 40 }],
    texts: [],
  };
}

describe('escapeXml', () => {
  it('XML özel karakterlerini kaçırır', () => {
    expect(escapeXml('a&b<c>d"e\'f')).toBe('a&amp;b&lt;c&gt;d&quot;e&apos;f');
  });
});

describe('sceneToSvg görsel href güvenliği', () => {
  it('tırnak, &, < ve > içeren href yeni öznitelik enjekte edemez', () => {
    const svg = sceneToSvg(sceneWithImage('x" onload="alert(1)" data-evil="1'));

    // Ham tırnak/öznitelik sınırı kalmamalı: değer kaçırılmış olmalı.
    expect(svg).not.toContain('onload="alert(1)"');
    expect(svg).not.toContain('data-evil="1"');
    expect(svg).toContain('href="x&quot; onload=&quot;alert(1)&quot; data-evil=&quot;1"');
  });

  it('& ve < > karakterleri kaçırılır, yeni etiket/öznitelik açılmaz', () => {
    const svg = sceneToSvg(sceneWithImage('a&b<c><image onload="x"'));

    expect(svg).not.toContain('<image onload');
    expect(svg).toContain('a&amp;b&lt;c&gt;&lt;image onload=&quot;x&quot;');
    // Yalnızca tek gerçek <image .../> öğesi olmalı.
    expect(svg.match(/<image /g)).toHaveLength(1);
  });

  it('normal raster data URL değişmeden korunur', () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const svg = sceneToSvg(sceneWithImage(dataUrl));

    expect(svg).toContain(`href="${dataUrl}"`);
    expect(svg).toContain('x="10"');
    expect(svg).toContain('y="20"');
    expect(svg).toContain('width="30"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
  });
});
