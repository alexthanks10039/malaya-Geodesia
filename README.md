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
