/**
 * Dışa aktarma hatalarının ve durum metinlerinin yerelleştirmesi (uçtan uca).
 *
 * Kapsam: PNG hatalarında ham iç mesaj sızıntısı olmaması, hata sonrası
 * toparlanma, dışa aktarma sürerken dil değişiminde eski dilde durum
 * kalmaması ve başarı sonrası dil değişiminde bayat metin gösterilmemesi.
 */

import { expect, test, type Page } from '@playwright/test';
import { seedUrl } from './seed';

async function switchLocale(page: Page, locale: 'tr' | 'en') {
  await page.getByTestId(`locale-${locale}`).click();
}

async function waitForFonts(page: Page) {
  await page.waitForFunction(() => document.fonts.status === 'loaded');
}

/** Dışa aktarma bölümünün durum satırı. */
function exportStatus(page: Page) {
  return page
    .locator('section')
    .filter({ has: page.getByRole('button', { name: /PNG indir|Download PNG/ }) })
    .getByRole('status');
}

/** Ham iç (Türkçe) dışa aktarma hatalarının UI'a sızmaması gereken parçaları. */
const RAW_INTERNAL_FRAGMENTS = ['üretilemedi', 'oluşturulamadı', 'desteklenmiyor', 'Tuval', 'Path2D'];

test.describe('Dışa aktarma yerelleştirmesi', () => {
  test('PNG hatası İngilizce doğal metin gösterir, ham Türkçe sızdırmaz ve toparlanır', async ({ page }) => {
    // İlk toBlob çağrısı null döner (PNG üretilemedi yolu), sonrakiler gerçek blob üretir.
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        toBlob: (callback: BlobCallback, type?: string, quality?: number) => void;
      };
      const original = proto.toBlob;
      let failed = false;
      proto.toBlob = function (this: HTMLCanvasElement, callback, type, quality) {
        if (!failed) {
          failed = true;
          window.setTimeout(() => callback(null), 0);
          return;
        }
        original.call(this, callback, type, quality);
      };
    });

    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await switchLocale(page, 'en');

    const status = exportStatus(page);
    await page.getByRole('button', { name: 'Download PNG' }).click();
    await expect(status).toContainText('Could not generate the PNG file.');
    for (const fragment of RAW_INTERNAL_FRAGMENTS) {
      await expect(status).not.toContainText(fragment);
    }

    // Toparlanma: ikinci deneme gerçek blob ile başarıyla iner.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).click(),
    ]);
    expect(await download.path()).toBeTruthy();
    await expect(status).toContainText('PNG downloaded');
    for (const fragment of RAW_INTERNAL_FRAGMENTS) {
      await expect(status).not.toContainText(fragment);
    }
  });

  test('dışa aktarma tuvali bağlamı oluşturulamazsa İngilizce mesaj; önizleme bozulmaz', async ({ page }) => {
    // Yalnızca dışa aktarma tuvalini hedefle: DOM'a bağlı olmayan ve genişliği
    // büyük (export 1024 px) tuval. Ölçüm tuvali (300 px) ve önizleme (bağlı) etkilenmez.
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (type: string, ...rest: unknown[]) => unknown;
      };
      const original = proto.getContext;
      proto.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === '2d' && !this.isConnected && this.width >= 512) return null;
        return original.call(this, type, ...rest);
      };
    });

    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await switchLocale(page, 'en');

    // Önizleme başlangıçta çalışıyor.
    await expect(page.getByRole('img', { name: 'Generated QR code preview' })).toBeVisible();

    const status = exportStatus(page);
    await page.getByRole('button', { name: 'Download PNG' }).click();
    await expect(status).toContainText('Could not create the export canvas.');
    for (const fragment of RAW_INTERNAL_FRAGMENTS) {
      await expect(status).not.toContainText(fragment);
    }

    // Önizleme hâlâ ayakta.
    await expect(page.getByRole('img', { name: 'Generated QR code preview' })).toBeVisible();
  });

  test('dışa aktarma sürerken EN→TR geçişinde meşgul ipucu Türkçeleşir, eski dil kalmaz', async ({ page }) => {
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        toBlob: (callback: BlobCallback, type?: string, quality?: number) => void;
      };
      const original = proto.toBlob;
      proto.toBlob = function (this: HTMLCanvasElement, callback, type, quality) {
        window.setTimeout(() => original.call(this, callback, type, quality), 1500);
      };
    });

    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await switchLocale(page, 'en');

    const status = exportStatus(page);
    await page.getByRole('button', { name: 'Download PNG' }).click();
    await expect(status).toContainText('Preparing PNG…');

    // İş sürerken Türkçeye geç: meşgul ipucu Türkçeleşmeli, İngilizce kalmamalı.
    await switchLocale(page, 'tr');
    await expect(status).toContainText('PNG hazırlanıyor…');
    await expect(status).not.toContainText('Preparing PNG');

    // İş tamamlandığında eski dilde başarı metni görünmemeli.
    await page.waitForTimeout(2500);
    await expect(status).not.toContainText('PNG downloaded');
    await expect(status).not.toContainText('SVG downloaded');
  });

  test('başarılı dışa aktarmadan sonra dil değişince bayat metin gösterilmez', async ({ page }) => {
    await page.goto('/');
    await waitForFonts(page);
    await seedUrl(page);
    await switchLocale(page, 'en');

    const status = exportStatus(page);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).click(),
    ]);
    expect(await download.path()).toBeTruthy();
    await expect(status).toContainText('PNG downloaded');

    await switchLocale(page, 'tr');
    await expect(status).not.toContainText('PNG downloaded');
    // Bayat İngilizce yerine güncel Türkçe durum/ipucu görünmeli.
    await expect(status).toContainText(/Dosyalar tarayıcınızda|PNG indirildi|PNG hazırlanıyor/);
  });
});
