-- Карты родителя: личная карта взрослого, отдельно от карт ребёнка.
create table if not exists parent_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  number text not null,
  system text not null default 'visa',
  type text not null default 'virtual',
  expiry text not null,
  cvv text not null,
  pin text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table parent_cards enable row level security;
revoke all on parent_cards from anon, authenticated;
create index if not exists parent_cards_user_idx on parent_cards (user_id, created_at);
