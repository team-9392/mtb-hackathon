-- Переводы между своими счетами. Счёт ребёнку открывает родитель: либо сразу,
-- если продукт доступен по возрасту, либо подтверждая запрос ребёнка.
create table if not exists transfers (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references children (id) on delete cascade,
  from_kind            text not null check (from_kind in ('pocket', 'savings', 'deposit', 'goal')),
  to_kind              text not null check (to_kind in ('pocket', 'savings', 'deposit', 'goal')),
  amount               numeric(12, 2) not null check (amount > 0),
  initiated_by_user_id uuid references users (id) on delete set null,
  created_at           timestamptz not null default now(),
  check (from_kind <> to_kind)
);

create index if not exists transfers_child_idx on transfers (child_id, created_at desc);

alter table transfers enable row level security;
revoke all on transfers from anon, authenticated;

drop trigger if exists transfers_audit on transfers;
create trigger transfers_audit
after insert or update on transfers
for each row execute function audit_change();
