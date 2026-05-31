-- ============================================================
--  GOOGLE GİRİŞDƏ "/auth/v1/callback 500" XƏTASININ TAM HƏLLİ
--
--  Səbəb: yeni istifadəçi yaranəndə auth.users üzərindəki trigger
--  (handle_new_user) uğursuz olur və bütün auth callback çökür (500).
--
--  HƏLL: Trigger-i TAMAMİLƏ SİLİRİK. Profil/balans artıq backend
--  tərəfindən (ensureProfile) avtomatik yaranır — trigger lazım deyil.
--
--  Supabase -> SQL Editor -> hamısını yapışdır -> RUN
-- ============================================================

-- 1) Auth-u çökdürən trigger-i sil (ƏN VACİB ADDIM)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2) profiles cədvəli düzgün qurulub (yoxdursa yarat)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  balance     integer not null default 0,
  full_name   text,
  created_at  timestamptz default now()
);
alter table public.profiles add column if not exists full_name text;

-- 3) RLS: istifadəçi yalnız öz profilini oxusun (server service_role bypass edir)
alter table public.profiles enable row level security;
drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);

-- 4) Artıq mövcud istifadəçilər üçün profil tamamla
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

-- ============================================================
--  Bitdi! İndi Google/email girişi 500 VERMƏYƏCƏK.
--  (Profil ilk balans/alış əməliyyatında backend tərəfindən yaranır.)
-- ============================================================
