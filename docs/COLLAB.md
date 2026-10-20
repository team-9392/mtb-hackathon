# Как работать вместе (5 человек, один проект)

Проект один, но у каждого свой компьютер. Чтобы не переписывать друг друга, работаем так.

## Один раз настроить компьютер

```bash
# 1. Склонировать (у тебя должен быть доступ к репозиторию)
git clone https://github.com/team-9392/mtb-hackathon.git
cd mtb-hackathon

# 2. Зависимости сервера и мобилки
cd server && npm ci && cd ..
cd mobile && npm install && cd ..

# 3. Секреты: server/.env и .secrets/ в git НЕ лежат
cp server/.env.example server/.env
# вписать значения от тимлида: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET
# .secrets/ (expo-token, supabase-keys) попросить у тимлида
```

Проверка: `cd server && npm run dev` — должен подняться на порту 8080.

## Ветки: у каждого своя, main — общая

```bash
git checkout main
git pull                     # забрать свежак
git checkout -b моё-имя      # например artem, evgen, tomilov, mikita
```

Правила:
- **Работаешь в своей ветке, не в main.** main всегда должна быть рабочей.
- Перед началом работы: `git pull --rebase origin main` — забери чужие изменения.
- Готово — запушь свою ветку и влей в main:
  ```bash
  git push -u origin моё-имя
  git checkout main && git pull && git merge --ff-only моё-имя && git push
  ```
  Не получается ff-only — значит кто-то уже влил своё: `git pull --rebase origin main`, разрули конфликты, снова merge.
- Один файл — один хозяин за раз. Если двое правят одно и то же, договоритесь в чате, кто делает.

## миграции базы: только по очереди

База одна на всех (Supabase). Поэтому:
- новая миграция = **новый файл** с номером больше последнего: `0011_что_то.sql`;
- **никогда не редактируй уже применённые миграции** — у остальных они уже в базе;
- применил в общую базу (`supabase db push`) — **напиши в чат**, чтобы никто не накатил своё поверх;
- сидовые данные (квесты, награды) не кладём в SQL с кириллицей — через скрипт или латиницу.

## сервер: деплой по одному

Прод живёт на `root@31.128.40.18`, код в `/srv/moby/app/server`, сервис `moby-api`.

```bash
cd server
rsync -az --delete --exclude node_modules --exclude dist --exclude .env \
  -e "ssh" ./ root@31.128.40.18:/srv/moby/app/server/
ssh root@31.128.40.18 'cd /srv/moby/app/server && npm ci && npm run build && systemctl restart moby-api'
```

- Деплой только из **main** и только когда договорились, что деплоит один человек.
- После деплоя проверь: `curl -s https://malanka.jaraslau.dev/moby/health` → `{"ok":true}`.

## мобилка: что можно и нельзя

- Пакеты ставим только `npx expo install <пакет>` (подберёт версию под SDK 58).
- `mobile/ios` и `mobile/android` в git не лежат — они генерируются: `npx expo prebuild -p ios --clean`.
- Перед коммитом: `npx tsc --noEmit` и `npx expo lint` — должны быть без ошибок.
- Сборки APK — через EAS, аккаунт организации: `jaraslaukunin-team` (доступ у всех).
  ```bash
  export EXPO_TOKEN=...   # попросить у тимлида
  cd mobile && npx eas-cli@latest build --platform android --profile preview
  ```
- iOS-сборка только на Mac с Xcode: `npx expo run:ios --device <UDID> --configuration Release`. У бесплатного Apple ID сборка встаёт только на свой iPhone.

## секреты

Никогда не коммитим:
- `server/.env` (в .gitignore);
- `.secrets/` (expo-token, supabase-keys, пароли);
- ключи Supabase service_role в чат/скриншоты.

Значения передаём через менеджер паролей (Bitwarden/1Password) или лично. Если ключ засветился — сразу ротация.

## перед защитой

- `git checkout main && git pull` у всех;
- `cd mobile && npx tsc --noEmit` — чисто;
- прод задеплоен из main и `/health` отвечает;
- APK собран из main (не из локальной ветки!);
- тестовые аккаунты в базе подчищены.
