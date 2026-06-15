-- ============================================================
--  주간 업무 보고 — 기간·상태·목표 일정 컬럼 추가
--  저장 시 "curr_from column" 에러가 나면 이 파일을 실행하세요
--  Dashboard → SQL Editor → 전체 붙여넣기 → Run
-- ============================================================

alter table weekly_tasks add column if not exists last_from    date;
alter table weekly_tasks add column if not exists last_to      date;
alter table weekly_tasks add column if not exists last_status  text not null default '진행중';
alter table weekly_tasks add column if not exists curr_from    date;
alter table weekly_tasks add column if not exists curr_to      date;
alter table weekly_tasks add column if not exists curr_status  text not null default '진행중';
alter table weekly_tasks add column if not exists next_from    date;
alter table weekly_tasks add column if not exists next_to      date;
alter table weekly_tasks add column if not exists next_status  text not null default '예정';
alter table weekly_tasks add column if not exists target_date  date;
alter table weekly_tasks add column if not exists target_memo  text not null default '';
