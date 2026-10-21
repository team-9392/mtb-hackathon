-- Задания от родителя ребёнку: родитель создаёт, ребёнок отмечает выполнение, родитель подтверждает.
create table if not exists parent_tasks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  title text not null,
  points integer not null default 20,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table parent_tasks enable row level security;
revoke all on parent_tasks from anon, authenticated;
create index if not exists parent_tasks_child_idx on parent_tasks (child_id, created_at desc);
