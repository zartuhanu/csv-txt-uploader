# csv-txt-uploader

CSV/TXT dosyalarını ön tanımlı şablonlarla karşılaştırır, formatlama hatalarını raporlar ve veriyi PostgreSQL veritabanına yükler. Uygulama, bir Node.js/Express back end ile minimal bir React front end den oluşur.

## Özellikler

- **Şablon doğrulama**  
  `server/templates` klasöründeki CSV şablon dosyalarının ilk satırındaki başlıkları ve tür örneklemelerini kullanarak; yüklenen dosyanın sütun yapısını ve veri tiplerini denetler.  
- **Hata raporlama**  
  Eksik/fazla sütunlar, satır başına değişken sütun sayısı ve tür uyuşmazlıklarını tespit edip detaylı çıktı verir.  
- **PostgreSQL’e yükleme**  
  Hata yoksa “Upload to DB” butonuyla tüm satırları dinamik olarak oluşturulan tabloya aktarır.  
- **Authenticator**  
  Uygulama her yüklemede kullanıcı adı/şifre ekranı gösterir; girilen bilgileri `server/logins.log` dosyasına zaman damgasıyla kaydeder. (Şu anki haliyle her kombinasyon kabul edilir)

---

## Önkoşullar

- Node.js (v14 veya üzeri)  
- PostgreSQL  
- Docker 

---

## 1. PostgreSQL Kurulumu (Docker ile)

Kod şu anda Docker üzerinden bir PostgreSQL konteyneri başlatılarak çalışmaktadır(bu kod dökümanın en sonunda bulunabilir)

## 2. Ortam Değişkenleri

Arka uç, aşağıdaki standart PostgreSQL ortam değişkenlerini kullanır.

**server/.env**
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=csvuploader
PORT=3000

## 3. Backend'i Başlatma

cd server
npm install
node index.js

Sunucu varsayılan olarak http://localhost:3000 üzeriden dinler

## 4. Uygulamayı Kullanma
Tarayıcıda http://localhost:3000 adresini açın.
Login ekranında dilediğiniz kullanıcı adı/şifre ile giriş yapın.
Açılan “CSV/TXT Uploader” arayüzünde:
Template menüsünden bir şablon seçin.
File bölümünden CSV veya TXT dosyanızı seçin.
Check File düğmesine tıklayarak dosyayı şablonla karşılaştırın.
Hata yoksa Upload to DB düğmesi etkinleşir; tıklayınca veri PostgreSQL’e eklenir.
İşlem sonuçları ve hatalar “output” bölümünde gösterilir.

## 5. Şablon Dosyaları
Tüm şablonlar server/templates klasöründe .csv uzantılı olarak bulunur.
Sunucu bu dosyaları okuyup her sütunun veri tipini (string, number, boolean) çıkarır.

## 6. Özelleştirme
Yeni bir şablon eklemek için server/templates altına uygun bir CSV dosyası koymanız yeterlidir.
Çevresel değişkenlerle veritabanı bilgilerini, sunucu portunu, dosya kaydetme yollarını değiştirebilirsiniz.


```bash
docker run --name csv-uploader-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=csvuploader \
  -p 5432:5432 -d postgres
