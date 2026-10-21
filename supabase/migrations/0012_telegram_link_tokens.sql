-- Одноразовые токены привязки Telegram до входа.
--
-- Раньше ссылка была otp_<номер>_<hmac>: номер телефона уезжал в URL и в
-- историю чата. Теперь в URL только криптостойкий токен (crypto.randomBytes(16)
-- -> 32 hex), сам номер хранится здесь. Токен живёт 10 минут и гасится
-- consumed_at при первом /start; повторно использовать его нельзя.

create table if not exists telegram_link_tokens (
  token       text primary key,
  phone       text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

create index if not exists telegram_link_tokens_phone_idx
  on telegram_link_tokens (phone, created_at desc);

create index if not exists telegram_link_tokens_expires_idx
  on telegram_link_tokens (expires_at);

alter table telegram_link_tokens enable row level security;
revoke all on telegram_link_tokens from anon, authenticated;

comment on table telegram_link_tokens is 'Одноразовые токены привязки Telegram (TTL 10 минут, без номера в URL)';
comment on column telegram_link_tokens.consumed_at is 'Момент первого /start; повторное использование токена запрещено';
