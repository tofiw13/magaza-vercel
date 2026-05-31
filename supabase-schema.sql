create table if not exists public.products (
  id text primary key,
  name text not null,
  description text default '',
  price integer not null default 0,
  currency text not null default 'usd',
  emoji text default '📦',
  file_path text default '',
  created_at timestamptz default now()
);
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_key text unique not null,
  items jsonb not null default '[]',
  total integer not null default 0,
  created_at timestamptz default now()
);
alter table public.products enable row level security;
alter table public.orders enable row level security;
insert into public.products (id, name, description, price, emoji, file_path) values
  ('cv-template','Professional CV / Rezume Sablonu','ATS-uygun, muasir CV sablonu.',499,'📄','cv-template.html'),
  ('study-schedule','Heftelik Ders Cedveli Sablonu','Cap ucun hazir cedvel.',399,'📚','study-schedule.html'),
  ('budget-sheet','Sexsi Budce Excel Sablonu','Avtomatik hesablamali izleyici.',399,'💰','budget-template.csv'),
  ('instagram-pack','Instagram Post Sablon Desti (30)','30 hazir post sablonu.',899,'🎨','instagram-templates.html'),
  ('ebook-freelance','E-kitab: Sifirdan Onlayn Pul','Praktiki beledci + 7 gunluk plan.',599,'📖','ebook-online-earning.md')
on conflict (id) do nothing;
