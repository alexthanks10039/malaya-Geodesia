# Telegram integration — Малая геодезия

## Источник

Операционный Telegram-модуль перенесён из соседнего проекта `GPT-GPT-Gpt / BOT TG`. Сохраняем его сильные части: Bot API wrapper, owner-only доступ, inline-клавиатуры, webhook/polling-подход и обработку заявок. В `Малой геодезии` он работает как нативный Next.js backend без отдельного Express-сервера.

Официальный Telegram Bot API поддерживает webhook через HTTPS и позволяет защищать входящие запросы заголовком `X-Telegram-Bot-Api-Secret-Token`. Для production используем именно эту схему.

## Поток

`Калькулятор → POST /api/leads → PostgreSQL geo_leads → Telegram Bot API → владелец → кнопки заявки → PostgreSQL`

Заявка теперь сохраняется до отправки Telegram. Поэтому падение Telegram не удаляет заявку.

## ENV

```env
TG_KEY=...
OWNER_ID=...
TG_WEBHOOK_SECRET=...
```

Опционально для ручной настройки webhook:

```env
PUBLIC_BASE_URL=https://your-domain.example
WEBHOOK_PATH=/api/telegram/webhook
```

## API

- `GET /api/telegram/webhook` — health/config status, без секретов.
- `POST /api/telegram/webhook` — принимает Telegram Update.
- `POST /api/leads` — создаёт заявку, сохраняет её в PostgreSQL и отправляет уведомление.

## Telegram

- `/start`, `/reload`, `Главное меню`
- новые заявки
- заявки в работе
- статистика
- карточка заявки
- взять в работу
- изменить статус
- главное меню

## Хранилище

Добавлена миграция `db/migrations/0004_geo_leads.sql`.

Таблица `geo_leads` хранит:
- заявку и параметры калькулятора;
- статус;
- ответственного;
- историю изменений;
- дату создания/обновления.

Если `DATABASE_URL` отсутствует, модуль сохраняет fallback in-memory для локального запуска. Production должен использовать PostgreSQL.

## Webhook

После деплоя webhook должен указывать на:

`https://<domain>/api/telegram/webhook`

При вызове `setWebhook` передаём `TG_WEBHOOK_SECRET`. Telegram будет отправлять его в `X-Telegram-Bot-Api-Secret-Token`.

## Следующий backend этап

1. Довести Telegram до production smoke test.
2. Добавить durable operator actions/audit.
3. Сделать команды настройки webhook через отдельный защищённый admin endpoint.
4. После Telegram перейти к единому Lead API/CRM слою и убрать остаточные browser/in-memory зависимости.
