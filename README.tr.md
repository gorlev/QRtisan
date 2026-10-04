<p align="center">
  <img src="public/brand/qrtisan-readme.svg" alt="QRtisan" width="480" />
</p>

<p align="center">
  <strong>QR kodunu tasarla. Sana özgü olsun. Verilerin cihazında kalsın.</strong>
</p>

<p align="center">
  <a href="https://gorlev.github.io/QRtisan/">Uygulamayı aç</a> ·
  <a href="README.md">English</a> ·
  <a href="#geliştirme">Geliştirme</a>
</p>

QRtisan; bağlantı, metin, e-posta ve Wi-Fi için tarayıcıda çalışan bir QR kod
tasarım stüdyosudur. Renkleri, şekilleri, çerçeveyi ve logoyu düzenle; baskı veya
dijital kullanım için PNG ya da SVG indir. Hesap açman gerekmez. Girdiğin içerik
ve yüklediğin görseller kendi cihazında işlenir.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/studio-dark.png" />
  <img src="docs/images/studio-light.png" alt="QRtisan tasarım araçları, canlı QR önizlemesi ve indirme seçenekleri" width="1440" />
</picture>

## Neler yapabilirsin?

| Özellik | Seçenekler |
| --- | --- |
| **İçerik** | Web bağlantısı, düz metin, konu ve mesaj içeren e-posta, Wi-Fi bilgileri |
| **Tasarım** | 7 çerçeve, düzenlenebilir etiketler, 7 modül şekli, özelleştirilebilir köşeler |
| **Logo** | PNG, JPEG veya WebP; boyut ve iç boşluk ayarı |
| **Renk** | Özel renkler, hazır paletler, ters renkler, şeffaf arka plan |
| **Çıktı** | 512, 1024 veya 2048 px PNG; ölçeklenebilir SVG |
| **Çalışma alanı** | 8 hazır tasarım, Türkçe ve İngilizce, açık ve koyu tema |

Önizleme düzenleme sırasında anında güncellenir. Masaüstünde QR ve indirme
seçenekleri sayfayı kaydırırken seni takip eder. Mobilde küçük canlı önizleme ve
ayrı önizleme/indirme paneli, dar ekranlarda düzenlemeyi kolaylaştırır.

## Üç adımda hazır

1. **İçeriği seç.** Bağlantı, metin, e-posta veya Wi-Fi bilgilerini gir.
2. **Tasarımı oluştur.** Hazır bir tasarımla başla ya da çerçeveyi, renkleri, şekilleri ve logoyu düzenle.
3. **Kontrol et ve indir.** Taranabilirlik uyarılarını incele; PNG veya SVG dosyanı indir.

Baskıdan veya paylaşımdan önce indirdiğin kodu telefonla okut. Dekoratif şekiller,
düşük kontrast, büyük logolar ve yoğun içerik taramayı etkileyebilir.

## Gizlilik

QR üretimi, logo işleme ve dışa aktarma tarayıcıda yapılır. Uygulamanın bir sunucu
arka ucu yoktur; QR içeriği ve yüklediğin logo bir sunucuya gönderilmez. Yayındaki
site, uygulama dosyalarını ve yazı tiplerini GitHub Pages üzerinden yükler.

Yalnızca tema ve açıkça seçtiğin dil tercihi yerel depolamada saklanır. İçerik ve
tasarım bellekte tutulur; sayfayı yenilediğinde sıfırlanır.

İndirdiğin QR, girdiğin bilgileri içerir; Wi-Fi modunda şifre de buna dahildir.
SVG çıktısı yüklediğin logoyu da gömer ve görselin meta verilerini koruyabilir.

## Geliştirme

**Gereksinimler:** Node.js 20.19+ ve npm. Yayın workflow’u Node.js 24 kullanır.

```bash
git clone https://github.com/gorlev/QRtisan.git
cd QRtisan
npm ci
npm run dev
```

[localhost:5173](http://localhost:5173) adresini aç. Port doluysa Vite bir sonraki
boş portu seçer.

### Komutlar

| Komut | İşlev |
| --- | --- |
| `npm run dev` | Geliştirme sunucusunu başlatır |
| `npm run build` | Tipleri kontrol eder, `dist/` klasörüne derler |
| `npm run preview` | Üretim derlemesini 4173 portunda sunar |
| `npm run check` | Tip kontrolü, lint, birim testleri ve derlemeyi çalıştırır |
| `npm run test:e2e` | Playwright tarayıcı testlerini çalıştırır |

Tarayıcı testleri için Chromium’u bir kez kur:

```bash
npx playwright install chromium
npm run test:e2e
```

### Nasıl çalışır?

**React, TypeScript, Vite ve Tailwind CSS** ile geliştirildi. QR matrisini `qrcode`
kütüphanesi üretir. Önizleme, PNG ve SVG aynı sahne modelini kullanır; geometrileri
bu sayede tutarlı kalır.

| Klasör | Sorumluluk |
| --- | --- |
| `src/lib/` | İçerik doğrulama, QR üretimi, geometri, renk ve uyarı kuralları |
| `src/lib/render/` | Ortak sahne modeli, Canvas/SVG çizimi ve dışa aktarma |
| `src/components/` | Düzenleyici, önizleme ve indirme arayüzü |
| `src/hooks/` | Stüdyo durumu ve ekran boyutuna uyarlanan düzen |
| `src/i18n/`, `src/theme/` | Dil ve tema tercihleri |
| `e2e/` | Tarayıcı akışları ve farklı ekran boyutları için testler |

Vitest; doğrulama, çizim, tipografi ve jsQR/ZXing ile QR çözümlemeyi kapsar.
Playwright; düzenleme, indirme, dil, tema ve ekran düzenini kontrol eder.
Ayrıntılı gereksinimler [ürün spesifikasyonunda](docs/PRD.md) bulunur.

## Yayınlama

[Pages workflow’u](.github/workflows/pages.yml) uygulamayı kontrol edip derler;
`main` dalına her push sonrasında [GitHub Pages’e](https://gorlev.github.io/QRtisan/)
yayınlar. GitHub Pages’in yayın kaynağı GitHub Actions olarak ayarlıdır.

Aynı derlemeyi yerelde denemek için:

```bash
npm run build -- --base=/QRtisan/
npm run preview
```

[localhost:4173/QRtisan/](http://localhost:4173/QRtisan/) adresini aç.

## Kullanım sınırları

- **Logo:** PNG, JPEG veya WebP; en fazla 2 MB; her boyut 24–4000 px arasında.
- **Kapasite:** Kodlanan bayt sayısına ve hata düzeltme seviyesine bağlıdır. Logo
  kullanıldığında H seviyesi gerekir; seçili seviyeye sığmayan içerik dışa aktarılamaz.
- **Etiket:** Kısa metinler daha iyi sonuç verir. Çok uzun metin çerçevenin sığdırma sınırını aşabilir.
- **SVG yazı tipleri:** Bazı vektör editörleri gömülü fontları kullanmaz. Birebir
  görünüm gerekiyorsa PNG tercih et.
- **Tarama:** Ekrandaki kontroller riskleri gösterir; her okuyucu, baskı yüzeyi ve
  çıktı boyutunda başarı garantisi vermez.

## Lisans

Bu proje [MIT Lisansı](LICENSE) ile sunulur. Bağımlılıklar kendi lisanslarına tabidir.
