# Малая геодезия

Многостраничный Next.js-продукт для услуг малой геодезии: сайт, динамический калькулятор, кейсы, справочник и встроенная Studio/CMS.

## Стек

- Node.js 24.x, Next.js 16 App Router, React 19, TypeScript
- PostgreSQL через `pg` и SQL migrations
- Vercel Blob для файлов
- Telegram Bot API для уведомлений и рабочего процесса заявок
- Puck для визуального редактирования страниц
- Playwright Test для smoke/E2E-проверок

## Локальный запуск

Требуется Node.js 24.x.

```bash
npm install
npm run dev
```

Перед запуском production-сервера и e2e-тестов:

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

> В репозитории пока нет tracked `package-lock.json`. Пока lockfile не сгенерирован и не проверен, workflows используют `npm install`, а не `npm ci`.

## Основные маршруты

- `/` — главная
- `/calculator` — калькулятор
- `/services` — услуги
- `/cases` — кейсы
- `/knowledge` — справочник
- `/partners` — партнёры
- `/studio` — встроенная Studio/CMS
- `/api/leads` — API заявок
- `/api/health` — health endpoint

## Данные и переменные окружения

Публичный контент может использовать статический fallback без базы. Запись CMS требует настроенного `DATABASE_URL`. Файловые загрузки зависят от Vercel Blob, Telegram-доставка — от конфигурации Telegram. Production-настройки и реальные webhook/DB-проверки следует подтверждать отдельно: успешная сборка сама по себе не доказывает работоспособность production-интеграций.

Studio auth временно отключена по текущему решению проекта. Перед production-запуском необходимо вернуть защиту через `ADMIN_PASSWORD` и проверить `STUDIO_AUTH_DISABLED`.

## CI/CD

- **CI** запускается на push/PR в `main`: TypeScript, production build и Playwright smoke tests.
- **Preview** запускается вручную и создаёт artifact сборки.
- **Visual preview** вручную снимает desktop/mobile screenshots и загружает artifact.
- **Live Preview** запускается вручную через GitHub Actions. Это временный публичный dev-туннель, не production и не закрытая ссылка. Не вводите через него пароли, секреты и данные клиентов.

Подробная техническая документация: [docs/PROJECT-DOCUMENTATION.md](docs/PROJECT-DOCUMENTATION.md).  
Текущий backend backlog: [docs/BACKLOG.md](docs/BACKLOG.md).
