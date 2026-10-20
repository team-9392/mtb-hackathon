-- Привязка Telegram: после одного /start бот может писать родителю первым.
alter table users add column if not exists telegram_chat_id text;
create index if not exists users_telegram_chat_idx on users (telegram_chat_id);
