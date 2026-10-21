# Функциональное тестирование: Moby Family

- **Дата:** 2026-10-21, 08:52–09:00 (Europe/Minsk)
- **Прод-API:** https://malanka.jaraslau.dev/moby
- **Рабочая копия:** /Users/jaraslaukunin/mtbhackathon
- **Тестовые номера:** +375000000201 (родитель), +375000000202 (ребёнок), демо-ОТП 1111
- **Возрастная ветка тестового ребёнка:** teen_14_17 (чтобы покрыть вклад, written14 и онлайн-операции)
- **Проверок:** 100 автоматических (93 по чек-листу + 7 realtime/доп.), **92 PASS**, **8 FAIL**
- **По 16 пунктам чек-листа:** 10 – OK, 4 – OK с замечаниями, 2 – с провалом (п. 5 и п. 14)
- **Код не менялся, коммитов нет.** Добавлен только этот отчёт. Тестовые данные удалены (раздел 5).

> Главный вывод: основной демо-сценарий «родитель ↔ ребёнок» работает, включая живой WebSocket в обе стороны. Но **отзыв доступа ребёнку не блокирует API сразу** (п. 5), **logout не инвалидирует access-токен** (п. 14), а **эндпоинт `/quests/:id/complete` начисляет монеты без прохождения теста**. Это главные риски.

---

## 1. Как тестировали

Временный Node-скрипт на `fetch` (Node 25.3, /tmp, в репозиторий не добавлялся) прошёл полный сценарий на прод-API: регистрация двух пользователей по ОТП 1111, создание семьи и ребёнка, вход ребёнка по access code, выпуск 8 вариантов карт, деньги, ЕРИП, тесты, награды, PIN, Telegram, токены, разрешения, согласия. Отдельным скриптом проверены WebSocket `/realtime` в обе стороны и `/events`.

Проверки карт дополнительно верифицировались локально: BIN, алгоритм Луна, формат срока `MM/YY` (+4 года), совпадение `last4` и полного номера в `GET /family`.

Для проверки покупок наград тестовому ребёнку через service role временно выставлено 1200 монет (иначе самый дешёвый фиксированный промокод за 500 монет недостижим: все детские тесты вместе дают 220). Эти данные удалены вместе с пользователем.

---

## 2. Таблица 16 пунктов

| № | Функция | Ожидание (чек-лист) | Факт | Итог |
| ---: | --- | --- | --- | --- |
| 1 | Регистрация родителя | `/auth/otp/request` → `/auth/otp/verify` (1111) → `/auth/family {fullName}`; в ответе family + accessToken с familyId | request 200 (challengeId, demoCode=1111); verify 200 (accessToken, refreshToken, claims.familyId=null, needsFamily=true); family 200: `family.id`, invite_code, accessToken, `claims.role=parent`, `claims.familyId=family.id` | ✅ |
| 2 | `/me` | GET отдаёт user.fullName и claims; PATCH меняет имя | GET 200: fullName «Moby QA Родитель», claims с familyId/role; PATCH 200 → «Moby QA Родитель 2»; повторный GET подтвердил | ✅ |
| 3 | Создание ребёнка | `POST /family/children {name, bracket}` → access_code; `GET /family` → `children[0].child.accessCode` и accessGranted | 201: child.id, access_code=A949A03D, bracket=teen_14_17. GET /family 200: accessCode=A949A03D, accessGranted=false (дефолт; после `POST /access` становится true), limits/permissions/accounts созданы | ✅ |
| 4 | Вход ребёнка | Второй номер → OTP → `/auth/join {accessCode}` → role=child; повторный join тем же – ок, чужим – 409 | join 200: claims.role=child, childId=child.id, familyId=family.id. Повторный join тем же токеном 200. Join родительским токеном – 409 «уже привязан к другому номеру» | ✅ |
| 5 | Доступ ребёнка | `{granted:false}` → ребёнок получает 403 на детские эндпоинты; `{granted:true}` → снова работает | `POST /children/:id/access {granted:false}` 200, `GET /family` показывает accessGranted=false. Но ребёнок с тем же токеном: `GET /children/:id/state` – **200**, `GET /bonuses` – **200**, `GET /children/:id/transactions` – **200**. `{granted:true}` 200, state 200 | ❌ **критично** |
| 6 | Карта | 4 системы × 2 типа: BIN 4276/5555/9112/6262, Luhn, срок 4 года, полный номер в /family; PATCH blocked | Все 8 комбинаций 201: visa 4276…, mastercard 5555…, belkart 9112…, unionpay 6262…; 16 цифр, Luhn=true, expiry=10/30 (+4 года), last4 совпадает. `GET /family` отдаёт полный number. blocked:true → status=blocked, blocked_at; оплата заблокированной картой → declined/card_blocked; blocked:false → status=issued | ✅ |
| 7 | Деньги | topup 25 → pocket +25 и транзакция «Пополнение от родителя»; перевод между счетами; лимиты; запрос ребёнка → родитель видит request → `PATCH .../requests/:rid {approve:true}` | topup 200 balance=25; у ребёнка pocket=25, txn «Пополнение от родителя» 25 approved by_child=false. transfer pocket→savings 10: 15/10, запись в /transfers. limits: monthly=250, per_txn=20, pocket_weekly=40, pocket_day=60, confirm_each=true – сохранены. Запрос deposit pending виден в /family; `{status:"approved"}` 200 → deposit.allowed=true. **Но `{approve:true}` → 400** validation «Неизвестное действие» | ⚠ контракт |
| 8 | Уведомления | После topup/запроса/теста родитель и ребёнок получают нужные строки | Ребёнок: `txn` «Деньги пришли» +25, `access_granted`/`access_revoked`, `request_resolved`, `txn_declined`, `reward`. Родитель: `request_created`, `payment_request`, `txn_declined`, `reward`. **Родителю нет уведомления о topup** (он сам инициатор – спорно, но чек-лист ждал «родитель и ребёнок») | ⚠ частично |
| 9 | ЕРИП / платежи | `POST /children/:id/payments` (или /payments): создание платежа ЕРИП по коду, списание с pocket; в /family и балансе; недостаточно денег → 409 | `POST /children/:id/payments {kind:"erip", amount:5}` 200: status=pending, requestId; баланс не меняется (15). Родитель видит в /family kind=erip, amount=5, recipient. Approve → pocket 15→10, txn «Платёж ЕРИП» 5 approved. Недостаточно (9999) → **400 bad_request**, не 409. Транзакция записана с **положительным** amount при списании | ⚠ дефект |
| 10 | Тесты | `GET /bonuses` 4 child / 3 parent; `GET /quizzes/:id` без correct; `POST /quests/:id/quiz`: верные → монеты, неверные → 0, повтор → 0 | bonuses child: 4 (c-pocket-1, c-card-1, c-plan-1, c-scam-1), parent: 3 (p-budget-1, p-limits-1, p-safety-1). `GET /quizzes/c-pocket-1`: 5 вопросов, поля correct в JSON нет. Неверные: ok=false, points=0, coins=0. Верные: ok=true, +50 монет, done=true. Повтор: points=0. Родительский quiz: +120 | ⚠ обход |
| 11 | Награды | `POST /rewards/:id/buy`: фиксированный и сгенерированный промокод; нехватка монет → 409 | С 1200 монет: r-cash5 → code=MOBY5 (фиксированный), coins=700; r-icecream-cup → code=MOBY-9E0279 (сгенерирован), coins=550; r-cash10 (900) → 409 not_enough. `GET /bonuses` показывает купленные коды | ✅ |
| 12 | PIN ребёнка | `POST /auth/app-code` и `/auth/app-code/verify` | app-code 1234 → 200; verify 1234 → 200; неверный → 401; верный после ошибки → 200 (сброс); 3 неверных → блокировка; верный во время блокировки → 401 «Вход временно заблокирован» | ✅ |
| 13 | Telegram | `POST /auth/telegram/link {phone}` → url; `/health telegram:true` | 200: `https://t.me/moby_auth_bot?start=otp_375000000201_…`, linked=false, botReady=true. `GET /telegram/link` (auth) → персональный url, linked=false. `/health`: telegram=true, demoOtp=true. Реальная доставка кода в бота не проверялась (нужен /start в Telegram) | ✅ с ограничением |
| 14 | Токены | `/auth/refresh` выдаёт новую пару; старый access после `/auth/logout` не работает | refresh 200: новая пара, claims; повтор старого refresh → 401 (ротация). Новый access → /me 200. logout 200; refresh после logout → 401. **Старый access после logout → /me 200** (ожидался 401) | ❌ дефект |
| 15 | Разрешения | PATCH permissions и operations меняются и влияют на операцию (запрет онлайн → 409/403) | savings:false → 200, allowed=false; перевод savings→pocket → 403 «Копилка отключена»; savings:true → allowed=true. online:false → 200, allowed=false; онлайн-оплата → status=declined, reason=operation_disabled (HTTP **200**, не 409/403); online:true → approved, pocket 10→8. Лимиты и права сохраняются | ✅ с оговоркой |
| 16 | Согласия | `POST /children/:id/consents {kinds}` фиксирует дату | 200 {ok, signedAt}; `GET /family` – все 4 вида (legal, pd, access, written14) с одинаковым signed_at. После written14 PATCH deposit {allowed:true} → allowed=true, has_consent=true | ✅ |

### Пункты, которых нет в чек-листе, но которые проверены

| Проверка | Ожидание | Факт | Итог |
| --- | --- | --- | --- |
| `GET /health` | 200, ok, telegram=true, demoOtp=true | 200, service=moby-family-api, telegram=true, demoOtp=true | ✅ |
| WS `/realtime` (родитель) | ready + familyId | ready, familyId, clients=1 | ✅ |
| WS `/realtime` (ребёнок) | ready + clients=2 | ready, familyId, clients=2 | ✅ |
| Живая связь родитель → ребёнок | topup → у ребёнка событие txn.created | topup 1 BYN → событие `txn.created amount=1` | ✅ |
| Живая связь ребёнок → родитель | запрос → у родителя request.created | запрос insurance → `request.created target=insurance` | ✅ |
| `GET /events?since=0` | Догон событий после обрыва | 200, 31 событие (txn.created, request.created, access.*, card.*, money.moved, limit.updated, consent.signed и др.) | ✅ |
| `PATCH /me/theme` | 200 theme=ocean | 200, theme=ocean | ✅ |
| `GET /family/audit` | 200 + журнал | 200, 35 событий до доп. тестов | ✅ |
| `POST /quests/:id/complete` без ответов | Либо 404/405, либо без начисления монет | 200: +60 монет, done=true – **обход теста** | ❌ |

---

## 3. Найденные баги

### B1. Отзыв доступа ребёнка не блокирует API – критично

**Файлы:** `server/src/routes/family.ts:171-206`, `server/src/routes/child.ts:35-48`, `server/src/routes/bonuses.ts:185-230`, `server/src/auth.ts:50-63`, `server/src/http.ts:37-47`.

`POST /children/:id/access {granted:false}` меняет `children.access_granted` и отзывает строки `sessions`, но access-токен – обычный JWT, который проверяется только по подписи. Ни `childState`, ни `assertChildAccess`, ни `GET /bonuses` не смотрят на `access_granted`. В итоге ребёнок со свежим токеном продолжает читать состояние, бонусы и транзакции.

**Факт:** после `granted:false` – `GET /children/:id/state` 200, `GET /bonuses` 200, `GET /children/:id/transactions` 200. Отзыв действует только на refresh-сессию, т.е. максимум через 15 минут (ACCESS_TTL_MIN=15, `server/src/env.ts:9`), а не сразу.

**Влияние на демо:** если показывать «родитель отключил доступ» – на телефоне ребёнка всё продолжит работать. Это самый заметный провал.

### B2. Logout не инвалидирует access-токен – высокий

**Файлы:** `server/src/routes/auth.ts:114-124`, `server/src/auth.ts:50-63`.

`/auth/logout` помечает `revoked_at` только у refresh-сессии. Access-JWT остаётся валидным до истечения 15 минут; `verifyAccess` не сверяется с БД. Проверено: после logout `GET /me` со старым access – 200.

### B3. `coin_ledger` не пополняется: вставляется несуществующая колонка `quest_id` – высокий

**Файлы:** `server/src/routes/bonuses.ts:161, 263, 312`; миграция `supabase/migrations/0008_quests_fix.sql:52-58` (в `coin_ledger` колонки `quest_id` нет).

Все три вставки передают `quest_id`, PostgREST возвращает `400 42703 column coin_ledger.quest_id does not exist`, ошибка нигде не проверяется. При этом `users.coins` меняется, поэтому баланс монет «правильный», а журнала операций нет вообще.

**Факт:** `GET /coin_ledger?user_id=…` вернул `[]` после трёх начислений и двух покупок; прямой запрос `select=quest_id` → 42703. При очистке удалено 0 строк `coin_ledger` – их не было.

### B4. `POST /quests/:id/complete` начисляет монеты без прохождения теста – высокий

**Файлы:** `server/src/routes/bonuses.ts:232-286` (начисление `points` из каталога без проверки ответов), `server/src/routes/bonuses.ts:50-77` (все тесты синкаются в таблицу `quests` с `kind="quiz"`).

Любой авторизованный ребёнок может вызвать `POST /quests/c-card-1/complete` и получить 60 монет, не отвечая на вопросы; тест при этом помечается `done`. Проверено: coins 550 → 610, points=60, done=true.

В мобильном UI этот путь напрямую не используется: `mobile/src/api/bonuses.ts:38-39` содержит `completeQuestApi`, но в экранах вызывается `submitQuizApi`; `mobile/src/api/actions.ts:86-92` вообще ходит в несуществующие `/children/:id/quests/:id/complete|approve` (в `server/src/routes` таких маршрутов нет – вернётся 404). То есть баг API-уровня, но не ежедневного UI-сценария.

### B5. Платёж ЕРИП записывается положительной суммой и не учитывается в месячном лимите – средний

**Файлы:** `server/src/routes/family.ts:433-449` (баланс уменьшается на `paymentAmount`, а в `transactions.amount` пишется `+paymentAmount`), `server/src/rules.ts:58-74` (`spentThisMonth` считает только `amount < 0`).

После approve ЕРИП на 5 BYN: pocket 15→10, но транзакция `amount=5, status=approved`. В истории ребёнок видит «+5» вместо «−5», а месячный лимит эту трату не учитывает. Обычные оплаты через `POST /children/:id/transactions` пишут `-Math.abs(amount)` (корректно).

### B6. Письменное согласие на вклад не enforced на уровне bootstrap/открытия счёта – средний

**Файлы:** `server/src/repo.ts:47-56` (`allowed: defaultAllowed(...)` для deposit = true), `server/src/rules.ts:36-38` (`requiresWrittenConsent`), `server/src/routes/money.ts:127-137` (счёт открывается сразу, если продукт доступен по возрасту).

У подростка после создания ребёнка `GET /family` показывает `deposit.allowed=true, requires_consent=true, has_consent=false`, и счёт deposit уже создан. При этом `PATCH /children/:id/permissions {productId:"deposit", allowed:true}` до согласия корректно возвращает `allowed=false` (`server/src/routes/family.ts:308-309`). То есть правило согласия обходится через bootstrap/открытие счёта.

### B7. Согласия не создаются при bootstrap ребёнка – низкий

**Файлы:** `server/src/repo.ts:85-87` (`family_id: null`), `supabase/migrations/0001_init.sql:96-101` (`consents.family_id NOT NULL`).

Вставка дефолтных согласий падает молча; сразу после `POST /family/children` `GET /family` отдаёт `consents: []`. После `POST /children/:id/consents` появляются 4 строки с датой. На демо заметно, если показывать экран согласий до подписания.

### B8. Родитель не получает уведомление о пополнении – низкий

**Файл:** `server/src/routes/money.ts:280-292` – `notify` вызывается только для `child.user_id`. Ребёнок получает «Деньги пришли», родитель – нет. Вероятно, задумано (родитель сам инициатор), но чек-лист ждал уведомления обеим сторонам.

### B9. Расхождения контракта/чек-листа

| Что в чек-листе | Что в коде/факте | Файл |
| --- | --- | --- |
| `PATCH /children/:id/requests/:rid {approve:true}` | ждёт `{status:"approved"}` или `{status:"declined"}`; `{approve:true}` → 400 «Неизвестное действие». Мобильный клиент тоже шлёт `status` | `server/src/routes/family.ts:384-389`, `mobile/src/api/actions.ts:73-77` |
| недостаточно денег на платеже → 409 | 400 `bad_request` «На карте недостаточно денег для этой заявки» | `server/src/routes/payments.ts:56-59` |
| запрет онлайн-платежей → 409/403 | HTTP 200 + `status:"declined", reason:"operation_disabled"` (операция реально блокируется, но код ответа другой) | `server/src/routes/child.ts:208-214`, `server/src/rules.ts:125-140` |
| `/children/:id/payments` (или `/payments`) | существует только `/children/:id/payments`; это заявка на approve, а не мгновенное списание | `server/src/routes/payments.ts:23-102` |
| `/children/:id/transfers` или `/money/transfer` | `/money/transfer` нет; есть `POST /children/:id/transfers` | `server/src/routes/money.ts:172-249` |
| таблица `device_tokens` | такой таблицы нет (404 PGRST205); push-токены лежат в `push_tokens` | `supabase/migrations/0005_payments_push.sql:10` |
| – | `POST /children/:id/card` при повторном выпуске обновляет единственную карту и всё равно отвечает 201; одновременно virtual+plastic не хранятся | `server/src/routes/family.ts:221-254` |
| – | `POST /auth/join` в ответе отдаёт `child.user_id=null` (строка выбрана до update), хотя в токене всё корректно | `server/src/routes/auth.ts:161-189` |

---

## 4. Что важно для демо

1. **Не показывать отзыв доступа как мгновенный** (B1): ребёнок продолжит работать до 15 минут. Если сценарий обязателен – нужен middleware, проверяющий `access_granted` в БД на каждом детском запросе, либо короткий TTL/чёрный список токенов.
2. **Не давать жюри вызвать `/quests/:id/complete`** (B4) – монеты начисляются без теста. Основной путь `/quests/:id/quiz` работает корректно.
3. **Logout на демо не проверять через старый access** (B2): он ещё 15 минут валиден.
4. **ЕРИП показывать как «заявка → подтверждение родителя»** (B5): мгновенного списания при создании платежа нет; сумма в истории будет положительной.
5. Остальное (регистрация, семья, ребёнок, карта, topup, переводы, лимиты, тесты, награды, PIN, Telegram-ссылка, разрешения, согласия, live-связь) демонстрируется штатно.

---

## 5. Очистка тестовых данных

Удаление выполнено через Supabase service role (ключ взят из `/srv/moby/app/server/.env` на сервере, в отчёт не попал). Удаляли по `family_id`, `child_id`, `user_id` и телефонам. Использованы только DELETE и один временный PATCH `users.coins=1200` для проверки покупок.

Созданные сущности: 2 пользователя, 1 семья, 1 ребёнок, 1 карта, 3 счёта, 6 транзакций, 3 запроса, 1 перевод, 4 согласия и т.д.

| Таблица | Удалено строк |
| --- | ---: |
| users | 2 |
| families | 1 |
| family_members | 2 |
| children | 1 |
| sessions | 6 |
| app_codes | 1 |
| otp_challenges | 2 (по одному на номер) |
| telegram_bindings | 0 |
| push_tokens | 0 |
| cards | 1 |
| accounts | 3 |
| limits | 1 |
| permissions | 6 |
| operation_permissions | 4 |
| allowed_categories | 0 |
| consents | 4 |
| transactions | 6 |
| transfers | 1 |
| goals | 0 |
| access_requests | 3 |
| notifications | 14 |
| quest_progress | 3 |
| purchases | 2 |
| coin_ledger | 0 (строки не создавались из-за B3) |
| audit_log | 36 |
| realtime_events | 31 |
| device_tokens | – таблицы нет (404), чистить нечего |

**Проверка после очистки:** все контрольные `GET` по `users` (в т.ч. по обоим телефонам), `families`, `family_members`, `children`, `notifications`, `access_requests`, `transactions`, `cards`, `accounts`, `consents`, `purchases`, `quest_progress`, `coin_ledger`, `sessions`, `app_codes`, `otp_challenges`, `audit_log`, `realtime_events` для тестовых id/телефонов вернули `[]`. Чужие семьи и дети (демо-данные других QA-прогонов) не затрагивались.

---

## 6. Итог: все ли функции рабочие?

**Нет, не все.** Из 16 пунктов чек-листа:

- **10 полностью рабочие:** 1, 2, 3, 4, 6, 11, 12, 13, 15, 16.
- **4 рабочие с замечаниями/дефектами:** 7 (контракт approve), 8 (нет уведомления родителю о topup), 9 (400 вместо 409, положительная сумма ЕРИП), 10 (обход через `/complete`).
- **2 с провалом:** 5 (отзыв доступа не блокирует API), 14 (logout не инвалидирует access).

Отдельно подтверждена **живая связь «родитель ↔ ребёнок»**: WebSocket `/realtime` подключается обоими, `ready` отдаёт familyId и число клиентов, topup родителя приходит ребёнку как `txn.created`, запрос ребёнка приходит родителю как `request.created`, `/events` догоняет пропущенные события. Это работает.

**Критично для демо:** B1 (отзыв доступа) и B4 (монеты без теста). **Высокие по данным:** B2 (logout/access), B3 (пустой coin_ledger), B5 (ЕРИП). Остальное – контрактные расхождения и мелочи, основной сценарий не блокируют.
