-- Несколько карт у ребёнка: CVV/PIN для показа в приложении и Telegram,
-- идентификационный номер родителя для гейтинга пакета.
--
-- 1) cards.cvv / cards.pin — демо-данные виртуальной карты. В реальном банке
--    CVV/PIN не хранят в открытом виде и тем более не отдают в API: здесь это
--    осознанное упрощение хакатон-стенда (хранение и отправка согласованы).
-- 2) Одна карта на ребёнка больше не ограничение: на ребёнка можно выпускать
--    несколько карт (виртуальная Visa + пластиковая Белкарт и т.д.).
--    В 0001 unique-констрейнта на child_id не было, но он мог появиться
--    вручную/в другой ветке — поэтому снимаем его идемпотентно.
-- 3) users.id_number — идентификационный номер родителя (пакет «Фэмили»
--    без него не считается оформленным).

alter table cards add column if not exists cvv text;
alter table cards add column if not exists pin text;

alter table cards drop constraint if exists cards_child_id_key;
alter table cards drop constraint if exists cards_child_id_unique;

create index if not exists cards_child_created_idx on cards (child_id, created_at);

alter table users add column if not exists id_number text;

comment on column cards.cvv is 'CVV карты (демо: хранится открыто, отдаётся только по запросу details)';
comment on column cards.pin is 'PIN карты (демо: хранится открыто, отдаётся только по запросу details)';
comment on column users.id_number is 'Идентификационный номер родителя для пакета «Фэмили»';
