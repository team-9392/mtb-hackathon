-- Игра «Недельный бюджет»: виртуальные деньги, решения по сценариям, история.
create table if not exists budget_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  balance numeric(12, 2) not null default 100,
  week_start date not null default current_date,
  scenario jsonb,
  scenario_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists budget_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  amount numeric(12, 2) not null,
  decision text not null,
  created_at timestamptz not null default now()
);
alter table budget_games enable row level security;
alter table budget_events enable row level security;
revoke all on budget_games from anon, authenticated;
revoke all on budget_events from anon, authenticated;
