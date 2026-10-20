-- Демо-данные для стенда: семья Дубицких, ребёнок Аня (10 лет).
-- Выполнять после 0001_init.sql. Телефоны: родитель +375291234567, ребёнок +375291234568.
-- Вход в обоих случаях: код 1111.

do $$
declare
  v_parent uuid := '11111111-1111-4111-8111-111111111111';
  v_child_user uuid := '22222222-2222-4222-8222-222222222222';
  v_family uuid := '33333333-3333-4333-8333-333333333333';
  v_child uuid := '44444444-4444-4444-8444-444444444444';
  v_card uuid := '55555555-5555-4555-8555-555555555555';
  v_goal uuid := '66666666-6666-4666-8666-666666666666';
  v_pocket uuid;
begin
  insert into users (id, phone, full_name) values
    (v_parent, '+375291234567', 'Ольга Дубицкая'),
    (v_child_user, '+375291234568', 'Аня Дубицкая')
  on conflict (phone) do nothing;

  insert into families (id, owner_user_id, invite_code)
    values (v_family, v_parent, 'FAMILY01')
  on conflict (invite_code) do nothing;

  insert into family_members (family_id, user_id, role) values
    (v_family, v_parent, 'parent'),
    (v_family, v_child_user, 'child')
  on conflict (family_id, user_id) do nothing;

  insert into children (id, family_id, user_id, name, birth_date, bracket, points, access_granted, access_code)
    values (v_child, v_family, v_child_user, 'Аня', '2016-04-12', 'child_7_13', 145, true, 'ANYA01')
  on conflict (id) do nothing;

  insert into consents (family_id, child_id, kind, signed_at, signed_by_user_id) values
    (v_family, v_child, 'legal', now(), v_parent),
    (v_family, v_child, 'pd', now(), v_parent),
    (v_family, v_child, 'access', now(), v_parent)
  on conflict (child_id, kind) do nothing;

  insert into permissions (child_id, product_id, allowed, requires_consent, has_consent) values
    (v_child, 'card', true, false, false),
    (v_child, 'pocket', true, false, false),
    (v_child, 'savings', true, false, false),
    (v_child, 'deposit', false, false, false),
    (v_child, 'insurance', true, false, false),
    (v_child, 'subscriptions', true, false, false)
  on conflict (child_id, product_id) do nothing;

  insert into operation_permissions (child_id, operation_id, allowed) values
    (v_child, 'pay', true),
    (v_child, 'online', false),
    (v_child, 'transfer', false),
    (v_child, 'cash', false)
  on conflict (child_id, operation_id) do nothing;

  insert into limits (child_id, monthly, per_txn, pocket_weekly, pocket_day, confirm_each)
    values (v_child, 100, 30, 20, 0, false)
  on conflict (child_id) do nothing;

  insert into accounts (child_id, kind, balance) values
    (v_child, 'pocket', 43.70),
    (v_child, 'savings', 128.50)
  on conflict (child_id, kind) do nothing;

  insert into cards (id, child_id, last4, status, issued_at)
    values (v_card, v_child, '4417', 'issued', now())
  on conflict (id) do nothing;

  insert into goals (id, child_id, title_ru, title_be, emoji, target, saved, auto_save)
    values (v_goal, v_child, 'Самокат', 'Самакат', '🛴', 300, 128.50, true)
  on conflict (id) do nothing;

  insert into quests (child_id, kind, title_ru, title_be, points, amount, status) values
    (v_child, 'lesson', 'Урок: зачем нужна копилка', 'Урок: навошта патрэбна скарбонка', 20, 0, 'todo'),
    (v_child, 'lesson', 'Урок: как защитить карту', 'Урок: як абараніць карту', 15, 0, 'todo'),
    (v_child, 'task', 'Помыть посуду', 'Памыць посуд', 10, 5, 'waiting'),
    (v_child, 'task', 'Полить цветы', 'Паліць кветкі', 10, 5, 'todo');

  insert into transactions (child_id, card_id, amount, category, merchant, title_ru, title_be, status, decline_reason) values
    (v_child, v_card, -24.90, 'groceries', 'Санта', 'Покупка в «Санта»', 'Купля ў «Санта»', 'approved', null),
    (v_child, v_card, -12.40, 'transport', 'Городской транспорт', 'Проезд', 'Праезд', 'approved', null),
    (v_child, v_card, -8.50, 'cafe', 'Кафе', 'Мороженое', 'Марозіва', 'approved', null),
    (v_child, v_card, -15.00, 'gambling', 'Online casino', 'Ставка', 'Стаўка', 'declined', 'hard_blocked');

  insert into access_requests (child_id, target, label_ru, label_be, status) values
    (v_child, 'subscriptions', 'Подписка на мультфильмы', 'Падпіска на мультфільмы', 'pending');

  insert into notifications (user_id, family_id, kind, title_ru, title_be, body_ru, body_be) values
    (v_parent, v_family, 'request_created', 'Аня просит доступ', 'Аня просіць доступ', 'Подписка на мультфильмы', 'Падпіска на мультфільмы');
end $$;
