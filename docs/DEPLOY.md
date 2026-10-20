# Развёртывание: Supabase + Node API на VPS с Ubuntu

Стек зафиксирован: **Node.js + Supabase**. Клиент (мобильное приложение) в базу не ходит
вообще — только в API. Supabase даёт managed PostgreSQL, бэкапы и консоль для показа жюри.

Нужен ли сервер: **да, но только под Node API**. База живёт в Supabase, поэтому хватает
самого маленького VPS (1 vCPU / 1 ГБ). API без состояния — можно перезапускать когда угодно.

---

## 1. Supabase (10 минут)

1. Создать проект на supabase.com (регион — ближайший к Беларуси, обычно Frankfurt).
2. SQL Editor → вставить содержимое `supabase/migrations/0001_init.sql` → Run.
   (Кто пользуется CLI: `npx supabase db push` после `npx supabase link`.)
3. При желании загрузить демо-данные: `supabase/seed.sql`.
4. Settings → API → скопировать:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (секрет, только на сервере)

Важно: в схеме включён RLS, политик нет, права у `anon` и `authenticated` отозваны.
Это значит, что даже если ключ из приложения утечёт, базу он не прочитает.

---

## 2. Node API на VPS (15 минут)

```bash
# Node 22 из NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v

# код
sudo mkdir -p /srv/moby && sudo chown "$USER" /srv/moby
git clone <адрес-репозитория> /srv/moby/app
cd /srv/moby/app/server

npm ci
cp .env.example .env
nano .env        # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, DEMO_OTP=1111
npm run build
npm test         # 8 проверок бизнес-правил
```

Секрет JWT: `openssl rand -hex 32`.

### Автозапуск через systemd

`/etc/systemd/system/moby-api.service`:

```ini
[Unit]
Description=Moby Family API
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/moby/app/server
EnvironmentFile=/srv/moby/app/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now moby-api
sudo systemctl status moby-api --no-pager
curl -s localhost:8080/health
```

---

## 3. HTTPS (Caddy, сертификат сам)

Нужен домен, направленный A-записью на IP сервера.

```bash
sudo apt-get install -y caddy
```

`/etc/caddy/Caddyfile`:

```
api.moby-family.by {
    reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
curl -s https://api.moby-family.by/health
```

Альтернатива без домена: `ngrok http 8080` — быстро для теста, но адрес плавающий.
Самодельный сертификат не подходит: iOS не пустит самоподписанный HTTPS.

Файрвол: открыть 22, 80, 443; порт 8080 наружу не выпускать.
```bash
sudo ufw allow 22,80,443/tcp && sudo ufw enable
```

---

## 4. Подключение приложения

В `mobile/app.json` добавить адрес API:

```json
{
  "expo": {
    "extra": { "apiUrl": "https://api.moby-family.by" }
  }
}
```

Либо на время запуска: `EXPO_PUBLIC_API_URL=https://api.moby-family.by npx expo start --tunnel`.

Если адрес не задан — приложение автоматически работает в демо-режиме на локальных данных,
поэтому стенд не падает без сети. Это осознанный запасной вариант, а не «забыли подключить».

---

## 5. Проверка боем

```bash
# 1. API жив
curl -s https://api.moby-family.by/health

# 2. Код подтверждения создаётся (в демо-режиме вернётся demoCode)
curl -s -X POST https://api.moby-family.by/auth/otp/request \
  -H 'content-type: application/json' -d '{"phone":"+375291234567"}'

# 3. Вход по коду 1111 и получение сессии
curl -s -X POST https://api.moby-family.by/auth/otp/verify \
  -H 'content-type: application/json' \
  -d '{"challengeId":"<id из шага 2>","code":"1111"}'
```

Дальше — два телефона в Expo Go: родитель входит первым, создаёт пакет «Фэмили»,
добавляет ребёнка и выдаёт доступ; ребёнок входит своим номером и кодом доступа.

---

## 6. Обновление и бэкапы

```bash
cd /srv/moby/app && git pull && cd server && npm ci && npm run build
sudo systemctl restart moby-api
```

- Бэкапы базы — штатные Supabase (Database → Backups), плюс можно включить PITR.
- Журнал изменений прав и согласий — таблица `audit_log`, смотреть через SQL Editor:
  `select action, entity, payload, at from audit_log order by at desc limit 50;`
