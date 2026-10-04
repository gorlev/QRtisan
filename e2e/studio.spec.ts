/**
 * Tarayıcı uçtan uca testleri.
 *
 * Gerçek kullanıcı akışları: içerik girme, doğrulama, çerçeve/renk/şekil
 * seçimi, logo yükleme, PNG/SVG indirme (indirilen dosyalar jsQR ve ZXing ile
 * çözülür) ve ağ izolasyonu (hiçbir dış istek yapılmamalı).
 */

import { expect, test, type Browser, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { decodePng } from './decode';
import { seedUrl } from './seed';

const DEFAULT_PAYLOAD = 'https://example.com';

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

/** sharp ile basit bir raster logo üretir (yerel dosya işlemi). */
async function makeLogoBuffer(): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <rect width="128" height="128" rx="28" fill="#8070D8"/>
    <circle cx="64" cy="64" r="30" fill="#FFFFFF"/>
    <rect x="56" y="44" width="16" height="40" rx="4" fill="#8070D8"/>
    <rect x="44" y="56" width="40" height="16" rx="4" fill="#8070D8"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}


/** SVG'yi uygulama stilleri olmadan temiz bir sayfada açar ve metin ölçülerini okur. */
async function measureSvgText(browser: Browser, svg: string) {
  const clean = await browser.newPage();
  await clean.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await clean.waitForFunction(() => {
    const element = document.querySelector('text');
    return Boolean(element && element.getBBox().width > 0);
  });
  const info = await clean.evaluate(() => {
    const element = document.querySelector('text') as SVGTextElement;
    return {
      family: element.getAttribute('font-family') ?? '',
      fontSize: Number(element.getAttribute('font-size')),
      width: element.getBBox().width,
      text: element.textContent ?? '',
    };
  });
  await clean.close();
  return info;
}

/** Uygulama sayfasında yüklenmiş Manrope ile metin genişliği ölçer. */
async function measureInApp(page: Page, text: string, fontSize: number) {
  return page.evaluate(
    ([value, size]) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;
      ctx.font = `700 ${size}px 'Manrope Variable', ui-sans-serif, system-ui, sans-serif`;
      return ctx.measureText(value).width;
    },
    [text, fontSize] as [string, number],
  );
}

/** Görsel yüklemeyi 400 ms geciktirir — logo yarışını deterministik kılar. */
async function slowDownImages(page: Page) {
  await page.addInitScript(() => {
    const NativeImage = window.Image;
    const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    window.Image = new Proxy(NativeImage, {
      construct(target, args) {
        const instance = Reflect.construct(target, args) as HTMLImageElement;
        let source = '';
        Object.defineProperty(instance, 'src', {
          configurable: true,
          get: () => source,
          set: (value: string) => {
            source = value;
            window.setTimeout(() => {
              srcDescriptor?.set?.call(instance, value);
            }, 400);
          },
        });
        return instance;
      },
    }) as typeof Image;
  });
}

test.describe('QRtisan', () => {
  test('ilk yüklemede içerik boştur: yer tutucu örnek, QR yok, dışa aktarma kapalı', async ({ page }) => {
    await page.goto('/');

    // Alan gerçekten boş; örnek adres yalnızca yer tutucudur ve görünür
    // etiketin yerini almaz.
    const urlInput = page.getByLabel('Web adresi');
    await expect(urlInput).toHaveValue('');
    await expect(urlInput).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByText('Web adresi', { exact: true })).toBeVisible();

    // Örnek/sahte QR üretilmez; canlı önizleme dostu bekleme durumundadır.
    await expect(page.getByTestId('preview-stage')).toHaveCount(0);
    await expect(page.getByText('Önizleme bekleniyor')).toBeVisible();
    await expect(page.getByText('QR kod üretmek için içerik girin.')).toBeVisible();

    // İlk dokunulmamış yüklemede korkutucu doğrulama hatası yok.
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Web adresi gerekli.')).toHaveCount(0);

    // Yük boş; dışa aktarma kullanıcı adres yazana kadar kapalı.
    await expect(page.getByTestId('payload-preview')).toHaveText('— içerik bekleniyor —');
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'SVG indir (vektör)' })).toBeDisabled();
    await expect(page.getByText('Geçerli bir QR kod oluştuğunda dışa aktarma açılır.')).toBeVisible();
  });

  test('yer tutucu görsel ipucudur: yazılan adres otomatik https ile gerçek QR üretir', async ({ page }) => {
    await page.goto('/');
    const urlInput = page.getByLabel('Web adresi');
    await expect(urlInput).toHaveValue('');
    await expect(urlInput).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();

    // Kullanıcı örnek metni seçip silmek zorunda değildir; doğrudan yazar.
    await urlInput.fill('example.com');
    await expect(urlInput).toHaveValue('example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.com');
    await expect(page.getByTestId('preview-stage')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'SVG indir (vektör)' })).toBeEnabled();

    // Mod geçişleri düzenlenen adresi ve üretilen QR'ı korur.
    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await page.locator('label:has(input[name="content-mode"][value="url"])').click();
    await expect(urlInput).toHaveValue('example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.com');
    await expect(page.getByTestId('preview-stage')).toBeVisible();

    // Temizleme güvenli boş duruma döner (hata yok, dışa aktarma kapalı).
    await urlInput.fill('');
    await expect(page.getByTestId('payload-preview')).toHaveText('— içerik bekleniyor —');
    await expect(page.getByText('QR kod üretmek için içerik girin.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
  });

  test('sayfa yüklenir, canlı önizleme çizilir', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
    await expect(page.getByText('QRtisan').first()).toBeVisible();
    await waitForFonts(page);
    await seedUrl(page);

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const checksum = await canvasChecksum(page);
    expect(checksum).toBeGreaterThan(0);

    const size = await canvas.evaluate((element) => ({
      width: (element as HTMLCanvasElement).width,
      height: (element as HTMLCanvasElement).height,
    }));
    expect(size.width).toBe(size.height);
    expect(size.width).toBeGreaterThan(200);
  });

  test('içerik değişince QR yükü ve matrisi güncellenir', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    const before = await canvasChecksum(page);

    await page.getByLabel('Web adresi').fill('example.org/merhaba');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/merhaba');
    await expect
      .poll(() => canvasChecksum(page), { timeout: 10_000 })
      .not.toBe(before);
  });

  test('geçersiz adres hata verir, dışa aktarma kilitlenir', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Web adresi').fill('gecersiz adres');
    await expect(page.getByRole('alert').first()).toContainText('boşluk');
    await expect(page.getByText('Önizleme bekleniyor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
  });

  test('Metin, E-posta ve Wi-Fi modları doğru yük üretir', async ({ page }) => {
    await page.goto('/');

    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await page.locator('#content-text').fill('Merhaba dünya');
    await expect(page.getByTestId('payload-preview')).toHaveText('Merhaba dünya');

    await page.locator('label:has(input[name="content-mode"][value="email"])').click();
    await page.locator('#email-to').fill('merhaba@example.com');
    await page.locator('#email-subject').fill('Deneme');
    await expect(page.getByTestId('payload-preview')).toHaveText(
      'mailto:merhaba@example.com?subject=Deneme',
    );

    await page.locator('label:has(input[name="content-mode"][value="wifi"])').click();
    await page.locator('#wifi-ssid').fill('KafeMisafir');
    await expect(page.getByRole('alert').first()).toContainText('Şifre gerekli');
    await page.locator('#wifi-password').fill('gizli123');
    await expect(page.getByTestId('payload-preview')).toHaveText('WIFI:T:WPA;S:KafeMisafir;P:gizli123;;');
  });

  test('çerçeve ve etiket önizlemeye uygulanır', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    const before = await canvasChecksum(page);

    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();
    await page.getByLabel('Etiket metni').fill('Taramak için okutun');
    await expect(page.getByText('Taramak için okutun').first()).toBeVisible();

    const aspect = await page.locator('canvas').first().evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return canvas.height / canvas.width;
    });
    expect(aspect).toBeGreaterThan(1.1);
    await expect.poll(() => canvasChecksum(page)).not.toBe(before);
  });

  test('renk, modül ve köşe şekilleri değiştirilebilir; kontrast uyarısı çalışır', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByText('Lavanta', { exact: true }).first().click();
    await expect(page.getByLabel('Ön plan (modüller) hex kodu')).toHaveValue(/#8070d8/i);

    await page.getByText('Nokta', { exact: true }).click();
    await expect(page.getByText(/modül · sürüm/)).toBeVisible();

    // Aynı ön/arka plan rengi → düşük kontrast uyarısı
    await page.getByLabel('Ön plan (modüller) hex kodu').fill('#FFFFFF');
    await page.getByLabel('Arka plan hex kodu').fill('#FFFFFF');
    await expect(page.getByText('Kontrast çok düşük', { exact: true })).toBeVisible();

    const contrast = page.getByTestId('contrast-readout');
    await expect(contrast).toContainText('1.0:1');
  });

  test('logo yüklenir, hata düzeltme kilitlenir ve kaldırılır', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);

    await page.getByRole('tab', { name: /^Logo/ }).click();

    // Güvenlik/limit kontrolü: raster olmayan dosya reddedilir
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>'),
    });
    await expect(
      page.getByRole('tabpanel', { name: 'Logo' }).getByText('Yalnızca PNG, JPEG veya WebP yükleyebilirsiniz.'),
    ).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });

    await expect(page.getByText('logo.png')).toBeVisible();
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await expect(page.getByLabel('Hata düzeltme')).toBeDisabled();
    await expect(page.getByLabel('Hata düzeltme')).toHaveValue('auto');

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.getByRole('button', { name: 'Kaldır' }).click();
    await expect(page.getByText('Logoyu buraya bırakın veya seçin')).toBeVisible();
  });

  test('PNG indirilir, önizlemeyle eşleşir ve taranabilir', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();
    await page.getByLabel('Etiket metni').fill('Taramak için okutun');

    await page.getByLabel('PNG çıktı boyutu').selectOption('512');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG indir' }).click(),
    ]);
    const path = await download.path();
    expect(download.suggestedFilename()).toMatch(/^qrtisan-qr-\d{8}-\d{4}\.png$/);
    expect(path).toBeTruthy();
    const buffer = await fs.readFile(path!);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(512);
    expect(meta.height).toBeGreaterThan(512);

    expect(decodePng(buffer)).toBe(DEFAULT_PAYLOAD);
    await expect(page.getByRole('status').filter({ hasText: 'PNG indirildi' })).toBeVisible();
  });

  test('SVG indirilir; çerçeve, etiket ve logo içerir; çözülebilir', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Rozet', { exact: true }).click();
    await page.getByLabel('Etiket metni').fill('Okut & keşfet');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'SVG indir (vektör)' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^qrtisan-qr-\d{8}-\d{4}\.svg$/);
    const svg = await fs.readFile((await download.path())!, 'utf8');

    expect(svg).toContain('<image href="data:image/png;base64,');
    expect(svg).toContain('Okut &amp; keşfet');
    expect(svg).toContain('fill-rule="evenodd"');
    expect(svg).toContain('@font-face');

    const raster = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(decodePng(raster)).toBe(DEFAULT_PAYLOAD);
  });

  test('hiçbir dış ağ isteği yapılmaz', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http')) return;
      const host = new URL(url).hostname;
      if (host !== '127.0.0.1' && host !== 'localhost') external.push(url);
    });

    await page.goto('/');
    await waitForFonts(page);
    await page.getByLabel('Web adresi').fill('example.org');
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByText('Classy', { exact: true }).click();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG indir' }).click(),
    ]);
    expect(await download.path()).toBeTruthy();
    await page.waitForTimeout(500);

    expect(external).toEqual([]);
  });

  test('sekmeler klavyeyle gezilebilir', async ({ page }) => {
    await page.goto('/');
    const frameTab = page.getByRole('tab', { name: /Çerçeve/ });
    await frameTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /^Logo/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Renk & Şekil/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(frameTab).toHaveAttribute('aria-selected', 'true');
  });

  test('mobil görünümde mini canlı QR düzenleyiciden önce görünür', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    // Mobil düzen: büyük tanıtım başlığı yerine doğrudan mini canlı QR.
    const liveProof = page.getByTestId('mobile-live-proof');
    await expect(liveProof).toBeVisible();
    await expect(page.getByTestId('mobile-live-canvas')).toBeVisible();

    const liveBox = await liveProof.boundingBox();
    const contentBox = await page.getByTestId('mobile-panel-content').boundingBox();
    const header = await page.locator('header').first().boundingBox();
    expect(liveBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(header).not.toBeNull();
    // Mini QR, üst çubuğun hemen altında ve düzenleyiciden önce gelir.
    expect(liveBox!.y).toBeLessThan(contentBox!.y);
    expect(liveBox!.y - (header!.y + header!.height)).toBeLessThanOrEqual(48);

    // Alt çubuktan büyük önizleme/indirme sayfası gerçek eserle açılır.
    await page.getByTestId('mobile-open-preview').click();
    await expect(page.getByTestId('mobile-sheet')).toBeVisible();
    await expect(page.getByTestId('mobile-sheet-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeVisible();
  });

  test('sekmelerin aria-controls hedefleri her zaman DOM\'da bulunur', async ({ page }) => {
    await page.goto('/');
    const ids = ['frame', 'logo', 'color'] as const;

    for (const id of ids) {
      await expect(page.locator(`#panel-${id}`)).toHaveCount(1);
    }

    for (const active of ids) {
      await page.locator(`#tab-${active}`).click();
      await expect(page.locator(`#panel-${active}`)).toBeVisible();
      for (const other of ids.filter((id) => id !== active)) {
        await expect(page.locator(`#panel-${other}`)).toBeHidden();
      }
      const controls = await page.locator(`#tab-${active}`).getAttribute('aria-controls');
      expect(controls).toBe(`panel-${active}`);
      await expect(page.locator(`#${controls}`)).toHaveCount(1);
    }

    // Klavye ile gezinirken de referanslar geçerli kalır
    await page.locator('#tab-frame').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#panel-logo')).toBeVisible();
    await expect(page.locator('#tab-logo')).toHaveAttribute('aria-controls', 'panel-logo');
  });

  test('çok baytlı içerik: otomatik düşürme, kilitli H hatası ve boş kontrol durumu', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);

    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await page.locator('#content-text').fill('ü'.repeat(637));

    // Otomatik seviye: matris üretilir, düşürme bilgisi görünür, hata yok
    await expect(page.getByText('Hata düzeltme otomatik düşürüldü', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
    await expect(page.getByText('İçerik QR koduna sığmıyor')).toHaveCount(0);

    // Logo eklenince H kilitlenir ve içerik sığmaz: eylem çağrısı görünür
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('İçerik QR koduna sığmıyor')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'logoyu kaldırın' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
    await expect(page.getByText('QR kod oluşturulamadı')).toBeVisible();
    // Geçerli matris yokken başarı mesajı gösterilmez
    await expect(page.getByText('Taranabilirlik kontrolü: sorun görünmüyor.')).toHaveCount(0);
    await expect(page.getByText('Taranabilirlik kontrolü, geçerli bir QR kod oluştuğunda yapılır.')).toBeVisible();
  });

  test('hiçbir seviyeye sığmayan içerikte net hata gösterilir', async ({ page }) => {
    await page.goto('/');
    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await page.locator('#content-text').fill('中'.repeat(1200));

    await expect(page.getByText('İçerik QR koduna sığmıyor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'SVG indir (vektör)' })).toBeDisabled();
    await expect(page.getByText('QR kod oluşturulamadı')).toBeVisible();
    await expect(page.getByText('Taranabilirlik kontrolü, geçerli bir QR kod oluştuğunda yapılır.')).toBeVisible();
  });

  test('logo değiştirilirken dışa aktarma kilitli kalır (yarış)', async ({ page }) => {
    await slowDownImages(page);
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });

    // Logo okunurken/çözülürken dışa aktarma kilitli ve durum açık
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();
    await expect(page.getByText(/Logo hazırlanıyor/).first()).toBeVisible();

    // Hazır olunca açılır
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled({ timeout: 15_000 });
    await expect(page.getByText(/Logo hazırlanıyor/)).toHaveCount(0);
  });

  test('SVG etiketi gömülü Manrope ile önizlemeyle aynı metriklerde çizilir', async ({ page, browser }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();

    const exportSvg = async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'SVG indir (vektör)' }).click(),
      ]);
      return fs.readFile((await download.path())!, 'utf8');
    };

    // 1) Türkçe etiket
    await page.locator('#frame-caption').fill('İletişim — görüşelim');
    const svg = await exportSvg();

    // Tüm alt kümeler gömülü olmalı; latin-ext Türkçe glifleri sağlar
    expect(svg.match(/@font-face/g) ?? []).toHaveLength(6);
    expect(svg).toContain('U+0100-02BA');
    expect(svg).toContain('İletişim — görüşelim');

    const turkish = await measureSvgText(browser, svg);
    expect(turkish.text).toBe('İletişim — görüşelim');
    expect(turkish.family).toContain('Manrope Variable');
    const turkishCanvas = await measureInApp(page, turkish.text, turkish.fontSize);
    expect(turkishCanvas).toBeGreaterThan(0);
    expect(Math.abs(turkish.width - turkishCanvas) / turkishCanvas).toBeLessThan(0.02);

    // 2) Uzun (otomatik küçültülen) etiket
    await page.locator('#frame-caption').fill('İletişim — görüşelim ve bizi takip edin');
    const svgLong = await exportSvg();
    const long = await measureSvgText(browser, svgLong);
    expect(long.fontSize).toBeLessThan(turkish.fontSize);
    const longCanvas = await measureInApp(page, long.text, long.fontSize);
    expect(Math.abs(long.width - longCanvas) / longCanvas).toBeLessThan(0.02);
  });

  test('yazı tipi yüklenmeden yapılan ilk dışa aktarma doğru metrikleri bekler', async ({ page, browser }) => {
    // Font dosyalarını geciktir: sayfa açılır açılmaz dışa aktarma denenir.
    await page.route('**/*.woff2', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });

    await page.goto('/');
    await seedUrl(page);
    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();
    await page.locator('#frame-caption').fill('İletişim — görüşelim ve bizi takip edin');

    const fontsReadyBefore = await page.evaluate(() =>
      document.fonts.check("700 16px 'Manrope Variable'"),
    );
    expect(fontsReadyBefore).toBe(false);

    const exportFile = async (name: 'PNG indir' | 'SVG indir (vektör)') => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name }).click(),
      ]);
      return fs.readFile((await download.path())!);
    };

    const earlyPng = await exportFile('PNG indir');
    const earlySvg = (await exportFile('SVG indir (vektör)')).toString('utf8');
    await page.waitForFunction(() => document.fonts.check("700 16px 'Manrope Variable'"));
    const latePng = await exportFile('PNG indir');
    const lateSvg = (await exportFile('SVG indir (vektör)')).toString('utf8');

    // PNG bayt bayt aynı olmalı: aksi halde ilk ölçüm fallback metriklerle yapılmıştır
    expect(earlyPng.equals(latePng)).toBe(true);

    // SVG etiketi de aynı (gerçek Manrope) metriklerle üretilmeli
    const early = await measureSvgText(browser, earlySvg);
    const late = await measureSvgText(browser, lateSvg);
    expect(early.fontSize).toBeGreaterThan(0);
    expect(early.fontSize).toBeCloseTo(late.fontSize, 2);
    expect(early.width).toBeCloseTo(late.width, 1);
  });

  test('logo varken hazır tasarım uygulanınca logo korunur ve çıktıya çizilir', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible();

    // Hazır tasarım içeriği ve logoyu korur
    await page.getByRole('button', { name: /Sade/ }).click();
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'PNG indir' }).click(),
    ]);
    const buffer = await fs.readFile((await download.path())!);

    // Kod hâlâ taranabilir
    expect(decodePng(buffer)).toBe(DEFAULT_PAYLOAD);

    // Merkezde lavanta logo pikselleri bulunmalı (Sade tasarım yalnızca mürekkep kullanır)
    const png = PNG.sync.read(buffer);
    const centerX = Math.floor(png.width / 2);
    const centerY = Math.floor(png.height / 2);
    const radius = Math.floor(png.width * 0.08);
    let lavender = 0;
    for (let y = centerY - radius; y < centerY + radius; y += 2) {
      for (let x = centerX - radius; x < centerX + radius; x += 2) {
        const index = (y * png.width + x) * 4;
        const [r, g, b] = [png.data[index], png.data[index + 1], png.data[index + 2]];
        if (Math.abs(r - 128) < 45 && Math.abs(g - 112) < 45 && Math.abs(b - 216) < 45) lavender += 1;
      }
    }
    expect(lavender).toBeGreaterThan(50);
  });

  test('reddedilen logo denemesi (SVG/aşırı boyut) logo yokken dışa aktarmayı kilitlemez', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();
    const logoPanel = page.getByRole('tabpanel', { name: 'Logo' });
    const input = page.locator('input[type="file"]');

    // Raster olmayan dosya reddedilir; geçerli logo yok, tasarım hâlâ geçerli
    await input.setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>'),
    });
    await expect(logoPanel.getByRole('alert')).toContainText('Yalnızca PNG, JPEG veya WebP');
    await expect(page.getByText('Logo yüklenemedi')).toHaveCount(0);

    const pngButton = page.getByRole('button', { name: 'PNG indir' });
    await expect(pngButton).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent('download'), pngButton.click()]);
    expect(await download.path()).toBeTruthy();

    // Aşırı boyutlu dosya da mevcut tasarımı kilitlemez
    await input.setInputFiles({
      name: 'buyuk.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await expect(logoPanel.getByRole('alert')).toContainText('Dosyanız 2.0 MB; üst sınır 2.0 MB.');
    await expect(pngButton).toBeEnabled();
  });

  test('tasarımı sıfırla logo yükleme hatasını temizler', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>'),
    });
    const alert = page.getByRole('tabpanel', { name: 'Logo' }).getByRole('alert');
    await expect(alert).toContainText('Yalnızca PNG, JPEG veya WebP');

    await page.getByRole('button', { name: 'Tasarımı sıfırla' }).click();
    await expect(alert).toHaveCount(0);
  });

  test('geçersiz logo değiştirme mevcut geçerli logoyu bozmaz', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible();

    // Geçersiz dosyayla değiştirme denemesi eski logoyu korur
    await page.locator('#logo-replace').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>'),
    });
    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByRole('tabpanel', { name: 'Logo' }).getByRole('alert')).toContainText(
      'Yalnızca PNG, JPEG veya WebP',
    );
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
  });

  test('başarı durumu içerik geçersizleşince yeşil kalmaz', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    const pngButton = page.getByRole('button', { name: 'PNG indir' });
    const [download] = await Promise.all([page.waitForEvent('download'), pngButton.click()]);
    expect(await download.path()).toBeTruthy();
    await expect(page.getByRole('status').filter({ hasText: 'PNG indirildi' })).toBeVisible();

    await page.getByLabel('Web adresi').fill('gecersiz adres');
    await expect(page.getByText('PNG indirildi')).toHaveCount(0);
    await expect(pngButton).toBeDisabled();
    await expect(page.getByText('Geçerli bir QR kod oluştuğunda dışa aktarma açılır.')).toBeVisible();
  });

  test('logo beklerken önceki başarı mesajı yerine bekleme ipucu gösterilir', async ({ page }) => {
    await slowDownImages(page);
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    const pngButton = page.getByRole('button', { name: 'PNG indir' });
    const [download] = await Promise.all([page.waitForEvent('download'), pngButton.click()]);
    expect(await download.path()).toBeTruthy();
    await expect(page.getByRole('status').filter({ hasText: 'PNG indirildi' })).toBeVisible();

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });

    await expect(page.getByText(/Logo hazırlanıyor; hazır olduğunda/)).toBeVisible();
    await expect(page.getByText('PNG indirildi')).toHaveCount(0);
    await expect(pngButton).toBeEnabled({ timeout: 15_000 });
  });

  test('logo okunurken dosya girdisi devre dışı kalır', async ({ page }) => {
    await slowDownImages(page);
    await page.goto('/');
    await waitForFonts(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();

    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });

    await expect(input).toBeDisabled();
    await expect(page.getByText('Dosya okunuyor…')).toBeVisible();
    await expect(page.getByText('logo.png')).toBeVisible({ timeout: 15_000 });
  });
});
