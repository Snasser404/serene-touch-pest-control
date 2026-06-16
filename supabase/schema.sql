-- ============================================================================
--  Serene Touch Pest Control — Portal database schema
--  Run this FIRST in the Supabase SQL Editor (one fresh project).
--  Then run policies.sql, then (optionally) seed.sql.
--  Full walkthrough: see PORTAL-SETUP.md
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase, but be safe).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
--  profiles — one row per signed-in user (customer / technician / admin)
--  id mirrors auth.users.id so RLS can compare against auth.uid().
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null default 'customer'
                 check (role in ('customer', 'technician', 'admin')),
  full_name    text,
  email        text,
  phone        text,
  address      text,            -- customers
  plan         text,            -- customers, e.g. 'Quarterly Protection Plan'
  member_since date,            -- customers
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
--  appointments — links a customer + (optionally) a technician + a treatment.
--  Past visits are simply rows with status='Completed'. Prep checklist state
--  lives in prep_done (a small JSON map of "item text" -> true).
-- ----------------------------------------------------------------------------
create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.profiles(id) on delete cascade,
  technician_id    uuid references public.profiles(id) on delete set null,
  technician_name  text,            -- denormalised so customers see the name
                                    -- without us exposing the tech's profile row
  pest             text not null,
  treatment_type   text,
  targets          text,
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  status           text not null default 'Unassigned'
                     check (status in ('Unassigned', 'Scheduled', 'En route',
                                       'In progress', 'Completed', 'Cancelled')),
  revisit_at       timestamptz,
  coverage_ends_at timestamptz,
  re_entry_hours   int not null default 0,
  notes            text,
  result           text,            -- short outcome note for completed visits
  prep_done        jsonb not null default '{}'::jsonb,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_appt_customer   on public.appointments (customer_id);
create index if not exists idx_appt_technician on public.appointments (technician_id);
create index if not exists idx_appt_starts_at  on public.appointments (starts_at);

-- ----------------------------------------------------------------------------
--  keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_appointments_touch on public.appointments;
create trigger trg_appointments_touch
  before update on public.appointments
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
--  Auto-create a profile row whenever a new auth user is created.
--  SECURITY NOTE: role is ALWAYS 'customer' here — we never trust a
--  client-supplied role from user_metadata, otherwise someone could sign
--  themselves up as an admin. Technician/admin roles are granted afterwards,
--  only by an existing admin (the manage-account function or upsert_profile_
--  details RPC use the privileged service_role / admin path to set them).
--  SECURITY DEFINER so it can write to profiles regardless of RLS;
--  search_path pinned to public to prevent function hijacking.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(regexp_replace(new.raw_user_meta_data ->> 'full_name', '[<>]', '', 'g'),
             regexp_replace(new.raw_user_meta_data ->> 'name', '[<>]', '', 'g')),
    new.raw_user_meta_data ->> 'phone',
    'customer'   -- never read role from client metadata
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
