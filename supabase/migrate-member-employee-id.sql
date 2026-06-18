-- 팀원 사번 컬럼 + UI팀 기본 팀원 사번 등록
alter table members add column if not exists employee_id text;

-- 기존 팀원 이름이 같으면 사번 연결
update members set employee_id = 'N1664' where deleted_at is null and name = '이상원' and (employee_id is null or employee_id = '');
update members set employee_id = 'N2918' where deleted_at is null and name = '김율아' and (employee_id is null or employee_id = '');
update members set employee_id = 'N4197' where deleted_at is null and name = '심상오' and (employee_id is null or employee_id = '');
update members set employee_id = 'N4201' where deleted_at is null and name = '오민선' and (employee_id is null or employee_id = '');
update members set employee_id = 'N4242' where deleted_at is null and name = '윤지은' and (employee_id is null or employee_id = '');
update members set employee_id = 'N2921' where deleted_at is null and name = '이상훈' and (employee_id is null or employee_id = '');
update members set employee_id = 'N4113' where deleted_at is null and name = '조은산' and (employee_id is null or employee_id = '');
update members set employee_id = 'N4185' where deleted_at is null and name = '조찬형' and (employee_id is null or employee_id = '');

-- 없으면 신규 등록
insert into members (id, name, color, label, employee_id)
select v.id, v.name, v.color, v.label, v.employee_id
from (values
  ('seed-n1664', '이상원', '#1e3a5f', 'FE개발', 'N1664'),
  ('seed-n2918', '김율아', '#0052cc', 'FE개발', 'N2918'),
  ('seed-n4197', '심상오', '#1d4ed8', 'FE개발', 'N4197'),
  ('seed-n4201', '오민선', '#2563eb', 'FE개발', 'N4201'),
  ('seed-n4242', '윤지은', '#4f46e5', 'FE개발', 'N4242'),
  ('seed-n2921', '이상훈', '#0e7490', 'FE개발', 'N2921'),
  ('seed-n4113', '조은산', '#0891b2', 'FE개발', 'N4113'),
  ('seed-n4185', '조찬형', '#0284c7', 'FE개발', 'N4185')
) as v(id, name, color, label, employee_id)
where not exists (
  select 1 from members m
  where m.deleted_at is null
    and (m.employee_id = v.employee_id or m.name = v.name)
);
