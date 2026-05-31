# Reqemsal Magaza (Vercel + Supabase)
1. Supabase: layihe yarat, SQL Editor-de supabase-schema.sql RUN, Storage "downloads" (private) bucket, storage-files/ icindeki 5 fayli yukle, API acarlarini gotur.
2. GitHub: bu qovlugu repoya yukle.
3. Vercel: repounu import et, env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_SECRET, ADMIN_PASSWORD (+STRIPE_SECRET_KEY), Deploy.
Admin: /admin.html (parol = ADMIN_PASSWORD). APP_SECRET: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
