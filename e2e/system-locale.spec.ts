/**
 * Sistem dili varsayılanı uçtan uca testleri.
 *
 * Kapsam: ilk ziyarette `navigator.languages` öncelik sırasına göre dil seçimi,
 * desteklenmeyen sistem dillerinde İngilizceye düşme, `navigator.language`
 * yedeği, kayıtlı açık tercihin (geçersiz değerler dahil) sistemi geçersiz
 * kılması, otomatik seçimin kalıcılaştırılmaması, depolama engelliyken
 * çökmeme, açık tercih yokken dil değişiminin canlı izlenmesi, manuel seçim
 * sonrası sabitlenmesi, `document.lang`/`title` meta verisi ve dil değişiminin
 * QR yükünü, tasarımı, logoyu ve temayı değiştirmemesi.
 *
 * Not: `playwright.config.ts` varsayılan bağlamı determinist olması için
 * `locale: 'tr-TR'` ile açar; İngilizce ve desteklenmeyen sistem dilleri bu
 * dosyada açıkça ezilir.
 */

import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

const LOCALE_KEY = 'kare-locale';
const TR_TITLE = 'QRtisan — Tarayıcıda QR Kod Tasarımı';
const EN_TITLE = 'QRtisan — QR Code Design in Your Browser';

interface LanguageStub {
  languages: string[];
  language: string;
}

/**
 * `navigator.languages`/`navigator.language` değerlerini sayfa açılmadan önce
 * sabitler ve test sırasında değiştirilebilir kılar. `languagechange` olayı
 * gerçek tarayıcı davranışını taklit etmek için elle tetiklenir.
 */
async function stubSystemLanguages(page: Page, initial: LanguageStub) {
  await page.addInitScript((seed: LanguageStub) => {
    const state = { languages: seed.languages.slice(), language: seed.language };
    Object.defineProperty(window.navigator, 'languages', {
      configurable: true,
      get: () => state.languages.slice(),
    });
    Object.defineProperty(window.navigator, 'language', {
      configurable: true,
      get: () => state.language,
    });
    (window as unknown as { __kareSetLanguages: (next: string[]) => void }).__kareSetLanguages = (
      next: string[],
    ) => {
      state.languages = next.slice();
      if (next.length > 0) state.language = next[0];
      window.dispatchEvent(new Event('languagechange'));
    };
  }, initial);
}

async function setSystemLanguages(page: Page, languages: string[]) {
  const dispatched = await page.evaluate((next) => {
    const setter = (window as unknown as { __kareSetLanguages?: (value: string[]) => void })
      .__kareSetLanguages;
    if (!setter) return false;
    setter(next);
    return true;
  }, languages);
  expect(dispatched, 'dil sahtelemesi kurulu olmalı').toBe(true);
}

async function storedLocale(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), LOCALE_KEY);
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

test.describe('Sistem dili varsayılanı', () => {
  test('tr-TR sistemde ilk ziyaret Türkçe açılır ve otomatik tercih yazılmaz', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle(TR_TITLE);
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
    await expect(page.getByTestId('locale-tr')).toHaveAttribute('aria-pressed', 'true');

    // Otomatik çözümlenen dil açık tercih sayılmaz.
    expect(await storedLocale(page)).toBeNull();
  });

  test.describe('en-US sistem', () => {
    test.use({ locale: 'en-US' });

    test('İngilizce açılır ve otomatik tercih yazılmaz', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle(EN_TITLE);
      await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
      await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'true');
      expect(await storedLocale(page)).toBeNull();
    });

    test('kayıtlı açık tercih sistemi geçersiz kılar ve yenilemede korunur', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('kare-locale', 'tr'));
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
      await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();

      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
      await expect(page.getByTestId('locale-tr')).toHaveAttribute('aria-pressed', 'true');
      expect(await storedLocale(page)).toBe('tr');
    });

    test('geçersiz kayıtlı değer yok sayılır ve sistem dili kullanılır', async ({ page }) => {
      await page.addInitScript(() => window.localStorage.setItem('kare-locale', 'de'));
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
      await expect(page.getByTestId('locale-en')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  test.describe('desteklenmeyen sistem dili', () => {
    test.use({ locale: 'de-DE' });

    test('yalnızca desteklenmeyen dilde İngilizceye düşer', async ({ page }) => {
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle(EN_TITLE);
      await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
      expect(await storedLocale(page)).toBeNull();
    });
  });

  test('navigator.languages öncelik sırasındaki ilk desteklenen dil kazanır', async ({ page }) => {
    await stubSystemLanguages(page, { languages: ['de-DE', 'tr-TR', 'en-GB'], language: 'de-DE' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
  });

  test('desteklenen dillerin sırası korunur (en, tr den önceyse İngilizce)', async ({ page }) => {
    await stubSystemLanguages(page, { languages: ['de-DE', 'en-GB', 'tr-TR'], language: 'de-DE' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { name: /Small squares\./ })).toBeVisible();
  });

  test('languages boşsa navigator.language yedeği kullanılır', async ({ page }) => {
    await stubSystemLanguages(page, { languages: [], language: 'tr-TR' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();
  });

  test.describe('ilk boyama (React yüklenmeden)', () => {
    test('kayıtlı İngilizce tercih lang/title değerlerini önceden ayarlar', async ({ page }) => {
      // React paketini engelle: yalnızca index.html satır içi betiği çalışsın.
      await page.route('**/src/main.tsx', (route) => route.abort());
      await page.addInitScript(() => window.localStorage.setItem('kare-locale', 'en'));
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page).toHaveTitle(EN_TITLE);
    });

    test.describe('en-US sistem', () => {
      test.use({ locale: 'en-US' });

      test('otomatik sistem dili lang/title değerlerini önceden ayarlar', async ({ page }) => {
        await page.route('**/src/main.tsx', (route) => route.abort());
        await page.goto('/');

        await expect(page.locator('html')).toHaveAttribute('lang', 'en');
        await expect(page).toHaveTitle(EN_TITLE);
      });
    });
  });

  test('açık tercih yokken sistem dil değişimi izlenir, manuel seçimden sonra sabitlenir', async ({
    page,
  }) => {
    await stubSystemLanguages(page, { languages: ['de-DE'], language: 'de-DE' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Sistem dili desteklenen bir dile geçince arayüz otomatik uyar.
    await setSystemLanguages(page, ['tr-TR']);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page).toHaveTitle(TR_TITLE);
    expect(await storedLocale(page)).toBeNull();

    // Manuel seçim açık tercih olur ve kalıcılaşır.
    await page.getByTestId('locale-en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await storedLocale(page)).toBe('en');

    // Açık tercih varken sistem değişimi arayüzü değiştirmez.
    await setSystemLanguages(page, ['tr-TR']);
    await page.waitForTimeout(150);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(EN_TITLE);
  });

  test('depolama engelliyken sistem dili kullanılır; manuel seçim oturumda kalır', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('storage blocked');
        },
      });
    });
    await stubSystemLanguages(page, { languages: ['tr-TR'], language: 'tr-TR' });
    await page.goto('/');

    // Erişim engelli olsa da uygulama çökmez ve sistem dilini kullanır.
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.getByRole('heading', { name: /Küçük kareler/ })).toBeVisible();

    // Manuel seçim bu oturumda geçerlidir...
    await page.getByTestId('locale-en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // ...ve sistem dil değişimi artık onu ezemez (oturum içi açık tercih).
    await setSystemLanguages(page, ['tr-TR']);
    await page.waitForTimeout(150);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('otomatik dil değişimi QR yükünü, tasarımı, logoyu ve temayı değiştirmez', async ({
    page,
  }) => {
    await stubSystemLanguages(page, { languages: ['de-DE'], language: 'de-DE' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByLabel('Web address').fill('example.org/korunacak');
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/korunacak');

    await page.getByRole('tab', { name: /Color & Shape/ }).click();
    await page.getByLabel('Foreground (modules) hex code').fill('#1F6F5C');
    await page.getByText('Dots', { exact: true }).click();

    await page.getByRole('tab', { name: /^Logo/ }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: await makeLogoBuffer(),
    });
    await expect(page.getByText('logo.png')).toBeVisible();

    const beforeTheme = await page.getByTestId('theme-control').getAttribute('data-theme-preference');

    await setSystemLanguages(page, ['tr-TR']);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');

    // Yük, logo ve tema korunur.
    await expect(page.getByTestId('payload-preview')).toHaveText('https://example.org/korunacak');
    await expect(page.getByText('logo.png')).toBeVisible();
    await expect(page.getByTestId('theme-control')).toHaveAttribute(
      'data-theme-preference',
      beforeTheme ?? 'system',
    );

    // Tasarım durumu (renk, modül şekli) korunur.
    await page.getByRole('tab', { name: /Renk & Şekil/ }).click();
    await expect(page.getByLabel('Ön plan (modüller) hex kodu')).toHaveValue('#1f6f5c');
    expect(await page.locator('input[name="dot-style"][value="dots"]').isChecked()).toBe(true);

    // Otomatik geçiş yine açık tercih yazmaz.
    expect(await storedLocale(page)).toBeNull();
  });
});
