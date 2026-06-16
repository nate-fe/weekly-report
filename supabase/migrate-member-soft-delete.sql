-- 팀원 soft delete + 업무 기록 유지
-- Supabase Dashboard → SQL Editor 에서 실행

-- 1) 팀원 soft delete 컬럼
alter table members add column if not exists deleted_at timestamptz;

-- 2) 주간 업무: member_id FK를 set null 로 통일 (이미 set null 이면 무시됨)
alter table weekly_tasks drop constraint if exists weekly_tasks_member_id_fkey;
alter table weekly_tasks add constraint weekly_tasks_member_id_fkey
  foreign key (member_id) references members(id) on delete set null;
