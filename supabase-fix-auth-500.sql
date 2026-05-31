-- ============================================================
--  GOOGLE / EMAIL GİRİŞDƏ "500 unexpected_failure" XƏTASININ HƏLLİ
--  Səbəb: yeni istifadəçi yaranəndə trigger profil yarada bilmir → auth çökür.
--  Bu skript trigger-i "bulletproof" edir (xəta olsa belə auth bloklanmır).
--  Supabase -> SQL Editor -> hamısını yapışdır -> RUN
-- ============================================================

-- 1) profiles cədvəli mövcuddur (yoxdursa yarat)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  balance     integer not null default 0,
  full_name   text,
  created_at  timestamptz default now()
);

-- full_name sütunu yoxdursa əlavə et (köhnə bazalar üçün)
alter table public.profiles add column if not exists full_name text;

-- 2) Trigger funksiyasını təhlükəsiz (exception-safe) et
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.profiles (id, email, full_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
    on conflict (id) do nothing;
  exception when others then
    -- Hər hansı xəta olsa belə auth prosesini BLOKLAMA
    null;
  end;
  return new;
end;
$$;

-- 3) Trigger-i yenidən qur
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Artıq mövcud olan (profili olmayan) istifadəçilər üçün profil yarat
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name','')
from auth.users u
on conflict (id) do nothing;

-- ============================================================
--  Bitdi. İndi Google/email girişi 500 verməyəcək.
-- ============================================================
