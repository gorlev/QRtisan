/** Alt bilgi — gizlilik ve teknik notlar. */

import { Lock, ShieldCheck } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-line bg-white/70">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <img src="/brand/qrtisan-stacked.png" alt="QRtisan" width="1254" height="1254" loading="lazy" className="brand-stacked shrink-0 self-start sm:self-center" />
        <div className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-lavender" aria-hidden />
          <p className="max-w-[70ch]">
            {t(
              'Tüm QR kod üretimi ve görsel işleme cihazınızda yapılır; içerik, logo ve tasarım hiçbir sunucuya gönderilmez. Dil ve tema tercihiniz bu tarayıcıda saklanır; QR içeriğiniz ve tasarımınız sayfa yenilenince sıfırlanır.',
              'All QR code generation and image processing happen on your device — your content, logo, and design are never sent to a server. Your language and theme preferences are saved in this browser; your QR content and design reset when you refresh.',
            )}
          </p>
        </div>
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft/80">
          <Lock size={12} aria-hidden />
          {t('QRtisan · v1.0 · yerel çalışır', 'QRtisan · v1.0 · runs locally')}
        </p>
      </div>
    </footer>
  );
}
