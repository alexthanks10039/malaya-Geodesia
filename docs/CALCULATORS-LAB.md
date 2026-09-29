# Calculator Lab

Изолированный контур разработки геодезических калькуляторов.

## Как изолировано

- отдельная ветка: `feature/calculators-lab`;
- отдельный route: `/calculators-lab`;
- отдельный API: `/api/calculators-lab`;
- основной route `/calculator` не изменён;
- компоненты не импортируются из основного Calculator UI;
- нет ссылок из основной навигации;
- registry и engine находятся в `lib/calculators-lab`.

## Архитектура

```
                  CALCULATOR LAB
                        │
                  Registry / Schema
                        │
              ┌─────────┴─────────┐
              ↓                   ↓
          Web UI              API Manifest
              │                   │
              └─────────┬─────────┘
                        ↓
                 Calculator Engine
                        ↓
                  Domain function
                        ↓
                     Result
```

Каждый калькулятор содержит:

- идентификатор;
- категорию;
- описание;
- source/reference;
- schema входов;
- чистую функцию расчёта.

Это позволяет позже подключить один и тот же контракт к public UI, Studio, API и тестам.

## Реализовано

1. Площадь по координатам XY.
2. Расстояние + азимут.
3. Разбивка точки.
4. Уклон.
5. Cut / Fill по сетке.
6. Объём траншеи.
7. Стоимость топосъёмки.

## API

`GET /api/calculators-lab` возвращает только сериализуемый manifest без внутренних функций расчёта.

Это заготовка для будущего Calculator Studio:

```
Manifest
  ↓
Visual Schema Editor
  ↓
Variables / Formula Builder
  ↓
Version
  ↓
Publish
```

## Smoke test

`npm run test:calculator-lab` проверяет базовые эталонные сценарии для ключевых калькуляторов.

## Источники и лицензии

Лаборатория не копирует GPL-код из сторонних проектов.

- `chrisveness/geodesy` используется как алгоритмический референс для геодезических функций; пакет публикуется под MIT.
- `edips/surveyingcalculator` используется как функциональный референс каталога survey-калькуляторов.
- `hypar-io/CutAndFill` и earthwork calculators используются как архитектурные референсы для Cut/Fill.

Перед импортом стороннего исходного кода в production необходимо отдельно проверить лицензию конкретного репозитория и сохранить attribution/NOTICE при необходимости.

## Production boundary

Production-публикация не выполняется из этой ветки. После UX-валидации можно переносить выбранные калькуляторы по одному в основной Calculator Engine и подключать их к CMS/Studio.
