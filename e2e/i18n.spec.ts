/**
 * Dil (TR/EN) ve dil değişimi uçtan uca testleri.
 *
 * Kapsam: doğal İngilizce akışlar, tüm sekme/mod/uyarı/dışa aktarma metinleri,
 * dil tercihinin kalıcılığı, document.lang/title, dil değişiminde içerik ve
 * tasarımın bozulmaması, logo yükleme yarışları ve mobil üst çubuk taşması.
 */

import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { decodePng } from './decode';
import { seedUrl } from './seed';

const DEFAULT_PAYLOAD = 'https://example.com';

async function switchLocale(page: Page, locale: 'tr' | 'en') {
  await page.getByTestId(`locale-${locale}`).click();
}

async function waitForFonts(page: Page) {
  await page.waitForFunction(() => document.fonts.status === 'loaded');
}

async function previewCanvasBuffer(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    return canvas ? canvas.toDataURL('image/png') : '';
  });
  return Buffer.from(dataUrl.split(',')[1] ?? '', 'base64');
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

/** İlk `allowed` görsel örneğinden sonrakilerin yüklenmesini başarısız kılar. */
async function failImagesAfter(page: Page, allowed: number) {
  await page.addInitScript((limit) => {
    const NativeImage = window.Image;
    let created = 0;
    window.Image = new Proxy(NativeImage, {
      construct(target, args) {
        const instance = Reflect.construct(target, args) as HTMLImageElement;
        created += 1;
        if (created > limit) {
          // Kaynağı hiç yükleme; src atandıktan sonra hata olayını tetikle.
          Object.defineProperty(instance, 'src', {
            configurable: true,
            get: () => '',
            set: () => {
              window.setTimeout(() => {
                instance.dispatchEvent(new Event('error'));
              }, 0);
            },
          });
        }
        return instance;
      },
    }) as typeof Image;
  }, allowed);
}

test.describe('Dil desteği (TR/EN)', () => {
  test('ilk yüklemede boş içerik dostu ve yerelleşmiştir; örnek QR üretilmez', async ({ page }) => {
    await page.goto('/');

    // TR: alan boş, yer tutucu örnek; canlı önizleme dostu bekleme durumu.
    const urlTr = page.getByLabel('Web adresi');
    await expect(urlTr).toHaveValue('');
    await expect(urlTr).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText('— içerik bekleniyor —');
    await expect(page.getByText('QR kod üretmek için içerik girin.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeDisabled();

    await switchLocale(page, 'en');

    // EN: aynı dostu durum İngilizce; korkutucu doğrulama hatası yok.
    const urlEn = page.getByLabel('Web address');
    await expect(urlEn).toHaveValue('');
    await expect(urlEn).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText('— waiting for content —');
    await expect(page.getByText('Enter content to generate a QR code.')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
    await expect(
      page.getByText('Export becomes available once there is a valid QR code.'),
    ).toBeVisible();
  });

  test('varsayılan Türkçe; İngilizceye geçince başlık, sekmeler ve alanlar çevrilir', async ({ page }) => {
    await page.goto('/');

    // Varsayılan: Türkçe
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle(/QRtisan/);
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
    await expect(page.getByLabel('Web adresi')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeVisible();
    await expect(page.getByTestId('locale-tr')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'false');

    // Geçerli QR bekleyen akışlar için sentetik adres açıkça yazılır.
    await seedUrl(page);

    await switchLocale(page, 'en');

    // document.lang + anlamlı başlık
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/QR Code Design in Your Browser/);

    // Doğal İngilizce başlık ve içerik
    await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Content' })).toBeVisible();
    await expect(page.getByLabel('Web address')).toHaveValue('https://example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText(DEFAULT_PAYLOAD);
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible();

    // Mod etiketleri
    for (const label of ['Website', 'Text', 'Email', 'Wi-Fi']) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    // Sekmeler
    await expect(page.getByRole('tab', { name: /Frame/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Logo/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Color & Shape/ })).toBeVisible();

    // Türkçeye dönüş
    await switchLocale(page, 'tr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
    await expect(page.getByLabel('Web adresi')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Renk & Şekil/ })).toBeVisible();
  });

  test('sekmeler 1536 px genişlikte yalnızca aktif dilde görünür; karşı dil sızmaz', async ({ page }) => {
    await page.setViewportSize({ width: 1536, height: 900 });
    await page.goto('/');
    await waitForFonts(page);

    // Türkçe: erişilebilir adlar tam olarak Türkçe; İngilizce metin yok.
    await expect(page.getByRole('tab', { name: 'Çerçeve', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Logo', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Renk & Şekil', exact: true })).toBeVisible();
    await expect(page.getByText('Frame', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Color & Shape', { exact: true })).toHaveCount(0);

    // İngilizce: erişilebilir adlar tam olarak İngilizce; Türkçe metin yok.
    await switchLocale(page, 'en');
    await expect(page.getByRole('tab', { name: 'Frame', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Logo', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Color & Shape', exact: true })).toBeVisible();
    await expect(page.getByText('Çerçeve', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Renk & Şekil', { exact: true })).toHaveCount(0);
  });

  test('İngilizce doğrulama hataları, modlar ve dışa aktarma kilit durumu', async ({ page }) => {
    await page.goto('/');
    await switchLocale(page, 'en');

    // Geçersiz adres: doğal İngilizce hata
    await page.getByLabel('Web address').fill('gecersiz adres');
    await expect(page.getByRole('alert').first()).toContainText('cannot contain spaces');
    await expect(page.getByText('Waiting for preview')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
    await expect(
      page.getByText('Export becomes available once there is a valid QR code.'),
    ).toBeVisible();

    // Metin modu
    await page.locator('label:has(input[name="content-mode"][value="text"])').click();
    await expect(page.locator('#content-text')).toBeVisible();
    await page.locator('#content-text').fill('Merhaba dünya');
    await expect(page.getByTestId('payload-preview')).toHaveText('Merhaba dünya');

    // E-posta modu
    await page.locator('label:has(input[name="content-mode"][value="email"])').click();
    await expect(page.getByLabel('Recipient')).toBeVisible();
    await page.getByLabel('Recipient').fill('hello@example.com');
    await page.getByLabel('Subject').fill('Info');
    await expect(page.getByTestId('payload-preview')).toHaveText('mailto:hello@example.com?subject=Info');

    // Wi-Fi modu
    await page.locator('label:has(input[name="content-mode"][value="wifi"])').click();
    await expect(page.getByLabel('Network name (SSID)')).toBeVisible();
    await expect(page.getByRole('alert').first()).toContainText('Network name (SSID) is required');
    await page.getByLabel('Network name (SSID)').fill('CafeGuest');
    await expect(page.getByRole('alert').first()).toContainText('Enter a password');
    await page.locator('#wifi-password').fill('gizli123');
    await expect(page.getByTestId('payload-preview')).toHaveText('WIFI:T:WPA;S:CafeGuest;P:gizli123;;');
    await expect(page.getByText('Hidden network')).toBeVisible();
  });

  test('İngilizce sekmeler: çerçeve, logo, renk/şekil ve öneri etiketleri', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await switchLocale(page, 'en');

    // Çerçeve
    await page.getByRole('tab', { name: /Frame/ }).click();
    await page.getByText('Bottom label', { exact: true }).click();
    await expect(page.getByLabel('Caption text')).toBeVisible();
    await page.getByRole('button', { name: 'Scan to open' }).click();
    await expect(page.locator('#frame-caption')).toHaveValue('Scan to open');
    await expect(page.getByText('Quiet zone')).toBeVisible();

    // Renk & Şekil
    await page.getByRole('tab', { name: /Color & Shape/ }).click();
    await expect(page.getByLabel('Foreground (modules) hex code')).toBeVisible();
    await expect(page.getByLabel('Background hex code')).toBeVisible();
    await expect(page.getByText('Ready-made palettes')).toBeVisible();
    await expect(page.getByText('Lavender / White', { exact: true })).toBeVisible();
    await expect(page.getByText('Module shape', { exact: true })).toBeVisible();
    await expect(page.getByText('Dots', { exact: true })).toBeVisible();
    await expect(page.getByText('Corner frame')).toBeVisible();
    await expect(page.getByLabel('Error correction')).toBeVisible();

    // Logo
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await expect(page.getByText('Drop a logo here or choose a file')).toBeVisible();
    await expect(page.getByText(/up to 2\.0 MB/)).toBeVisible();
    await expect(page.getByText('Error correction is automatic')).toBeVisible();

    // Hazır tasarımlar
    await expect(page.getByText('Ready-made designs')).toBeVisible();
    await expect(page.getByRole('button', { name: /Plain/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Lavender/ })).toBeVisible();
  });

  test('İngilizce kontrast uyarısı ve dışa aktarma durum metinleri', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await switchLocale(page, 'en');

    // Düşük kontrast uyarısı İngilizce
    await page.getByRole('tab', { name: /Color & Shape/ }).click();
    await page.getByLabel('Foreground (modules) hex code').fill('#FFFFFF');
    await page.getByLabel('Background hex code').fill('#FFFFFF');
    await expect(page.getByText('Contrast is too low', { exact: true })).toBeVisible();
    await expect(page.getByTestId('contrast-readout')).toContainText('poor');
    await expect(page.getByText('Scanability check')).toBeVisible();

    // Kontrastı düzelt; uyarı kalksın
    await page.getByLabel('Foreground (modules) hex code').fill('#252338');
    await page.getByLabel('Background hex code').fill('#FFFFFF');
    await expect(
      page.getByRole('paragraph').filter({ hasText: 'Scanability check: no issues found.' }),
    ).toBeVisible();

    // PNG indirme İngilizce durum metni ve çözülebilirlik
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^qrtisan-qr-\d{8}-\d{4}\.png$/);
    const buffer = await fs.readFile((await download.path())!);
    expect(decodePng(buffer)).toBe(DEFAULT_PAYLOAD);
    await expect(page.getByRole('status').filter({ hasText: 'PNG downloaded' })).toBeVisible();

    // SVG indirme İngilizce durum metni
    const [svgDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download SVG (vector)' }).click(),
    ]);
    expect(svgDownload.suggestedFilename()).toMatch(/^qrtisan-qr-\d{8}-\d{4}\.svg$/);
    expect(await svgDownload.path()).toBeTruthy();
    await expect(page.getByRole('status').filter({ hasText: 'SVG downloaded' })).toBeVisible();
  });

  test('dil değişimi yükü, etiketi, logoyu ve temayı değiştirmez', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);

    await page.getByLabel('Web adresi').fill('example.org/korunacak');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/korunacak');

    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await page.getByText('Alt etiket', { exact: true }).click();
    await page.getByLabel('Etiket metni').fill('Sabit etiket');

    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await page.getByLabel('Ön plan (modüller) hex kodu').fill('#1F6F5C');
    await page.getByText('Nokta', { exact: true }).click();

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible();
    // Logo görseli çözülüp dışa aktarma açılana kadar bekle.
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled({ timeout: 15_000 });

    const beforeTheme = await page.getByTestId('theme-control').getAttribute('data-theme-preference');

    await switchLocale(page, 'en');

    // İçerik, logo ve tema değişmedi
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/korunacak');
    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByTestId('theme-control')).toHaveAttribute(
      'data-theme-preference',
      beforeTheme ?? 'system',
    );

    // Tasarım durumu (renk, modül şekli, etiket) değişmedi
    await page.getByRole('tab', { name: /Color & Shape/ }).click();
    await expect(page.getByLabel('Foreground (modules) hex code')).toHaveValue('#1f6f5c');
    expect(await page.locator('input[name="dot-style"][value="dots"]').isChecked()).toBe(true);
    await page.getByRole('tab', { name: /Frame/ }).click();
    await expect(page.locator('#frame-caption')).toHaveValue('Sabit etiket');

    await switchLocale(page, 'tr');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/korunacak');
    await page.getByRole('tab', { name: /^Logo/ }).click();
    await expect(page.getByText('logo.png')).toBeVisible();
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await expect(page.getByLabel('Ön plan (modüller) hex kodu')).toHaveValue('#1f6f5c');
    expect(await page.locator('input[name="dot-style"][value="dots"]').isChecked()).toBe(true);
    await page.getByRole('tab', { name: /Çerçeve/ }).click();
    await expect(page.locator('#frame-caption')).toHaveValue('Sabit etiket');

    // Önizlemedeki QR hâlâ aynı yükü taşıyor
    expect(decodePng(await previewCanvasBuffer(page))).toBe('https://example.org/korunacak');
  });

  test('hazır tasarım etiketi seçildiği dilde uygulanır, dil değişince bozulmaz', async ({ page }) => {
    await page.goto('/');
    await switchLocale(page, 'en');

    await page.getByRole('button', { name: /Mint/ }).click();
    await page.getByRole('tab', { name: /Frame/ }).click();
    await expect(page.locator('#frame-caption')).toHaveValue('Scan & explore');

    await switchLocale(page, 'tr');
    await expect(page.locator('#frame-caption')).toHaveValue('Scan & explore');

    await page.getByRole('button', { name: /Nane/ }).click();
    await expect(page.locator('#frame-caption')).toHaveValue('Okut & keşfet');
    await switchLocale(page, 'en');
    await expect(page.locator('#frame-caption')).toHaveValue('Okut & keşfet');
  });

  test('dil tercihi yenilemede korunur; QR verisi saklanmaz', async ({ page }) => {
    await page.goto('/');
    await switchLocale(page, 'en');
    expect(await page.evaluate(() => localStorage.getItem('kare-locale'))).toBe('en');

    await page.getByLabel('Web address').fill('example.org/gecici');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/gecici');

    await page.reload();

    // Tercih korunur
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/QR Code Design in Your Browser/);
    await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
    await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'true');

    // QR verisi (içerik) saklanmaz — sayfa yenilenince alan boş, dostu
    // bekleme durumuna döner; örnek adres yalnızca yer tutucudur.
    await expect(page.getByLabel('Web address')).toHaveValue('');
    await expect(page.getByLabel('Web address')).toHaveAttribute('placeholder', 'example.com');
    await expect(page.getByTestId('payload-preview')).toHaveText('— waiting for content —');
    await expect(page.getByText('Enter content to generate a QR code.')).toBeVisible();

    await switchLocale(page, 'tr');
    expect(await page.evaluate(() => localStorage.getItem('kare-locale'))).toBe('tr');
  });

  test('yükleme hatası kapatılabilir; dil değişince güncel dilde görünür', async ({ page }) => {
    await page.goto('/');
    await seedUrl(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"/>'),
    });

    const panel = page.getByRole('tabpanel', { name: 'Logo' });
    await expect(panel.getByRole('alert')).toContainText('Yalnızca PNG, JPEG veya WebP');

    // Dil değişince aynı hata İngilizce gösterilir
    await switchLocale(page, 'en');
    await expect(panel.getByRole('alert')).toContainText('PNG, JPEG, or WebP');

    // Geri dönünce Türkçe
    await switchLocale(page, 'tr');
    await expect(panel.getByRole('alert')).toContainText('Yalnızca PNG, JPEG veya WebP');

    // Kapatma düğmesi hatayı temizler (mevcut tasarımı değiştirmez)
    await panel.getByRole('button', { name: 'Logo hatasını kapat' }).click();
    await expect(panel.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
  });

  test('çözülemeyen logo X ile kaldırılır (noop değil)', async ({ page }) => {
    // İlk görsel (readLogoFile) yüklenir; önizleme görseli başarısız olur.
    await failImagesAfter(page, 1);
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });

    const panel = page.getByRole('tabpanel', { name: 'Logo' });
    await expect(panel.getByRole('alert')).toContainText('açılamadı');

    // X bozuk logoyu kaldırır; yükleme alanı geri gelir ve dışa aktarma açılır
    await panel.getByRole('button', { name: 'Bozuk logoyu kaldır' }).click();
    await expect(panel.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('Logoyu buraya bırakın veya seçin')).toBeVisible();
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
  });

  test('sıfırlama uçuştaki logo yüklemesini geçersiz kılar (yarış)', async ({ page }) => {
    await slowDownImages(page);
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('Dosya okunuyor…')).toBeVisible();

    await page.getByRole('button', { name: 'Tasarımı sıfırla' }).click();

    // Geç gelen sonuç logoyu geri getirmemeli
    await page.waitForTimeout(1200);
    await expect(page.getByText('logo.png')).toHaveCount(0);
    await expect(page.getByText('Logoyu buraya bırakın veya seçin')).toBeVisible();
    await expect(page.getByText('Dosya okunuyor…')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled();
  });

  test('logo değiştirme sırasında sıfırlama eski logoyu korur, geç sonucu yok sayar', async ({ page }) => {
    await slowDownImages(page);
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await page.getByRole('tab', { name: /^Logo/ }).click();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible({ timeout: 15_000 });
    // Önizleme görseli de hazır olana kadar bekle (aksi halde değiştirme yok sayılır)
    await expect(page.getByRole('button', { name: 'PNG indir' })).toBeEnabled({ timeout: 15_000 });

    await page.locator('#logo-replace').setInputFiles({
      name: 'logo2.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('Logo işleniyor…')).toBeVisible();

    await page.getByRole('button', { name: 'Tasarımı sıfırla' }).click();
    await page.waitForTimeout(1200);

    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByText('logo2.png')).toHaveCount(0);
  });

  test('mobil üst çubuk 320 ve 390 px genişlikte taşmaz', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      await seedUrl(page);
      await expect(page.getByTestId('mobile-studio')).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px yatay taşma`).toBeLessThanOrEqual(0);

      const header = await page.locator('header').first().boundingBox();
      expect(header).not.toBeNull();
      expect(header!.x + header!.width).toBeLessThanOrEqual(width + 1);

      // Mobil düzen: mini canlı QR + segmentli düzenleyici viewport içinde kalmalı
      for (const testId of ['mobile-studio', 'mobile-live-proof', 'mobile-panel-content']) {
        const box = await page.getByTestId(testId).boundingBox();
        expect(box, `${testId} görünür olmalı`).not.toBeNull();
        expect(box!.x + box!.width, `${testId} taşması`).toBeLessThanOrEqual(width + 1);
      }

      await page.getByTestId('mobile-step-design').click();
      const designBox = await page.getByTestId('mobile-panel-design').boundingBox();
      expect(designBox).not.toBeNull();
      expect(designBox!.x + designBox!.width, 'mobile-panel-design taşması').toBeLessThanOrEqual(
        width + 1,
      );

      const localeBox = await page.getByTestId('locale-select').boundingBox();
      const themeBox = await page.getByTestId('theme-control').boundingBox();
      expect(localeBox).not.toBeNull();
      expect(themeBox).not.toBeNull();
      expect(localeBox!.x + localeBox!.width).toBeLessThanOrEqual(themeBox!.x + 1);

      // Dil seçici mobilde de kullanılabilir (mobil düzen etiketleri çevrilir)
      await page.getByTestId('locale-en').click();
      await expect(page.getByText('Live QR')).toBeVisible();
      await page.getByTestId('locale-tr').click();
      await expect(page.getByText('Canlı QR')).toBeVisible();
    }
  });
});
