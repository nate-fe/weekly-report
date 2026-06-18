-- 개인 메모: 단일 본문 → 페이지 목록(pages jsonb)
alter table personal_memos add column if not exists pages jsonb not null default '[]'::jsonb;

-- 기존 단일 content를 첫 페이지로 이전
update personal_memos
set pages = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-' || employee_id,
    'title', '메모',
    'content', content,
    'updatedAt', updated_at
  )
)
where coalesce(jsonb_array_length(pages), 0) = 0
  and btrim(coalesce(content, '')) <> '';
