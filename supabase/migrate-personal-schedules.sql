-- 개인 일정 (회의·라이브) — 사번별 JSONB
alter table personal_memos
  add column if not exists schedules jsonb not null default '[]'::jsonb;
