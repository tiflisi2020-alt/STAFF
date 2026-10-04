-- Row Level Security.
-- Helper functions are security definer so policies can read the caller's
-- profile without recursive RLS. They only return data for auth.uid().

create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and restaurant_id is not null
  )
$$;

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.employees
  where profile_id = auth.uid()
    and restaurant_id = public.current_restaurant_id()
$$;

create or replace function public.list_colleagues()
returns table (
  id uuid,
  first_name text,
  last_name text,
  department_id uuid,
  position_id uuid,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.first_name, e.last_name, e.department_id, e.position_id, e.avatar_url
  from public.employees e
  where e.restaurant_id = public.current_restaurant_id()
    and e.is_active
$$;

create or replace function public.assign_profile_to_current_restaurant(target_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.profiles
  set restaurant_id = public.current_restaurant_id()
  where id = target_profile_id
    and restaurant_id is null;

  if not found then
    raise exception 'profile is already assigned' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.bootstrap_admin(target_user_id uuid, target_restaurant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'bootstrap is only available from the service role' using errcode = '42501';
  end if;

  update public.profiles
  set role = 'admin',
      restaurant_id = target_restaurant_id
  where id = target_user_id;
end;
$$;

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    new.role = old.role;
    new.restaurant_id = old.restaurant_id;
    return new;
  end if;

  if old.restaurant_id is not null
    and old.restaurant_id is distinct from public.current_restaurant_id() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if old.restaurant_id is null then
    new.restaurant_id = public.current_restaurant_id();
  elsif new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'restaurant cannot be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

create or replace function public.protect_request_review()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    if new.employee_id is distinct from old.employee_id
      or new.restaurant_id is distinct from old.restaurant_id then
      raise exception 'request owner cannot be changed' using errcode = '42501';
    end if;
    return new;
  end if;

  raise exception 'not allowed' using errcode = '42501';
end;
$$;

create trigger time_off_protect_review
before update on public.time_off_requests
for each row execute function public.protect_request_review();

create trigger vacation_protect_review
before update on public.vacation_requests
for each row execute function public.protect_request_review();

create or replace function public.protect_swap_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.shift_id is distinct from old.shift_id
    or new.requester_employee_id is distinct from old.requester_employee_id
    or new.target_employee_id is distinct from old.target_employee_id
    or new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'swap parties cannot be changed' using errcode = '42501';
  end if;

  if public.is_admin() then
    if old.status <> 'pending_manager' or new.status not in ('approved', 'rejected') then
      raise exception 'manager can only approve or reject a peer-accepted swap' using errcode = '42501';
    end if;
    return new;
  end if;

  if public.current_employee_id() = old.target_employee_id
    and old.status = 'pending_peer'
    and new.status in ('pending_manager', 'peer_rejected') then
    new.peer_responded_at = now();
    return new;
  end if;

  raise exception 'not allowed' using errcode = '42501';
end;
$$;

create trigger shift_swap_protect_update
before update on public.shift_swap_requests
for each row execute function public.protect_swap_update();

create or replace function public.protect_notification_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.recipient_profile_id is distinct from old.recipient_profile_id
    or new.restaurant_id is distinct from old.restaurant_id
    or new.title is distinct from old.title
    or new.body is distinct from old.body then
    raise exception 'notification content cannot be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger notifications_protect_update
before update on public.notifications
for each row execute function public.protect_notification_update();

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.employees enable row level security;
alter table public.employee_availability enable row level security;
alter table public.schedule_weeks enable row level security;
alter table public.shifts enable row level security;
alter table public.time_off_requests enable row level security;
alter table public.vacation_requests enable row level security;
alter table public.shift_swap_requests enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;
alter table public.schedule_templates enable row level security;
alter table public.schedule_template_shifts enable row level security;
alter table public.restaurant_settings enable row level security;

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.restaurants,
  public.profiles,
  public.departments,
  public.positions,
  public.employees,
  public.employee_availability,
  public.schedule_weeks,
  public.shifts,
  public.time_off_requests,
  public.vacation_requests,
  public.shift_swap_requests,
  public.attendance,
  public.notifications,
  public.schedule_templates,
  public.schedule_template_shifts,
  public.restaurant_settings
to authenticated;

revoke all on
  public.restaurants,
  public.profiles,
  public.departments,
  public.positions,
  public.employees,
  public.employee_availability,
  public.schedule_weeks,
  public.shifts,
  public.time_off_requests,
  public.vacation_requests,
  public.shift_swap_requests,
  public.attendance,
  public.notifications,
  public.schedule_templates,
  public.schedule_template_shifts,
  public.restaurant_settings
from anon;

revoke all on function public.current_restaurant_id() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.current_employee_id() from public, anon;
revoke all on function public.list_colleagues() from public, anon;
revoke all on function public.assign_profile_to_current_restaurant(uuid) from public, anon;
revoke all on function public.bootstrap_admin(uuid, uuid) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.bootstrap_admin(uuid, uuid) to service_role;
  end if;
end $$;

grant execute on function public.current_restaurant_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.list_colleagues() to authenticated;
grant execute on function public.assign_profile_to_current_restaurant(uuid) to authenticated;

create policy restaurants_select on public.restaurants
for select to authenticated
using (id = public.current_restaurant_id());

create policy restaurants_update on public.restaurants
for update to authenticated
using (public.is_admin() and id = public.current_restaurant_id())
with check (public.is_admin() and id = public.current_restaurant_id());

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (public.is_admin() and restaurant_id = public.current_restaurant_id())
);

create policy profiles_update on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or (public.is_admin() and restaurant_id = public.current_restaurant_id())
)
with check (
  id = auth.uid()
  or (public.is_admin() and restaurant_id = public.current_restaurant_id())
);

create policy departments_select on public.departments
for select to authenticated
using (restaurant_id = public.current_restaurant_id());

create policy departments_write on public.departments
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy positions_select on public.positions
for select to authenticated
using (restaurant_id = public.current_restaurant_id());

create policy positions_write on public.positions
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy employees_select on public.employees
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or profile_id = auth.uid())
);

create policy employees_write on public.employees
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy availability_select on public.employee_availability
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
);

create policy availability_write on public.employee_availability
for all to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
)
with check (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
);

create policy schedule_weeks_select on public.schedule_weeks
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or status = 'published')
);

create policy schedule_weeks_write on public.schedule_weeks
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy shifts_select on public.shifts
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (
    public.is_admin()
    or (
      employee_id = public.current_employee_id()
      and status in ('published', 'cancelled')
      and exists (
        select 1
        from public.schedule_weeks week
        where week.id = schedule_week_id
          and week.status = 'published'
      )
    )
  )
);

create policy shifts_write on public.shifts
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy time_off_select on public.time_off_requests
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
);

create policy time_off_insert on public.time_off_requests
for insert to authenticated
with check (
  restaurant_id = public.current_restaurant_id()
  and employee_id = public.current_employee_id()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

create policy time_off_update on public.time_off_requests
for update to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy vacation_select on public.vacation_requests
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
);

create policy vacation_insert on public.vacation_requests
for insert to authenticated
with check (
  restaurant_id = public.current_restaurant_id()
  and employee_id = public.current_employee_id()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
);

create policy vacation_update on public.vacation_requests
for update to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy swap_select on public.shift_swap_requests
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (
    public.is_admin()
    or requester_employee_id = public.current_employee_id()
    or target_employee_id = public.current_employee_id()
  )
);

create policy swap_insert on public.shift_swap_requests
for insert to authenticated
with check (
  restaurant_id = public.current_restaurant_id()
  and requester_employee_id = public.current_employee_id()
  and status = 'pending_peer'
  and reviewed_by is null
  and reviewed_at is null
  and peer_responded_at is null
);

create policy swap_update on public.shift_swap_requests
for update to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (
    public.is_admin()
    or target_employee_id = public.current_employee_id()
  )
)
with check (
  restaurant_id = public.current_restaurant_id()
  and (
    public.is_admin()
    or target_employee_id = public.current_employee_id()
  )
);

create policy attendance_select on public.attendance
for select to authenticated
using (
  restaurant_id = public.current_restaurant_id()
  and (public.is_admin() or employee_id = public.current_employee_id())
);

create policy attendance_write on public.attendance
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy notifications_select on public.notifications
for select to authenticated
using (recipient_profile_id = auth.uid());

create policy notifications_update on public.notifications
for update to authenticated
using (recipient_profile_id = auth.uid())
with check (recipient_profile_id = auth.uid());

create policy notifications_insert on public.notifications
for insert to authenticated
with check (
  public.is_admin()
  and restaurant_id = public.current_restaurant_id()
  and exists (
    select 1
    from public.profiles recipient
    where recipient.id = recipient_profile_id
      and recipient.restaurant_id = public.current_restaurant_id()
  )
);

create policy templates_all on public.schedule_templates
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy template_shifts_all on public.schedule_template_shifts
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());

create policy settings_select on public.restaurant_settings
for select to authenticated
using (restaurant_id = public.current_restaurant_id());

create policy settings_write on public.restaurant_settings
for all to authenticated
using (public.is_admin() and restaurant_id = public.current_restaurant_id())
with check (public.is_admin() and restaurant_id = public.current_restaurant_id());
