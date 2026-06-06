-- ============================================================
--  YENİ ÖZƏLLİKLƏR: xal, reytinq, promo kod, müddətli endirim
--  Supabase -> SQL Editor -> yapışdır -> RUN
--  (Təkrar işlədilə bilər. auth.users-ə TRIGGER QOYULMUR.)
-- ============================================================

-- 1) XAL: profiles cədvəlinə points sütunu (1 xal = 1 qəpik)
alter table public.profiles add column if not exists points integer not null default 0;

-- 2) MƏHSUL REYTİNQİ: products cədvəlinə ortalama və say
alter table public.products add column if not exists rating_sum integer not null default 0;
alter table public.products add column if not exists rating_count integer not null default 0;

-- 3) MÜDDƏTLİ ENDİRİM: məhsula endirimli qiymət və bitmə vaxtı
alter table public.products add column if not exists sale_price integer;        -- sent ilə endirimli qiymət (null = endirim yox)
alter table public.products add column if not exists sale_ends_at timestamptz;  -- endirimin bitmə anı (null = müddətsiz)

-- 4) REYTİNQLƏR cədvəli (hər istifadəçi hər məhsula 1 dəfə)
create table if not exists public.ratings (
  id          bigint generated always as identity primary key,
  product_id  text references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  stars       integer not null check (stars between 1 and 5),
  created_at  timestamptz default now(),
  unique (product_id, user_id)
);
alter table public.ratings enable row level security;
drop policy if exists "own ratings read" on public.ratings;
create policy "own ratings read" on public.ratings for select using (auth.uid() = user_id);

-- 5) PROMO KODLAR cədvəli
--    Cədvəl əvvəldən mövcud ola bilər, ona görə HƏR sütunu ayrıca əlavə edirik.
create table if not exists public.promo_codes (
  code text primary key
);
alter table public.promo_codes add column if not exists discount_percent integer not null default 0;
alter table public.promo_codes add column if not exists active boolean not null default true;
alter table public.promo_codes add column if not exists max_uses integer;          -- null = limitsiz
alter table public.promo_codes add column if not exists used_count integer not null default 0;
alter table public.promo_codes add column if not exists expires_at timestamptz;    -- null = müddətsiz
alter table public.promo_codes add column if not exists created_at timestamptz default now();
alter table public.promo_codes enable row level security;

-- Nümunə promo kodlar
insert into public.promo_codes (code, discount_percent, active, max_uses, expires_at) values
  ('SALAM10', 10, true, null, null),
  ('YENI20',  20, true, 100,  now() + interval '30 days')
on conflict (code) do nothing;


-- 6) TƏNZİMLƏMƏLƏR (kampaniya bitmə tarixi və s.)
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
alter table public.app_settings enable row level security;
-- Hamı oxuya bilər (kampaniya tarixi public-dir)
drop policy if exists "settings public read" on public.app_settings;
create policy "settings public read" on public.app_settings for select using (true);


-- 7) MƏHSUL VARİANTLARI: bir məhsulun içində bir neçə fayl
--    Hər alışda növbəti variant verilir (dövri).
--    Format: [{"name":"Variant 1","file_path":"fayl1.pdf"}, {"name":"Variant 2","file_path":"fayl2.pdf"}]
alter table public.products add column if not exists variants jsonb default '[]'::jsonb;

-- Kampaniya faizi app_settings-də saxlanılır (campaign_percent açarı).
-- Ayrıca sütun lazım deyil — mövcud app_settings cədvəlindən istifadə olunur.


-- ============================================================
--  HƏR MƏHSULA HAZIR 2-Cİ VARİANT ƏLAVƏ ET
--  Birinci variant = mövcud fayl, ikinci variant = yeni "-2" fayl.
--  Beləcə eyni istifadəçi məhsulu təkrar alanda fərqli fayl alır.
--  (Bu fayllar Storage "downloads" bucket-inə yüklənməlidir.)
-- ============================================================
update public.products set variants = '[
  {"name":"Klassik (tünd/göy)","file_path":"cv-template.html"},
  {"name":"Modern (yaşıl)","file_path":"cv-template-2.html"}
]'::jsonb where id = 'cv-template';

update public.products set variants = '[
  {"name":"Həftəlik cədvəl","file_path":"study-schedule.html"},
  {"name":"Gündəlik planlayıcı","file_path":"study-schedule-2.html"}
]'::jsonb where id = 'study-schedule';

update public.products set variants = '[
  {"name":"Aylıq büdcə","file_path":"budget-template.csv"},
  {"name":"İllik büdcə izləyici","file_path":"budget-template-2.csv"}
]'::jsonb where id = 'budget-sheet';

update public.products set variants = '[
  {"name":"Feed postları (30)","file_path":"instagram-templates.html"},
  {"name":"Story & Reels (30)","file_path":"instagram-templates-2.html"}
]'::jsonb where id = 'instagram-pack';

update public.products set variants = '[
  {"name":"Bələdçi versiyası","file_path":"ebook-online-earning.md"},
  {"name":"İş dəftəri versiyası","file_path":"ebook-online-earning-2.md"}
]'::jsonb where id = 'ebook-freelance';
