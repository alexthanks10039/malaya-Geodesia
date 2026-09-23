# Malaya Studio

Встроенный визуальный workspace для проектирования сайта прямо поверх реального Next.js UI.

## Модель

`GitHub main → Vercel Preview/Production`

`/studio → Layers → Canvas → Inspector → local draft → Snapshot/Export → Preview`

Vercel Preview Deployments создают изолированную версию ветки и обновляются на каждый push, поэтому Studio не подменяет deployment workflow, а работает перед ним как визуальный слой проектирования.

## Основной workflow

1. Открыть `/studio`.
2. Выбрать страницу в PAGE.
3. Выбрать Desktop / Tablet / Mobile.
4. В режиме Select нажать на элемент в canvas или выбрать его в Layers.
5. Изменить контент, типографику, layout, appearance или custom CSS в Inspector.
6. Использовать Grid для проверки сетки.
7. Save создаёт локальный snapshot.
8. Export сохраняет полный draft JSON.
9. Import возвращает draft из JSON.
10. После проверки изменения проходят обычный CI + Vercel Preview workflow.

## Что умеет visual editor

- иерархическое DOM-дерево Layers;
- поиск по тегу, тексту и CSS-классу;
- стабильные runtime selectors;
- click-to-select в реальном preview;
- режим Select / Interact;
- Desktop / Tablet / Mobile viewport;
- zoom 60–130%;
- визуальная grid-подложка;
- inline изменение текста;
- типографика: font-size, line-height, weight, tracking, alignment;
- layout: display, width, max-width, height, gap, position, z-index, padding, margin;
- appearance: color, background, border, radius, shadow, opacity;
- advanced: transform, transition, custom CSS;
- изменение ссылок и alt;
- скрытие существующего элемента;
- добавление Text / Button / Divider / Container;
- удаление созданных Studio-блоков;
- Undo / Redo до 50 шагов;
- snapshots до 12 версий;
- review comments, привязанные к слою;
- экспорт / импорт draft JSON;
- глобальные design tokens;
- специализированные редакторы калькулятора и кейсов внутри той же среды.

## Draft storage

Studio использует browser localStorage.

Ключи:

- `malaya-studio-overrides`
- `malaya-studio-calculator`
- `malaya-studio-versions`

Черновик не записывает JSX/CSS в GitHub автоматически. Это намеренное разделение между визуальным проектированием и source control.

## Вставленные блоки

Studio может добавить безопасные runtime-блоки:

- Text → `<p>`
- Button → `<a>`
- Divider → `<div>`
- Container → `<div>`

Они сохраняются как данные draft и восстанавливаются при следующем открытии preview. Для production-кода их необходимо принять в source layer отдельно.

## Legacy Dev Mode

Старый quick Dev Mode сохранён для обратной совместимости.

Внутри нового Studio preview он автоматически отключён параметром `studioPreview=1`, чтобы два редактора не конфликтовали.

## Vercel

Vercel использует Preview Deployments как изолированные среды для веток и PR. Vercel Toolbar предоставляет отдельный слой collaboration: Comments, Draft Mode и другие инструменты проверки live deployment. Studio намеренно не дублирует deployment/CI и оставляет их Vercel/GitHub.

## Горячие клавиши

- `Ctrl/Cmd + Z` — Undo
- `Ctrl/Cmd + Shift + Z` — Redo
- `Ctrl/Cmd + S` — Snapshot
- `/` — поиск Layers
- `Esc` — закрыть selection

## Проверка перед merge

`npm run lint`

`npm run build`

После push Vercel создаёт новый deployment для ветки, а CI выполняет TypeScript check и production build.
