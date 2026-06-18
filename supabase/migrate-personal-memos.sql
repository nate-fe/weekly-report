-- 개인 메모 (사번별, 페이지 목록) — 신규 설치용
create table if not exists personal_memos (
  employee_id  text primary key,
  content      text not null default '',
  pages        jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

grant all on table personal_memos to anon, authenticated;

alter table personal_memos enable row level security;

drop policy if exists "allow_all_personal_memos" on public.personal_memos;

create policy "allow_all_personal_memos"
  on public.personal_memos for all to anon, authenticated
  using (true) with check (true);
