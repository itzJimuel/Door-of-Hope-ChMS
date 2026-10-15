-- =====================================================================
-- Door of Hope Assembly of God — Church Management System
-- Database schema (run once in Supabase → SQL Editor)
--
-- Security model: every table has Row Level Security (RLS) turned on.
-- The rules below are enforced by the database itself, so a user can never
-- read or change data their role doesn't allow — even with a hacked browser.
-- =====================================================================

-- ---------- Types ----------------------------------------------------
create type public.user_role         as enum ('admin', 'pastor', 'leader', 'usher', 'member');
create type public.membership_status as enum ('visitor', 'regular_attendee', 'member');
create type public.activity_status   as enum ('new', 'active', 'irregular', 'inactive');
create type public.event_type        as enum ('sunday_service', 'small_group', 'prayer_meeting', 'event');
create type public.household_role   as enum ('head', 'spouse', 'child', 'other');
create type public.group_type        as enum ('small_group', 'ministry');

-- ---------- Tables ---------------------------------------------------

-- People who can log in. One row per Supabase auth user.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        public.user_role not null default 'member',   -- least privilege by default
  created_at  timestamptz not null default now()
);

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- e.g. "Santos Family"
  created_at  timestamptz not null default now()
);

create table public.members (
  id                 uuid primary key default gen_random_uuid(),
  first_name         text not null,
  last_name          text not null,
  photo_path         text,                    -- path in the private "member-photos" bucket
  birthday           date,
  gender             text check (gender in ('male', 'female')),
  civil_status       text check (civil_status in ('single', 'married', 'widowed', 'separated')),
  phone              text,
  email              text,
  address            text,
  household_id       uuid references public.households (id) on delete set null,
  household_role     public.household_role,
  is_child           boolean not null default false,   -- children are excluded from status & follow-up
  first_visit_date   date not null default current_date,
  date_joined        date,                    -- date they became a formal member
  baptism_date       date,
  membership_status  public.membership_status not null default 'visitor',
  qr_token           text not null unique default replace(gen_random_uuid()::text, '-', ''),
  consent_given      boolean not null default false,
  consent_date       date,
  consent_notes      text,                    -- e.g. "Signed paper form, filed in office"
  archived_at        timestamptz,             -- moved away / no longer tracked
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint consent_recorded check (consent_given and consent_date is not null)
);
create index members_household_idx on public.members (household_id);
create index members_name_idx on public.members (last_name, first_name);

create table public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  type        public.group_type not null default 'small_group',
  leader_id   uuid references public.profiles (id) on delete set null,
  meeting_info text,                          -- e.g. "Fridays 7pm, Brgy. San Isidro"
  created_at  timestamptz not null default now()
);

create table public.group_members (
  group_id    uuid not null references public.groups (id) on delete cascade,
  member_id   uuid not null references public.members (id) on delete cascade,
  primary key (group_id, member_id)
);
create index group_members_member_idx on public.group_members (member_id);

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  type        public.event_type not null,
  group_id    uuid references public.groups (id) on delete cascade,   -- set for small-group meetings
  starts_at   timestamptz not null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint small_group_needs_group check (type <> 'small_group' or group_id is not null)
);
create index events_starts_idx on public.events (starts_at desc);

create table public.attendance (
  event_id     uuid not null references public.events (id) on delete cascade,
  member_id    uuid not null references public.members (id) on delete cascade,
  method       text not null default 'manual' check (method in ('manual', 'qr')),
  recorded_by  uuid references public.profiles (id) on delete set null,
  recorded_at  timestamptz not null default now(),
  primary key (event_id, member_id)           -- a person can only be checked in once per event
);
create index attendance_member_idx on public.attendance (member_id);

-- One row only (id = 1). Admins edit these on the Settings page.
create table public.settings (
  id                      int primary key default 1 check (id = 1),
  active_min_attendance   int not null default 3 check (active_min_attendance >= 1),
  window_weeks            int not null default 4 check (window_weeks between 1 and 26),
  new_member_days         int not null default 90 check (new_member_days between 0 and 365),
  followup_lookback_days  int not null default 30 check (followup_lookback_days between 1 and 180)
);
insert into public.settings (id) values (1);

-- Every time a member's activity status changes, a row is added here.
create table public.member_status_history (
  id               bigint generated always as identity primary key,
  member_id        uuid not null references public.members (id) on delete cascade,
  status           public.activity_status not null,
  previous_status  public.activity_status,     -- null = first time we calculated it
  changed_at       timestamptz not null default now()
);
create index status_history_member_idx on public.member_status_history (member_id, changed_at desc);

-- Who viewed or changed which member record. Nobody can edit or delete these rows.
create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid,                            -- null = system / SQL editor
  member_id   uuid,                            -- no foreign key so entries survive deletion
  action      text not null check (action in ('view', 'create', 'update', 'delete')),
  details     jsonb,                           -- names of fields changed (not their values)
  created_at  timestamptz not null default now()
);
create index audit_created_idx on public.audit_log (created_at desc);

-- ---------- Helper functions used by the security rules ---------------

create or replace function public.my_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()       -- admin or pastor
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('admin', 'pastor'), false)
$$;

create or replace function public.leads_group(p_group uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups where id = p_group and leader_id = auth.uid())
$$;

create or replace function public.leads_member(p_member uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    join public.groups g on g.id = gm.group_id
    where gm.member_id = p_member and g.leader_id = auth.uid()
  )
$$;

-- ---------- Row Level Security ---------------------------------------
alter table public.profiles              enable row level security;
alter table public.households            enable row level security;
alter table public.members               enable row level security;
alter table public.groups                enable row level security;
alter table public.group_members         enable row level security;
alter table public.events                enable row level security;
alter table public.attendance            enable row level security;
alter table public.settings              enable row level security;
alter table public.member_status_history enable row level security;
alter table public.audit_log             enable row level security;

-- profiles: you can see yourself; admins & pastors see everyone; only admins change roles.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- households: admins & pastors only.
create policy households_all on public.households for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- members: staff see/edit all; leaders see only members of groups they lead.
-- Ushers get NO direct access — they use the check-in functions below, which return names only.
create policy members_select on public.members for select to authenticated
  using (public.is_staff() or public.leads_member(id));
create policy members_insert on public.members for insert to authenticated
  with check (public.is_staff());
create policy members_update on public.members for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy members_delete on public.members for delete to authenticated
  using (public.my_role() = 'admin');

-- groups
create policy groups_select on public.groups for select to authenticated
  using (public.is_staff() or leader_id = auth.uid());
create policy groups_write on public.groups for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy group_members_select on public.group_members for select to authenticated
  using (public.is_staff() or public.leads_group(group_id));
create policy group_members_write on public.group_members for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- events: ushers & leaders see church-wide events; leaders also see their own group's meetings.
create policy events_select on public.events for select to authenticated
  using (
    public.is_staff()
    or (group_id is null and public.my_role() in ('usher', 'leader'))
    or (group_id is not null and public.leads_group(group_id))
  );
create policy events_insert on public.events for insert to authenticated
  with check (public.is_staff() or (group_id is not null and public.leads_group(group_id)));
create policy events_update on public.events for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy events_delete on public.events for delete to authenticated
  using (public.is_staff());

-- attendance: read by staff, or by a leader for their own members. Writes go through
-- the check_in functions (which verify permission), plus staff may write directly.
create policy attendance_select on public.attendance for select to authenticated
  using (public.is_staff() or public.leads_member(member_id));
create policy attendance_write on public.attendance for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- settings: everyone signed in can read; only admins change.
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_update on public.settings for update to authenticated
  using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

create policy status_history_select on public.member_status_history for select to authenticated
  using (public.is_staff() or public.leads_member(member_id));

create policy audit_select on public.audit_log for select to authenticated
  using (public.my_role() = 'admin');

-- ---------- Activity status ------------------------------------------

-- The status rules, in one place. Uses the thresholds from settings.
create or replace function public.compute_status(p_member uuid, p_as_of timestamptz default now())
returns public.activity_status
language sql stable set search_path = public as $$
  with s as (select * from public.settings where id = 1),
       m as (select * from public.members where id = p_member),
       c as (
         select count(*) as n
         from public.attendance a
         join public.events e on e.id = a.event_id, s
         where a.member_id = p_member
           and e.starts_at >  p_as_of - make_interval(weeks => s.window_weeks)
           and e.starts_at <= p_as_of
       )
  select case
    when m.is_child or m.archived_at is not null           then null
    when m.first_visit_date > p_as_of::date                 then null   -- hadn't visited yet
    when m.first_visit_date > p_as_of::date - s.new_member_days then 'new'
    when c.n >= s.active_min_attendance                     then 'active'
    when c.n >= 1                                           then 'irregular'
    else 'inactive'
  end::public.activity_status
  from m, s, c
$$;

-- Members with their live status. security_invoker = the reader's own access rules apply.
create or replace view public.member_overview with (security_invoker = true) as
select
  m.id, m.first_name, m.last_name, m.phone, m.membership_status, m.is_child,
  m.household_id, m.birthday, m.archived_at, m.first_visit_date,
  public.compute_status(m.id) as status,
  (select max(e.starts_at) from public.attendance a join public.events e on e.id = a.event_id
    where a.member_id = m.id and e.starts_at <= now()) as last_attended
from public.members m;

-- Records status changes into member_status_history. Called when the dashboard
-- loads (and by the sample-data script to build history). Cheap for a few hundred members.
create or replace function public.refresh_member_statuses(p_as_of timestamptz default now())
returns int
language plpgsql security definer set search_path = public as $$
declare
  r     record;
  cur   public.activity_status;
  prev  public.activity_status;
  n     int := 0;
begin
  -- auth.uid() is null only for trusted callers (SQL editor, scheduled jobs).
  if auth.uid() is not null and not public.is_staff() then
    raise exception 'Not allowed';
  end if;
  for r in select id from public.members loop
    cur := public.compute_status(r.id, p_as_of);
    continue when cur is null;
    select status into prev from public.member_status_history
      where member_id = r.id and changed_at <= p_as_of
      order by changed_at desc limit 1;
    if prev is distinct from cur then
      insert into public.member_status_history (member_id, status, previous_status, changed_at)
      values (r.id, cur, prev, p_as_of);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- "Needs follow-up": members whose status recently dropped to Irregular or Inactive.
create or replace function public.needs_followup()
returns table (
  member_id uuid, first_name text, last_name text, phone text,
  status public.activity_status, previous_status public.activity_status,
  changed_at timestamptz, last_attended timestamptz
)
language sql stable set search_path = public as $$
  with latest as (
    select distinct on (h.member_id) h.*
    from public.member_status_history h
    order by h.member_id, h.changed_at desc
  )
  select l.member_id, m.first_name, m.last_name, m.phone, l.status, l.previous_status, l.changed_at,
         (select max(e.starts_at) from public.attendance a join public.events e on e.id = a.event_id
           where a.member_id = m.id)
  from latest l
  join public.members m on m.id = l.member_id
  cross join public.settings s
  where s.id = 1
    and m.archived_at is null and not m.is_child
    and l.status in ('irregular', 'inactive')
    and l.previous_status is not null
    and not (l.status = 'irregular' and l.previous_status = 'inactive')   -- coming back is good news
    and l.changed_at >= now() - make_interval(days => s.followup_lookback_days)
  order by l.changed_at desc
$$;

-- Weekly attendance for the dashboard chart. Weeks run Sunday → Saturday.
create or replace function public.weekly_attendance(p_weeks int default 12)
returns table (week_start date, people bigint, sunday bigint)
language sql stable set search_path = public as $$
  with this_sunday as (
    select date_trunc('week', (now() at time zone 'Asia/Manila') + interval '1 day') - interval '1 day' as d
  )
  select gs::date,
         count(distinct a.member_id),
         count(distinct a.member_id) filter (where e.type = 'sunday_service')
  from this_sunday,
       generate_series(this_sunday.d - make_interval(weeks => p_weeks - 1), this_sunday.d, interval '1 week') gs
  left join public.events e
         on (e.starts_at at time zone 'Asia/Manila') >= gs
        and (e.starts_at at time zone 'Asia/Manila') <  gs + interval '1 week'
  left join public.attendance a on a.event_id = e.id
  group by gs
  order by gs
$$;

-- Birthdays in the next N days (handles Feb 29 and the new-year wrap-around).
create or replace function public.upcoming_birthdays(p_days int default 7)
returns table (member_id uuid, first_name text, last_name text, birthday date, next_birthday date, turning int)
language sql stable set search_path = public as $$
  with t as (select (now() at time zone 'Asia/Manila')::date as today),
  b as (
    select m.*, t.today,
           date_part('year', age(t.today, m.birthday))::int as yrs
    from public.members m, t
    where m.birthday is not null and m.archived_at is null
  ),
  n as (
    select b.*,
      case when (b.birthday + make_interval(years => b.yrs))::date = b.today
           then b.today
           else (b.birthday + make_interval(years => b.yrs + 1))::date end as nb
    from b
  )
  select id, first_name, last_name, birthday, nb, date_part('year', age(nb, birthday))::int
  from n
  where nb between today and today + p_days
  order by nb, last_name
$$;

-- ---------- Check-in (used by ushers, leaders and staff) ----------------

create or replace function public.can_check_in(p_event uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when public.is_staff() then true
      when public.my_role() = 'usher'  then e.group_id is null
      when public.my_role() = 'leader' then e.group_id is not null and public.leads_group(e.group_id)
      else false end
    from public.events e where e.id = p_event
  ), false)
$$;

-- Who may be checked in to this event: the group's roster for group meetings,
-- everyone (not archived) for church-wide events. Returns names only.
create or replace function public.checkin_roster(p_event uuid)
returns table (member_id uuid, first_name text, last_name text, is_child boolean, checked_in boolean)
language plpgsql stable security definer set search_path = public as $$
declare g uuid;
begin
  if not public.can_check_in(p_event) then raise exception 'Not allowed'; end if;
  select group_id into g from public.events where id = p_event;
  return query
    select m.id, m.first_name, m.last_name, m.is_child,
           exists (select 1 from public.attendance a where a.event_id = p_event and a.member_id = m.id)
    from public.members m
    where m.archived_at is null
      and (g is null or exists (select 1 from public.group_members gm where gm.group_id = g and gm.member_id = m.id))
    order by m.last_name, m.first_name;
end $$;

create or replace function public.check_in(p_event uuid, p_member uuid, p_method text default 'manual')
returns boolean      -- true = newly checked in, false = was already checked in
language plpgsql security definer set search_path = public as $$
declare g uuid; n int;
begin
  if not public.can_check_in(p_event) then raise exception 'Not allowed'; end if;
  select group_id into g from public.events where id = p_event;
  if not exists (
    select 1 from public.members m where m.id = p_member and m.archived_at is null
      and (g is null or exists (select 1 from public.group_members gm where gm.group_id = g and gm.member_id = m.id))
  ) then raise exception 'This person is not on the list for this event'; end if;
  insert into public.attendance (event_id, member_id, method, recorded_by)
  values (p_event, p_member, case when p_method = 'qr' then 'qr' else 'manual' end, auth.uid())
  on conflict do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.check_in_qr(p_event uuid, p_token text)
returns table (member_id uuid, first_name text, last_name text, newly_checked_in boolean)
language plpgsql security definer set search_path = public as $$
declare m public.members;
begin
  select * into m from public.members where qr_token = p_token and archived_at is null;
  if m.id is null then raise exception 'QR code not recognized'; end if;
  return query select m.id, m.first_name, m.last_name, public.check_in(p_event, m.id, 'qr');
end $$;

create or replace function public.undo_check_in(p_event uuid, p_member uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_check_in(p_event) then raise exception 'Not allowed'; end if;
  delete from public.attendance where event_id = p_event and member_id = p_member;
end $$;

-- Lets ushers start today's Sunday service / prayer meeting without needing admin.
create or replace function public.ensure_event_today(p_type public.event_type)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  ev uuid;
begin
  if not (public.is_staff() or public.my_role() = 'usher') then raise exception 'Not allowed'; end if;
  if p_type not in ('sunday_service', 'prayer_meeting') then raise exception 'Unsupported type'; end if;
  select id into ev from public.events
    where type = p_type and group_id is null
      and (starts_at at time zone 'Asia/Manila')::date = today
    limit 1;
  if ev is null then
    insert into public.events (title, type, starts_at, created_by)
    values (
      case p_type when 'sunday_service' then 'Sunday Service' else 'Prayer Meeting' end,
      p_type,
      (today + case p_type when 'sunday_service' then time '09:00' else time '19:00' end) at time zone 'Asia/Manila',
      auth.uid())
    returning id into ev;
  end if;
  return ev;
end $$;

-- ---------- Audit log ------------------------------------------------

create or replace function public.log_member_view(p_member uuid)
returns void
language sql security definer set search_path = public as $$
  insert into public.audit_log (user_id, member_id, action) values (auth.uid(), p_member, 'view')
$$;

create or replace function public.audit_member_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    insert into public.audit_log (user_id, member_id, action, details)
    select auth.uid(), new.id, 'update', jsonb_agg(n.key)
    from jsonb_each(to_jsonb(new)) n
    where n.value is distinct from (to_jsonb(old) -> n.key) and n.key <> 'updated_at';
    return new;
  elsif tg_op = 'INSERT' then
    insert into public.audit_log (user_id, member_id, action) values (auth.uid(), new.id, 'create');
    return new;
  else
    insert into public.audit_log (user_id, member_id, action) values (auth.uid(), old.id, 'delete');
    return old;
  end if;
end $$;

create trigger members_audit_ins after insert on public.members
  for each row execute function public.audit_member_change();
create trigger members_audit_upd before update on public.members
  for each row execute function public.audit_member_change();
create trigger members_audit_del after delete on public.members
  for each row execute function public.audit_member_change();

-- New sign-ups get a profile with the lowest role. An admin then assigns the real role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Permissions on functions & views ---------------------------
-- Functions are callable by "public" by default; lock them to signed-in users.
revoke execute on all functions in schema public from public, anon;
grant  execute on all functions in schema public to authenticated;
revoke all on public.member_overview from anon;
grant  select on public.member_overview to authenticated;

-- ---------- Photo storage (private bucket) ------------------------------
insert into storage.buckets (id, name, public) values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;

create policy "staff manage member photos" on storage.objects for all to authenticated
  using (bucket_id = 'member-photos' and public.is_staff())
  with check (bucket_id = 'member-photos' and public.is_staff());
create policy "leaders view member photos" on storage.objects for select to authenticated
  using (bucket_id = 'member-photos' and public.my_role() = 'leader');
