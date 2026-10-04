/**
 * Mobil stüdyo E2E testleri — 320×568, 390×667, 390×844 ve yatay 844×390.
 *
 * Kapsam:
 *  - Mini canlı QR gerçek matristen çizilir; tasarım değişince güncellenir ve
 *    derin kontrollerde üst çubuk altında sabit kalır.
 *  - Büyük önizleme, gerçek sahne en-boy oranıyla kullanılabilir alana
 *    **kırpılmadan** sığar; her kırpıcı ata öğe için gerçek kutu geometrisi
 *    doğrulanır (yalnızca genişlik değil).
 *  - Çerçeve + etiket + sessiz alan eksiksiz görünür; uzun uyarılar açılınca
 *    eser küçülmez, gövde gerçekten kaydırılır.
 *  - Yerel <dialog>: Esc/X ile kapanır, odak tetikleyiciye döner, arka plan
 *    inert; pencere kaydırma konumu korunur, düzenleyici sıfırlanmaz.
 *  - Dil/tema ve mod geçişleri QR durumunu bozmaz.
 *  - SVG başlığı ham yükü (ör. Wi-Fi parolası) kopyalamaz; QR çözülebilir.
 *  - Klavye (visualViewport) davranışı deterministik olarak simüle edilir.
 */

import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { decodePng } from './decode';
import { seedUrl } from './seed';

declare global {
  interface Window {
    /** Test simülasyonu: görsel klavye yüksekliğini ayarlar (fiziksel cihaz değil). */
    __setKeyboardHeight?: (height: number | null) => void;
  }
}

const DEFAULT_PAYLOAD = 'https://example.com';

const MOBILE_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
] as const;

const LANDSCAPE_VIEWPORT = { width: 844, height: 390 } as const;

/** Kırpma regresyonu: her gerçekçi mobil/yatay görünüm. */
const CLIP_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 667 },
  { width: 390, height: 844 },
  LANDSCAPE_VIEWPORT,
] as const;

/** Dil, sistem yerine açıkça TR'ye sabitlenir; seçiciler deterministik olur. */
async function pinTrLocale(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('kare-locale', 'tr');
    } catch {
      // depolama engelli: varsayılan dile düşülür
    }
  });
}

async function openMobileStudio(page: Page) {
  await pinTrLocale(page);
  await page.goto('/');
  await page.waitForFunction(() => document.fonts.status === 'loaded');
  await expect(page.getByTestId('mobile-studio')).toBeVisible();
  // Geçerli mini QR bekleyen akışlar sentetik adresi açıkça yazar; üretim
  // artık örnek adresle önceden doldurmaz.
  await seedUrl(page);
  await expect(page.getByTestId('mobile-live-canvas')).toBeVisible();
}

/** Alt etiketli, dolu etiketli dikey sahne — en kötü kırpma durumu. */
async function applyLabelBottom(page: Page) {
  await page.getByTestId('mobile-step-design').click();
  await page.getByRole('tab', { name: /Çerçeve/ }).click();
  await page.getByText('Alt etiket', { exact: true }).click();
  await page.locator('#frame-caption').fill('Taramak için okutun');
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}

interface ClippingReport {
  canvas: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  art: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  body: { top: number; bottom: number; left: number; right: number; width: number; height: number };
  bodyCanScroll: boolean;
  bodyScrollTop: number;
  clippedBy: string | null;
  canvasInArt: boolean;
  canvasInBody: boolean;
}

/** Tuvali her kırpıcı ataya karşı gerçek kutularla doğrular. */
async function measureArtworkClipping(page: Page): Promise<ClippingReport | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="mobile-sheet-canvas"]');
    const art = document.querySelector('[data-testid="mobile-sheet-art"]');
    const body = document.querySelector('[data-testid="mobile-sheet-body"]');
    if (
      !(canvas instanceof HTMLElement) ||
      !(art instanceof HTMLElement) ||
      !(body instanceof HTMLElement)
    ) {
      return null;
    }
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const c = canvas.getBoundingClientRect();
    const a = art.getBoundingClientRect();
    const b = body.getBoundingClientRect();

    // Tuvale taşma uygulayan her ata öğe için görünür alanı kontrol et.
    let clippedBy: string | null = null;
    let node: HTMLElement | null = canvas.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const clips =
        style.overflow !== 'visible' ||
        style.overflowX !== 'visible' ||
        style.overflowY !== 'visible';
      if (clips) {
        const r = node.getBoundingClientRect();
        const hidden =
          c.top < r.top - 0.5 || c.bottom > r.bottom + 0.5 || c.left < r.left - 0.5 || c.right > r.right + 0.5;
        if (hidden) {
          clippedBy = node.getAttribute('data-testid') ?? node.className;
          break;
        }
      }
      node = node.parentElement;
    }

    return {
      canvas: rect(canvas),
      art: rect(art),
      body: rect(body),
      bodyCanScroll: body.scrollHeight > body.clientHeight + 1,
      bodyScrollTop: body.scrollTop,
      clippedBy,
      canvasInArt:
        c.top >= a.top - 0.5 && c.bottom <= a.bottom + 0.5 && c.left >= a.left - 0.5 && c.right <= a.right + 0.5,
      canvasInBody: c.top >= b.top - 0.5 && c.bottom <= b.bottom + 0.5,
    };
  });
}

async function canvasChecksum(page: Page, testId: string): Promise<number> {
  return page.evaluate((id) => {
    const canvas = document.querySelector(`[data-testid="${id}"]`);
    if (!(canvas instanceof HTMLCanvasElement)) return 0;
    const context = canvas.getContext('2d');
    if (!context) return 0;
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let index = 0; index < data.length; index += 97) sum += data[index];
    return sum;
  }, testId);
}

async function decodeCanvas(page: Page, testId: string): Promise<string | null> {
  const dataUrl = await page.evaluate((id) => {
    const canvas = document.querySelector(`[data-testid="${id}"]`);
    if (!(canvas instanceof HTMLCanvasElement)) return null;
    return canvas.toDataURL('image/png');
  }, testId);
  if (!dataUrl) return null;
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return decodePng(Buffer.from(base64, 'base64'));
}

async function makeLogoBuffer(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <rect width="128" height="128" rx="28" fill="#8070D8"/>
    <circle cx="64" cy="64" r="30" fill="#FFFFFF"/>
    <rect x="56" y="44" width="16" height="40" rx="4" fill="#8070D8"/>
    <rect x="44" y="56" width="40" height="16" rx="4" fill="#8070D8"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function documentOverflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function blurActive(page: Page) {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  });
}

test.describe('Mobil stüdyo', () => {
  test('390x844: ilk yüklemede mini önizleme boş ve dostu; örnek QR üretilmez', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await pinTrLocale(page);
    await page.goto('/');
    await expect(page.getByTestId('mobile-studio')).toBeVisible();

    // Alan boş; örnek adres yalnızca yer tutucudur ve görünür etiket korunur.
    const urlInput = page.getByLabel('Web adresi');
    await expect(urlInput).toHaveValue('');
    await expect(urlInput).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByText('Web adresi', { exact: true })).toBeVisible();

    // Mini canlı önizleme sahte QR çizmez; dostu bekleme durumundadır.
    await expect(page.getByTestId('mobile-live-canvas')).toHaveCount(0);
    await expect(page.getByTestId('mobile-live-empty')).toBeVisible();
    await expect(page.getByTestId('mobile-live-empty')).toContainText('Önizleme bekleniyor');
    await expect(page.getByTestId('mobile-warning-status')).toContainText('Geçerli bir QR kod yok');

    // Korkutucu doğrulama hatası yok; dışa aktarma kapalı.
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('mobile-open-preview')).toBeVisible();

    // EN: aynı dostu boş durum mobilde de yerelleşir (alan yine boş kalır).
    await page.getByTestId('locale-en').click();
    await expect(page.getByTestId('mobile-live-empty')).toContainText('Waiting for preview');
    await expect(page.locator('#content-url')).toHaveValue('');
    await expect(page.locator('#content-url')).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByTestId('locale-tr').click();
    await expect(page.getByTestId('mobile-live-empty')).toContainText('Önizleme bekleniyor');

    await page.getByTestId('mobile-open-preview').click();
    await expect(page.getByTestId('mobile-sheet-empty')).toBeVisible();
    await expect(page.getByText('QR kod üretmek için içerik girin.')).toBeVisible();
    await expect(
      page.getByTestId('mobile-sheet-export').getByRole('button', { name: 'PNG indir' }),
    ).toBeDisabled();
  });

  for (const viewport of MOBILE_VIEWPORTS) {
    test(`${viewport.width}x${viewport.height}: canlı mini QR gerçek ve tasarım değişince güncellenir`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);

      const artBox = await page.getByTestId('mobile-live-art').boundingBox();
      expect(artBox).not.toBeNull();
      expect(artBox!.width, 'mini QR alanı 90–112 px olmalı').toBeGreaterThanOrEqual(90);
      expect(artBox!.width).toBeLessThanOrEqual(112);
      expect(artBox!.height).toBeGreaterThanOrEqual(90);
      expect(artBox!.height).toBeLessThanOrEqual(112);

      // Mini tuval sahte değil: gerçek yük çözülebilir.
      expect(await decodeCanvas(page, 'mobile-live-canvas')).toBe(DEFAULT_PAYLOAD);

      const before = await canvasChecksum(page, 'mobile-live-canvas');

      // Derin tasarım değişikliği: alt etiketli çerçeve + etiket metni.
      await page.getByTestId('mobile-step-design').click();
      await page.getByRole('tab', { name: /Çerçeve/ }).click();
      await page.getByText('Alt etiket', { exact: true }).click();
      await page.locator('#frame-caption').fill('Taramak için okutun');

      await expect.poll(() => canvasChecksum(page, 'mobile-live-canvas')).not.toBe(before);
      expect(await decodeCanvas(page, 'mobile-live-canvas')).toBe(DEFAULT_PAYLOAD);

      // Canlı kanıt, adım değişince de görünür kalır.
      await page.getByTestId('mobile-step-content').click();
      await expect(page.getByTestId('mobile-live-canvas')).toBeVisible();
    });
  }

  test('390x844: mini QR derin tasarım kontrollerinde sabit ve görünür kalır', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    await page.getByTestId('mobile-step-design').click();

    // Hazır tasarımların en sonuna kadar kaydır.
    const presets = page.locator('[data-testid="mobile-panel-design"] button[aria-pressed]:has(canvas)');
    await expect(presets.first()).toBeVisible();
    await presets.last().scrollIntoViewIfNeeded();

    const header = await page.locator('header').first().boundingBox();
    const proof = await page.getByTestId('mobile-live-proof').boundingBox();
    expect(header).not.toBeNull();
    expect(proof).not.toBeNull();
    expect(proof!.y, 'canlı kanıt üst çubuğun altında kalmalı').toBeGreaterThanOrEqual(
      header!.y + header!.height - 2,
    );
    await expect(page.getByTestId('mobile-live-canvas')).toBeInViewport({ ratio: 0.9 });

    // Sayfanın en altında da sabit kalır.
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    const proofAtBottom = await page.getByTestId('mobile-live-proof').boundingBox();
    expect(proofAtBottom).not.toBeNull();
    expect(proofAtBottom!.y).toBeLessThanOrEqual(header!.y + header!.height + 2);
    await expect(page.getByTestId('mobile-live-canvas')).toBeInViewport({ ratio: 0.9 });

    // Uyarı sayacı canlı kanıtta; düşük kontrastta sayıya döner ve canlı
    // bölge ekran okuyucuya duyurur.
    await expect(page.getByTestId('mobile-warning-count')).toContainText(/sorun yok|no issues/);
    await expect(page.getByTestId('mobile-warning-status')).toContainText(/sorun görünmüyor|no issues/);
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByLabel('Ön plan (modüller) hex kodu').fill('#FFFFFF');
    await page.getByLabel('Arka plan hex kodu').fill('#FFFFFF');
    await expect(page.getByTestId('mobile-warning-count')).toHaveText(/[1-9]\d*/);
    await expect(page.getByTestId('mobile-warning-status')).toContainText(/uyarısı|warning/);
  });

  for (const viewport of CLIP_VIEWPORTS) {
    test(`${viewport.width}x${viewport.height}: büyük QR tam çerçeve+etiketle kırpılmadan sığar`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);
      await applyLabelBottom(page);

      await page.getByTestId('mobile-open-preview').click();
      await expect(page.getByTestId('mobile-sheet')).toHaveAttribute('open', '');
      await expect(page.getByTestId('mobile-sheet-canvas')).toBeVisible();

      const report = await measureArtworkClipping(page);
      expect(report).not.toBeNull();
      expect(report!.bodyScrollTop, 'ilk görünüm üstte olmalı').toBe(0);
      expect(report!.clippedBy, 'kırpıcı ata öğe tuvale taşmamalı').toBeNull();
      expect(report!.canvasInArt, 'tuval kartın dışına taşmamalı').toBe(true);
      expect(report!.canvasInBody, 'tam sahne ilk görünümde eksiksiz görünmeli').toBe(true);

      // Dikey sahne gerçek en-boyunu korur (kareye zorlanmaz).
      const aspect = await page
        .getByTestId('mobile-sheet-canvas')
        .evaluate((element) => (element as HTMLCanvasElement).height / (element as HTMLCanvasElement).width);
      expect(aspect, 'alt etiketli sahne dikey olmalı').toBeGreaterThan(1.1);

      // Kırpılmadığının kanıtı: gerçek yük çözülebilir.
      expect(await decodeCanvas(page, 'mobile-sheet-canvas')).toBe(DEFAULT_PAYLOAD);

      // Gövde gerektiğinde kaydırılır; dışa aktarma erişilebilir kalır.
      if (report!.bodyCanScroll) {
        const exportSlot = page.getByTestId('mobile-sheet-export');
        await exportSlot.scrollIntoViewIfNeeded();
        const exportBox = await exportSlot.boundingBox();
        expect(exportBox).not.toBeNull();
        expect(exportBox!.y).toBeLessThan(report!.body.bottom + 1);
      }
    });
  }

  test('390x844: büyük önizleme gerçek QR, çerçeve, etiket ve logoyu gösterir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    // Çerçeve + etiket + logo ile dolu bir tasarım.
    await page.getByTestId('mobile-step-design').click();
    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();
    await page.locator('#frame-caption').fill('Taramak için okutun');

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByTestId('mobile-live-logo-pending')).toHaveCount(0, { timeout: 15_000 });

    // Alt çubuktan büyük önizlemeyi aç.
    await blurActive(page);
    await page.getByTestId('mobile-open-preview').click();

    const dialog = page.getByTestId('mobile-sheet');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('open', '');

    const sheetCanvas = page.getByTestId('mobile-sheet-canvas');
    await expect(sheetCanvas).toBeVisible();

    const miniBox = await page.getByTestId('mobile-live-canvas').boundingBox();
    const largeBox = await sheetCanvas.boundingBox();
    expect(miniBox).not.toBeNull();
    expect(largeBox).not.toBeNull();
    expect(largeBox!.width, 'büyük önizleme mini QR’dan büyük olmalı').toBeGreaterThan(
      miniBox!.width * 1.5,
    );

    // Alt etiketli çerçeve dikey sahne üretir.
    const aspect = await sheetCanvas.evaluate(
      (element) => (element as HTMLCanvasElement).height / (element as HTMLCanvasElement).width,
    );
    expect(aspect).toBeGreaterThan(1.1);

    // Gerçek yük, çerçeve ve etiketle birlikte de çözülebilir.
    expect(await decodeCanvas(page, 'mobile-sheet-canvas')).toBe(DEFAULT_PAYLOAD);

    // Logo gerçekten çizildi: QR merkez bandında lavanta pikseller var.
    const lavender = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="mobile-sheet-canvas"]');
      if (!(canvas instanceof HTMLCanvasElement)) return 0;
      const context = canvas.getContext('2d');
      if (!context) return 0;
      const x = Math.floor(canvas.width * 0.42);
      const y = Math.floor(canvas.height * 0.34);
      const size = Math.max(8, Math.floor(canvas.width * 0.16));
      const { data } = context.getImageData(x, y, size, size);
      let count = 0;
      for (let index = 0; index < data.length; index += 4) {
        const [r, g, b] = [data[index], data[index + 1], data[index + 2]];
        if (Math.abs(r - 128) < 45 && Math.abs(g - 112) < 45 && Math.abs(b - 216) < 45) count += 1;
      }
      return count;
    });
    expect(lavender, 'logo lavanta pikselleri bulunamadı').toBeGreaterThan(20);

    // Uyarılar bağımsız katlanır bölümde; QR'ı ekrandan itmez.
    await expect(page.getByTestId('mobile-sheet-warnings')).toBeVisible();
  });

  test('390x844: büyük önizleme sayfasından PNG ve SVG indirilir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    // Üstteki canlı kanıt da büyük önizlemeyi açar.
    await expect(page.getByTestId('mobile-sheet-export')).toHaveCount(0);
    await page.getByTestId('mobile-live-open').click();
    const exportSlot = page.getByTestId('mobile-sheet-export');
    await expect(exportSlot).toBeVisible();
    await expect(exportSlot).toHaveCount(1);

    const [pngDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportSlot.getByRole('button', { name: 'PNG indir' }).click(),
    ]);
    const pngBuffer = await fs.readFile((await pngDownload.path())!);
    expect(decodePng(pngBuffer)).toBe(DEFAULT_PAYLOAD);
    await expect(exportSlot.getByRole('status').filter({ hasText: 'PNG indirildi' })).toBeVisible();

    const [svgDownload] = await Promise.all([
      page.waitForEvent('download'),
      exportSlot.getByRole('button', { name: 'SVG indir (vektör)' }).click(),
    ]);
    const svg = await fs.readFile((await svgDownload.path())!, 'utf8');
    expect(svg).toContain('<svg');
    expect(svg).toContain('@font-face');
  });

  test('390x844: diyalog Esc ile kapanır, odak tetikleyiciye döner, arka plan inert', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    await page.getByLabel('Web adresi').fill('example.org/kapanis');
    await blurActive(page);
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));

    const trigger = page.getByTestId('mobile-open-preview');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);
    await trigger.click();

    const dialog = page.getByTestId('mobile-sheet');
    await expect(dialog).toHaveAttribute('open', '');
    expect(
      await page.evaluate(
        () => document.querySelector('[data-testid="mobile-sheet"]')?.matches(':modal') ?? false,
      ),
      'diyalog modal olmalı',
    ).toBe(true);

    // Arka plan inert: diyalog üst katmanda işaretçi olaylarını keser.
    const interception = await page.evaluate(() => {
      const step = document.querySelector('[data-testid="mobile-step-content"]');
      const dialog = document.querySelector('[data-testid="mobile-sheet"]');
      if (!(step instanceof HTMLElement) || !dialog) return null;
      const rect = step.getBoundingClientRect();
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return {
        topIsStep: top === step,
        topInsideDialog: Boolean(top && dialog.contains(top)),
      };
    });
    expect(interception).not.toBeNull();
    expect(interception!.topIsStep, 'arka plan öğesi işaretçi alamamalı').toBe(false);
    expect(interception!.topInsideDialog, 'diyalog arka planı örtmeli').toBe(true);

    // Modal açıkken arka plan kaymaz.
    await page.mouse.move(195, 20);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => window.scrollY), 'modal açıkken arka plan kaymamalı').toBe(
      scrollBefore,
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null))
      .toBe('mobile-open-preview');
    expect(await page.evaluate(() => window.scrollY), 'kapanınca sayfa zıplamamalı').toBe(scrollBefore);

    // Kapanınca mini QR yine görünür; düzenleyici durumu sıfırlanmaz.
    await expect(page.getByTestId('mobile-live-proof')).toBeInViewport({ ratio: 0.9 });
    await expect(page.locator('#content-url')).toHaveValue('example.org/kapanis');

    // Kapat düğmesi de odağı tetikleyiciye döndürür.
    await page.getByTestId('mobile-live-open').click();
    await expect(dialog).toHaveAttribute('open', '');
    await page.getByTestId('mobile-sheet-close').click();
    await expect(dialog).toBeHidden();
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null))
      .toBe('mobile-live-open');
    await expect(page.locator('#content-url')).toHaveValue('example.org/kapanis');
    await expect(page.getByTestId('mobile-live-proof')).toBeInViewport({ ratio: 0.9 });
  });

  test('390x844: dil, tema ve QR durumu adımlar arasında korunur', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    await page.getByLabel('Web adresi').fill('example.org/durum');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/durum');
    const checksumBefore = await canvasChecksum(page, 'mobile-live-canvas');

    // Adım geçişi durumu korur.
    await page.getByTestId('mobile-step-design').click();
    await page.getByTestId('mobile-step-content').click();
    await expect(page.locator('#content-url')).toHaveValue('example.org/durum');

    // Sayfa aç/kapat durumu korur.
    await blurActive(page);
    await page.getByTestId('mobile-live-open').click();
    await expect(page.getByTestId('mobile-sheet')).toHaveAttribute('open', '');
    await page.getByTestId('mobile-sheet-close').click();
    await expect(page.getByTestId('mobile-sheet')).toBeHidden();
    await expect(page.locator('#content-url')).toHaveValue('example.org/durum');

    // Dil değişimi: metinler yerelleşir, QR durumu aynı kalır.
    await page.getByTestId('locale-en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('mobile-step-content')).toContainText('Content');
    await expect(page.locator('#content-url')).toHaveValue('example.org/durum');
    await page.getByTestId('locale-tr').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');

    // Tema değişimi: tuval pikselleri CSS ile ters çevrilmez.
    await page.getByTestId('theme-control').locator('select').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#content-url')).toHaveValue('example.org/durum');
    expect(await canvasChecksum(page, 'mobile-live-canvas')).toBe(checksumBefore);
    await page.getByTestId('theme-control').locator('select').selectOption('light');
  });

  for (const viewport of [...MOBILE_VIEWPORTS, LANDSCAPE_VIEWPORT]) {
    test(`${viewport.width}x${viewport.height}: yatay taşma yok ve alt çubuk erişilebilir`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);

      expect(await documentOverflowX(page), 'yatay taşma var').toBeLessThanOrEqual(0);

      const header = await page.locator('header').first().boundingBox();
      expect(header).not.toBeNull();
      expect(header!.x + header!.width).toBeLessThanOrEqual(viewport.width + 1);

      const dock = page.getByTestId('mobile-dock');
      await expect(dock).toBeVisible();
      const dockBox = await dock.boundingBox();
      expect(dockBox).not.toBeNull();
      expect(dockBox!.x).toBeGreaterThanOrEqual(-1);
      expect(dockBox!.x + dockBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    });
  }

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
  ] as const) {
    test(`${viewport.width}x${viewport.height}: alt çubuk son içeriği, girdiyi ve altbilgiyi kapatmaz`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);

      // İçerik adımı: altbilgi, sabit alt çubuğun üstünde kalır.
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const dockBox = await page.getByTestId('mobile-dock').boundingBox();
      const footerBox = await page.locator('footer').boundingBox();
      expect(dockBox).not.toBeNull();
      expect(footerBox).not.toBeNull();
      expect(footerBox!.y + footerBox!.height, 'altbilgi alt çubuğun altında kalıyor').toBeLessThanOrEqual(
        dockBox!.y + 1,
      );

      // Tasarım adımı: son içerik de alt çubuğun üstünde kalır.
      await page.getByTestId('mobile-step-design').click();
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const dockAtDesign = await page.getByTestId('mobile-dock').boundingBox();
      const designPanel = await page.getByTestId('mobile-panel-design').boundingBox();
      expect(dockAtDesign).not.toBeNull();
      expect(designPanel).not.toBeNull();
      expect(
        designPanel!.y + designPanel!.height,
        'son içerik alt çubuğun altında kalıyor',
      ).toBeLessThanOrEqual(dockAtDesign!.y + 1);

      // Metin girişi odaktayken çubuk gizlenir; odaklanan alan kapanmaz.
      await page.getByTestId('mobile-step-content').click();
      const urlInput = page.getByLabel('Web adresi');
      await urlInput.scrollIntoViewIfNeeded();
      await urlInput.focus();
      await expect(page.getByTestId('mobile-dock')).toBeHidden();

      const inputBox = await urlInput.boundingBox();
      expect(inputBox).not.toBeNull();
      expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(viewport.height + 1);

      await blurActive(page);
      await expect(page.getByTestId('mobile-dock')).toBeVisible();
    });
  }

  test('320x568: kompakt üst çubuk marka, dil, tema ve sıfırlamayı korur', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openMobileStudio(page);

    expect(await documentOverflowX(page)).toBeLessThanOrEqual(0);

    const brand = page.locator('header a[aria-label*="QRtisan"]').first();
    await expect(brand).toBeVisible();
    await expect(page.getByTestId('locale-tr')).toBeVisible();
    await expect(page.getByTestId('locale-en')).toBeVisible();
    await expect(page.getByTestId('theme-control')).toBeVisible();
    await expect(page.getByRole('button', { name: /Tasarımı sıfırla|Reset design/ })).toBeVisible();

    const header = await page.locator('header').first().boundingBox();
    expect(header).not.toBeNull();
    for (const selector of ['locale-tr', 'locale-en', 'theme-control']) {
      const box = await page.getByTestId(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x + box!.width).toBeLessThanOrEqual(320 + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(header!.y + header!.height + 1);
    }
  });

  for (const viewport of MOBILE_VIEWPORTS) {
    test(`${viewport.width}x${viewport.height}: birincil başlık eylemleri TR/EN ≥44x44`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);

      expect(await documentOverflowX(page), 'yatay taşma var').toBeLessThanOrEqual(0);

      const header = await page.getByTestId('topbar').boundingBox();
      expect(header).not.toBeNull();

      const brand = page.locator('header a[aria-label*="QRtisan"]').first();
      await expect(brand).toBeVisible();

      for (const locale of ['tr', 'en'] as const) {
        await page.getByTestId(`locale-${locale}`).click();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);

        // Her birincil başlık eylemi ayrı ayrı ölçülür (grup parent'ı değil).
        const targets: Array<{ label: string; locator: ReturnType<Page['locator']> }> = [
          { label: `locale-tr (${locale})`, locator: page.getByTestId('locale-tr') },
          { label: `locale-en (${locale})`, locator: page.getByTestId('locale-en') },
          { label: `marka bağlantısı (${locale})`, locator: brand },
          {
            label: `sıfırlama (${locale})`,
            locator: page.getByRole('button', { name: /Tasarımı sıfırla|Reset design/ }),
          },
          {
            label: `tema seçici (${locale})`,
            locator: page.getByTestId('theme-control').locator('select'),
          },
        ];

        for (const target of targets) {
          const box = await target.locator.boundingBox();
          expect(box, `${target.label} bulunamadı`).not.toBeNull();
          expect(box!.width, `${target.label} genişliği`).toBeGreaterThanOrEqual(44);
          expect(box!.height, `${target.label} yüksekliği`).toBeGreaterThanOrEqual(44);
          expect(
            box!.y + box!.height,
            `${target.label} başlık dışına taşıyor`,
          ).toBeLessThanOrEqual(header!.y + header!.height + 1);
        }

        // Tema menüsü doğal etiketleri gösterir; seçenek metni kırpılmaz.
        const selectedLabel = await page
          .getByTestId('theme-control')
          .locator('select')
          .evaluate((element) => (element as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
        expect(['Açık', 'Koyu', 'Sistem', 'Light', 'Dark', 'System']).toContain(selectedLabel);
        const themeWidth = (await page.getByTestId('theme-control').locator('select').boundingBox())!;
        expect(themeWidth.width, 'tema etiketi için yeterli genişlik').toBeGreaterThanOrEqual(88);
      }

      // TR'ye dön: sonraki ölçümler deterministik kalsın.
      await page.getByTestId('locale-tr').click();

      // Tema gerçek (hack'siz) yüksekliği 44–48 px; wrapper da gerçek yüksekliği taşır.
      const themeBox = await page.getByTestId('theme-control').boundingBox();
      const themeSelectBox = await page.getByTestId('theme-control').locator('select').boundingBox();
      expect(themeBox).not.toBeNull();
      expect(themeSelectBox).not.toBeNull();
      expect(themeBox!.height).toBeGreaterThanOrEqual(44);
      expect(themeBox!.height).toBeLessThanOrEqual(48);
      expect(themeSelectBox!.height).toBeGreaterThanOrEqual(44);
      expect(themeSelectBox!.height).toBeLessThanOrEqual(48);

      for (const testId of ['mobile-step-content', 'mobile-step-design']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height, `${testId} adım hedefi`).toBeGreaterThanOrEqual(44);
      }

      const dockBox = await page.getByTestId('mobile-open-preview').boundingBox();
      expect(dockBox).not.toBeNull();
      expect(dockBox!.height, 'alt eylem en az 44 px olmalı').toBeGreaterThanOrEqual(44);

      // Marka: 320'de ikon, 390'da ikon + ad.
      if (viewport.width >= 390) {
        await expect(page.locator('header').getByText('QRtisan')).toBeVisible();
      }
    });
  }

  test('kısa telefonlar (320x568, 390x667) ve yatay: tam eser görünür, indirme erişilebilir', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 390, height: 667 },
      LANDSCAPE_VIEWPORT,
    ] as const) {
      await page.setViewportSize(viewport);
      await openMobileStudio(page);

      await blurActive(page);
      await page.getByTestId('mobile-open-preview').click();

      const dialog = page.getByTestId('mobile-sheet');
      await expect(dialog).toHaveAttribute('open', '');

      const closeBox = await page.getByTestId('mobile-sheet-close').boundingBox();
      expect(closeBox).not.toBeNull();
      expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(viewport.height + 1);

      // Genişlik yeterli değil: her kırpıcı ataya karşı tam görünürlük.
      const report = await measureArtworkClipping(page);
      expect(report).not.toBeNull();
      expect(report!.clippedBy).toBeNull();
      expect(report!.canvasInArt).toBe(true);
      expect(report!.canvasInBody).toBe(true);
      expect(report!.canvas.width, 'büyük önizleme kullanılabilir kalmalı').toBeGreaterThanOrEqual(
        Math.min(220, viewport.width * 0.55),
      );

      // PNG seçenekleri kısa etiketli (taşma yok).
      const optionLabel = await page
        .getByTestId('mobile-sheet-export')
        .locator('option[value="1024"]')
        .textContent();
      expect(optionLabel?.trim()).toBe('1024 px');

      // İndirme denetimleri kısa ekranda da erişilebilir.
      const exportSlot = page.getByTestId('mobile-sheet-export');
      const pngButton = exportSlot.getByRole('button', { name: 'PNG indir' });
      await pngButton.scrollIntoViewIfNeeded();
      await expect(pngButton).toBeEnabled();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('390x844: uyarılar açılınca eser küçülmez, tüm ayrıntılar erişilebilir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    // Çok sayıda gerçek uyarı: uzun içerik + uzun etiket + dar sessiz alan + düşük kontrast.
    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await page.locator('#content-text').fill('ü'.repeat(950));
    await applyLabelBottom(page);
    await page.locator('#frame-caption').fill('Bu çok uzun bir etiket metnidir ve uyarı üretmelidir');
    await page.locator('#quiet-zone').fill('0');
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByLabel('Ön plan (modüller) hex kodu').fill('#FFFFFF');
    await page.getByLabel('Arka plan hex kodu').fill('#FFFFFF');
    await blurActive(page);

    await page.getByTestId('mobile-open-preview').click();
    await expect(page.getByTestId('mobile-sheet')).toHaveAttribute('open', '');

    const warningsDetails = page.getByTestId('mobile-sheet-warnings');
    const summary = await warningsDetails.locator('summary').innerText();
    expect(summary, 'uyarı sayısı özette görünmeli').toMatch(/\d+/);

    const artBefore = await page.getByTestId('mobile-sheet-art').boundingBox();
    expect(artBefore).not.toBeNull();

    await warningsDetails.locator('summary').click();
    await expect(warningsDetails).toHaveAttribute('open', '');

    const items = warningsDetails.locator('.mobile-sheet__warning');
    expect(await items.count(), 'birden çok uyarı üretilmeli').toBeGreaterThanOrEqual(4);

    const artAfter = await page.getByTestId('mobile-sheet-art').boundingBox();
    expect(artAfter).not.toBeNull();
    expect(Math.abs(artAfter!.width - artBefore!.width), 'uyarı açılınca eser küçülmemeli').toBeLessThanOrEqual(1);
    expect(Math.abs(artAfter!.height - artBefore!.height), 'uyarı açılınca eser kırpılmamalı').toBeLessThanOrEqual(1);

    // Tüm ayrıntılar gerçekten erişilebilir (gizli kırpma yok).
    await items.last().scrollIntoViewIfNeeded();
    const lastBox = await items.last().boundingBox();
    const bodyBox = await page.getByTestId('mobile-sheet-body').boundingBox();
    expect(lastBox).not.toBeNull();
    expect(bodyBox).not.toBeNull();
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(bodyBox!.y + bodyBox!.height + 1);
  });

  test('visualViewport klavye simülasyonu: alt çubuk gizlenir/gösterilir (fiziksel cihaz değil)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const proto = window.VisualViewport?.prototype;
      if (!proto) return;
      const original = Object.getOwnPropertyDescriptor(proto, 'height');
      if (!original?.get) return;
      let mockHeight: number | null = null;
      Object.defineProperty(proto, 'height', {
        configurable: true,
        get() {
          return mockHeight ?? original.get!.call(this);
        },
      });
      window.__setKeyboardHeight = (height: number | null) => {
        mockHeight = height;
        window.visualViewport?.dispatchEvent(new Event('resize'));
      };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    await expect(page.getByTestId('mobile-dock')).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.tagName ?? '')).not.toBe('INPUT');

    // Yalnızca görsel klavye daralması: odak yok, sadece visualViewport küçülür.
    await page.evaluate(() => window.__setKeyboardHeight?.(420));
    await expect(page.getByTestId('mobile-dock')).toBeHidden();

    await page.evaluate(() => window.__setKeyboardHeight?.(null));
    await expect(page.getByTestId('mobile-dock')).toBeVisible();
  });

  test('içerik modları (metin/e-posta/wi-fi) erişilebilir ve durum korunur', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    const modes = [
      { id: 'text', first: '#content-text', firstValue: 'Sentetik metin içeriği', payload: 'Sentetik metin içeriği' },
      {
        id: 'email',
        first: '#email-to',
        firstValue: 'test@example.com',
        payload: 'mailto:test@example.com?subject=Konu',
      },
      {
        id: 'wifi',
        first: '#wifi-ssid',
        firstValue: 'SentetikAg',
        payload: 'WIFI:T:WPA;S:SentetikAg;P:sifre123;;',
      },
    ] as const;

    for (const mode of modes) {
      await page.locator(`label:has(input[name="content-mode"][value="${mode.id}"])`).click();
      if (mode.id === 'email') {
        await page.locator('#email-to').fill('test@example.com');
        await page.locator('#email-subject').fill('Konu');
      } else if (mode.id === 'wifi') {
        await page.locator('#wifi-ssid').fill('SentetikAg');
        await page.locator('#wifi-password').fill('sifre123');
      } else {
        await page.locator('#content-text').fill('Sentetik metin içeriği');
      }
      await expect(page.getByTestId('payload-preview')).toHaveText(mode.payload);

      // Adım ve sayfa geçişleri alan değerini korur.
      await page.getByTestId('mobile-step-design').click();
      await page.getByTestId('mobile-step-content').click();
      await expect(page.locator(mode.first)).toHaveValue(mode.firstValue);

      await blurActive(page);
      await page.getByTestId('mobile-open-preview').click();
      await page.getByTestId('mobile-sheet-close').click();
      await expect(page.locator(mode.first)).toHaveValue(mode.firstValue);
    }
  });

  test('taranabilirlik durumu düğme etiketine ve canlı bölgeye yansır (TR/EN)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    const liveOpen = page.getByTestId('mobile-live-open');
    const status = page.getByTestId('mobile-warning-status');
    await expect(liveOpen).toHaveAttribute('aria-label', /taranabilirlik sorunu yok/);
    await expect(status).toContainText('sorun görünmüyor');

    // Geçersiz matriste sahte "sorun yok" denmez.
    await page.getByLabel('Web adresi').fill('gecersiz adres');
    await expect(status).toContainText('Geçerli bir QR kod yok');
    await expect(liveOpen).not.toHaveAttribute('aria-label', /sorun yok/);
    await page.getByLabel('Web adresi').fill('example.com');

    // Uyarı üretilince etiket ve canlı bölge güncellenir.
    await page.getByTestId('mobile-step-design').click();
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByLabel('Ön plan (modüller) hex kodu').fill('#FFFFFF');
    await page.getByLabel('Arka plan hex kodu').fill('#FFFFFF');
    await expect(liveOpen).toHaveAttribute('aria-label', /taranabilirlik uyarısı/);
    await expect(status).toContainText('uyarısı');

    // İngilizceye geçince duyuru da yerelleşir.
    await page.getByTestId('locale-en').click();
    await expect(liveOpen).toHaveAttribute('aria-label', /scanability warning/);
    await expect(status).toContainText('scanability warning');
  });

  test('SVG başlığı ham Wi-Fi yükünü sızdırmaz, QR çözülebilir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    const payload = 'WIFI:T:WPA;S:SentetikAg-Review;P:S3cret-Pass!;;';
    await page.locator('label:has(input[name="content-mode"][value="wifi"])').click();
    await page.locator('#wifi-ssid').fill('SentetikAg-Review');
    await page.locator('#wifi-password').fill('S3cret-Pass!');
    await expect(page.getByTestId('payload-preview')).toHaveText(payload);

    await blurActive(page);
    await page.getByTestId('mobile-open-preview').click();
    const exportSlot = page.getByTestId('mobile-sheet-export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportSlot.getByRole('button', { name: 'SVG indir (vektör)' }).click(),
    ]);
    const svg = await fs.readFile((await download.path())!, 'utf8');

    // Başlık genel: ham yük ne metinde ne nitelikte aranabilir olmalı.
    expect(svg).not.toContain('SentetikAg-Review');
    expect(svg).not.toContain('S3cret-Pass!');
    expect(svg).not.toContain('WIFI:');
    expect(svg).toContain('QR kod');

    // Geometri/kodlama korunur: SVG hâlâ tam yükü çözer.
    const raster = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(decodePng(raster)).toBe(payload);
  });

  test('reduced motion: animasyonlar kapanır, canlı önizleme çalışır', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    const pulseAnimation = await page
      .locator('.mobile-live__pulse')
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(pulseAnimation, 'canlı rozet nabzı kapanmalı').toBe('none');

    const spinAnimation = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.className = 'mobile-artwork__spin';
      document.body.appendChild(probe);
      const name = getComputedStyle(probe).animationName;
      probe.remove();
      return name;
    });
    expect(spinAnimation, 'logo yükleniyor dönüşü kapanmalı').toBe('none');

    const dockTransition = await page
      .getByTestId('mobile-dock')
      .evaluate((element) => getComputedStyle(element).transitionDuration);
    expect(parseFloat(dockTransition)).toBeLessThanOrEqual(0.001);

    // Hareket kısıtlıyken de gerçek önizleme ve sayfa akışı çalışır.
    expect(await decodeCanvas(page, 'mobile-live-canvas')).toBe(DEFAULT_PAYLOAD);
    await page.getByTestId('mobile-open-preview').click();
    await expect(page.getByTestId('mobile-sheet')).toHaveAttribute('open', '');
    await page.getByTestId('mobile-sheet-close').click();
    await expect(page.getByTestId('mobile-sheet')).toBeHidden();
  });

  test('güvenli alan dolgusu simülasyonu: çubuk ve sayfa kenar boşlukları (fiziksel telefon değil)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    // env(safe-area-inset-*) fiziksel cihazda okunur; burada jetonlar simüle edilir.
    await page.getByTestId('mobile-studio').evaluate((element) => {
      element.style.setProperty('--mobile-safe-top', '24px');
      element.style.setProperty('--mobile-safe-bottom', '24px');
    });

    const dockPadding = await page
      .getByTestId('mobile-dock')
      .evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
    expect(dockPadding, 'alt çubuk alt güvenli alanı').toBeGreaterThanOrEqual(24);

    await blurActive(page);
    await page.getByTestId('mobile-open-preview').click();

    const headerPadding = await page.evaluate(() => {
      const header = document.querySelector('.mobile-sheet__header');
      return header ? parseFloat(getComputedStyle(header).paddingTop) : -1;
    });
    expect(headerPadding, 'sayfa üst güvenli alanı').toBeGreaterThanOrEqual(24);

    const bodyPadding = await page
      .getByTestId('mobile-sheet-body')
      .evaluate((element) => parseFloat(getComputedStyle(element).paddingBottom));
    expect(bodyPadding, 'sayfa alt güvenli alanı').toBeGreaterThanOrEqual(24);
  });

  test('mobilde girilen veri masaüstüne geçişte korunur', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openMobileStudio(page);

    await page.getByLabel('Web adresi').fill('example.org/gecis');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/gecis');

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId('mobile-studio')).toHaveCount(0);
    await expect(page.locator('input#content-url:visible')).toHaveValue('example.org/gecis');
    await expect(page.getByTestId('preview-rail')).toBeVisible();
  });
});
