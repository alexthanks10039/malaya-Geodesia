# CHECKPOINT-04 — Calculation Engine

## Что изменено
- Добавлен `lib/calculation-engine.ts` — чистый доменный Calculation Engine.
- Добавлен `scripts/calculation-engine-smoke.ts`.
- В `package.json` добавлена команда `test:calculation-engine`.

## Архитектурная граница
`Calculation Engine` не зависит от React, Studio UI, HTTP или базы данных. Он принимает versioned `CalculationModel`, входные числовые переменные и возвращает детерминированный результат с trace.

## Что не изменено
- Текущий публичный calculator не переключён на новый engine.
- `lib/calculator.ts` сохранён как compatibility facade.
- `lib/calculators-lab/engine.ts` не переписан.
- Бизнес-логика существующего продукта не менялась.

## Проверки
Добавлен smoke test для:
- цепочки зависимых формул;
- version/model identity;
- output extraction;
- execution trace;
- обнаружения циклических зависимостей.

Автоматический запуск `npm run test:calculation-engine` через удалённый GitHub-инструмент в этой сессии недоступен, поэтому результат выполнения команды не заявляется как подтверждённый. Перед следующим этапом необходимо выполнить локально/CI:

```bash
npm run test:calculation-engine
npm run lint
npm run build
```

## Rollback
Откатить коммиты после предыдущего рабочего состояния, не затрагивая более ранние изменения. Основные файлы checkpoint:
- `lib/calculation-engine.ts`
- `scripts/calculation-engine-smoke.ts`
- `package.json`

## Следующий вход
Следующий этап может использовать `CalculationModel`, `runCalculation()` и `CalculationResult` как стабильный контракт для параметров, коэффициентов и тарифов.
