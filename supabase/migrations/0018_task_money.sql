-- Задания за деньги: родитель назначает сумму в BYN, при подтверждении деньги перечисляются ребёнку.
alter table parent_tasks add column if not exists reward_money numeric(10, 2) not null default 0;
