# Быстрый запуск проекта в GitHub Codespaces

Этот документ описывает единый сценарий запуска **Малой геодезии**. Его цель: чтобы человек или Copilot мог открыть Codespace, выполнить одну команду и получить тот же realtime-preview, где находятся сайт, калькулятор и Studio/Dev Mode.

## Быстрый старт

В корне репозитория:

```bash
./scripts/codespace-preview.sh
```

Или:

```bash
npm run codespace
```

Скрипт:

1. Проверяет Node.js >= 20.
2. Устанавливает зависимости, только если `node_modules` ещё нет.
3. Запускает `npm run lint`.
4. Поднимает Next.js на `0.0.0.0:3000`.
5. Оставляет процесс в foreground, чтобы Codespaces корректно показывал состояние dev-сервера и порт.
6. Использует текущий `main` и текущую кодовую базу. Никакого второго frontend/API/preview-проекта не создаётся.

После запуска Codespaces автоматически показывает forwarded port 3000. Открывать нужно именно этот порт.

## Алгоритм для Copilot

Если нужно быстро поднять окружение, Copilot может выполнить:

```bash
./scripts/codespace-preview.sh
```

Если скрипт не исполняется из-за прав:

```bash
bash scripts/codespace-preview.sh
```

Для проверки без запуска сервера:

```bash
npm install
npm run lint
```

Для обычной разработки без Codespaces:

```bash
npm run dev
```

Для временного публичного preview через Cloudflare Quick Tunnel:

```bash
npm run live
```

## Правило единого окружения

Основной dev-контур:

`main -> Codespace -> Next.js -> Studio/Dev Mode -> Calculator`

Все новые модули должны подключаться к этому же приложению. Не создавать отдельные preview-приложения для отдельных страниц или модулей.

## Что делать при изменениях

После изменения кода не нужно заново разворачивать проект. Next.js dev server использует hot reload.

Если изменились зависимости:

```bash
npm install
npm run codespace
```

Если Codespace был пересоздан, достаточно снова выполнить:

```bash
npm run codespace
```

## Production

Этот скрипт **не является production deployment**. Он предназначен для быстрого realtime development в Codespaces. Production-развёртывание должно выполняться отдельно через настроенный hosting/deployment pipeline.
