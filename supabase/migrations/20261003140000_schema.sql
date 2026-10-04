-- Restaurant staff schema.
-- Dates are calendar dates. Times are local wall-clock times without a time zone.
-- A shift or availability window crosses midnight when end_time <= start_time
-- (for example 16:00 -> 00:00).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete restrict,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  color_token text not null default 'neutral',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  department_id uuid not null references public.departments (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (department_id, name)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  profile_id uuid unique references public.profiles (id) on delete set null,
  first_name text not null check (char_length(btrim(first_name)) > 0),
  last_name text not null check (char_length(btrim(last_name)) > 0),
  phone text,
  email text,
  avatar_url text,
  department_id uuid references public.departments (id) on delete restrict,
  position_id uuid references public.positions (id) on delete restrict,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employee_availability (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  is_unavailable boolean not null default false,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_unavailable and start_time is null and end_time is null)
    or (
      not is_unavailable
      and start_time is not null
      and end_time is not null
      and start_time <> end_time
    )
  )
);

create table public.schedule_weeks (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, week_start),
  check (extract(isodow from week_start) = 1)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  schedule_week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  department_id uuid not null references public.departments (id) on delete restrict,
  position_id uuid not null references public.positions (id) on delete restrict,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 720),
  notes text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time <> end_time)
);

create table public.time_off_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  request_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vacation_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  requester_employee_id uuid not null references public.employees (id) on delete cascade,
  target_employee_id uuid not null references public.employees (id) on delete cascade,
  status text not null default 'pending_peer' check (
    status in (
      'pending_peer',
      'peer_rejected',
      'pending_manager',
      'approved',
      'rejected'
    )
  ),
  peer_responded_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_employee_id <> target_employee_id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  shift_id uuid references public.shifts (id) on delete set null,
  attendance_date date not null,
  scheduled_start time,
  scheduled_end time,
  actual_start time,
  actual_end time,
  status text not null check (status in ('present', 'late', 'absent', 'day_off', 'vacation')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.schedule_template_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  template_id uuid not null references public.schedule_templates (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete restrict,
  department_id uuid not null references public.departments (id) on delete restrict,
  position_id uuid not null references public.positions (id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 720),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time <> end_time)
);

create table public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null unique references public.restaurants (id) on delete cascade,
  display_name text not null,
  timezone text not null default 'Asia/Tbilisi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index employees_restaurant_id_idx on public.employees (restaurant_id);
create index employees_department_id_idx on public.employees (department_id);
create index employees_position_id_idx on public.employees (position_id);
create index employees_active_idx on public.employees (restaurant_id, is_active);
create unique index employees_restaurant_email_key
  on public.employees (restaurant_id, email)
  where email is not null;

create index employee_availability_employee_day_idx
  on public.employee_availability (employee_id, day_of_week);

create index shifts_employee_date_idx on public.shifts (employee_id, shift_date);
create index shifts_restaurant_date_idx on public.shifts (restaurant_id, shift_date);
create index shifts_week_idx on public.shifts (schedule_week_id);
create index shifts_status_idx on public.shifts (restaurant_id, status);

create unique index time_off_open_request_key
  on public.time_off_requests (employee_id, request_date)
  where status in ('pending', 'approved');

create index time_off_restaurant_status_idx
  on public.time_off_requests (restaurant_id, status, request_date);

create index vacation_employee_dates_idx
  on public.vacation_requests (employee_id, start_date, end_date);
create index vacation_restaurant_status_idx
  on public.vacation_requests (restaurant_id, status);

alter table public.vacation_requests
  add constraint vacation_requests_no_overlap
  exclude using gist (
    employee_id with =,
    daterange(start_date, end_date, '[]') with &&
  )
  where (status in ('pending', 'approved'));

create index shift_swap_requester_idx on public.shift_swap_requests (requester_employee_id, status);
create index shift_swap_target_idx on public.shift_swap_requests (target_employee_id, status);
create index shift_swap_restaurant_status_idx on public.shift_swap_requests (restaurant_id, status);

create index attendance_employee_date_idx on public.attendance (employee_id, attendance_date);
create index attendance_restaurant_date_idx on public.attendance (restaurant_id, attendance_date);

create index notifications_recipient_idx
  on public.notifications (recipient_profile_id, is_read, created_at desc);

create index schedule_template_shifts_template_idx
  on public.schedule_template_shifts (template_id, day_of_week);

create index profiles_restaurant_idx on public.profiles (restaurant_id);

create or replace function public.enforce_position_restaurant()
returns trigger
language plpgsql
as $$
declare
  department_restaurant uuid;
begin
  select restaurant_id into department_restaurant
  from public.departments
  where id = new.department_id;

  if department_restaurant is null or department_restaurant <> new.restaurant_id then
    raise exception 'position department does not belong to the restaurant'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_employee_relations()
returns trigger
language plpgsql
as $$
declare
  position_department uuid;
  position_restaurant uuid;
  profile_restaurant uuid;
begin
  if new.position_id is not null then
    select department_id, restaurant_id
      into position_department, position_restaurant
    from public.positions
    where id = new.position_id;

    if position_restaurant is distinct from new.restaurant_id
      or position_department is distinct from new.department_id then
      raise exception 'employee position does not match the department'
        using errcode = '23514';
    end if;
  end if;

  if new.department_id is not null then
    if not exists (
      select 1 from public.departments
      where id = new.department_id and restaurant_id = new.restaurant_id
    ) then
      raise exception 'employee department does not belong to the restaurant'
        using errcode = '23514';
    end if;
  end if;

  if new.profile_id is not null then
    select restaurant_id into profile_restaurant
    from public.profiles
    where id = new.profile_id;

    if profile_restaurant is distinct from new.restaurant_id then
      raise exception 'employee profile belongs to another restaurant'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_same_restaurant()
returns trigger
language plpgsql
as $$
declare
  employee_restaurant uuid;
begin
  select restaurant_id into employee_restaurant
  from public.employees
  where id = new.employee_id;

  if employee_restaurant is distinct from new.restaurant_id then
    raise exception 'record does not belong to the employee restaurant'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_shift_integrity()
returns trigger
language plpgsql
as $$
declare
  week_restaurant uuid;
  week_start date;
  employee_restaurant uuid;
  position_department uuid;
  position_restaurant uuid;
begin
  select restaurant_id, schedule_weeks.week_start
    into week_restaurant, week_start
  from public.schedule_weeks
  where id = new.schedule_week_id;

  if week_restaurant is distinct from new.restaurant_id then
    raise exception 'shift week belongs to another restaurant'
      using errcode = '23514';
  end if;

  if new.shift_date < week_start or new.shift_date > week_start + 6 then
    raise exception 'shift date is outside the schedule week'
      using errcode = '23514';
  end if;

  select restaurant_id into employee_restaurant
  from public.employees
  where id = new.employee_id;

  if employee_restaurant is distinct from new.restaurant_id then
    raise exception 'shift employee belongs to another restaurant'
      using errcode = '23514';
  end if;

  select department_id, restaurant_id
    into position_department, position_restaurant
  from public.positions
  where id = new.position_id;

  if position_restaurant is distinct from new.restaurant_id
    or position_department is distinct from new.department_id then
    raise exception 'shift position does not match the department'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_swap_parties()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_employee uuid;
  shift_restaurant uuid;
  target_restaurant uuid;
begin
  select employee_id, restaurant_id
    into shift_employee, shift_restaurant
  from public.shifts
  where id = new.shift_id;

  if shift_restaurant is distinct from new.restaurant_id
    or shift_employee is distinct from new.requester_employee_id then
    raise exception 'swap request must use the requester shift'
      using errcode = '23514';
  end if;

  select restaurant_id into target_restaurant
  from public.employees
  where id = new.target_employee_id and is_active;

  if target_restaurant is distinct from new.restaurant_id then
    raise exception 'swap target is not an active employee of the restaurant'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger positions_set_updated_at
before update on public.positions
for each row execute function public.set_updated_at();

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create trigger employee_availability_set_updated_at
before update on public.employee_availability
for each row execute function public.set_updated_at();

create trigger schedule_weeks_set_updated_at
before update on public.schedule_weeks
for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

create trigger time_off_requests_set_updated_at
before update on public.time_off_requests
for each row execute function public.set_updated_at();

create trigger vacation_requests_set_updated_at
before update on public.vacation_requests
for each row execute function public.set_updated_at();

create trigger shift_swap_requests_set_updated_at
before update on public.shift_swap_requests
for each row execute function public.set_updated_at();

create trigger attendance_set_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create trigger schedule_templates_set_updated_at
before update on public.schedule_templates
for each row execute function public.set_updated_at();

create trigger schedule_template_shifts_set_updated_at
before update on public.schedule_template_shifts
for each row execute function public.set_updated_at();

create trigger restaurant_settings_set_updated_at
before update on public.restaurant_settings
for each row execute function public.set_updated_at();

create trigger positions_enforce_restaurant
before insert or update on public.positions
for each row execute function public.enforce_position_restaurant();

create trigger employees_enforce_relations
before insert or update on public.employees
for each row execute function public.enforce_employee_relations();

create trigger availability_enforce_restaurant
before insert or update on public.employee_availability
for each row execute function public.enforce_same_restaurant();

create trigger shifts_enforce_integrity
before insert or update on public.shifts
for each row execute function public.enforce_shift_integrity();

create trigger time_off_enforce_restaurant
before insert or update on public.time_off_requests
for each row execute function public.enforce_same_restaurant();

create trigger vacation_enforce_restaurant
before insert or update on public.vacation_requests
for each row execute function public.enforce_same_restaurant();

create trigger attendance_enforce_restaurant
before insert or update on public.attendance
for each row execute function public.enforce_same_restaurant();

create trigger swap_enforce_parties
before insert or update on public.shift_swap_requests
for each row execute function public.enforce_swap_parties();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'employee'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.shifts replica identity full;
alter table public.notifications replica identity full;
alter table public.schedule_weeks replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.shifts;
    alter publication supabase_realtime add table public.notifications;
    alter publication supabase_realtime add table public.schedule_weeks;
  end if;
end $$;
