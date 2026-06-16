-- 팀 설정 (주간회의 요일·시간·예외 일정)
create table if not exists team_settings (
  id            text primary key default 'default',
  meeting_day   smallint not null default 3,
  meeting_time  text not null default '14:00',
  exceptions    jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);

insert into team_settings (id, meeting_day, meeting_time, exceptions)
values ('default', 3, '14:00', '[]'::jsonb)
on conflict (id) do nothing;

grant all on table team_settings to anon, authenticated;

alter table team_settings enable row level security;

drop policy if exists "allow_all_team_settings" on public.team_settings;
create policy "allow_all_team_settings"
  on public.team_settings for all to anon, authenticated
  using (true) with check (true);
