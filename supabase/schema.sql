-- Les bons contacts — schéma Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor → New query

-- Profils utilisateurs (lié à auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Utilisateur',
  email text not null,
  created_at timestamptz not null default now()
);

-- Achats d'ebooks (source de vérité côté serveur)
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ebook_id text not null,
  stripe_session_id text,
  created_at timestamptz not null default now(),
  unique (user_id, ebook_id)
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);
create index if not exists purchases_ebook_id_idx on public.purchases (ebook_id);

-- Nouveau compte → créer le profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Utilisateur'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.purchases enable row level security;

drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Purchases: read own" on public.purchases;
create policy "Purchases: read own"
  on public.purchases for select
  using (auth.uid() = user_id);
