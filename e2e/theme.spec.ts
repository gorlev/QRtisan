/**
 * Tema uçtan uca testleri.
 *
 * Kapsam: işletim sistemi şemasının canlı izlenmesi, açık tercihin dokunulmazlığı,
 * tercihin yeniden yüklemede korunması (yalnızca tercih — QR verisi asla),
 * tema değişiminin QR tuvalini/renkleri/dışa aktarmayı değiştirmemesi,
 * üst çubuktaki denetimin Türkçe/İngilizce etiketleri, erken satır içi init
 * (tema sıçraması yok) ve karanlık temada masaüstü/mobil okunabilirlik.
 *
 * Not: Üst çubuk denetimi ve İngilizce çeviri paralel işçilerce entegre edilir;
 * denetim henüz bağlı değilse ilgili testler açıkça atlanır (sessiz geçilmez).
 */

import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import { seedUrl } from './seed';

const THEME_KEY = 'kare-theme';

type ThemeState = {
  theme: string | null;
  preference: string | null;
  colorScheme: string;
};

async function rootTheme(page: Page): Promise<ThemeState> {
  return page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    preference: document.documentElement.getAttribute('data-theme-preference'),
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
  }));
}

async function controlReady(page: Page): Promise<boolean> {
  return (await page.getByTestId('theme-control').count()) > 0;
}

async function chooseTheme(page: Page, value: 'light' | 'dark' | 'system') {
  await page.getByTestId('theme-control').locator('select').selectOption(value);
}

async function canvasChecksum(page: Page): Promise<number> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return 0;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 97) sum += data[i];
    return sum;
  });
}

async function waitForFonts(page: Page) {
  await page.waitForFunction(() => document.fonts.status === 'loaded');
}

async function exportPng(page: Page): Promise<Buffer> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PNG indir' }).click(),
  ]);
  return fs.readFile((await download.path())!);
}

/** Karanlık temada kritik metin/yüzey oranlarını ve zemin parlaklığını ölçer. */
function contrastReport() {
  // Renkleri (oklab/color-mix dahil) tarayıcının kendi ayrıştırıcısıyla RGBA'ya çevir.
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const context = probe.getContext('2d');
  const parse = (value: string): [number, number, number, number] => {
    if (!context) return [0, 0, 0, 1];
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000000';
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const data = context.getImageData(0, 0, 1, 1).data;
    return [data[0], data[1], data[2], data[3] / 255];
  };
  const over = (
    top: [number, number, number, number],
    bottom: [number, number, number, number],
  ): [number, number, number, number] => {
    const alpha = top[3];
    return [
      Math.round(top[0] * alpha + bottom[0] * (1 - alpha)),
      Math.round(top[1] * alpha + bottom[1] * (1 - alpha)),
      Math.round(top[2] * alpha + bottom[2] * (1 - alpha)),
      1,
    ];
  };
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  const luminance = ([r, g, b]: [number, number, number, number]) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const ratio = (foreground: string, background: [number, number, number, number]) => {
    const first = luminance(parse(foreground));
    const second = luminance(background);
    const lighter = Math.max(first, second);
    const darker = Math.min(first, second);
    return (lighter + 0.05) / (darker + 0.05);
  };
  const bodyStyle = getComputedStyle(document.body);
  const bodyBackground = parse(bodyStyle.backgroundColor);
  const card = document.querySelector('.card');
  const cardBackground = card ? parse(getComputedStyle(card).backgroundColor) : bodyBackground;
  const cardHeading = document.querySelector('.card h2');
  const input = document.querySelector('#content-url');
  const lavender = document.querySelector('h1 span');
  const status = document.querySelector('[data-testid="contrast-readout"]');
  const statusBackground = status ? over(parse(getComputedStyle(status).backgroundColor), cardBackground) : cardBackground;
  return {
    body: ratio(bodyStyle.color, bodyBackground),
    bodyLuminance: luminance(bodyBackground),
    cardHeading: cardHeading ? ratio(getComputedStyle(cardHeading).color, cardBackground) : 0,
    inputText: input ? ratio(getComputedStyle(input).color, parse(getComputedStyle(input).backgroundColor)) : 0,
    lavenderOnCard: lavender ? ratio(getComputedStyle(lavender).color, cardBackground) : 0,
    statusText: status ? ratio(getComputedStyle(status).color, statusBackground) : 0,
  };
}

test.describe('QRtisan teması', () => {
  test('sistem tercihi işletim sistemi şemasını canlı izler', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    let state = await rootTheme(page);
    expect(state.theme).toBe('dark');
    expect(state.preference).toBe('system');
    expect(state.colorScheme).toContain('dark');

    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(async () => (await rootTheme(page)).theme).toBe('light');
    state = await rootTheme(page);
    expect(state.preference).toBe('system');
    expect(state.colorScheme).toContain('light');

    await page.emulateMedia({ colorScheme: 'dark' });
    await expect.poll(async () => (await rootTheme(page)).theme).toBe('dark');
  });

  test('açık tema seçimi işletim sistemi değişimlerinden etkilenmez ve sayfayı yeniden yüklemez', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    test.skip(!(await controlReady(page)), 'ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).');

    await page.evaluate(() => {
      (window as unknown as { __themeMarker?: number }).__themeMarker = 42;
    });

    await chooseTheme(page, 'dark');
    await expect.poll(async () => (await rootTheme(page)).theme).toBe('dark');
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('dark');

    // İşletim sistemi açığa dönse de açık tercih korunur
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(150);
    expect((await rootTheme(page)).theme).toBe('dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(150);
    expect((await rootTheme(page)).theme).toBe('dark');

    // Ters yön: açık tercih, koyu işletim sisteminde de korunur
    await chooseTheme(page, 'light');
    await expect.poll(async () => (await rootTheme(page)).theme).toBe('light');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(150);
    expect((await rootTheme(page)).theme).toBe('light');

    // Tema değişimi gezinmeyi/sayfayı yeniden yüklemez
    expect(await page.evaluate(() => (window as unknown as { __themeMarker?: number }).__themeMarker)).toBe(42);
  });

  test('tercih yeniden yüklemede korunur; yalnızca tercihler saklanır', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await controlReady(page)), 'ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).');

    await chooseTheme(page, 'dark');
    await page.reload();
    let state = await rootTheme(page);
    expect(state.theme).toBe('dark');
    expect(state.preference).toBe('dark');
    await expect(page.getByTestId('theme-control').locator('select')).toHaveValue('dark');

    await chooseTheme(page, 'light');
    await page.reload();
    state = await rootTheme(page);
    expect(state.theme).toBe('light');
    expect(state.preference).toBe('light');
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBe('light');

    // Gizlilik: depoda QR içeriği, logo veya tasarım bulunmaz.
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain('example.com');
    expect(stored).not.toContain('data:image');
    expect(stored).not.toContain('https://');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    for (const key of keys) {
      expect(['kare-theme', 'kare-locale']).toContain(key);
    }
  });

  test('tema değişimi QR tuvalini, renkleri ve dışa aktarmayı değiştirmez', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    test.skip(!(await controlReady(page)), 'ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).');
    await waitForFonts(page);
    await seedUrl(page);

    const beforeChecksum = await canvasChecksum(page);
    const beforeBody = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const swatch = page.locator('button[aria-label*=" — #"]').first();
    const beforeSwatch = await swatch.evaluate((element) => (element as HTMLElement).style.backgroundColor);
    const beforePayload = await page.getByTestId('payload-preview').textContent();
    const beforePng = await exportPng(page);

    await chooseTheme(page, 'dark');
    await expect.poll(async () => (await rootTheme(page)).theme).toBe('dark');
    await waitForFonts(page);

    const afterChecksum = await canvasChecksum(page);
    const afterBody = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const afterSwatch = await swatch.evaluate((element) => (element as HTMLElement).style.backgroundColor);
    const afterPayload = await page.getByTestId('payload-preview').textContent();
    const afterPng = await exportPng(page);

    // Tema gerçekten değişti…
    expect(afterBody).not.toBe(beforeBody);
    // …ama QR matrisi, renkler ve dışa aktarma bit bit aynı kaldı.
    expect(afterChecksum).toBe(beforeChecksum);
    expect(afterSwatch).toBe(beforeSwatch);
    expect(afterPayload).toBe(beforePayload);
    expect(afterPng.equals(beforePng)).toBe(true);
  });

  test('üst çubuktaki denetim kompakt ve seçili tercihi gösterir', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    test.skip(!(await controlReady(page)), 'ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).');

    const control = page.getByTestId('theme-control');
    await expect(control).toBeVisible();
    const select = control.locator('select');
    await expect(select).toHaveAttribute('aria-label', /Tema/);
    await expect(select.locator('option')).toHaveText(['Açık', 'Koyu', 'Sistem']);
    // İşletim sistemi koyu olsa bile denetim çözülen temayı değil tercihi gösterir.
    await expect(select).toHaveValue('system');
    expect((await rootTheme(page)).theme).toBe('dark');
    await expect(control).toHaveAttribute('data-theme-resolved', 'dark');

    const box = await control.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeLessThan(48);
    expect(box!.width).toBeLessThan(160);
  });

  test("locale prop'u İngilizce doğal etiketleri üretir", async ({ page }) => {
    await page.goto('/');
    const probe = await page.evaluate(async () => {
      const dynamicImport = (specifier: string) => import(specifier);
      // Vite geliştirme sunucusunda optimize edilmiş CJS bağımlılıkları
      // `default` altında dönebilir; iki biçimi de destekle.
      const ReactModule = await dynamicImport('/@id/react');
      const React = ReactModule.default ?? ReactModule;
      const ReactDomModule = await dynamicImport('/@id/react-dom/client');
      const createRoot = ReactDomModule.createRoot ?? ReactDomModule.default?.createRoot;
      const { ThemeProvider } = await dynamicImport('/src/theme/ThemeProvider.tsx');
      const { ThemeControl } = await dynamicImport('/src/components/ThemeControl.tsx');

      const host = document.createElement('div');
      host.id = 'theme-locale-probe';
      document.body.appendChild(host);
      const root = createRoot(host);
      root.render(
        React.createElement(ThemeProvider, null, React.createElement(ThemeControl, { locale: 'en' })),
      );
      for (let attempt = 0; attempt < 40 && !host.querySelector('select'); attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 25));
      }
      const select = host.querySelector('select');
      const result = {
        label: select?.getAttribute('aria-label') ?? '',
        options: Array.from(select?.querySelectorAll('option') ?? []).map((option) => option.textContent),
      };
      root.unmount();
      host.remove();
      return result;
    });

    expect(probe.label).toBe('Theme preference');
    expect(probe.options).toEqual(['Light', 'Dark', 'System']);
  });

  test('dil değişimi üst çubuktaki tema denetimi etiketlerini yerelleştirir', async ({ page }) => {
    await page.goto('/');
    test.skip(
      !(await controlReady(page)) || (await page.getByTestId('locale-en').count()) === 0,
      'Dil seçici veya ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).',
    );

    const select = page.getByTestId('theme-control').locator('select');
    await expect(select).toHaveAttribute('aria-label', /Tema/);
    await expect(select.locator('option')).toHaveText(['Açık', 'Koyu', 'Sistem']);

    await page.getByTestId('locale-en').click();
    await expect(select).toHaveAttribute('aria-label', 'Theme preference');
    await expect(select.locator('option')).toHaveText(['Light', 'Dark', 'System']);

    await page.getByTestId('locale-tr').click();
    await expect(select).toHaveAttribute('aria-label', /Tema/);
    await expect(select.locator('option')).toHaveText(['Açık', 'Koyu', 'Sistem']);
  });

  test('karanlık temada kritik yüzeyler ve metinler okunaklı', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const report = await page.evaluate(contrastReport);
    expect(report.bodyLuminance).toBeLessThan(0.05);
    expect(report.body).toBeGreaterThan(7);
    expect(report.cardHeading).toBeGreaterThan(7);
    expect(report.inputText).toBeGreaterThan(7);
    expect(report.lavenderOnCard).toBeGreaterThan(4.5);
    // Durum rozeti (kontrast göstergesi) renk karışımlı zeminde de okunaklı
    expect(report.statusText).toBeGreaterThan(4.5);
  });

  test('mobil görünümde tema denetimi kompakt ve kart yüzeyleri okunaklı', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    test.skip(!(await controlReady(page)), 'ThemeControl üst çubukta henüz bağlı değil (paralel entegrasyon).');

    const control = page.getByTestId('theme-control');
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box).toBeTruthy();
    // Dokunma hedefi: gerçek kontrol 44–48 px (WCAG/Apple hedefi), kompakt kalır.
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeLessThanOrEqual(48);
    expect(box!.width).toBeLessThanOrEqual(150);

    const header = await page.locator('header').first().boundingBox();
    expect(header).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(header!.y);
    expect(box!.y + box!.height).toBeLessThanOrEqual(header!.y + header!.height);

    const report = await page.evaluate(contrastReport);
    expect(report.inputText).toBeGreaterThan(7);
    expect(report.cardHeading).toBeGreaterThan(7);
    expect(report.statusText).toBeGreaterThan(4.5);
  });

  test('ilk boyamadan önce tema uygulanır (satır içi betik)', async ({ page }) => {
    await page.route('**/src/main.tsx*', (route) => route.abort());
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const state = await rootTheme(page);
    expect(state.theme).toBe('dark');
    expect(state.preference).toBe('system');
    expect(state.colorScheme).toContain('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('kayıtlı açık tercih ilk boyamada uygulanır', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('kare-theme', 'dark'));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const state = await rootTheme(page);
    expect(state.theme).toBe('dark');
    expect(state.preference).toBe('dark');
  });
});
