-- Полные данные карты: номер, платёжная система, тип носителя, срок действия.
alter table cards add column if not exists number text;
alter table cards add column if not exists system text not null default 'visa';
alter table cards add column if not exists type text not null default 'virtual';
alter table cards add column if not exists expiry text;

do $$
begin
  alter table cards add constraint cards_system_check
    check (system in ('visa', 'mastercard', 'belkart', 'unionpay'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table cards add constraint cards_type_check check (type in ('virtual', 'plastic'));
exception when duplicate_object then null;
end $$;
