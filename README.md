# 🛒 OnlineBələdçi - Rəqəmsal Mağaza

**Tam funksional rəqəmsal məhsul satış platforması** - Vercel + Supabase ilə

![Version](https://img.shields.io/badge/version-2.0.0-green)
![Features](https://img.shields.io/badge/features-11%2B-blue)

---

## ✨ Yeni Funksiyalar (v2.0)

### 🎨 Visual & UX
| Funksiya | Təsvir |
|----------|--------|
| 🌙 **Dark/Light Mode** | Avtomatik yadda saxlanılır, localStorage |
| 🎯 **Bounce Effekti** | Səbətə əlavə edərkən animasiya |
| ✨ **Smooth Transitions** | Bütün keçidlər yumşaq |

### 🛒 Alış-veriş Təcrübəsi
| Funksiya | Təsvir |
|----------|--------|
| ⭐ **Ulduzlu Qiymətləndirmə** | 5 ulduzlu reytinq, ortalam hesablanır |
| 🎁 **Promo Kod Sistemi** | Faiz və ya məbləğ endirimi |
| 🔥 **Flash Sale** | Geri sayım taymeri ilə kampaniyalar |
| ❤️ **Wishlist** | Sevimlilər siyahısı |
| 🏆 **Loyalty Points** | Hər 1₼ = 1 xal, 100 xal = 1₼ |

### 📱 Müştəri Dəstəyi
| Funksiya | Təsvir |
|----------|--------|
| 💬 **Real-time Chat** | Telegram ilə inteqrasiya, avtomatik cavablar |
| 📧 **Bildirişlər** | Sifariş zamanı Telegram/email |
| 📋 **Sifariş Tarixçəsi** | Tam əməliyyat tarixçəsi |

---

## 🚀 Quraşdırma

### 1. Supabase
```bash
# SQL Editor-də işlət:
1. supabase-schema.sql
2. supabase-new-features.sql

# Storage:
- "downloads" bucket (private)
- "receipts" bucket (private)

# Faylları yüklə:
storage-files/ qovluğundakı 5 faylı
```

### 2. Environment Variables
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key
APP_SECRET=random-32-byte-hex
ADMIN_PASSWORD=your-admin-password

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Stripe (optional)
STRIPE_SECRET_KEY=your-stripe-key
```

### 3. Deploy
```bash
# Vercel-ə push et
vercel --prod
```

---

## 📊 Admin Panel

**URL:** `/admin.html`

**Funksiyalar:**
- 👥 İstifadəçi idarəetməsi
- 💰 Balans sorğuları (təsdiq/rədd)
- 📦 Sifarişlər
- 🛍️ Məhsullar
- 🔥 Flash Sales
- 🎁 Promo kodlar

---

## 🔗 API Endpoints

| Endpoint | Method | Təsvir |
|----------|--------|--------|
| `/api/products` | GET | Məhsullar (sale qiymətləri ilə) |
| `/api/buy` | POST | Balansla alış |
| `/api/promo` | GET | Promo kod yoxla |
| `/api/wishlist` | GET/POST/DELETE | Sevimlilər |
| `/api/ratings` | GET/POST | Reytinq |
| `/api/flash-sales` | GET | Aktiv kampaniyalar |
| `/api/chat` | POST | Chat mesajı |

---

## 📁 Fayl Strukturu

```
magaza-vercel/
├── index.html          # Əsas səhifə (bütün frontend)
├── admin.html          # Admin panel
├── api/
│   ├── products.js     # Məhsullar API
│   ├── buy.js          # Alış + Promo + Points
│   ├── promo.js        # Promo kod API
│   ├── wishlist.js     # Wishlist API
│   ├── ratings.js      # Reytinq API
│   ├── flash-sales.js  # Flash Sale API
│   ├── chat.js         # Chat API
│   ├── admin.js        # Admin API
│   └── telegram.js     # Telegram webhook
├── lib/
│   ├── supabase.js     # Supabase client
│   ├── auth.js         # Auth helper
│   └── user.js         # User helper
└── storage-files/      # Məhsul faylları
```

---

## 🎯 İstifadə

### Promo Kod
Axtarış çubuğunun yanındakı "Promo kod" sahəsinə kod daxil edin.

### Flash Sale
Admin panel-də yaradın. Avtomatik banner və geri sayım göstərilir.

### Wishlist
Məhsul kartındakı ❤️ işarəsinə basın.

### Chat
Sağ alt küncdə 💬 düyməsinə basın.

---

## 📱 Telegram Bot

1. [@BotFather](https://t.me/BotFather) - yeni bot yaradın
2. Tokeni `TELEGRAM_BOT_TOKEN` kimi əlavə edin
3. Sizin Chat ID-ni `TELEGRAM_CHAT_ID` kimi əlavə edin
4. Webhook qurun:
```
https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_SITE}/api/telegram
```

---

## 📄 Lisenziya

MIT © OnlineBələdçi
