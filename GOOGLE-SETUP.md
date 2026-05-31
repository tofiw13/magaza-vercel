# Google ilə girişi aktivləşdirmək (pulsuz)

Kod hazırdır. "Google ilə davam et" düyməsinin işləməsi üçün Supabase + Google tərəfində bir dəfəlik konfiqurasiya lazımdır:

## 1. Google Cloud Console
1. https://console.cloud.google.com → yeni layihə yarat (və ya mövcudu seç)
2. **APIs & Services → OAuth consent screen** → External → tətbiq adı: OnlineBələdçi → Save
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized redirect URIs**-ə əlavə et (Supabase-dən gələn URL):
     `https://<SƏNİN-PROJECT>.supabase.co/auth/v1/callback`
4. Yaranan **Client ID** və **Client Secret**-i kopyala

## 2. Supabase
1. Supabase → **Authentication → Providers → Google** → Enable
2. **Client ID** və **Client Secret**-i yapışdır → Save
3. **Authentication → URL Configuration → Site URL**-ə saytını yaz:
   `https://magaza-vercel.vercel.app`
   Və **Redirect URLs**-ə də əlavə et: `https://magaza-vercel.vercel.app`

## 3. Bitdi
İndi saytda "🔵 Google ilə davam et" işləyəcək — istifadəçi Gmail hesabı ilə daxil olacaq.

> Qeyd: Konfiqurasiya tamamlanmasa, düymə "Google girişi aktiv deyil" xətası verəcək (kod bunu artıq idarə edir).
