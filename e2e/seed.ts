/**
 * Test tohumlama yardımcıları.
 *
 * Üretimde içerik alanı örnek adresle önceden doldurulmaz; geçerli bir QR
 * bekleyen testler sentetik adresi kullanıcı davranışıyla (yazma + odak
 * bırakma) açıkça girer. Böylece testler üretimin örnek değer yazmasına
 * bağımlı olmaz ve gerçek kullanıcı akışı taklit edilir.
 */

import type { Page } from '@playwright/test';

/** Sentetik, gerçek dışı test adresi (dokümantasyon örnekleriyle aynı). */
export const SEED_URL = 'https://example.com';

/** URL alanına açıkça sentetik adres yazar; odağı bırakır (mobil çubuk gizlenmez). */
export async function seedUrl(page: Page, value: string = SEED_URL): Promise<void> {
  await page.getByLabel(/Web adresi|Web address/).fill(value);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
}
