-- Moby Family — начальная схема (PostgreSQL / Supabase)
-- Доступ к таблицам: только service role (Node API). Клиент в базу не ходит вообще.
-- RLS включён, политик для anon/authenticated нет, права отозваны — см. конец файла.

create extension if not exists "pgcrypto";

-- ---------- служебное ----------

create table if not exists app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- пользователи и устройства ----------

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  phone          text not null unique,
  full_name      text,
  status         text not null default 'active' check (status in ('active', 'blocked', 'deleted')),
  last_login_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users (id) on delete cascade,
  refresh_hash  text not null,
  device_id     text,
  os            text,
  push_token    text,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked_at    timestamptz
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists otp_challenges (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists otp_phone_idx on otp_challenges (phone, created_at desc);

create table if not exists app_codes (
  user_id      uuid primary key references users (id) on delete cascade,
  code_hash    text not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

-- ---------- семья ----------

create table if not exists families (
  id             uuid primary key default gen_random_uuid(),
  owner_user_id  uuid not null references users (id) on delete restrict,
  tariff         text not null default 'family' check (tariff in ('family')),
  invite_code    text not null unique,
  currency       text not null default 'BYN',
  created_at     timestamptz not null default now()
);

create table if not exists family_members (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families (id) on delete cascade,
  user_id    uuid not null references users (id) on delete cascade,
  role       text not null check (role in ('parent', 'child')),
  status     text not null default 'active' check (status in ('active', 'pending', 'removed')),
  joined_at  timestamptz not null default now(),
  unique (family_id, user_id)
);

create table if not exists children (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid not null references families (id) on delete cascade,
  user_id         uuid references users (id) on delete set null,
  name            text not null,
  birth_date      date,
  bracket         text not null check (bracket in ('child_7_13', 'teen_14_17')),
  points          int not null default 0,
  access_granted  boolean not null default false,
  access_code     text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists children_family_idx on children (family_id);

-- ---------- продукты, согласия, права ----------

create table if not exists consents (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families (id) on delete cascade,
  child_id          uuid not null references children (id) on delete cascade,
  kind              text not null check (kind in ('legal', 'pd', 'access', 'written14')),
  signed_at         timestamptz,
  signed_by_user_id uuid references users (id) on delete set null,
  device_id         text,
  unique (child_id, kind)
);

create table if not exists permissions (
  id               uuid primary key default gen_random_uuid(),
  child_id         uuid not null references children (id) on delete cascade,
  product_id       text not null check (product_id in ('card', 'pocket', 'savings', 'deposit', 'insurance', 'subscriptions')),
  allowed          boolean not null default false,
  requires_consent boolean not null default false,
  has_consent      boolean not null default false,
  pending_request  boolean not null default false,
  updated_at       timestamptz not null default now(),
  unique (child_id, product_id)
);

create table if not exists operation_permissions (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children (id) on delete cascade,
  operation_id  text not null check (operation_id in ('pay', 'online', 'transfer', 'cash')),
  allowed       boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (child_id, operation_id)
);

create table if not exists allowed_categories (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references children (id) on delete cascade,
  category_id  text not null check (category_id not in ('gambling', 'adult')),
  allowed      boolean not null default true,
  unique (child_id, category_id)
);

create table if not exists limits (
  child_id      uuid primary key references children (id) on delete cascade,
  monthly       numeric(12, 2) not null default 0,
  per_txn       numeric(12, 2) not null default 0,
  pocket_weekly numeric(12, 2) not null default 0,
  pocket_day    numeric(12, 2) not null default 0,
  pocket_day_of_week int not null default 1 check (pocket_day_of_week between 0 and 6),
  confirm_each  boolean not null default false,
  updated_at    timestamptz not null default now()
);

-- ---------- деньги ----------

create table if not exists accounts (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children (id) on delete cascade,
  kind       text not null check (kind in ('pocket', 'savings', 'deposit', 'goal')),
  balance    numeric(12, 2) not null default 0,
  currency   text not null default 'BYN',
  opened_at  timestamptz not null default now(),
  unique (child_id, kind)
);

create table if not exists cards (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid not null references children (id) on delete cascade,
  last4       text not null,
  status      text not null default 'pending' check (status in ('pending', 'issued', 'blocked')),
  issued_at   timestamptz,
  blocked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists cards_child_idx on cards (child_id);

create table if not exists transactions (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid not null references children (id) on delete cascade,
  card_id        uuid references cards (id) on delete set null,
  amount         numeric(12, 2) not null,
  currency       text not null default 'BYN',
  category       text not null,
  merchant       text,
  title_ru       text not null,
  title_be       text not null,
  status         text not null default 'approved' check (status in ('approved', 'declined', 'pending')),
  decline_reason text,
  by_child       boolean not null default true,
  created_at     timestamptz not null default now()
);
create index if not exists transactions_child_idx on transactions (child_id, created_at desc);

create table if not exists goals (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references children (id) on delete cascade,
  title_ru   text not null,
  title_be   text not null,
  emoji      text not null default '🎯',
  target     numeric(12, 2) not null,
  saved      numeric(12, 2) not null default 0,
  auto_save  boolean not null default false,
  deadline   date,
  status     text not null default 'active' check (status in ('active', 'achieved', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists goals_child_idx on goals (child_id);

create table if not exists quests (
  id                 uuid primary key default gen_random_uuid(),
  child_id           uuid not null references children (id) on delete cascade,
  kind               text not null check (kind in ('lesson', 'task')),
  title_ru           text not null,
  title_be           text not null,
  points             int not null default 0,
  amount             numeric(12, 2) not null default 0,
  status             text not null default 'todo' check (status in ('todo', 'waiting', 'approved')),
  completed_at       timestamptz,
  approved_by_user_id uuid references users (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists quests_child_idx on quests (child_id, created_at desc);

create table if not exists access_requests (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references children (id) on delete cascade,
  target              text not null,
  label_ru            text not null,
  label_be            text not null,
  status              text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz,
  resolved_by_user_id uuid references users (id) on delete set null
);
create index if not exists access_requests_child_idx on access_requests (child_id, created_at desc);

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  family_id  uuid references families (id) on delete cascade,
  kind       text not null,
  title_ru   text not null,
  title_be   text not null,
  body_ru    text,
  body_be    text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- ---------- аудит и обмен событиями ----------

create table if not exists audit_log (
  id            bigserial primary key,
  family_id     uuid,
  actor_user_id uuid,
  action        text not null,
  entity        text not null,
  entity_id     text,
  payload       jsonb not null default '{}'::jsonb,
  at            timestamptz not null default now()
);
create index if not exists audit_family_idx on audit_log (family_id, at desc);

create table if not exists realtime_events (
  id         bigserial primary key,
  family_id  uuid not null,
  topic      text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists realtime_family_idx on realtime_events (family_id, id);

-- ---------- триггеры ----------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_children_updated on children;
create trigger trg_children_updated before update on children
  for each row execute function set_updated_at();

drop trigger if exists trg_permissions_updated on permissions;
create trigger trg_permissions_updated before update on permissions
  for each row execute function set_updated_at();

drop trigger if exists trg_operation_permissions_updated on operation_permissions;
create trigger trg_operation_permissions_updated before update on operation_permissions
  for each row execute function set_updated_at();

drop trigger if exists trg_limits_updated on limits;
create trigger trg_limits_updated before update on limits
  for each row execute function set_updated_at();

-- каждое изменение прав, согласий, лимитов и карт попадает в журнал
create or replace function audit_change() returns trigger as $$
declare
  row_family uuid;
  entity_key text;
  payload jsonb;
begin
  payload := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));

  -- у limits нет своей колонки id: ключом записи выступает ребёнок
  if tg_table_name = 'limits' then
    entity_key := coalesce(new.child_id, old.child_id)::text;
  else
    entity_key := coalesce(new.id, old.id)::text;
  end if;

  row_family := null;
  if tg_table_name = 'consents' then
    row_family := coalesce(new.family_id, old.family_id);
  end if;
  if row_family is null then
    select family_id into row_family from children
      where id = coalesce(new.child_id, old.child_id);
  end if;

  insert into audit_log (family_id, action, entity, entity_id, payload)
  values (row_family, lower(tg_op), tg_table_name, entity_key, payload);

  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_audit_consents on consents;
create trigger trg_audit_consents after insert or update on consents
  for each row execute function audit_change();

drop trigger if exists trg_audit_permissions on permissions;
create trigger trg_audit_permissions after insert or update on permissions
  for each row execute function audit_change();

drop trigger if exists trg_audit_operation_permissions on operation_permissions;
create trigger trg_audit_operation_permissions after insert or update on operation_permissions
  for each row execute function audit_change();

drop trigger if exists trg_audit_limits on limits;
create trigger trg_audit_limits after insert or update on limits
  for each row execute function audit_change();

drop trigger if exists trg_audit_cards on cards;
create trigger trg_audit_cards after insert or update on cards
  for each row execute function audit_change();

-- ---------- закрываем базу от клиентов ----------

alter table users                enable row level security;
alter table sessions             enable row level security;
alter table otp_challenges       enable row level security;
alter table app_codes            enable row level security;
alter table families             enable row level security;
alter table family_members       enable row level security;
alter table children             enable row level security;
alter table consents             enable row level security;
alter table permissions          enable row level security;
alter table operation_permissions enable row level security;
alter table allowed_categories   enable row level security;
alter table limits               enable row level security;
alter table accounts             enable row level security;
alter table cards                enable row level security;
alter table transactions         enable row level security;
alter table goals                enable row level security;
alter table quests               enable row level security;
alter table access_requests      enable row level security;
alter table notifications        enable row level security;
alter table audit_log            enable row level security;
alter table realtime_events      enable row level security;
alter table app_settings         enable row level security;

-- политик нет намеренно: ни anon, ни authenticated не читают и не пишут напрямую.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
