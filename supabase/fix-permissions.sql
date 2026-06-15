-- ============================================================
--  팀원 추가/수정 실패 시 — 이 파일만 SQL Editor에서 실행
--  Dashboard → SQL Editor → New query → 전체 붙여넣기 → Run
-- ============================================================

-- 1) 기존 RLS 정책 전부 삭제
do $$
declare r record;
begin
  for r in (
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'members', 'daily_tasks', 'weekly_records', 'weekly_tasks', 'weekly_todos', 'weekly_drafts'
      )
  ) loop
    execute format(
      'drop policy if exists %I on public.%I',
      r.policyname, r.tablename
    );
  end loop;
end $$;

-- 2) anon/authenticated 역할에 테이블 권한 부여
grant usage on schema public to anon, authenticated;
grant all on table members        to anon, authenticated;
grant all on table daily_tasks    to anon, authenticated;
grant all on table weekly_records to anon, authenticated;
grant all on table weekly_tasks   to anon, authenticated;
grant all on table weekly_todos   to anon, authenticated;
grant all on table weekly_drafts to anon, authenticated;

-- 3) RLS가 켜져 있어도 전체 허용 (Supabase 기본 정책은 SELECT만 허용하는 경우가 많음)
alter table members        enable row level security;
alter table daily_tasks    enable row level security;
alter table weekly_records enable row level security;
alter table weekly_tasks   enable row level security;
alter table weekly_todos   enable row level security;
alter table weekly_drafts  enable row level security;

create policy "allow_all_members"
  on public.members for all to anon, authenticated
  using (true) with check (true);

create policy "allow_all_daily_tasks"
  on public.daily_tasks for all to anon, authenticated
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
