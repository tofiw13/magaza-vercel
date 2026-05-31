-- ============================================================
--  Auth + Balans + Topup sxemi
--  Supabase -> SQL Editor -> yapışdır -> RUN
-- ============================================================

-- İstifadəçi profilləri (balans burada saxlanılır)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  balance     integer not null default 0,   -- sent ilə
  created_at  timestamptz default now()
);

-- Balans artırma sorğuları (qəbz şəkli ilə)
create table if not exists public.topups (
  id           bigint generated always as identity primary key,
  user_id      uuid references auth.users(id) on delete cascade,
  user_email   text,
  amount       integer not null default 0,   -- sent ilə
  receipt_path text,                          -- Storage-dakı qəbz şəkli
  status       text not null default 'pending',  -- pending / approved / rejected
  created_at   timestamptz default now()
);

-- RLS aktiv
alter table public.profiles enable row level security;
alter table public.topups   enable row level security;

-- İstifadəçi yalnız ÖZ profilini və topup-larını oxuya bilər
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);

drop policy if exists "own topups read" on public.topups;
create policy "own topups read" on public.topups for select using (auth.uid() = user_id);
-- (balansı və statusu yalnız server service_role dəyişir — RLS-i bypass edir)

-- Qeydiyyatdan keçən hər istifadəçi üçün avtomatik profil yarat
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  STORAGE: "receipts" adlı PRIVATE bucket yarat
--  (qəbz şəkilləri üçün) — Supabase -> Storage -> New bucket -> receipts (Public: OFF)
-- ============================================================
