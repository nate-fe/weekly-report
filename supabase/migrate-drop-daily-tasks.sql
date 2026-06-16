-- 일일 업무 테이블 제거 (앱에서 미사용)
-- Supabase Dashboard → SQL Editor 에서 실행
-- ※ daily_tasks 데이터가 모두 삭제됩니다

drop policy if exists "allow_all_daily_tasks" on public.daily_tasks;
drop table if exists public.daily_tasks cascade;
