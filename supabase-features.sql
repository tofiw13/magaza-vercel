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
