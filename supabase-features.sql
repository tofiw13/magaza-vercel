-- ============================================================
--  YENİ ÖZƏLLİKLƏR: xal, reytinq, promo kod
--  Supabase -> SQL Editor -> yapışdır -> RUN
--  (Təkrar işlədilə bilər. auth.users-ə TRIGGER QOYULMUR.)
-- ============================================================

-- 1) XAL: profiles cədvəlinə points sütunu (sent ekvivalenti, 1 xal = 1 qəpik)
alter table public.profiles add column if not exists points integer not null default 0;

-- 2) MƏHSUL REYTİNQİ: products cədvəlinə ortalama və say
alter table public.products add column if not exists rating_sum integer not null default 0;
alter table public.products add column if not exists rating_count integer not null default 0;

-- 3) REYTİNQLƏR cədvəli (hər istifadəçi hər məhsula 1 dəfə)
create table if not exists public.ratings (
  id          bigint generated always as identity primary key,
  product_id  text references public.products(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  stars       integer not null check (stars between 1 and 5),
  created_at  timestamptz default now(),
  unique (product_id, user_id)
);
alter table public.ratings enable row level security;

-- İstifadəçi öz reytinqlərini oxuya bilər (yazma/yeniləmə serverdə service_role ilə)
drop policy if exists "own ratings read" on public.ratings;
create policy "own ratings read" on public.ratings for select using (auth.uid() = user_id);

-- 4) PROMO KODLAR cədvəli
create table if not exists public.promo_codes (
  code            text primary key,                 -- məs: SALAM10
  discount_percent integer not null default 0,       -- 0-100
  active          boolean not null default true,
  max_uses        integer,                           -- null = limitsiz
  used_count      integer not null default 0,
  expires_at      timestamptz,                       -- null = müddətsiz
  created_at      timestamptz default now()
);
alter table public.promo_codes enable row level security;
-- (Oxuma/yazma serverdə service_role ilə olur — public policy lazım deyil)

-- Nümunə promo kodlar (istəsən sonra admin paneldən deyil, buradan idarə et)
insert into public.promo_codes (code, discount_percent, active, max_uses, expires_at) values
  ('SALAM10', 10, true, null, null),
  ('YENI20',  20, true, 100,  now() + interval '30 days')
on conflict (code) do nothing;
