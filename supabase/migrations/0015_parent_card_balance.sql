-- Баланс личной карты родителя (для отображения на главной рядом с картой).
alter table parent_cards add column if not exists balance numeric(12, 2) not null default 0;
