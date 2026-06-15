-- 주간 업무 임시 저장 (서버)
create table if not exists weekly_drafts (
  week_key    text primary key,
  from_date   date not null,
  to_date     date not null,
  tasks       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

grant all on table weekly_drafts to anon, authenticated;

alter table weekly_drafts enable row level security;

drop policy if exists "allow_all_weekly_drafts" on public.weekly_drafts;
create policy "allow_all_weekly_drafts"
  on public.weekly_drafts for all to anon, authenticated
  using (true) with check (true);
