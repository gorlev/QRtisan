/** İçerik modelleri, doğrulama ve QR yükü (payload) üretimi. */

import { translate, type Locale } from './locale';
import type { ContentFields, ContentMode, WifiFields } from './types';

export const MODE_LABELS: Record<ContentMode, string> = {
  url: 'Web sitesi',
  text: 'Metin',
  email: 'E-posta',
  wifi: 'Wi-Fi',
};

export const MODE_LABELS_EN: Record<ContentMode, string> = {
  url: 'Website',
  text: 'Text',
  email: 'Email',
  wifi: 'Wi-Fi',
};

/** Mod sekmesi etiketleri — anahtarlar her dilde sabittir. */
export function getModeLabels(locale: Locale = 'tr'): Record<ContentMode, string> {
  return locale === 'en' ? MODE_LABELS_EN : MODE_LABELS;
}

/**
 * Arayüzdeki üst sınır (UTF-16 kod birimi).
 *
 * Gerçek kapasite sınırı bu değer değildir: QR kapasitesi **bayt** cinsindendir
 * ve çok baytlı karakterlerde (Türkçe, emoji) daha hızlı dolar. Gerçek denetim
 * `qr.ts` içindeki kodlayıcıda yapılır; sığmayan içerik kullanıcıya bildirilir
 * veya otomatik seviyede daha düşük hata düzeltmeye geçilir.
 */
export const MAX_TEXT_LENGTH = 1200;

/**
 * Başlangıç içeriği — örnek adres **önceden yazılmaz**; `example.com`
 * yalnızca arayüzdeki yer tutucudur. Dışa aktarma, kullanıcı geçerli bir
 * adres yazana kadar kapalı kalır.
 */
export const DEFAULT_CONTENT: ContentFields = {
  url: '',
  text: '',
  email: { to: '', subject: '', body: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
};

export interface FieldError {
  field: string;
  message: string;
}

export interface ContentEvaluation {
  payload: string;
  errors: FieldError[];
  /** İlk hata — önizleme alanındaki genel mesaj için. */
  primaryError: string | null;
  /** Alan bazlı hata aramak için pratik yardımcı. */
  errorFor: (field: string) => string | null;
}

/** Şema eksikse https:// ekler, boşlukları temizler. */
export function normalizeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value;
  return `https://${value}`;
}

const HOST_LABEL = '[a-z0-9]([a-z0-9-]*[a-z0-9])?';
const DOTTED_HOST_RE = new RegExp(`^(${HOST_LABEL}\\.)+[a-z]{2,}$`, 'i');
const SINGLE_LABEL_RE = new RegExp(`^${HOST_LABEL}$`, 'i');

/** Her okteti 0–255 aralığında olan gerçek IPv4 adresi mi? */
export function isValidIpv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

export function validateUrl(raw: string, locale: Locale = 'tr'): string | null {
  const value = raw.trim();
  if (!value) return translate(locale, 'Web adresi gerekli.', 'Enter a web address.');
  if (/\s/.test(value)) {
    return translate(locale, 'Adres boşluk içeremez.', 'The address cannot contain spaces.');
  }
  const explicitScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const normalized = normalizeUrl(value);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return translate(
      locale,
      'Geçerli bir adres girin, örn. example.com',
      'Enter a valid address, e.g. example.com',
    );
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    return translate(
      locale,
      'Yalnızca http ve https adresleri desteklenir.',
      'Only http and https addresses are supported.',
    );
  }
  const host = parsed.hostname;
  if (isValidIpv4(host) || host === 'localhost' || DOTTED_HOST_RE.test(host)) return null;
  // Yerel ağ adları (örn. `http://nas`, `nas:5000`) yalnızca şema veya port
  // belirtilmişse kabul edilir; çıplak "merhaba" gibi girdiler reddedilir.
  if (SINGLE_LABEL_RE.test(host) && (explicitScheme || parsed.port !== '')) return null;
  return translate(
    locale,
    'Geçerli bir alan adı girin, örn. example.com',
    'Enter a valid domain name, e.g. example.com',
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(raw: string, locale: Locale = 'tr'): string | null {
  const value = raw.trim();
  if (!value) return translate(locale, 'E-posta adresi gerekli.', 'Enter an email address.');
  if (!EMAIL_RE.test(value)) {
    return translate(locale, 'Geçerli bir e-posta adresi girin.', 'Enter a valid email address.');
  }
  return null;
}

export function validateWifi(wifi: WifiFields, locale: Locale = 'tr'): FieldError[] {
  const errors: FieldError[] = [];
  if (!wifi.ssid.trim()) {
    errors.push({
      field: 'wifi.ssid',
      message: translate(locale, 'Ağ adı (SSID) gerekli.', 'Network name (SSID) is required.'),
    });
  }
  if (wifi.encryption !== 'nopass' && !wifi.password) {
    errors.push({
      field: 'wifi.password',
      message: translate(
        locale,
        'Şifre gerekli ya da "Şifresiz" seçin.',
        'Enter a password or choose "No password".',
      ),
    });
  }
  return errors;
}

export function validateText(text: string, locale: Locale = 'tr'): string | null {
  if (!text.trim()) return translate(locale, 'Metin gerekli.', 'Enter some text.');
  if (text.length > MAX_TEXT_LENGTH) {
    return translate(
      locale,
      `Metin en fazla ${MAX_TEXT_LENGTH} karakter olabilir.`,
      `Text can be at most ${MAX_TEXT_LENGTH} characters.`,
    );
  }
  return null;
}

/** Wi-Fi standardına göre özel karakterleri kaçırır (\ ; , : "). */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

export function buildWifiPayload(wifi: WifiFields): string {
  const parts = [`T:${wifi.encryption}`, `S:${escapeWifi(wifi.ssid.trim())}`];
  if (wifi.encryption !== 'nopass' && wifi.password) {
    parts.push(`P:${escapeWifi(wifi.password)}`);
  }
  if (wifi.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

export function buildEmailPayload(email: ContentFields['email']): string {
  const address = email.to.trim();
  const params: string[] = [];
  if (email.subject.trim()) params.push(`subject=${encodeURIComponent(email.subject.trim())}`);
  if (email.body.trim()) params.push(`body=${encodeURIComponent(email.body)}`);
  return params.length ? `mailto:${address}?${params.join('&')}` : `mailto:${address}`;
}

/** Moda göre nihai QR içeriğini ve doğrulama hatalarını üretir. */
export function evaluateContent(
  mode: ContentMode,
  content: ContentFields,
  locale: Locale = 'tr',
): ContentEvaluation {
  const errors: FieldError[] = [];

  if (mode === 'url') {
    // Boş alan "henüz girilmedi" demektir; ilk dokunulmamış yüklemede veya
    // alan temizlendiğinde korkutucu bir doğrulama hatası gösterilmez.
    if (content.url.trim()) {
      const message = validateUrl(content.url, locale);
      if (message) errors.push({ field: 'url', message });
    }
  }
  if (mode === 'text') {
    const message = validateText(content.text, locale);
    if (message) errors.push({ field: 'text', message });
  }
  if (mode === 'email') {
    const message = validateEmail(content.email.to, locale);
    if (message) errors.push({ field: 'email.to', message });
  }
  if (mode === 'wifi') {
    errors.push(...validateWifi(content.wifi, locale));
  }

  let payload = '';
  if (mode === 'url') payload = normalizeUrl(content.url);
  if (mode === 'text') payload = content.text;
  if (mode === 'email') payload = buildEmailPayload(content.email);
  if (mode === 'wifi') payload = buildWifiPayload(content.wifi);

  const errorFor = (field: string) => errors.find((e) => e.field === field)?.message ?? null;

  return {
    payload: errors.length ? '' : payload,
    errors,
    primaryError: errors[0]?.message ?? null,
    errorFor,
  };
}

/** Metnin UTF-8 bayt uzunluğu — QR kapasitesi bayt cinsindendir. */
export function utf8ByteLength(value: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
  let bytes = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** Önizlemede taşmayı önlemek için yükü kod noktası sınırında kısaltır. */
export function truncatePayload(payload: string, max = 96): string {
  const codePoints = Array.from(payload);
  if (codePoints.length <= max) return payload;
  const keep = Math.max(0, max - 1);
  return `${codePoints.slice(0, keep).join('')}…`;
}
