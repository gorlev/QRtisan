import { describe, expect, it } from 'vitest';
import {
  buildEmailPayload,
  buildWifiPayload,
  DEFAULT_CONTENT,
  escapeWifi,
  evaluateContent,
  getModeLabels,
  isValidIpv4,
  MAX_TEXT_LENGTH,
  MODE_LABELS,
  normalizeUrl,
  truncatePayload,
  utf8ByteLength,
  validateEmail,
  validateText,
  validateUrl,
  validateWifi,
} from './content';
import type { ContentFields } from './types';

const baseContent: ContentFields = {
  url: '',
  text: '',
  email: { to: '', subject: '', body: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
};

describe('normalizeUrl', () => {
  it('şema yoksa https ekler', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('  example.com/yol  ')).toBe('https://example.com/yol');
  });

  it('mevcut şemayı korur', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('https://example.com?a=1')).toBe('https://example.com?a=1');
  });

  it('port içeren adreslere şema ekler', () => {
    expect(normalizeUrl('localhost:5173')).toBe('https://localhost:5173');
  });

  it('boş girdide boş döner', () => {
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('validateUrl', () => {
  it('geçerli adresleri kabul eder', () => {
    expect(validateUrl('example.com')).toBeNull();
    expect(validateUrl('https://alt.example.co.uk/yol')).toBeNull();
    expect(validateUrl('localhost:5173')).toBeNull();
    expect(validateUrl('192.168.1.10')).toBeNull();
  });

  it('boş ve hatalı adresleri reddeder', () => {
    expect(validateUrl('')).toMatch(/gerekli/);
    expect(validateUrl('bir iki')).toMatch(/boşluk/);
    expect(validateUrl('merhaba')).toMatch(/alan adı/);
    expect(validateUrl('ftp://example.com')).toMatch(/http/);
  });
});

describe('validateEmail', () => {
  it('geçerli ve geçersiz adresleri ayırır', () => {
    expect(validateEmail('merhaba@example.com')).toBeNull();
    expect(validateEmail('merhaba@example')).toMatch(/e-posta/);
    expect(validateEmail('')).toMatch(/gerekli/);
  });
});

describe('Wi-Fi yükü', () => {
  it('özel karakterleri kaçırır', () => {
    expect(escapeWifi('a;b,c:d"e\\f')).toBe('a\\;b\\,c\\:d\\"e\\\\f');
  });

  it('WPA yükü üretir', () => {
    expect(buildWifiPayload({ ssid: 'Kafe', password: 'p@ss', encryption: 'WPA', hidden: false })).toBe(
      'WIFI:T:WPA;S:Kafe;P:p@ss;;',
    );
  });

  it('şifresiz ve gizli ağda alanları atlar/ekler', () => {
    expect(buildWifiPayload({ ssid: 'Açık', password: '', encryption: 'nopass', hidden: false })).toBe(
      'WIFI:T:nopass;S:Açık;;',
    );
    expect(buildWifiPayload({ ssid: 'Gizli', password: 'x', encryption: 'WPA', hidden: true })).toBe(
      'WIFI:T:WPA;S:Gizli;P:x;H:true;;',
    );
  });

  it('SSID zorunlu, şifre WPA/WEP için zorunlu', () => {
    expect(validateWifi({ ssid: '', password: '', encryption: 'WPA', hidden: false })).toHaveLength(2);
    expect(validateWifi({ ssid: 'a', password: '', encryption: 'nopass', hidden: false })).toHaveLength(0);
  });
});

describe('e-posta yükü', () => {
  it('konu ve mesajı kodlar', () => {
    expect(buildEmailPayload({ to: 'a@b.com', subject: 'Merhaba dünya', body: 'Satır 1' })).toBe(
      'mailto:a@b.com?subject=Merhaba%20d%C3%BCnya&body=Sat%C4%B1r%201',
    );
  });

  it('boş alanları atlar', () => {
    expect(buildEmailPayload({ to: 'a@b.com', subject: '', body: '' })).toBe('mailto:a@b.com');
  });
});

describe('evaluateContent', () => {
  it('hatalı içerikte yük üretmez', () => {
    const result = evaluateContent('url', { ...baseContent, url: 'gecersiz' });
    expect(result.payload).toBe('');
    expect(result.errors).toHaveLength(1);
    expect(result.errorFor('url')).toMatch(/alan adı/);
  });

  it('moda göre yükü üretir', () => {
    expect(evaluateContent('url', { ...baseContent, url: 'example.com' }).payload).toBe('https://example.com');
    expect(evaluateContent('text', { ...baseContent, text: 'merhaba' }).payload).toBe('merhaba');
    expect(
      evaluateContent('email', { ...baseContent, email: { to: 'a@b.com', subject: '', body: '' } }).payload,
    ).toBe('mailto:a@b.com');
    expect(
      evaluateContent('wifi', {
        ...baseContent,
        wifi: { ssid: 'Kafe', password: 'x', encryption: 'WPA', hidden: false },
      }).payload,
    ).toBe('WIFI:T:WPA;S:Kafe;P:x;;');
  });

  it('çok uzun metni reddeder', () => {
    const long = 'a'.repeat(MAX_TEXT_LENGTH + 1);
    expect(evaluateContent('text', { ...baseContent, text: long }).primaryError).toMatch(/en fazla/);
  });

  it('boş URL başlangıç durumudur: hata değil, yük boş kalır', () => {
    const result = evaluateContent('url', baseContent);
    expect(result.payload).toBe('');
    expect(result.errors).toEqual([]);
    expect(result.primaryError).toBeNull();
    expect(result.errorFor('url')).toBeNull();
  });
});

describe('başlangıç içeriği', () => {
  it('örnek adres önceden yazılmaz', () => {
    expect(DEFAULT_CONTENT.url).toBe('');
    expect(DEFAULT_CONTENT.text).toBe('');
    expect(DEFAULT_CONTENT.email.to).toBe('');
    expect(DEFAULT_CONTENT.wifi.ssid).toBe('');
  });
});

describe('URL doğrulaması: IPv4 ve yerel ağ', () => {
  it('geçersiz IPv4 oktetlerini reddeder', () => {
    for (const value of ['999.999.999.999', 'http://999.999.999.999', '256.1.1.1']) {
      const error = validateUrl(value);
      expect(error, value).not.toBeNull();
      expect(error, value).toMatch(/adres|alan adı/);
    }
  });

  it('geçerli IPv4 adreslerini kabul eder', () => {
    expect(validateUrl('192.168.1.10')).toBeNull();
    expect(validateUrl('http://10.0.0.254:8080')).toBeNull();
    expect(validateUrl('255.255.255.255')).toBeNull();
  });

  it('yerel ağ adlarını kabul eder', () => {
    expect(validateUrl('http://nas')).toBeNull();
    expect(validateUrl('nas:5000')).toBeNull();
    expect(validateUrl('http://yazici.local')).toBeNull();
  });

  it('şemasız ve portsuz tek etiketli girdiyi reddeder', () => {
    expect(validateUrl('merhaba')).toMatch(/alan adı/);
  });

  it('isValidIpv4 oktet aralığını denetler', () => {
    expect(isValidIpv4('192.168.0.1')).toBe(true);
    expect(isValidIpv4('0.0.0.0')).toBe(true);
    expect(isValidIpv4('255.255.255.255')).toBe(true);
    expect(isValidIpv4('256.1.1.1')).toBe(false);
    expect(isValidIpv4('999.999.999.999')).toBe(false);
    expect(isValidIpv4('1.2.3')).toBe(false);
    expect(isValidIpv4('example.com')).toBe(false);
  });
});

describe('utf8ByteLength', () => {
  it('UTF-8 bayt uzunluğunu döndürür', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('ü')).toBe(2);
    expect(utf8ByteLength('İ')).toBe(2);
    expect(utf8ByteLength('中')).toBe(3);
    expect(utf8ByteLength('🚀')).toBe(4);
  });
});

describe('truncatePayload', () => {
  it('uzun yükü kısaltır', () => {
    const value = 'x'.repeat(120);
    expect(truncatePayload(value, 20)).toHaveLength(20);
    expect(truncatePayload(value, 20).endsWith('…')).toBe(true);
    expect(truncatePayload('kısa', 20)).toBe('kısa');
  });

  it('surrogate çiftini bölmez (emoji güvenli)', () => {
    const result = truncatePayload('🚀'.repeat(10), 5);
    expect(Array.from(result)).toHaveLength(5);
    expect(result.endsWith('…')).toBe(true);
    // Eşleşmemiş yüksek/düşük surrogate kalmamalı
    expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(result)).toBe(false);
    expect(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(result)).toBe(false);
  });
});

describe('İngilizce doğrulama mesajları', () => {
  it('URL hatalarını yerelleştirir', () => {
    expect(validateUrl('', 'en')).toBe('Enter a web address.');
    expect(validateUrl('bir iki', 'en')).toBe('The address cannot contain spaces.');
    expect(validateUrl('merhaba', 'en')).toMatch(/domain/);
    expect(validateUrl('ftp://example.com', 'en')).toMatch(/http/);
    expect(validateUrl('example.com', 'en')).toBeNull();
  });

  it('e-posta hatalarını yerelleştirir', () => {
    expect(validateEmail('', 'en')).toBe('Enter an email address.');
    expect(validateEmail('merhaba@example', 'en')).toBe('Enter a valid email address.');
    expect(validateEmail('merhaba@example.com', 'en')).toBeNull();
  });

  it('Wi-Fi hatalarını yerelleştirir', () => {
    const errors = validateWifi({ ssid: '', password: '', encryption: 'WPA', hidden: false }, 'en');
    expect(errors.map((error) => error.field)).toEqual(['wifi.ssid', 'wifi.password']);
    expect(errors.map((error) => error.message)).toEqual([
      'Network name (SSID) is required.',
      'Enter a password or choose "No password".',
    ]);
  });

  it('metin hatalarını sınırla birlikte yerelleştirir', () => {
    expect(validateText('', 'en')).toBe('Enter some text.');
    expect(validateText('a'.repeat(MAX_TEXT_LENGTH + 1), 'en')).toBe(
      `Text can be at most ${MAX_TEXT_LENGTH} characters.`,
    );
  });

  it('evaluateContent hatalarını yerelleştirir, yükü dilden bağımsız tutar', () => {
    const content = { ...baseContent, url: 'gecersiz' };
    const tr = evaluateContent('url', content);
    const en = evaluateContent('url', content, 'en');
    expect(en.payload).toBe(tr.payload);
    expect(en.primaryError).toMatch(/domain/);
    expect(en.errorFor('url')).toBe('Enter a valid domain name, e.g. example.com');

    expect(evaluateContent('text', { ...baseContent, text: 'merhaba' }, 'en').payload).toBe('merhaba');
    expect(
      evaluateContent('wifi', {
        ...baseContent,
        wifi: { ssid: 'Kafe', password: 'x', encryption: 'WPA', hidden: false },
      }, 'en').payload,
    ).toBe('WIFI:T:WPA;S:Kafe;P:x;;');
  });
});

describe('getModeLabels', () => {
  it('anahtarları sabit tutar, etiketleri yerelleştirir', () => {
    expect(Object.keys(getModeLabels('en'))).toEqual(Object.keys(MODE_LABELS));
    expect(getModeLabels('tr')).toBe(MODE_LABELS);
    expect(getModeLabels('en')).toEqual({
      url: 'Website',
      text: 'Text',
      email: 'Email',
      wifi: 'Wi-Fi',
    });
  });
});
