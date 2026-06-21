-- ============================================================================
--  Serene Touch Pest Control — Row-Level Security + secure write RPCs
--  Run this AFTER schema.sql.
--
--  Design:
--   * READS are governed by RLS SELECT policies (customer sees only their own
--     data, technician only their jobs + those customers, admin sees all).
--   * WRITES are blocked by RLS for normal users and go through SECURITY
--     DEFINER functions that re-check the caller's role/ownership themselves.
--     This means the browser is never trusted to enforce permissions.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  Helpers (SECURITY DEFINER → they bypass RLS, so no policy recursion).
-- ---------------------------------------------------------------------------
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
--  Turn RLS on. With RLS enabled and no permissive policy, access is denied.
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.appointments enable row level security;

-- Defence in depth: nobody writes these tables directly. Every mutation goes
-- through the SECURITY DEFINER RPCs below (which run as the function owner and
-- are unaffected by these revokes). This makes "no write policy = no writes"
-- an enforced guarantee rather than relying on the mere absence of a policy.
revoke insert, update, delete on public.profiles     from anon, authenticated;
revoke insert, update, delete on public.appointments from anon, authenticated;

-- ===========================  profiles : SELECT  ===========================
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using ((select public.is_admin()));

-- A technician may read the profiles of customers on their assigned jobs
-- (needed to show the customer's name / address / phone on a job card).
drop policy if exists profiles_select_tech_customers on public.profiles;
create policy profiles_select_tech_customers on public.profiles
  for select using (
    profiles.role = 'customer' and exists (
      select 1 from public.appointments a
      where a.customer_id = profiles.id
        and a.technician_id = auth.uid()
    )
  );

-- ===========================  profiles : WRITES  ===========================
-- No direct INSERT/UPDATE/DELETE for anyone (enforced by the table REVOKE above).
-- All profile changes go through the admin-only upsert_profile_details() RPC
-- (SECURITY DEFINER) or the service_role Edge Function. A self-update policy is
-- deliberately absent — it would let a customer set their own role to 'admin'.
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_update_self on public.profiles;

-- =========================  appointments : SELECT  =========================
drop policy if exists appt_select_customer on public.appointments;
create policy appt_select_customer on public.appointments
  for select using (customer_id = auth.uid());

drop policy if exists appt_select_tech on public.appointments;
create policy appt_select_tech on public.appointments
  for select using (technician_id = auth.uid());

drop policy if exists appt_select_admin on public.appointments;
create policy appt_select_admin on public.appointments
  for select using ((select public.is_admin()));

-- There are intentionally NO INSERT/UPDATE/DELETE policies on appointments.
-- Every mutation flows through the SECURITY DEFINER RPCs below.

-- ============================================================================
--  SECURE WRITE RPCs
--  Each runs as the function owner (bypassing RLS) but re-checks auth.uid()
--  and role/ownership before touching data. search_path pinned for safety.
-- ============================================================================

-- Customer ticks/unticks their preparation checklist (own appointment only).
create or replace function public.set_prep(p_appt uuid, p_prep jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointments
     set prep_done = coalesce(p_prep, '{}'::jsonb)
   where id = p_appt
     and customer_id = auth.uid();
  if not found then
    raise exception 'Not allowed';
  end if;
end;
$$;

-- Technician (own job) or admin advances a job's status.
-- Completing a job auto-books the ~2-week revisit if one is not already set.
create or replace function public.advance_status(p_appt uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tech uuid;
begin
  if p_status not in ('Unassigned','Scheduled','En route','In progress','Completed','Cancelled') then
    raise exception 'Invalid status';
  end if;

  select technician_id into v_tech from public.appointments where id = p_appt;
  if not found then
    raise exception 'Appointment not found';
  end if;
  if not ((select public.is_admin()) or v_tech = auth.uid()) then
    raise exception 'Not allowed';
  end if;

  update public.appointments
     set status = p_status,
         completed_at = case when p_status = 'Completed' then now() else completed_at end,
         revisit_at = case
            when p_status = 'Completed' and (revisit_at is null or revisit_at < now())
              then now() + interval '14 days'
            else revisit_at
         end
   where id = p_appt;
end;
$$;

-- Technician (own job) or admin saves visit notes.
create or replace function public.save_notes(p_appt uuid, p_notes text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tech uuid;
begin
  select technician_id into v_tech from public.appointments where id = p_appt;
  if not found then
    raise exception 'Appointment not found';
  end if;
  if not ((select public.is_admin()) or v_tech = auth.uid()) then
    raise exception 'Not allowed';
  end if;
  update public.appointments set notes = p_notes where id = p_appt;
end;
$$;

-- Admin assigns / unassigns a technician. Assigning an unassigned job moves it
-- to 'Scheduled'; clearing the technician reverts it to 'Unassigned'.
create or replace function public.assign_tech(p_appt uuid, p_tech uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only';
  end if;

  if p_tech is not null then
    select full_name into v_name from public.profiles
      where id = p_tech and role = 'technician';
    if v_name is null then
      raise exception 'Not a technician';
    end if;
  end if;

  update public.appointments
     set technician_id   = p_tech,
         technician_name = v_name,
         status = case
            when p_tech is null then 'Unassigned'
            when status = 'Unassigned' then 'Scheduled'
            else status
         end
   where id = p_appt;
end;
$$;

-- Admin creates a new appointment for an existing customer.
create or replace function public.create_appointment(
  p_customer       uuid,
  p_pest           text,
  p_treatment      text,
  p_targets        text,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz,
  p_re_entry_hours int,
  p_coverage_ends  timestamptz,
  p_notes          text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only';
  end if;
  if not exists (select 1 from public.profiles where id = p_customer and role = 'customer') then
    raise exception 'Not a customer';
  end if;

  insert into public.appointments
    (customer_id, pest, treatment_type, targets, starts_at, ends_at,
     re_entry_hours, coverage_ends_at, notes, status)
  values
    (p_customer, p_pest, p_treatment, p_targets, p_starts_at, p_ends_at,
     coalesce(p_re_entry_hours, 0), p_coverage_ends, p_notes, 'Unassigned')
  returning id into v_id;

  return v_id;
end;
$$;

-- Admin edits a customer's / technician's profile details.
create or replace function public.upsert_profile_details(
  p_id        uuid,
  p_full_name text,
  p_phone     text,
  p_address   text,
  p_plan      text,
  p_role      text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only';
  end if;
  if p_role is not null and p_role not in ('customer','technician','admin') then
    raise exception 'Invalid role';
  end if;

  -- Never demote the last remaining admin (prevents locking everyone out).
  if p_role is not null and p_role <> 'admin'
     and (select role from public.profiles where id = p_id) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Cannot remove the last admin';
  end if;

  update public.profiles
     set full_name = coalesce(regexp_replace(p_full_name, '[<>]', '', 'g'), full_name),
         phone     = coalesce(p_phone,     phone),
         address   = coalesce(p_address,   address),
         plan      = coalesce(p_plan,      plan),
         role      = coalesce(p_role,      role)
   where id = p_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
--  Lock down execution. Postgres grants EXECUTE to PUBLIC by default, so we
--  must revoke from PUBLIC (not just anon) — otherwise the anonymous role keeps
--  EXECUTE via PUBLIC. Then grant only to signed-in (authenticated) users.
--  Function bodies still re-check auth.uid()/role; this is defence in depth.
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public;

revoke execute on function public.set_prep(uuid, jsonb)                       from public;
revoke execute on function public.advance_status(uuid, text)                  from public;
revoke execute on function public.save_notes(uuid, text)                      from public;
revoke execute on function public.assign_tech(uuid, uuid)                     from public;
revoke execute on function public.create_appointment(uuid,text,text,text,timestamptz,timestamptz,int,timestamptz,text) from public;
revoke execute on function public.upsert_profile_details(uuid,text,text,text,text,text) from public;
revoke execute on function public.my_role()  from public;
revoke execute on function public.is_admin() from public;

grant execute on function public.set_prep(uuid, jsonb)                        to authenticated;
grant execute on function public.advance_status(uuid, text)                   to authenticated;
grant execute on function public.save_notes(uuid, text)                       to authenticated;
grant execute on function public.assign_tech(uuid, uuid)                      to authenticated;
grant execute on function public.create_appointment(uuid,text,text,text,timestamptz,timestamptz,int,timestamptz,text) to authenticated;
grant execute on function public.upsert_profile_details(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.my_role()  to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ============================================================================
--  Dashboard upgrade — appointment edit/delete + Realtime  (additive, re-runnable)
-- ============================================================================

-- Admin edits an existing appointment (reschedule / change service / notes…).
create or replace function public.update_appointment(
  p_appt uuid, p_pest text, p_treatment text, p_targets text,
  p_starts_at timestamptz, p_ends_at timestamptz, p_re_entry_hours int,
  p_coverage_ends timestamptz, p_revisit timestamptz, p_notes text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (select public.is_admin()) then raise exception 'Admin only'; end if;
  update public.appointments set
    pest             = coalesce(nullif(p_pest, ''), pest),
    treatment_type   = p_treatment,
    targets          = p_targets,
    starts_at        = coalesce(p_starts_at, starts_at),
    ends_at          = coalesce(p_ends_at, ends_at),
    re_entry_hours   = coalesce(p_re_entry_hours, re_entry_hours),
    coverage_ends_at = p_coverage_ends,
    revisit_at       = p_revisit,
    notes            = p_notes
  where id = p_appt;
  if not found then raise exception 'Appointment not found'; end if;
end;
$$;

-- Admin deletes an appointment.
create or replace function public.delete_appointment(p_appt uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (select public.is_admin()) then raise exception 'Admin only'; end if;
  delete from public.appointments where id = p_appt;
end;
$$;

revoke execute on function public.update_appointment(uuid,text,text,text,timestamptz,timestamptz,int,timestamptz,timestamptz,text) from public;
revoke execute on function public.delete_appointment(uuid) from public;
grant  execute on function public.update_appointment(uuid,text,text,text,timestamptz,timestamptz,int,timestamptz,timestamptz,text) to authenticated;
grant  execute on function public.delete_appointment(uuid) to authenticated;

-- Turn on Realtime for appointments so dashboards update live across users.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
end $$;
