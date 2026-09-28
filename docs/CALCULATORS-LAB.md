# Calculator Lab

Изолированный контур разработки геодезических калькуляторов.

## Как изолировано

- отдельная ветка: `feature/calculators-lab`;
- отдельный route: `/calculators-lab`;
- основной route `/calculator` не изменён;
- компоненты не импортируются из основного Calculator UI;
- нет ссылок из основной навигации;
- registry и engine находятся в `lib/calculators-lab`.

## Архитектура

```
UI
 ↓
Calculator Registry
 ↓
Schema-driven Definition
 ↓
Calculator Engine
 ↓
Domain Calculator
 ↓
Calculator Result
```

Каждый калькулятор содержит:

- идентификатор;
- категорию;
- описание;
- source/reference;
- schema входов;
- чистую функцию расчёта.

Это позволяет позже подключить один и тот же контракт к public UI, Studio, API и тестам.

## Реализовано в лаборатории

1. Площадь по координатам XY.
2. Расстояние + азимут.
3. Разбивка точки.
4. Уклон.
5. Cut / Fill по сетке.
6. Объём траншеи.
7. Стоимость топосъёмки.

## Источники и лицензии

Лаборатория не копирует GPL-код из сторонних проектов.

- `chrisveness/geodesy` используется как алгоритмический референс для геодезических функций.
- `edips/surveyingcalculator` используется как функциональный референс каталога survey-калькуляторов.
- `hypar-io/CutAndFill` и earthwork calculators используются как архитектурные референсы для Cut/Fill.

Перед импортом стороннего исходного кода в production необходимо отдельно проверить лицензию конкретного репозитория и сохранить attribution/NOTICE при необходимости.

## Следующий слой

После UX-валидации можно вынести:

```
CalculatorDefinition
        ↓
CalculatorSchema
        ↓
Studio Builder
        ↓
Formula/Variable Editor
        ↓
Versioned Config
        ↓
Public Calculator
```

Production-публикация не выполняется из этой ветки автоматически как часть основного продукта.
