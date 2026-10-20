-- Платежи, которые ребёнок только запрашивает: ЕРИП и перевод по номеру.
-- Подтверждает и списывает деньги родитель.
alter table access_requests add column if not exists kind text not null default 'access';
alter table access_requests add column if not exists amount numeric(12, 2);
alter table access_requests add column if not exists recipient text;
alter table access_requests add column if not exists note_ru text;
alter table access_requests add column if not exists note_be text;

-- Токены устройств для push-уведомлений (родителю приходит запрос, даже если приложение закрыто).
create table if not exists push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  token      text not null unique,
  platform   text not null default 'unknown',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;
revoke all on push_tokens from anon, authenticated;
