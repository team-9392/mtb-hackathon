-- Привязка Telegram по номеру телефона ещё до входа: код подтверждения приходит в бот.
create table if not exists telegram_bindings (
  phone text primary key,
  chat_id text not null,
  created_at timestamptz not null default now()
);

alter table telegram_bindings enable row level security;
revoke all on telegram_bindings from anon, authenticated;
