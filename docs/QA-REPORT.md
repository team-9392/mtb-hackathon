# QA-отчёт: Moby Family

- **Дата:** 2026-10-21, 08:35–08:40 (Europe/Minsk)
- **Прод-API:** https://malanka.jaraslau.dev/moby
- **Рабочая копия:** /Users/jaraslaukunin/mtbhackathon
- **Проверено:** 55 пунктов (включая 31 живой API-сценарий), **51 OK**, **4 проблемных пункта**
- **Критичных провалов в проверенных пользовательских сценариях:** нет
- **Код не менялся.** Единственный добавленный мной файл – этот отчёт; остальные изменения в рабочей копии (git status) были до/появились параллельно и мной не трогались. Коммитов нет, секреты в отчёт не попали.

Кратко: все обязательные сценарии мобильного API на проде прошли, веб-бандл собирается, серверные typecheck/build/tests зелёные. Проблемы – в конфиге Expo (app.json), в устаревших мобильных логических тестах, в рассинхроне документации по полю why и в мёртвом/сломанном коде доступа к несуществующей колонке quests.child_id.

> **Обновление после отчёта:** исправлены 3 из 4 проблем – M3 (app.json), M4 (фикстуры тестов), E4 (мёртвый quests.child_id). D7 (формулировка про why) осталась как есть. Что изменено и результаты повторных проверок – в разделе 6.

---

## 1. Сводка по блокам

| Блок | Проверок | OK | Проблем |
| --- | ---: | ---: | ---: |
| Мобильное приложение (tsc, lint, doctor, npm test) | 4 | 2 | 2 |
| Сервер (tsc, build, test) | 3 | 3 | 0 |
| Живой API на проде | 31 | 31 | 0 |
| Веб-версия на :8083 | 4 | 4 | 0 |
| Контент и документация | 8 | 7 | 1 |
| Дополнительно (негативные проверки, схема БД, очистка) | 5 | 4 | 1 |
| **Итого** | **55** | **51** | **4** |

---

## 2. Таблица проверок

### 2.1 Мобильное приложение

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| M1 | cd mobile && npx tsc --noEmit | 0 ошибок | exit 0, вывода ошибок нет | OK |
| M2 | cd mobile && npx expo lint | 0 errors | exit 0; **0 errors, 66 warnings** (no-void – 56, react/no-unstable-nested-components – 9, @typescript-eslint/no-shadow – 1); 22 файла; отдельное info «Using legacy ESLint config» | OK |
| M3 | cd mobile && npx expo-doctor | 20/20 | exit 1; **19/20**; ошибка схемы конфига: mobile/app.json:9 – лишнее свойство newArchEnabled | **ПРОБЛЕМА** |
| M4 | cd mobile && npm test (дополнительно) | 10/10 | exit 1; **8/10**; 2 FAIL: «попытка ставки отклонена» (получено undefined вместо declined) и «траты ребёнка» (0 вместо 45.8) | **ПРОБЛЕМА** |

### 2.2 Сервер

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| S1 | cd server && npx tsc --noEmit | 0 ошибок | exit 0, ошибок нет | OK |
| S2 | cd server && npm run build | exit 0 | exit 0, dist/ собран | OK |
| S3 | cd server && npm test | все тесты проходят | 8 tests, 8 pass, 0 fail (354 ms) | OK |

### 2.3 Живой API (прод)

Скрипт: временный /tmp/qa-live.mts (Node fetch + tsx, импорт QUIZZES из server/src/quizzes.ts), в репозиторий не добавлялся. База: https://malanka.jaraslau.dev/moby.

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| L1 | POST /auth/otp/request (родитель +375000000101) | 200, challengeId, demoCode=1111 | 200, challengeId есть, demoCode=1111, ttl=300 | OK |
| L2 | POST /auth/otp/verify (код 1111) | 200, accessToken, familyId=null, needsFamily=true | ровно так | OK |
| L3 | Создан/найден пользователь родителя | UUID пользователя | UUID получен | OK |
| L4 | POST /auth/family | 200, family.id, новый токен role=parent | 200, familyId есть, role=parent | OK |
| L5 | GET /me под родителем | role=parent, familyId заполнен | 200, role=parent, familyId совпал | OK |
| L6 | POST /family/children (ребёнок) | 201, child.id, access_code | 201, childId есть, accessCode=37005981 | OK |
| L7 | GET /family под родителем | child.accessCode присутствует и совпадает | 200, accessCode=37005981 | OK |
| L8 | POST /auth/otp/request (второй номер +375000000102) | 200, demoCode=1111 | 200, demoCode=1111 | OK |
| L9 | POST /auth/otp/verify второго номера | 200, accessToken, familyId=null | ровно так | OK |
| L10 | POST /auth/join с accessCode | 200, role=child, childId, новый токен | 200, role=child, childId совпал | OK |
| L11 | Токен после join | Отличается от токена до join | отличается | OK |
| L12 | GET /me под ребёнком | role=child, familyId заполнен | 200, role=child, familyId совпал | OK |
| L13 | POST /children/:id/access {granted:true} | 200, accessGranted=true | 200, accessGranted=true | OK |
| L14 | GET /children/:id/state | accessGranted=true | true | OK |
| L15 | POST /children/:id/card {type:"plastic",system:"belkart"} | 201/200, type=plastic, system=belkart, last4 | 201, system=belkart, type=plastic, last4=5015, PAN 9112… | OK |
| L16 | GET /bonuses под ребёнком: тесты | 4 теста c-* | 4 всего, 4 c-* | OK |
| L17 | GET /bonuses под ребёнком: награды | Есть награды с partnerLogo | 12 наград, 4 с partnerLogo (stationery, cafe, cinema, trampoline) | OK |
| L18 | GET /bonuses под родителем: тесты | 3 теста p-* | 3 всего, 3 p-* | OK |
| L19 | GET /bonuses под родителем: награды | 5 наград | 5 | OK |
| L20 | GET /quizzes/c-pocket-1 | 200, 4–5 вопросов | 200, 5 вопросов | OK |
| L21 | Поле correct в ответе квиза | Отсутствует | ключа correct нет нигде в JSON | OK |
| L22 | Варианты ответов | 3–4 на ru и be, длины совпадают | везде 4/4 | OK |
| L23 | POST /quests/c-pocket-1/quiz с правильными ответами | ok=true, points=50, монеты +50 | 200, 5/5, points=50, coins=50 | OK |
| L24 | Повторный проход того же теста | points=0, монеты не растут | 200, ok=true, points=0, coins=50 | OK |
| L25 | GET /bonuses после теста | done=true | true | OK |
| L26 | POST /rewards/r-icecream-cup/buy (code:null) | 200, сгенерированный MOBY-… | 200, code=MOBY-E32EA1 (6 hex), списано 150 | OK |
| L27 | POST /rewards/r-cash5/buy (фиксированный код) | ровно MOBY5 | 200, code=MOBY5, списано 500 | OK |
| L28 | GET /bonuses после покупок | Купленные коды видны | MOBY-E32EA1 и MOBY5 | OK |
| L29 | GET /partners/cafe.png | 200, image/png | 200, image/png, 3823 байта, SHA-256 совпал с server/assets/partners/cafe.png | OK |
| L30 | GET /partners/нет.png | 404 | 404, JSON not_found | OK |
| L31 | GET /health | 200, {"ok":true} | 200, ok:true, demoOtp:true, telegram:true | OK |

> Для проверки покупок тестовому ребёнку сервисной ролью Supabase было временно выставлено 2000 монет (иначе награды за 150/500 монет недоступны после одного теста). Это делалось только на тестовом аккаунте, который затем удалён.

### 2.4 Веб-версия

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| W1 | Порт 8083 | Dev-сервер запущен системным Node | PID 90838: /opt/homebrew/bin/node node_modules/.bin/expo start --web --port 8083, cwd = mobile | OK |
| W2 | GET http://127.0.0.1:8083/ | 200, HTML | 200, text/html, 1280 байт, title «Moby Family», есть #root и тег бандла | OK |
| W3 | GET /node_modules/expo-router/entry.bundle?... | 200, JS | 200, application/javascript; charset=UTF-8, 5 394 266 байт; X-Metro-Files-Changed-Count: 0 | OK |
| W4 | Поиск TransformError в бандле | Нет реальной ошибки трансформации | Строка встречается 14 раз, но только в коде Metro/LogBox (parseBabelTransformError, isTransformError, regex-форматы); фактического события TransformError нет | OK |

### 2.5 Контент и документация

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| D1 | docs/QUIZ.md | Файл есть | есть, 11 955 байт | OK |
| D2 | docs/REWARDS.md | Файл есть | есть, 11 829 байт | OK |
| D3 | QUIZZES в server/src/quizzes.ts | 4 детских + 3 родительских | 7: c-pocket-1, c-card-1, c-plan-1, c-scam-1, p-budget-1, p-limits-1, p-safety-1 | OK |
| D4 | Число вопросов в тестах | 4–5 | child: 5, 5, 4, 5; parent: 5, 5, 5 | OK |
| D5 | REWARDS в server/src/rewards.ts | 12 детских + 5 родительских | 17: 12 child, 5 parent; 7 с партнёром, 4 с фиксированным кодом, 13 с code:null | OK |
| D6 | Логотипы партнёров | Все файлы из каталога доступны | 6 уникальных PNG: books, cafe, cinema, stationery, taxi, trampoline – все 200, image/png, SHA-256 совпали с локальными | OK |
| D7 | Документация про why | Должна соответствовать API | docs/QUIZ.md:192 и server/src/quizzes.ts:7-8 говорят, что why не уходит клиенту; фактически server/src/routes/bonuses.ts:117-118 отдаёт why_ru/why_be, а mobile/src/app/quiz/[id].tsx:232 их показывает | **ПРОБЛЕМА** |
| D8 | Формат генерируемого промокода | MOBY-XXXX | Фактически MOBY- + 6 hex (MOBY-E32EA1), как и описано в docs/REWARDS.md:79; correct при этом действительно не отдаётся | OK |

### 2.6 Дополнительно

| № | Что проверял | Ожидание | Факт | Итог |
| --- | --- | --- | --- | --- |
| E1 | GET /family без токена | 401 | 401 | OK |
| E2 | GET /bonuses без токена | 401 | 401 | OK |
| E3 | GET /me с битым токеном | 401 | 401 | OK |
| E4 | Схема quests против кода | Код не должен обращаться к несуществующим колонкам | В проде quests без child_id; REST возвращает 42703 column quests.child_id does not exist; код repo.ts:141 и child.ts:337-342, 392-397 всё ещё фильтрует по child_id | **ПРОБЛЕМА** |
| E5 | Очистка тестовых данных | 0 остатков после теста | Удалены пользователи, семья, ребёнок, сессии, покупки, ledger, progress, уведомления, audit/realtime, OTP; проверено 0 строк в 12 таблицах | OK |

---

## 3. Что сломано и где

### 3.1 expo-doctor: невалидный app.json (низкий/средний риск)

- **Файл:** mobile/app.json:9
- **Факт:** "newArchEnabled": true – expo-doctor (1.20.4) считает это лишним свойством схемы: «should NOT have additional property 'newArchEnabled'». Итог: 19/20 проверок, exit 1.
- **Влияние:** сборка веб-версии и typecheck проходят, но чистый doctor/EAS-валидация конфига будут красными.
- **Что делать:** убрать newArchEnabled (в SDK 58 New Architecture включена по умолчанию) и перезапустить npx expo-doctor.

### 3.2 Мобильные логические тесты: 2 падения из 10 (средний риск для CI)

- **Тест:** mobile/scripts/verify-logic.ts:86-90 – ищет в initialState.txns операцию gambling со статусом declined, но initialState.txns пуст.
- **Тест:** mobile/scripts/verify-logic.ts:120-123 – ожидает сумму трат 45.8 из initialState.txns, получает 0.
- **Причина:** mobile/src/store/mock.ts:70 – txns: []; демо-транзакции из mock убраны, а тесты остались на старых данных. Это не регрессия spentThisMonth/isHardBlocked, а устаревшие фикстуры.
- **Факт:** npm test завершается с exit 1: «Провалено проверок: 2».
- **Что делать:** либо вернуть фикстуры транзакций в тест (локально, не в initialState), либо переписать проверки на явно собранные txns.

### 3.3 quests.child_id не существует в проде (средний/низкий риск, латентный баг)

- **Схема:** supabase/migrations/0008_quests_fix.sql:12-22 – таблица quests пересоздана без child_id (поля: id, audience, kind, points, title_ru, title_be, desc_ru, desc_be, sort).
- **Код, который всё ещё читает child_id:**
  - server/src/repo.ts:141 – db.from("quests").select("*").eq("child_id", child.id);
  - server/src/routes/child.ts:337-342 – POST /children/:id/quests/:questId/complete;
  - server/src/routes/child.ts:392-397 – PATCH /children/:id/quests/:questId/approve.
- **Живое подтверждение:** GET /rest/v1/quests?select=*&child_id=eq.… на проде возвращает 400 {"code":"42703","message":"column quests.child_id does not exist"}.
- **Влияние:** GET /family и GET /children/:id/state не падают (ошибка Supabase молча игнорируется), но всегда отдают quests: []; два endpoint'а детских заданий всегда возвращают 409 «Задание не найдено». Текущий UI детских квестов использует /bonuses, поэтому пользовательский сценарий из ТЗ не затронут, но код мёртвый и вводит в заблуждение.
- **Что делать:** либо убрать quests/child_id из childState и удалить два legacy-endpoint'а, либо вернуть отдельную таблицу детских заданий.

### 3.4 Документация противоречит API по полю why (низкий риск)

- **Утверждение:** docs/QUIZ.md:192 – «Поля correct и why хранятся только на сервере и в мобильное приложение не отправляются». То же в шапке server/src/quizzes.ts:7-8.
- **Факт:** server/src/routes/bonuses.ts:117-118 отдаёт why_ru и why_be в GET /quizzes/:id; клиент их использует – mobile/src/app/quiz/[id].tsx:232.
- **Что верно:** correct действительно не отдаётся (проверено L21). why – отдаётся намеренно, чтобы показать объяснение после ответа.
- **Что делать:** поправить формулировку в docs/QUIZ.md и комментарий в server/src/quizzes.ts: скрыт только correct, а why приходит клиенту.

### 3.5 Шум линтера (не провал, 66 warnings)

- **Файлы с наибольшим числом:** mobile/src/store/StoreProvider.tsx – 22, mobile/src/app/child/(tabs)/_layout.tsx – 5, mobile/src/app/auth/code.tsx – 5, mobile/src/app/parent/(tabs)/_layout.tsx – 4.
- **Правила:** no-void – 56 (осознанные void promise), react/no-unstable-nested-components – 9 (компоненты табов определяются внутри render в обоих _layout.tsx), @typescript-eslint/no-shadow – 1 (mobile/src/app/child/(tabs)/index.tsx:28, переменная t).
- **Ошибок нет**, lint exit 0. Это не блокер, но 9 unstable nested components стоит вынести из render.

### 3.6 Мелочи

- server/assets/partners/icecream.png нигде не используется: r-icecream-cup имеет partner: null; остальные 6 логотипов используются и отдаются корректно.
- server/package.json запускает только src/rules.test.ts; интеграционных тестов API в репозитории нет – живой сценарий проверялся внешним скриптом.

---

## 4. Тестовые данные и очистка

- Скрипта очистки в проекте **нет**: grep -rn "wipe" --include=*.mjs --include=*.js --include=*.ts дал только совпадения в mobile/src/i18n/ru.ts и be.ts (это часть слова swipe), а не скрипт очистки.
- Созданные номера:
  - родитель: **+375000000101**
  - ребёнок: **+375000000102**
- Созданные и затем удалённые сущности:
  - parent user 552b75f7-8a0e-4e8c-b860-f2efd1c9a217
  - child user 2e6b6afd-d8b2-4b18-90d5-10c618f281c4
  - family 1ad3be05-deb2-4f1b-8889-9542e7b23bed
  - child 71851bb5-4e12-4c76-b0da-a44994aec5c0
- Очистка выполнена через Supabase service role (ключ не печатался): удалены семья, пользователи, дети, сессии, покупки, coin_ledger, quest_progress, уведомления, audit_log, realtime_events, family_members, otp_challenges.
- Контрольная проверка после очистки: **0 строк** по всем 12 таблицам и 0 OTP-челленджей на оба тестовых номера.

---

## 5. Как воспроизводилось

~~~bash
# мобильное
cd mobile
npx tsc --noEmit
npx expo lint
npx expo-doctor
npm test

# сервер
cd ../server
npx tsc --noEmit
npm run build
npm test

# живой API: временный скрипт, не в репозитории
npx tsx /tmp/qa-live.mts

# веб (уже был запущен системным Node)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:8083/
curl -s -o /dev/null -w '%{http_code} %{content_type} %{size_download}\n' \
  'http://127.0.0.1:8083/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=src%2Fapp&unstable_transformProfile=hermes-stable'
~~~

**Ограничения проверки:** не запускались iOS/Android-сборки и реальные устройства, не проверялись push/Telegram/WebSocket и нагрузка; веб-версия проверена по HTTP и сборке бандла, без визуального прогона в браузере.

---

## 6. Исправления после отчёта

**Коммит:** `fix: починить фикстуры тестов, схему app.json и мёртвый фильтр quests.child_id` (один коммит; фактический хэш – в `git log -1 --format=%H` и в ответе агента).

| Пункт | Что сделано | Файлы |
| --- | --- | --- |
| M3 | Убрано поле `"newArchEnabled": true` из конфига Expo: в SDK 58 New Architecture включена по умолчанию, схема его больше не принимает. | mobile/app.json |
| M4 | Тест больше не читает демо-операции из `initialState`: фикстуры (3 траты ребёнка на 24.9 + 12.4 + 8.5, отклонённая ставка на 50, операция родителя на 200) собираются внутри `scripts/verify-logic.ts`. Проверяется реальная логика: `spentThisMonth` отбрасывает отклонённые операции и операции не ребёнка, остаток лимита считается по фактическим тратам (60 − 45.8 = 14.2), пустой `initialState` даёт 0 трат. | mobile/scripts/verify-logic.ts |
| E4 | `childState` больше не запрашивает `quests` с фильтром `child_id` (поле ответа оставлено пустым массивом, чтобы не менять контракт с `mobile/src/api/sync.ts`). Legacy-эндпоинты `POST /children/:id/quests/:questId/complete` и `PATCH /children/:id/quests/:questId/approve` удалены: они фильтровали по `child_id` и обращались к колонкам `status/amount/created_at`, которых в `quests` после 0008 нет, и из UI не вызываются. Актуальные пути не затронуты: `/bonuses`, `POST /quests/:id/complete`, `POST /quests/:id/quiz`, покупки наград. | server/src/repo.ts, server/src/routes/child.ts |

Повторные проверки после правок:

| Проверка | Результат |
| --- | --- |
| cd server && npx tsc --noEmit | ✅ 0 ошибок |
| cd server && npm run build | ✅ exit 0 |
| cd server && npm test | ✅ 8 tests, 8 pass, 0 fail |
| cd mobile && npx tsc --noEmit | ✅ 0 ошибок |
| cd mobile && npm test | ✅ **10/10** проверок пройдено |
| cd mobile && npx expo-doctor | ✅ **20/20** checks passed |
| cd mobile && npx expo lint | ✅ 0 errors, **66 warnings** (как в M2, не трогали) |

Замечания:

- `GET /family` и `GET /children/:id/state` по-прежнему отдают `quests: []` – контракт ответа для приложения не изменился, ошибка PostgREST 42703 по `quests.child_id` больше не возникает.
- Мобильные обёртки `completeQuestApi`/`approveQuestApi` в mobile/src/api/actions.ts и одноимённые методы в StoreProvider остались, но из экранов не вызываются – это мёртвый код, его удаление вынесено за рамки этой правки (в коммит вошли только mobile/app.json, mobile/scripts, server/src, docs).
- Пункт D7 (документация про why) и шум линтера (3.5) не правились: в задачу не входили.
