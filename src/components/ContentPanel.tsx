/** İçerik paneli — Web sitesi / Metin / E-posta / Wi-Fi modları ve doğrulama. */

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, Eye, Link2, Mail, Type, Wifi } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { getModeLabels, MAX_TEXT_LENGTH, truncatePayload, type ContentEvaluation } from '../lib/content';
import type { ContentFields, ContentMode, EmailFields, WifiFields } from '../lib/types';
import { Button, cx, Field, Panel, PanelHeader, Select, Switch, TextArea, TextInput } from './ui';

const MODE_ICONS = {
  url: Link2,
  text: Type,
  email: Mail,
  wifi: Wifi,
} as const;

const MODES: ContentMode[] = ['url', 'text', 'email', 'wifi'];

interface ContentPanelProps {
  mode: ContentMode;
  content: ContentFields;
  evaluation: ContentEvaluation;
  /** İçerik doğrulandı ama QR kapasitesine sığmadı. */
  matrixError: string | null;
  onModeChange: (mode: ContentMode) => void;
  onPatchContent: (patch: Partial<ContentFields>) => void;
  onPatchEmail: (patch: Partial<EmailFields>) => void;
  onPatchWifi: (patch: Partial<WifiFields>) => void;
}

export function ContentPanel({
  mode,
  content,
  evaluation,
  matrixError,
  onModeChange,
  onPatchContent,
  onPatchEmail,
  onPatchWifi,
}: ContentPanelProps) {
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyPayload = async () => {
    if (!evaluation.payload) return;
    try {
      await navigator.clipboard.writeText(evaluation.payload);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const modeLabels = getModeLabels(locale);

  return (
    <Panel>
      <PanelHeader
        step="01"
        title={t('İçerik', 'Content')}
        hint={t('QR kodunuzun yönlendireceği veriyi girin.', 'Enter the data your QR code should point to.')}
      />

      <fieldset>
        <legend className="sr-only">{t('İçerik türü', 'Content type')}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map((value) => {
            const Icon = MODE_ICONS[value];
            const selected = mode === value;
            return (
              <label
                key={value}
                className={cx(
                  'has-focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] font-bold transition',
                  selected
                    ? 'border-lavender bg-lilac-soft text-lavender-deep ring-2 ring-lavender/20'
                    : 'border-line bg-white text-ink-soft hover:border-lavender/40 hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name="content-mode"
                  value={value}
                  checked={selected}
                  onChange={() => onModeChange(value)}
                  className="sr-only"
                />
                <Icon size={15} aria-hidden />
                {modeLabels[value]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 space-y-4">
        {mode === 'url' && (
          <Field
            htmlFor="content-url"
            label={t('Web adresi', 'Web address')}
            hint={t('https:// otomatik eklenir', 'https:// is added automatically')}
            error={evaluation.errorFor('url')}
          >
            <TextInput
              id="content-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="example.com"
              value={content.url}
              invalid={Boolean(evaluation.errorFor('url'))}
              aria-describedby={evaluation.errorFor('url') ? 'content-url-error' : undefined}
              onChange={(event) => onPatchContent({ url: event.target.value })}
            />
          </Field>
        )}

        {mode === 'text' && (
          <Field
            htmlFor="content-text"
            label={t('Metin', 'Text')}
            hint={`${content.text.length}/${MAX_TEXT_LENGTH}`}
            error={evaluation.errorFor('text')}
          >
            <TextArea
              id="content-text"
              rows={5}
              placeholder={t(
                'Örn. Masalarımızda QR kodu okutarak menüye ulaşabilirsiniz.',
                'E.g. Scan the QR code on your table to open our menu.',
              )}
              value={content.text}
              maxLength={MAX_TEXT_LENGTH + 1}
              invalid={Boolean(evaluation.errorFor('text'))}
              aria-describedby={evaluation.errorFor('text') ? 'content-text-error' : undefined}
              onChange={(event) => onPatchContent({ text: event.target.value })}
            />
          </Field>
        )}

        {mode === 'email' && (
          <div className="space-y-4">
            <Field
              htmlFor="email-to"
              label={t('Alıcı', 'Recipient')}
              error={evaluation.errorFor('email.to')}
            >
              <TextInput
                id="email-to"
                type="email"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                placeholder={t('merhaba@example.com', 'hello@example.com')}
                value={content.email.to}
                invalid={Boolean(evaluation.errorFor('email.to'))}
                aria-describedby={evaluation.errorFor('email.to') ? 'email-to-error' : undefined}
                onChange={(event) => onPatchEmail({ to: event.target.value })}
              />
            </Field>
            <Field htmlFor="email-subject" label={t('Konu', 'Subject')} optional>
              <TextInput
                id="email-subject"
                value={content.email.subject}
                placeholder={t('Bilgi talebi', 'Information request')}
                onChange={(event) => onPatchEmail({ subject: event.target.value })}
              />
            </Field>
            <Field htmlFor="email-body" label={t('Mesaj', 'Message')} optional>
              <TextArea
                id="email-body"
                rows={3}
                value={content.email.body}
                placeholder={t('Merhaba, ...', 'Hi there, ...')}
                onChange={(event) => onPatchEmail({ body: event.target.value })}
              />
            </Field>
          </div>
        )}

        {mode === 'wifi' && (
          <div className="space-y-4">
            <Field
              htmlFor="wifi-ssid"
              label={t('Ağ adı (SSID)', 'Network name (SSID)')}
              error={evaluation.errorFor('wifi.ssid')}
            >
              <TextInput
                id="wifi-ssid"
                value={content.wifi.ssid}
                autoComplete="off"
                placeholder={t('KafeMisafir', 'CafeGuest')}
                invalid={Boolean(evaluation.errorFor('wifi.ssid'))}
                aria-describedby={evaluation.errorFor('wifi.ssid') ? 'wifi-ssid-error' : undefined}
                onChange={(event) => onPatchWifi({ ssid: event.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="wifi-encryption" label={t('Güvenlik', 'Security')}>
                <Select
                  id="wifi-encryption"
                  value={content.wifi.encryption}
                  onChange={(event) =>
                    onPatchWifi({ encryption: event.target.value as WifiFields['encryption'] })
                  }
                >
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">{t('WEP (eski)', 'WEP (legacy)')}</option>
                  <option value="nopass">{t('Şifresiz', 'No password')}</option>
                </Select>
              </Field>
              <Field
                htmlFor="wifi-password"
                label={t('Şifre', 'Password')}
                error={evaluation.errorFor('wifi.password')}
                className={content.wifi.encryption === 'nopass' ? 'opacity-50' : undefined}
              >
                <div className="relative">
                  <TextInput
                    id="wifi-password"
                    type={showPassword ? 'text' : 'password'}
                    value={content.wifi.password}
                    autoComplete="off"
                    disabled={content.wifi.encryption === 'nopass'}
                    invalid={Boolean(evaluation.errorFor('wifi.password'))}
                    aria-describedby={evaluation.errorFor('wifi.password') ? 'wifi-password-error' : undefined}
                    className="pr-10"
                    onChange={(event) => onPatchWifi({ password: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? t('Şifreyi gizle', 'Hide password') : t('Şifreyi göster', 'Show password')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-soft transition hover:bg-lilac-soft hover:text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender/20"
                  >
                    <Eye size={15} aria-hidden />
                  </button>
                </div>
              </Field>
            </div>
            <Switch
              id="wifi-hidden"
              label={t('Gizli ağ', 'Hidden network')}
              checked={content.wifi.hidden}
              hint={t(
                "Ağ SSID'yi yayınlamıyorsa işaretleyin.",
                'Check this if the network does not broadcast its SSID.',
              )}
              onChange={(hidden) => onPatchWifi({ hidden })}
            />
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-canvas/70 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-soft">
            {t('QR içeriği', 'QR payload')}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={copyPayload}
            disabled={!evaluation.payload}
            aria-live="polite"
          >
            {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            {copied ? t('Kopyalandı', 'Copied') : t('Kopyala', 'Copy')}
          </Button>
        </div>
        <p
          data-testid="payload-preview"
          className="mt-1.5 break-all font-mono text-[11.5px] leading-relaxed text-ink"
        >
          {truncatePayload(evaluation.payload) || t('— içerik bekleniyor —', '— waiting for content —')}
        </p>
      </div>

      {matrixError && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-900"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-bold">{t('İçerik QR koduna sığmıyor', 'Content does not fit the QR code')}</p>
            <p>{matrixError}</p>
          </div>
        </div>
      )}
    </Panel>
  );
}
