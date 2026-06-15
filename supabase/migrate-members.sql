-- 팀원 레이블 + 주간 업무 member_id 컬럼 추가

alter table members add column if not exists label text not null default 'FE개발';

alter table weekly_tasks add column if not exists member_id text references members(id) on delete set null;
