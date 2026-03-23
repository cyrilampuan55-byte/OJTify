create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  target_hours numeric not null default 600,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  excluded_days text[] not null default array['Sun'],
  target_end_date date null,
  target_hours numeric not null default 600,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  time_in timestamptz not null,
  time_out timestamptz null,
  total_hours numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists logs_user_id_idx on public.logs(user_id);
create index if not exists logs_time_in_idx on public.logs(time_in desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz null,
  data_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, type, data_key)
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, target_hours)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case when new.email = 'admin@ojtify.com' then 'admin' else 'user' end,
    600
  )
  on conflict (id) do update
  set name = excluded.name,
      email = excluded.email;

  insert into public.settings (user_id, excluded_days, target_end_date, target_hours)
  values (new.id, array['Sun'], null, 600)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id and role = 'admin'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.logs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles select own or admin" on public.profiles;
drop policy if exists "profiles update own or admin" on public.profiles;
drop policy if exists "settings own or admin" on public.settings;
drop policy if exists "logs own or admin select" on public.logs;
drop policy if exists "logs own insert" on public.logs;
drop policy if exists "logs own or admin update" on public.logs;
drop policy if exists "logs own or admin delete" on public.logs;
drop policy if exists "notifications own or admin select" on public.notifications;
drop policy if exists "notifications own insert" on public.notifications;
drop policy if exists "notifications own or admin update" on public.notifications;
drop policy if exists "notifications own or admin delete" on public.notifications;

create policy "profiles select own or admin"
on public.profiles for select to authenticated
using (
  auth.uid() = id or public.is_admin()
);

create policy "profiles update own or admin"
on public.profiles for update to authenticated
using (
  auth.uid() = id or public.is_admin()
)
with check (
  auth.uid() = id or public.is_admin()
);

create policy "settings own or admin"
on public.settings for all to authenticated
using (
  auth.uid() = user_id or public.is_admin()
)
with check (
  auth.uid() = user_id or public.is_admin()
);

create policy "logs own or admin select"
on public.logs for select to authenticated
using (
  auth.uid() = user_id or public.is_admin()
);

create policy "logs own insert"
on public.logs for insert to authenticated
with check (auth.uid() = user_id);

create policy "logs own or admin update"
on public.logs for update to authenticated
using (
  auth.uid() = user_id or public.is_admin()
)
with check (
  auth.uid() = user_id or public.is_admin()
);

create policy "logs own or admin delete"
on public.logs for delete to authenticated
using (
  auth.uid() = user_id or public.is_admin()
);

create policy "notifications own or admin select"
on public.notifications for select to authenticated
using (
  auth.uid() = user_id or public.is_admin()
);

create policy "notifications own or admin insert"
on public.notifications for insert to authenticated
with check (
  auth.uid() = user_id or public.is_admin()
);

create policy "notifications own or admin update"
on public.notifications for update to authenticated
using (
  auth.uid() = user_id or public.is_admin()
)
with check (
  auth.uid() = user_id or public.is_admin()
);

create policy "notifications own or admin delete"
on public.notifications for delete to authenticated
using (
  auth.uid() = user_id or public.is_admin()
);
