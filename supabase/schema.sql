-- ============================================================
--  주간 업무 보고 — Supabase 스키마
--  Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================================

-- 1. 팀원
create table if not exists members (
  id          text primary key,
  name        text not null,
  color       text not null,
  label       text not null default 'FE개발',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- 2. 주간 보고 헤더
create table if not exists weekly_records (
  week_key    text primary key,          -- 예: "2026-W24"
  from_date   date not null,
  to_date     date not null,
  updated_at  timestamptz not null default now()
);

-- 3. 주간 업무 항목
create table if not exists weekly_tasks (
  id           text primary key,
  week_key     text not null references weekly_records(week_key) on delete cascade,
  member_id    text references members(id) on delete set null,
  assignee     text not null default '',
  name         text not null default '',
  last_work    text not null default '',
  last_from    date,
  last_to      date,
  last_status  text not null default '진행중',
  curr_work    text not null default '',
  curr_from    date,
  curr_to      date,
  curr_status  text not null default '진행중',
  next_work    text not null default '',
  next_from    date,
  next_to      date,
  next_status  text not null default '예정',
  works        jsonb not null default '[]'::jsonb,
  target_date  date,
  target_memo  text not null default '',
  order_index  integer not null default 0
);

-- 4. 주간 Todo
create table if not exists weekly_todos (
  id          text primary key,
  week_key    text not null references weekly_records(week_key) on delete cascade,
  text        text not null default '',
  done        boolean not null default false,
  order_index integer not null default 0
);

-- 5. 주간 업무 임시 저장
create table if not exists weekly_drafts (
  week_key    text primary key,
  from_date   date not null,
  to_date     date not null,
  tasks       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ── 권한 설정 (반드시 실행) ───────────────────────────────────
-- 이미 실행한 적이 있어도 다시 Run 해도 됩니다 (정책·컬럼 중복 방지 처리됨)

grant usage on schema public to anon, authenticated;
grant all on table members        to anon, authenticated;
grant all on table weekly_records to anon, authenticated;
grant all on table weekly_tasks   to anon, authenticated;
grant all on table weekly_todos   to anon, authenticated;
grant all on table weekly_drafts  to anon, authenticated;

-- 기존 RLS 정책 삭제 후 재생성 (재실행 시 "already exists" 에러 방지)
do $$
declare r record;
begin
  for r in (
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'members', 'weekly_records', 'weekly_tasks', 'weekly_todos', 'weekly_drafts'
      )
  ) loop
    execute format(
      'drop policy if exists %I on public.%I',
      r.policyname, r.tablename
    );
  end loop;
end $$;

alter table members        enable row level security;
alter table weekly_records enable row level security;
alter table weekly_tasks   enable row level security;
alter table weekly_todos   enable row level security;
alter table weekly_drafts  enable row level security;

create policy "allow_all_members"
  on public.members for all to anon, authenticated
  using (true) with check (true);

create policy "allow_all_weekly_records"
  on public.weekly_records for all to anon, authenticated
  using (true) with check (true);

create policy "allow_all_weekly_tasks"
  on public.weekly_tasks for all to anon, authenticated
  using (true) with check (true);

create policy "allow_all_weekly_todos"
  on public.weekly_todos for all to anon, authenticated
  using (true) with check (true);

create policy "allow_all_weekly_drafts"
  on public.weekly_drafts for all to anon, authenticated
  using (true) with check (true);

-- ── 기존 DB에 누락된 weekly_tasks 컬럼 추가 (curr_from 에러 방지) ──
alter table weekly_tasks add column if not exists last_from    date;
alter table weekly_tasks add column if not exists last_to      date;
alter table weekly_tasks add column if not exists last_status  text not null default '진행중';
alter table weekly_tasks add column if not exists curr_from    date;
alter table weekly_tasks add column if not exists curr_to      date;
alter table weekly_tasks add column if not exists curr_status  text not null default '진행중';
alter table weekly_tasks add column if not exists next_from    date;
alter table weekly_tasks add column if not exists next_to      date;
alter table weekly_tasks add column if not exists next_status  text not null default '예정';
alter table weekly_tasks add column if not exists works        jsonb not null default '[]'::jsonb;
alter table weekly_tasks add column if not exists target_date  date;
alter table weekly_tasks add column if not exists target_memo  text not null default '';

alter table members add column if not exists label text not null default 'FE개발';
alter table members add column if not exists deleted_at timestamptz;
alter table weekly_tasks add column if not exists member_id text references members(id) on delete set null;

-- weekly_tasks: 팀원 삭제 시 업무 기록 유지
alter table weekly_tasks drop constraint if exists weekly_tasks_member_id_fkey;
alter table weekly_tasks add constraint weekly_tasks_member_id_fkey
  foreign key (member_id) references members(id) on delete set null;
