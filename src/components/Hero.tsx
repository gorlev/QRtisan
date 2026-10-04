/** Başlık ve kısa açıklama. */

import { useI18n } from '../i18n/I18nProvider';

export function Hero() {
  const { t } = useI18n();

  return (
    <section className="mx-auto max-w-[1240px] px-4 pb-7 pt-10 sm:px-6 sm:pt-14">
      <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-lavender">
        {t('Tarayıcıda çalışır · kurulum yok · hesap yok', 'Runs in your browser · no install · no account')}
      </p>
      <h1 className="mt-3 max-w-[22ch] text-[34px] font-extrabold leading-[1.04] tracking-[-0.02em] text-ink sm:text-[46px]">
        {t('Küçük kareler.', 'Small squares.')}
        <br />
        <span className="text-lavender">{t('Büyük fikirler.', 'Big ideas.')}</span>
      </h1>
      <p className="mt-4 max-w-[64ch] text-[14.5px] leading-relaxed text-ink-soft">
        {t(
          'Menünüz, kartvizitiniz veya davetiyeniz için QR kodunuzu tasarlayın: çerçeve, logo, renk ve modül şekilleri. Her şey kendi tarayıcınızda üretilir; dosyalarınız hiçbir sunucuya gönderilmez.',
          'Design a QR code for your menu, business card, or invitation: frames, logos, colors, and module shapes. Everything is generated right in your browser — your files are never sent to a server.',
        )}
      </p>
    </section>
  );
}
