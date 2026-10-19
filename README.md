# Малая геодезия

P0 MVP цифрового продукта: многостраничный Next.js-сайт, интерактивный калькулятор, кейсы, справочник и подготовленная PostgreSQL/Prisma схема.

## Запуск

```bash
npm install
npm run dev
```

## Маршруты

- / — главная
- /services — услуги
- /calculator — калькулятор
- /cases — кейсы
- /knowledge — справочник и поиск
- /api/leads — endpoint заявок

## Архитектура

Приложение разворачивается единым Next.js-проектом. Статические seed-данные для витрины находятся в lib/data.ts; редактируемый CMS, версии, журнал изменений, метаданные файлов, очередь Telegram и постоянный rate limit используют PostgreSQL через lib/db.ts и SQL-миграции из scripts/db-migrate.mjs. Без DATABASE_URL витрина может показывать seed-данные, но запись/публикация в Studio, долговременный журнал и файловый каталог работать не будут.

## Design

Визуальный язык: geospatial / engineering / digital twin. Motion используется для UI-анимаций; GSAP и React Three Fiber заложены в следующих этапах.


## Live Preview

### Вариант 1: автоматически через GitHub Actions

Каждый push в `main` запускает отдельный live-preview:

1. GitHub Actions запускает `next dev`.
2. Cloudflare Quick Tunnel публикует его наружу.
3. URL появляется в GitHub Actions в блоке **Live Preview** и в статусе коммита **Live Preview**.
4. Новый push в `main` автоматически перезапускает preview на новом состоянии проекта.

Это именно dev-preview, не production. Quick Tunnel генерирует временный публичный `trycloudflare.com` адрес. Для разработки это удобно, но ссылку нельзя считать закрытой.

### Вариант 2: локально с одной командой

После `npm install`:

```bash
npm run live
```

Команда поднимает Next.js dev server и Cloudflare Quick Tunnel. В консоли появится:

```
LIVE PREVIEW: https://....trycloudflare.com
```

За счёт `next dev` изменения кода видны сразу после сохранения.

### Вариант 3: GitHub Codespaces

В репозитории подготовлен `.devcontainer/devcontainer.json`:

- Node 24
- автоматический `npm install`
- порт 3000 пробрасывается автоматически
- видимость порта по умолчанию приватная
- изменения в `next dev` отображаются сразу после сохранения

Открывать Codespace можно прямо из GitHub для этого репозитория.

### Почему здесь нет второго проекта

Все три режима работают поверх текущего `malaya-Geodesia`. Отдельного фронтенда, отдельного API или отдельного репозитория не создаётся.

<!-- deployment-heartbeat: 2026-09-23 -->
## Документация

Полная техническая документация проекта: [docs/PROJECT-DOCUMENTATION.md](docs/PROJECT-DOCUMENTATION.md)

## Переменные окружения

Настрой их в Vercel → Project → Settings → Environment Variables для Production и Preview:

- DATABASE_URL — PostgreSQL connection string. Обязателен для CMS CRUD, публикаций, версий, аудита и устойчивой очереди уведомлений.
- ADMIN_PASSWORD и ADMIN_SESSION_SECRET — вход в Studio; секрет сессии должен быть не короче 32 символов.
- BLOB_READ_WRITE_TOKEN — загрузка файлов в Vercel Blob.
- TG_KEY, OWNER_ID, TG_WEBHOOK_SECRET, CRON_SECRET — Telegram-уведомления, webhook и cron-повтор отправки.
- DATABASE_SSL=false — только для локальной PostgreSQL без TLS.

Полный шаблон находится в .env.example. Не коммить реальные секреты. STUDIO_AUTH_DISABLED действует только вне production.

## Проверка перед релизом

```bash
npm install
npm run lint
npm run build
```

После деплоя проверь статус Vercel Ready, форму заявки, вход в Studio, создание/сохранение/публикацию черновика, загрузку файла и доставку Telegram. Успешная сборка сама по себе не подтверждает, что переменные окружения и внешние сервисы настроены.
