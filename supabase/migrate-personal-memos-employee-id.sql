-- 개인 메모: Supabase Auth → 사번(employee_id) 기준으로 전환
-- 기존 auth.users 연동 메모는 마이그레이션되지 않습니다.

drop policy if exists "personal_memos_select_own" on public.personal_memos;
drop policy if exists "personal_memos_insert_own" on public.personal_memos;
drop policy if exists "personal_memos_update_own" on public.personal_memos;
drop policy if exists "personal_memos_delete_own" on public.personal_memos;
drop policy if exists "allow_all_personal_memos" on public.personal_memos;

drop table if exists personal_memos;

create table personal_memos (
  employee_id  text primary key,
  content      text not null default '',
  pages        jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

grant all on table personal_memos to anon, authenticated;

alter table personal_memos enable row level security;

create policy "allow_all_personal_memos"
  on public.personal_memos for all to anon, authenticated
  using (true) with check (true);
