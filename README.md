# ✈️ Hava Brifing — Günlük Havacılık, Pilotaj ve Yapay Zeka EFB Uygulaması

**Hava Brifing**, her sabah Türkiye saati ile **08:00'de (05:00 UTC)** son 24 saatin küresel havacılık, uçak kaza/kırım, pilotaj/SOP ve yapay zeka gelişmelerini otomatik olarak derleyen, özetleyen ve telefonunuza bildirim gönderen **sunucusuz (serverless) bir Progressive Web App (PWA)** uygulamasıdır.

Airbus FlySmart / Jeppesen FD Pro **Electronic Flight Bag (EFB)** koyu kokpit estetiğiyle tasarlanmıştır; çevrimdışı (offline) çalışır ve veritabanı maliyeti **sıfırdır**.

---

## 📋 İçindekiler

1. [Nasıl Çalışır?](#-nasıl-çalışır)
2. [Adım 1: Projeyi GitHub'a Yükleme](#-adım-1-projeyi-githuba-yükleme)
3. [Adım 2: GitHub Secrets (Şifreler) Ekleme](#-adım-2-github-secrets-şifreler-ekleme)
4. [Adım 3: GitHub Pages Yayınını Aktif Etme](#-adım-3-github-pages-yayınını-aktif-etme)
5. [Adım 4: Telefona `ntfy` Bildirim Uygulamasını Kurma](#-adım-4-telefona-ntfy-bildirim-uygulamasını-kurma)
6. [Adım 5: Uygulamayı Telefona Ana Ekran Uygulaması (PWA) Olarak Ekleme](#-adım-5-uygulamayı-telefona-ana-ekran-uygulaması-pwa-olarak-ekleme)
7. [İlk Raporu Manuel Olarak Test Etme](#-ilk-raporu-manuel-olarak-test-etme)
8. [Bilgisayarda (Lokal) Çalıştırma](#-bilgisayarda-lokal-çalıştırma)

---

## ⚙️ Nasıl Çalışır?

1. **Veri Toplama (RSS):** Her sabah 08:00 TRT'de GitHub Actions uyanır; *The Aviation Herald*, *Aviation Safety Network*, *Simple Flying*, *FlightGlobal*, *EASA*, *TechCrunch AI*, *OpenAI*, *Anthropic* ve *Google AI* kaynaklarından son 24 saatin haberlerini çeker.
2. **Yapay Zeka Sentezi (Gemini):** Haberler Google Gemini modeline gönderilir; havacılık terminolojisi (`METAR`, `NOTAM`, `SOP`, `CRM`, `TCAS RA`, `AD/SIB`) korunarak Türkçe özetlenir ve şema doğrulamasından (`zod`) geçirilir.
3. **Sıfır Maliyetli Yayın:** Üretilen rapor `public/data/briefings/YYYY-MM-DD.json` olarak repoya kaydedilir, `index.json` güncellenir ve site otomatik olarak **GitHub Pages** (veya **Vercel**) üzerinde yayınlanır.
4. **Anlık Bildirim:** Rapor yayınlandığı anda telefonunuzdaki **ntfy** (veya **Telegram**) uygulamasına günün manşeti ve özet maddeleri bildirim olarak düşer.

---

## 🚀 Adım 1: Projeyi GitHub'a Yükleme

1. [github.com](https://github.com) adresine giriş yapın ve sağ üstteki **`+`** simgesine tıklayıp **"New repository"** (Yeni depo) seçeneğini seçin.
2. **Repository name** kısmına örneğin `hava-brifing` yazın.
3. Ücretsiz GitHub Pages ve sınırsız Actions dakikası için **Public** seçeneğini işaretleyin ve **"Create repository"** butonuna basın.
4. Bilgisayarınızda proje klasöründe terminali açıp sırasıyla şu komutları çalıştırın (kendi GitHub kullanıcı adınızı yazarak):

```bash
git init
git add .
git commit -m "feat: initial EFB daily briefing PWA"
git branch -M main
git remote add origin https://github.com/Thebybrs/hava-brifing.git
git push -u origin main
```

> **Güvenlik Notu:** `.env` dosyanız `.gitignore` içinde yer aldığı için kişisel API anahtarınız GitHub'a **yüklenmez**.

---

## 🔐 Adım 2: GitHub Secrets (Şifreler) Ekleme

GitHub Actions robotunun sabahları Gemini API'yi kullanabilmesi ve telefonunuza bildirim gönderebilmesi için anahtarlarınızı güvenli kasaya (Secrets) ekleyin:

1. GitHub deponuzun sayfasında üst menüden **Settings** (Ayarlar) sekmesine tıklayın.
2. Sol menüden **Secrets and variables** → **Actions** bölümüne girin.
3. Yeşil **"New repository secret"** butonuna tıklayarak aşağıdaki 2 anahtarı ekleyin:

| Name (İsim) | Secret (Değer) | Açıklama |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | `AIza...` veya `AQ...` | Google AI Studio / Gemini API anahtarınız (**Zorunlu**) |
| `NTFY_TOPIC` | `ahmet-hava-brifing-9842` | Telefon bildirimi için **tahmin edilemez, size özel** benzersiz bir kanal adı (**Önerilen**) |

*(İsteğe Bağlı)* Eğer Telegram üzerinden de bildirim almak isterseniz aynı yere `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` ekleyebilirsiniz.

---

## 🌐 Adım 3: GitHub Pages Yayınını Aktif Etme

Uygulamanızın internette bir web sitesi olarak açılması için:

1. GitHub deponuzda **Settings** → sol menüden **Pages** bölümüne tıklayın.
2. **Build and deployment** altındaki **Source** açılır menüsünü **"Deploy from a branch"** yerine **"GitHub Actions"** olarak değiştirin.
3. Hepsi bu kadar! Artık her kod yüklediğinizde veya her sabah yeni rapor üretildiğinde siteniz otomatik olarak şu adreste yayınlanacaktır:
   `https://thebybrs.github.io/hava-brifing/`

---

## 🔔 Adım 4: Telefona `ntfy` Bildirim Uygulamasını Kurma

Her sabah 08:00'de brifing hazır olduğunda telefonunuza bildirim gelmesi için:

1. Telefonunuza ücretsiz ve açık kaynaklı **ntfy** uygulamasını indirin:
   - **Android:** [Google Play Store — ntfy](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
   - **iPhone (iOS):** [App Store — ntfy](https://apps.apple.com/app/ntfy/id1625396347)
2. Uygulamayı açın ve sağ alttaki **`+` (Subscribe to topic)** butonuna dokunun.
3. **Topic name** alanına **Adım 2'de `NTFY_TOPIC` olarak belirlediğiniz birebir aynı ismi** (ör. `ahmet-hava-brifing-9842`) yazıp abone olun.
4. Artık her sabah 08:00'de günün manşeti ve özet maddeleri telefonunuza bildirim olarak gelecek; bildirime dokunduğunuzda doğrudan uygulama açılacaktır.

---

## 📱 Adım 5: Uygulamayı Telefona Ana Ekran Uygulaması (PWA) Olarak Ekleme

Siteniz yayınlandıktan sonra telefonunuzun tarayıcısından sitenizi (`https://thebybrs.github.io/hava-brifing/`) açın:

- **iPhone / iPad (Safari):**
  1. Alt çubuktaki **Paylaş** (yukarı ok içeren kare) simgesine dokunun.
  2. Listeyi aşağı kaydırıp **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğine dokunun ve sağ üstten **Ekle** deyin.
- **Android (Chrome):**
  1. Ekranın üst kısmında çıkan **"Hava Brifing EFB — Yükle"** çubuğuna dokunun veya sağ üstteki üç nokta (`⋮`) menüsünden **"Uygulamayı yükle / Ana ekrana ekle"** seçeneğine dokunun.

Uygulama artık telefonunuzun ana ekranına gerçek bir kokpit uygulaması (tam ekran, adres çubuksuz ve çevrimdışı çalışabilir) olarak kurulacaktır.

---

## 🧪 İlk Raporu Manuel Olarak Test Etme

Sabah 08:00'i beklemeden sistemin çalıştığını hemen görmek için:

1. GitHub deponuzda üst menüden **Actions** sekmesine tıklayın.
2. Soldaki listeden **Daily Briefing** iş akışını seçin.
3. Sağ taraftaki **"Run workflow"** açılır butonuna tıklayıp yeşil **"Run workflow"** düğmesine basın.
4. Yaklaşık 1–2 dakika içinde yeni brifing üretilecek, depoya kaydedilecek, siteniz güncellenecek ve telefonunuza bildirim gelecektir.

---

## 💻 Bilgisayarda (Lokal) Çalıştırma

Projeyi kendi bilgisayarınızda geliştirmek veya çalıştırmak için:

```bash
# 1. Paketleri kurun
npm install

# 2. .env dosyasını oluşturup içine GEMINI_API_KEY=... anahtarınızı yazın
cp .env.example .env

# 3. Canlı brifing raporunu üretin
npm run briefing

# 4. Geliştirme sunucusunu başlatın (http://localhost:5173)
npm run dev
```

### Yararlı Komutlar
- `npm run dev` — Yerel geliştirme sunucusunu başlatır.
- `npm run briefing` — RSS kaynaklarını tarar ve Gemini ile günün raporunu üretir.
- `npm run feeds:verify` — Tüm RSS kaynaklarının sağlık durumunu kontrol eder.
- `npm run typecheck` — TypeScript tip kontrolünü çalıştırır.
- `npm test` — Birim ve bileşen testlerini (`vitest`) çalıştırır.
- `npm run build` — PWA prodüksiyon paketini (`dist/`) derler.
