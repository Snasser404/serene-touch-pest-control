-- ============================================================================
--  Serene Touch — OPTIONAL sample data, so you can see the portal working.
--
--  Auth users can't be created from plain SQL (passwords are managed by
--  Supabase Auth), so FIRST create these three users under
--  Authentication → Users → "Add user" (tick "Auto Confirm User"):
--
--      admin@serenetouch.ca       (any password you like)
--      tech@serenetouch.ca
--      customer@serenetouch.ca
--
--  The handle_new_user trigger gives each a profile automatically. Then run
--  this file in the SQL Editor to set their roles + add a sample appointment.
--  Delete this data anytime; it is just for the demo.
-- ============================================================================

do $$
declare
  v_admin uuid;
  v_tech  uuid;
  v_cust  uuid;
begin
  select id into v_admin from public.profiles where email = 'admin@serenetouch.ca';
  select id into v_tech  from public.profiles where email = 'tech@serenetouch.ca';
  select id into v_cust  from public.profiles where email = 'customer@serenetouch.ca';

  if v_admin is null or v_tech is null or v_cust is null then
    raise exception
      'Create admin@, tech@ and customer@serenetouch.ca under Authentication → Users first.';
  end if;

  update public.profiles
     set role = 'admin', full_name = 'Operations Admin'
   where id = v_admin;

  update public.profiles
     set role = 'technician', full_name = 'Marc Tremblay', phone = '438-555-0140'
   where id = v_tech;

  update public.profiles
     set role = 'customer', full_name = 'Jane Doe', phone = '438-555-0199',
         address = '123 Maple Avenue, Toronto, ON  M4B 1B4',
         plan = 'Quarterly Protection Plan', member_since = '2025-09-12'
   where id = v_cust;

  -- An upcoming, assigned job for Jane
  insert into public.appointments
    (customer_id, technician_id, technician_name, pest, treatment_type, targets,
     starts_at, ends_at, status, revisit_at, coverage_ends_at, re_entry_hours, notes)
  values
    (v_cust, v_tech, 'Marc Tremblay', 'Cockroaches',
     'Gel Bait + Crack & Crevice Treatment', 'kitchen and bathroom',
     now() + interval '5 days' + interval '9 hours',
     now() + interval '5 days' + interval '10 hours 30 minutes',
     'Scheduled',
     now() + interval '19 days', now() + interval '95 days', 4,
     'Targeting the kitchen and bathroom. Please keep the area under the sink accessible.');

  -- A past (completed) visit, so Jane has service history
  insert into public.appointments
    (customer_id, technician_id, technician_name, pest, treatment_type, targets,
     starts_at, ends_at, status, completed_at, re_entry_hours, result)
  values
    (v_cust, v_tech, 'Marc Tremblay', 'Ants',
     'Perimeter Barrier Treatment', 'kitchen and exterior perimeter',
     now() - interval '180 days', now() - interval '180 days' + interval '1 hour',
     'Completed', now() - interval '180 days' + interval '1 hour', 2,
     'Exterior perimeter treated. No further activity reported.');

  -- An unassigned job waiting for the admin to assign a technician
  insert into public.appointments
    (customer_id, pest, treatment_type, targets, starts_at, ends_at, status,
     coverage_ends_at, re_entry_hours, notes)
  values
    (v_cust, 'Rodents (Mice & Rats)', 'Removal + Entry-Point Sealing',
     'basement and garage',
     now() + interval '3 days' + interval '15 hours',
     now() + interval '3 days' + interval '16 hours 30 minutes',
     'Unassigned', now() + interval '365 days', 0,
     'Customer reported droppings in the garage. Needs a technician assigned.');
end $$;
