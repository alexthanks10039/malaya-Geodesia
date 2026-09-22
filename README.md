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

Контент пока находится в lib/data.ts, чтобы P0 запускался без внешней БД. prisma/schema.prisma готовит миграцию на PostgreSQL. Следующий этап: PostGIS, pgvector, карты, Three.js/R3F и AI search.

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

### Почему здесь нет второго проекта

Live Preview работает поверх текущего `malaya-Geodesia`. Отдельного фронтенда, отдельного API или отдельного репозитория не создаётся.
