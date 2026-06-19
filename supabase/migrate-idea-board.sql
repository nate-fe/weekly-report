-- 아이디어 게시판 (팀 공유, 작성자는 employee_id로만 식별)
create table if not exists idea_posts (
  id            text primary key,
  employee_id   text not null,
  content       text not null default '',
  color_index   smallint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idea_posts_created_at_idx on idea_posts (created_at desc);

grant all on table idea_posts to anon, authenticated;

alter table idea_posts enable row level security;

drop policy if exists "allow_all_idea_posts" on public.idea_posts;

create policy "allow_all_idea_posts"
  on public.idea_posts for all to anon, authenticated
  using (true) with check (true);
