-- =====================================================================
-- SAMPLE DATA — 30 fake members with 12 weeks of attendance.
-- Run AFTER schema.sql, on an empty database, in Supabase → SQL Editor.
-- All names, phones and addresses are made up.
--
-- Each person follows an attendance "pattern" so you can test the status logic:
--   active           comes almost every week                → Active
--   became_irregular was active, came once in the last 4 wks → Irregular  (shows in Needs follow-up)
--   irregular        comes every 3rd week or so             → Irregular  (long-standing, not flagged)
--   became_inactive  was regular, stopped ~5 weeks ago      → Inactive   (shows in Needs follow-up)
--   long_inactive    hasn't come in months                  → Inactive   (long-standing, not flagged)
--   new_N            first visited N weeks ago              → New
-- =====================================================================

do $$
declare
  p          record;
  w          int;
  sun        date;
  base_mon   date := date_trunc('week', (now() at time zone 'Asia/Manila'))::date;
  hh         jsonb := '{}';
  gid        jsonb := '{}';
  mid        uuid;
  g          text;
  first_wk   int;
  attends    boolean;
  in_groups  boolean;
  d          int;
begin
  perform setseed(0.42);

  -- Households
  for p in select * from (values ('Santos'), ('Reyes'), ('Dela Cruz'), ('Mendoza'), ('Bautista')) v(n) loop
    insert into households (name) values (p.n || ' Family') returning id into mid;
    hh := hh || jsonb_build_object(p.n, mid);
  end loop;

  -- Groups (leaders are assigned later from the Groups page, once leader accounts exist)
  for p in select * from (values
      ('San Isidro Cell Group', 'small_group', 'Fridays 7:00 PM, Brgy. San Isidro'),
      ('Youth Cell',            'small_group', 'Fridays 6:00 PM, church hall'),
      ('Couples Fellowship',    'small_group', 'Fridays 7:30 PM, rotating homes'),
      ('Worship Team',          'ministry',    'Rehearsal Saturdays 4:00 PM'),
      ('Ushering Team',         'ministry',    null),
      ('Kids'' Ministry',       'ministry',    'Sundays during service')) v(n, t, info) loop
    insert into groups (name, type, meeting_info) values (p.n, p.t::group_type, p.info) returning id into mid;
    gid := gid || jsonb_build_object(p.n, mid);
  end loop;

  -- Events: 12 weeks of Sunday services, Wednesday prayer meetings and Friday small groups.
  for w in 0..11 loop
    sun := base_mon - 1 - 7 * w;
    insert into events (title, type, starts_at)
      values ('Sunday Service', 'sunday_service', (sun + time '09:00') at time zone 'Asia/Manila');
    insert into events (title, type, starts_at)
      values ('Prayer Meeting', 'prayer_meeting', (sun - 4 + time '19:00') at time zone 'Asia/Manila');
    for g in select key from jsonb_each_text(gid) loop
      if (select type from groups where name = g) = 'small_group' then
        insert into events (title, type, group_id, starts_at)
          values (g, 'small_group', (gid ->> g)::uuid, (sun - 2 + time '19:00') at time zone 'Asia/Manila');
      end if;
    end loop;
  end loop;

  -- People: idx, first, last, gender, civil, household, household role, is_child, pattern,
  --         membership, groups, birthday
  create temp table seed_people on commit drop as
  select * from (values
    ( 1,'Ricardo','Santos','male','married','Santos','head',false,'active','member','{San Isidro Cell Group,Ushering Team}', date '1981-03-14'),
    ( 2,'Liza','Santos','female','married','Santos','spouse',false,'active','member','{San Isidro Cell Group,Kids'' Ministry}', date '1984-07-22'),
    ( 3,'Mika','Santos','female','single','Santos','child',true,'active','visitor','{}', date '2017-05-02'),
    ( 4,'Paolo','Santos','male','single','Santos','child',true,'active','visitor','{}', (current_date - interval '6 years')::date),
    ( 5,'Jun','Reyes','male','married','Reyes','head',false,'became_irregular','member','{Couples Fellowship}', date '1979-11-30'),
    ( 6,'Grace','Reyes','female','married','Reyes','spouse',false,'became_irregular','member','{Couples Fellowship,Worship Team}', date '1982-01-09'),
    ( 7,'Antonio','Dela Cruz','male','married','Dela Cruz','head',false,'active','member','{Couples Fellowship}', date '1975-09-18'),
    ( 8,'Marites','Dela Cruz','female','married','Dela Cruz','spouse',false,'active','member','{Couples Fellowship,Kids'' Ministry}', date '1977-04-05'),
    ( 9,'Kevin','Dela Cruz','male','single','Dela Cruz','child',false,'active','regular_attendee','{Youth Cell,Worship Team}', date '2009-02-27'),
    (10,'Ramon','Mendoza','male','married','Mendoza','head',false,'became_inactive','member','{San Isidro Cell Group}', date '1968-06-11'),
    (11,'Cora','Mendoza','female','married','Mendoza','spouse',false,'became_inactive','member','{San Isidro Cell Group}', date '1970-12-03'),
    (12,'Noel','Bautista','male','married','Bautista','head',false,'long_inactive','member','{}', date '1986-08-19'),
    (13,'Joy','Bautista','female','married','Bautista','spouse',false,'irregular','member','{}', date '1988-10-25'),
    (14,'Angelica','Ramos','female','single','','',false,'active','member','{Youth Cell,Worship Team}', date '2003-03-08'),
    (15,'Mark','Villanueva','male','single','','',false,'active','regular_attendee','{Youth Cell}', (current_date + 5 - interval '22 years')::date),
    (16,'Jasmine','Garcia','female','single','','',false,'irregular','regular_attendee','{Youth Cell}', date '2005-07-14'),
    (17,'Carlo','Aquino','male','single','','',false,'became_inactive','regular_attendee','{Youth Cell}', date '2004-01-21'),
    (18,'Rowena','Castillo','female','widowed','','',false,'active','member','{San Isidro Cell Group,Ushering Team}', (current_date + 2 - interval '58 years')::date),
    (19,'Ernesto','Flores','male','widowed','','',false,'irregular','member','{San Isidro Cell Group}', date '1955-05-30'),
    (20,'Teresita','Navarro','female','married','','',false,'active','member','{}', date '1972-02-16'),
    (21,'Dennis','Torres','male','single','','',false,'long_inactive','regular_attendee','{}', date '1995-09-09'),
    (22,'Maricel','Gonzales','female','single','','',false,'became_irregular','member','{Worship Team}', date '1998-12-12'),
    (23,'Joel','Pascual','male','married','','',false,'active','member','{Ushering Team}', date '1983-06-27'),
    (24,'Rosario','Lim','female','married','','',false,'irregular','member','{}', date '1966-04-17'),
    (25,'Bea','Fernandez','female','single','','',false,'new_3','visitor','{}', date '2000-08-08'),
    (26,'Patrick','Soriano','male','single','','',false,'new_5','visitor','{Youth Cell}', date '2006-10-01'),
    (27,'Liezl','Domingo','female','married','','',false,'new_8','visitor','{}', date '1991-03-03'),
    (28,'Arnold','Cruz','male','single','','',false,'long_inactive','visitor','{}', date '1993-11-11'),
    (29,'Grace Ann','Morales','female','single','','',false,'active','member','{Kids'' Ministry}', date '1996-05-19'),
    (30,'Victor','Salazar','male','married','','',false,'active','member','{Ushering Team,San Isidro Cell Group}', date '1978-01-28')
  ) v(idx, fn, ln, gender, civil, hh_name, hh_role, is_child, pattern, mstatus, grps, bday);

  for p in select * from seed_people order by idx loop
    first_wk := case when p.pattern like 'new_%' then split_part(p.pattern, '_', 2)::int else null end;

    insert into members (
      first_name, last_name, gender, civil_status, birthday, phone, email, address,
      household_id, household_role, is_child, membership_status,
      first_visit_date, date_joined, baptism_date, consent_given, consent_date, consent_notes)
    values (
      p.fn, p.ln, p.gender, p.civil, p.bday,
      case when p.is_child then null else '0917 555 ' || lpad((1000 + p.idx * 37)::text, 4, '0') end,
      case when p.is_child then null else lower(replace(p.fn, ' ', '')) || '.' || lower(replace(p.ln, ' ', '')) || '@example.com' end,
      'Purok ' || (p.idx % 7 + 1) || ', Brgy. San Isidro, Sample City',
      case when p.hh_name = '' then null else (hh ->> p.hh_name)::uuid end,
      case when p.hh_role = '' then null else p.hh_role::household_role end,
      p.is_child, p.mstatus::membership_status,
      case when first_wk is not null then base_mon - 1 - 7 * first_wk
           else date '2019-01-06' + (p.idx * 41) end,
      case when p.mstatus = 'member' then date '2020-03-01' + (p.idx * 23) end,
      case when p.mstatus = 'member' then date '2019-12-15' + (p.idx * 23) end,
      true,
      case when first_wk is not null then base_mon - 1 - 7 * first_wk else date '2025-01-12' end,
      'Signed paper consent form')
    returning id into mid;

    foreach g in array p.grps::text[] loop
      insert into group_members (group_id, member_id) values ((gid ->> g)::uuid, mid);
    end loop;

    -- Attendance
    for w in 0..11 loop
      attends := case
        when p.pattern = 'active'           then (w + p.idx) % 5 <> 0
        when p.pattern = 'became_irregular' then (w >= 4 and (w + p.idx) % 5 <> 0) or w = 2
        when p.pattern = 'irregular'        then w % 3 = p.idx % 3
        when p.pattern = 'became_inactive'  then w >= 5
        when p.pattern = 'long_inactive'    then w = 11
        when first_wk is not null           then w <= first_wk and (w = first_wk or random() < 0.7)
        else false end;
      -- Group meetings only for steady attenders (keeps the "irregular" people irregular).
      in_groups := attends and (p.pattern = 'active' or first_wk is not null
                     or (p.pattern = 'became_irregular' and w >= 4)
                     or (p.pattern = 'became_inactive'));
      continue when not attends;

      sun := base_mon - 1 - 7 * w;
      insert into attendance (event_id, member_id, method, recorded_at)
        select e.id, mid, case when random() < 0.6 then 'qr' else 'manual' end, e.starts_at
        from events e where e.type = 'sunday_service'
          and (e.starts_at at time zone 'Asia/Manila')::date = sun;

      if in_groups then
        insert into attendance (event_id, member_id, method, recorded_at)
          select e.id, mid, 'manual', e.starts_at
          from events e join group_members gm on gm.group_id = e.group_id and gm.member_id = mid
          where e.type = 'small_group' and (e.starts_at at time zone 'Asia/Manila')::date = sun - 2;
      end if;

      if p.pattern = 'active' and (w + p.idx) % 2 = 0 then
        insert into attendance (event_id, member_id, method, recorded_at)
          select e.id, mid, 'manual', e.starts_at
          from events e where e.type = 'prayer_meeting'
            and (e.starts_at at time zone 'Asia/Manila')::date = sun - 4;
      end if;
    end loop;
  end loop;

  -- Build ~10 weeks of status history, as if the system had been running daily.
  for d in reverse 70..0 loop
    perform refresh_member_statuses(now() - make_interval(days => d));
  end loop;
end $$;

-- Quick check: how many people in each status right now?
select status, count(*) from member_overview where not is_child group by status order by status;
