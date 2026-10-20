-- Каталог квестов и наград для монет Moby. Сиды кладём через API (кириллица в SQL-строках ломает push).
drop table if exists purchases cascade;
drop table if exists coin_ledger cascade;
drop table if exists quest_progress cascade;
drop table if exists quests cascade;
drop table if exists rewards cascade;
drop table if exists coin_ledger cascade;

alter table users add column if not exists coins int not null default 0;
alter table users add column if not exists theme text not null default 'default';

create table if not exists quests (
  id text primary key,
  audience text not null check (audience in ('parent','child')),
  kind text not null check (kind in ('lesson','quiz','mission')),
  points int not null check (points > 0),
  title_ru text not null,
  title_be text not null,
  desc_ru text,
  desc_be text,
  sort int not null default 0
);

create table if not exists quest_progress (
  user_id uuid not null references users(id) on delete cascade,
  quest_id text not null references quests(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create table if not exists rewards (
  id text primary key,
  audience text not null check (audience in ('parent','child')),
  kind text not null check (kind in ('promo','theme','perk')),
  price int not null check (price > 0),
  title_ru text not null,
  title_be text not null,
  desc_ru text,
  desc_be text,
  value text not null,
  sort int not null default 0
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reward_id text not null references rewards(id),
  code text not null,
  created_at timestamptz not null default now()
);

create table if not exists coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table quests enable row level security;
alter table quest_progress enable row level security;
alter table rewards enable row level security;
alter table purchases enable row level security;
alter table coin_ledger enable row level security;

revoke all on quests, quest_progress, rewards, purchases, coin_ledger from anon, authenticated;
