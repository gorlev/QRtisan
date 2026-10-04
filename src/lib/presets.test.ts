import { describe, expect, it } from 'vitest';
import {
  CAPTION_SUGGESTIONS,
  CAPTION_SUGGESTIONS_EN,
  getCaptionSuggestions,
  getQrPresets,
  QR_PRESETS,
} from './presets';

describe('getQrPresets', () => {
  it('Türkçe listede kimlik ve ayarlar değişmez', () => {
    expect(getQrPresets('tr')).toBe(QR_PRESETS);
  });

  it('İngilizce adları çevirir, kimlik ve tasarım ayarlarını korur', () => {
    const en = getQrPresets('en');
    expect(en).toHaveLength(QR_PRESETS.length);
    en.forEach((preset, index) => {
      const tr = QR_PRESETS[index];
      expect(preset.id).toBe(tr.id);
      expect(preset.design.fg).toBe(tr.design.fg);
      expect(preset.design.bg).toBe(tr.design.bg);
      expect(preset.design.dot).toBe(tr.design.dot);
      expect(preset.design.frame).toBe(tr.design.frame);
      expect(preset.design.frameRadius).toBe(tr.design.frameRadius);
    });
    expect(en.map((preset) => preset.name)).not.toEqual(QR_PRESETS.map((preset) => preset.name));
    expect(en.map((preset) => preset.note)).not.toEqual(QR_PRESETS.map((preset) => preset.note));
    expect(en.find((preset) => preset.id === 'nane')?.note).toBe('Badge frame, mint background');
  });

  it('preset etiketlerini yalnızca İngilizce listede çevirir', () => {
    const en = getQrPresets('en');
    expect(en.find((preset) => preset.id === 'nane')?.design.caption).toBe('Scan & explore');
    expect(en.find((preset) => preset.id === 'bilet')?.design.caption).toBe('ADMISSION • 2026');
    expect(en.find((preset) => preset.id === 'kabarcik')?.design.caption).toBe('Get in touch');
    expect(en.find((preset) => preset.id === 'etiket')?.design.caption).toBe('MENU');
  });

  it('İngilizce liste orijinal Türkçe sabitleri değiştirmez', () => {
    getQrPresets('en');
    expect(QR_PRESETS.find((preset) => preset.id === 'nane')?.design.caption).toBe('Okut & keşfet');
    expect(QR_PRESETS.find((preset) => preset.id === 'sade')?.name).toBe('Sade');
    expect(QR_PRESETS.find((preset) => preset.id === 'sade')?.note).toBe('Kare modüller, çerçevesiz');
  });

  it('etiketsiz presetlerde caption eklemez', () => {
    const en = getQrPresets('en');
    expect(en.find((preset) => preset.id === 'sade')?.design.caption).toBe('');
    expect(en.find((preset) => preset.id === 'lavanta')?.design.caption).toBe('');
  });
});

describe('getCaptionSuggestions', () => {
  it('dile göre önerileri döndürür', () => {
    expect(getCaptionSuggestions('tr')).toBe(CAPTION_SUGGESTIONS);
    expect(getCaptionSuggestions('en')).toBe(CAPTION_SUGGESTIONS_EN);
    expect(getCaptionSuggestions('en')).toContain('Menu');
    expect(getCaptionSuggestions('en')).toContain('Wi-Fi password');
  });
});
