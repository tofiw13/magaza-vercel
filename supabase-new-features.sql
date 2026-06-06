-- ============================================
-- YENİ FUNKSİYALAR ÜÇÜN DATABASE SCHEMA
-- Supabase -> SQL Editor -> hamısını yapışdır -> RUN
-- (Təkrar işlədilə bilər - səhv verməz)
-- ============================================

-- 1. ULDUZLU QİYMƏTLƏNDİRMƏ (RATINGS)
create table if not exists public.ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, product_id)
);
create index if not exists idx_ratings_product on public.ratings(product_id);

-- 2. PROMO KODLAR (COUPONS)
create table if not exists public.promo_codes (
  id bigint generated always as identity primary key,
  code text unique not null,
  discount_percent integer default 0 check (discount_percent >= 0 and discount_percent <= 100),
  discount_fixed integer default 0 check (discount_fixed >= 0),
  min_order integer default 0,
  max_uses integer default null,
  used_count integer default 0,
  expires_at timestamptz default null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. FLASH SALES (KAMPANİYALAR)
create table if not exists public.flash_sales (
  id bigint generated always as identity primary key,
  product_id text not null references public.products(id) on delete cascade,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 90),
  original_price integer not null,
  sale_price integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists idx_flash_sales_product on public.flash_sales(product_id);
create index if not exists idx_flash_sales_active on public.flash_sales(is_active, starts_at, ends_at);

-- 4. WISHLIST (SEVİMLİLƏR)
create table if not exists public.wishlists (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);
create index if not exists idx_wishlists_user on public.wishlists(user_id);

-- 5. LOYALTY POINTS (SADİQLİK XALLARI)
create table if not exists public.loyalty_points (
  id bigint generated always as identity primary key,
  user_id uuid unique not null references auth.users(id) on delete cascade,
  points integer default 0,
  total_earned integer default 0,
  total_spent integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.loyalty_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  points integer not null,
  type text not null check (type in ('earned', 'spent', 'bonus')),
  description text default '',
  order_id bigint references public.orders(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_loyalty_trans_user on public.loyalty_transactions(user_id);

-- 6. SİFARİŞ STATUSU (ORDERS əlavələri)
alter table public.orders add column if not exists status text default 'completed';
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists promo_code text;
alter table public.orders add column if not exists discount_amount integer default 0;
alter table public.orders add column if not exists points_used integer default 0;
alter table public.orders add column if not exists points_earned integer default 0;

-- 7. İSTİFADƏÇİ TƏRCİHLƏRİ (NOTIFICATIONS)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_notifications boolean default true,
  telegram_notifications boolean default false,
  telegram_chat_id text default '',
  created_at timestamptz default now()
);

-- 8. SİFARİŞ STATUS TARİXÇƏSİ
create table if not exists public.order_status_history (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete cascade,
  status text not null,
  note text default '',
  created_at timestamptz default now()
);
create index if not exists idx_order_status_order on public.order_status_history(order_id);

-- 9. PROFILES ƏLAVƏLƏRİ
alter table public.profiles add column if not exists phone text default '';
alter table public.profiles add column if not exists address text default '';

-- 10. PRODUCTS ƏLAVƏLƏRİ
alter table public.products add column if not exists rating_avg decimal(3,2) default 0;
alter table public.products add column if not exists rating_count integer default 0;
alter table public.products add column if not exists category text default 'digital';

-- 11. CHAT MESAJLARI
create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_chat_messages_user on public.chat_messages(user_id);


-- ============================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================
alter table public.ratings enable row level security;
alter table public.promo_codes enable row level security;
alter table public.flash_sales enable row level security;
alter table public.wishlists enable row level security;
alter table public.loyalty_points enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.user_preferences enable row level security;
alter table public.order_status_history enable row level security;
alter table public.chat_messages enable row level security;

-- Ratings
drop policy if exists "Ratings are public" on public.ratings;
create policy "Ratings are public" on public.ratings for select using (true);
drop policy if exists "Users can insert own rating" on public.ratings;
create policy "Users can insert own rating" on public.ratings for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own rating" on public.ratings;
create policy "Users can update own rating" on public.ratings for update using (auth.uid() = user_id);

-- Promo codes
drop policy if exists "Active promo codes are public" on public.promo_codes;
create policy "Active promo codes are public" on public.promo_codes for select using (is_active = true);

-- Flash sales
drop policy if exists "Flash sales are public" on public.flash_sales;
create policy "Flash sales are public" on public.flash_sales for select using (true);

-- Wishlists
drop policy if exists "Users can view own wishlist" on public.wishlists;
create policy "Users can view own wishlist" on public.wishlists for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own wishlist" on public.wishlists;
create policy "Users can insert own wishlist" on public.wishlists for insert with check (auth.uid() = user_id);
drop policy if exists "Users can delete own wishlist" on public.wishlists;
create policy "Users can delete own wishlist" on public.wishlists for delete using (auth.uid() = user_id);

-- Loyalty
drop policy if exists "Users can view own points" on public.loyalty_points;
create policy "Users can view own points" on public.loyalty_points for select using (auth.uid() = user_id);
drop policy if exists "Users can view own transactions" on public.loyalty_transactions;
create policy "Users can view own transactions" on public.loyalty_transactions for select using (auth.uid() = user_id);

-- User preferences
drop policy if exists "Users can view own preferences" on public.user_preferences;
create policy "Users can view own preferences" on public.user_preferences for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences" on public.user_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences" on public.user_preferences for update using (auth.uid() = user_id);

-- Chat
drop policy if exists "Users can view own chat" on public.chat_messages;
create policy "Users can view own chat" on public.chat_messages for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own chat" on public.chat_messages;
create policy "Users can insert own chat" on public.chat_messages for insert with check (auth.uid() = user_id);

-- ============================================
-- TRİGGERLƏR
-- ============================================

-- Rating ortalamasını avtomatik hesabla
create or replace function update_product_rating()
returns trigger as $$
begin
  update public.products
  set rating_avg = (select coalesce(avg(rating), 0) from public.ratings where product_id = coalesce(new.product_id, old.product_id)),
      rating_count = (select count(*) from public.ratings where product_id = coalesce(new.product_id, old.product_id))
  where id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_update_product_rating on public.ratings;
create trigger trg_update_product_rating
after insert or update or delete on public.ratings
for each row execute function update_product_rating();

-- Yeni istifadəçi üçün loyalty points yarat
create or replace function ensure_loyalty_points()
returns trigger as $$
begin
  insert into public.loyalty_points (user_id, points, total_earned)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ensure_loyalty_points on auth.users;
create trigger trg_ensure_loyalty_points
after insert on auth.users
for each row execute function ensure_loyalty_points();

-- ============================================
-- NÜMUNƏ MƏLUMATLAR
-- ============================================

-- Nümunə promo kodları
insert into public.promo_codes (code, discount_percent, min_order, max_uses) values
  ('YENI2024', 10, 500, 100),
  ('BAHAR20', 20, 1000, 50),
  ('OZEL10', 10, 0, null)
on conflict (code) do nothing;

-- Mövcud istifadəçilər üçün loyalty points yarat (geriyə dönük)
insert into public.loyalty_points (user_id, points, total_earned)
select id, 0, 0 from auth.users
on conflict (user_id) do nothing;
