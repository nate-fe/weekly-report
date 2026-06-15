-- weekly_tasks: 작업 기간을 works JSON 배열로 저장
-- SQL Editor에서 실행

alter table weekly_tasks add column if not exists works jsonb not null default '[]'::jsonb;
