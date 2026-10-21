-- Геймификация: достижения, ежедневный вход, скины карты, дуэль, питомец.
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, code)
);

create table if not exists daily_logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  day date not null,
  streak int not null default 1,
  reward int not null default 10,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create table if not exists card_skins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table users add column if not exists card_skin text not null default 'classic';

alter table achievements enable row level security;
alter table daily_logins enable row level security;
alter table card_skins enable row level security;
revoke all on achievements from anon, authenticated;
revoke all on daily_logins from anon, authenticated;
revoke all on card_skins from anon, authenticated;
