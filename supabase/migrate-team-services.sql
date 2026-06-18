-- team_settings에 서비스 목록 컬럼 추가
alter table team_settings
  add column if not exists services jsonb not null default '[]'::jsonb;
