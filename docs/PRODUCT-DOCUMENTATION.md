# Малая геодезия — продуктовая документация

**Дата:** 23.09.2026  
**Статус:** MLP / единая база для разработки и QA  
**Repo:** alexthanks10039/malaya-Geodesia

## 1. Видение
Цифровой сервис геодезических работ, который переводит клиента от прикладной задачи к подходящему методу, составу работ, результату, предварительному расчёту и заявке.

**Основной принцип:** задача → метод → данные → результат → расчёт → заявка.

## 2. P0
- Главная, каталог услуг, individual service pages.
- Калькулятор цены/срока.
- Заявка.
- Единый preview/development environment.
- Responsive UI.
- Связь контента с реальными URL.

## 3. P1
- CRUD.
- Файловое пространство.
- Уникальные URL/slug.
- Draft / changes / published.
- Audit log.
- Full Studio.
- Встроенный Dev Mode.
- Редактор калькулятора.
- Редактор кейсов.
- Сквозная связь Studio → CMS → published page.

## 4. Заморожено P3/P4
PostGIS, полноценные geodata workflows, карты, pgvector/RAG/AI и расширенный 3D. Они не должны вытеснять коммерческое ядро.

## 5. Информационная архитектура
`/`, `/services`, `/services/[slug]`, `/calculator`, `/cases`, `/cases/[slug]`, `/knowledge`, `/knowledge/[slug]`, `/technologies`, `/partners`, `/contacts`, `/studio`.

## 6. Основной клиентский сценарий
Главная → сценарий задачи → калькулятор → тип → площадь → условия → результат → срок → предварительный расчёт → телефон → «ГОТОВО / ЗАЯВКА ПРИНЯТА».

Успех сценария: параметры валидны, расчёт понятен, заявка не теряется и попадает в операционный контур.

## 7. Услуги
Текущий seed:
1. Топографическая съёмка
2. Аэрофотосъёмка
3. Лазерное сканирование
4. Исполнительная съёмка
5. 3D-моделирование
6. Расчёт объёмов

Индивидуальная услуга должна отвечать на четыре группы вопросов:
- когда нужна;
- что получу;
- каким методом делаем;
- в каком формате выдаём.

После этого — процесс и CTA в калькулятор.

## 8. Калькулятор
Вход: type, area, complexity, output, urgency, phone.

Расчёт строится через конфигурируемый контекст: базовая цена, площадь, количество условий, коэффициенты формата/срочности, параметры срока, пользовательские коэффициенты и формулы.

**Важно:** цены — предварительная продуктовая логика, а не подтверждённый прайс.

Studio должен позволять менять типы, площади, базовые цены, коэффициенты, сроки, округление и формулы без поиска логики по исходникам.

## 9. Lead
`POST /api/leads` сейчас валидирует:
- телефон 10–16 нормализованных цифр;
- type;
- area > 0 и ≤ 10 000 000 м²;
- output;
- urgency;
- complexity ≤ 20.

Текущий API возвращает синтетический `leadId`. **Критический gap:** заявка пока не является durable-записью в БД.

Целевой поток:
**Calculator → validation → Lead DB → notification/integration → operator.**

Telegram/Google Forms считаются реализованными только после фактической интеграции и проверки доставки.

## 10. CMS
Типы: case, service, knowledge, partner.

Lifecycle: draft → changes → published.

Контент имеет draft/published data, slug/path, version и timestamps. URL должны быть уникальны на уровне БД.

## 11. File Space
FileAsset хранит id, pathname, url, filename, contentType, size, folder, createdAt.

Операции: upload, list, delete.

Медиа должно постепенно стать единым контуром для услуг, кейсов и остальных сущностей.

## 12. Audit
Должны фиксироваться create, update_draft, publish, unpublish, delete, upload и delete file с before/after/metadata.

## 13. Studio
Studio является частью самого сайта, а не отдельным playground.

### Full Studio
Page picker, iframe preview, DOM tree, inspector, responsive preview, design tokens, draft/reset/export и специализированные editors.

### Dev Mode
Работает поверх реального DOM:
- DEV ON;
- дерево блоков;
- поиск;
- выбор/подсветка;
- EDIT;
- TEST;
- live text/CSS;
- browser draft;
- reset element/page;
- JSON export.

Inspector MLP редактирует text, fontSize, lineHeight, color, background, padding, margin, borderRadius, width, maxWidth, gap, letterSpacing, opacity, display.

Responsive preview: desktop / tablet 1024px / mobile 390px.

Tokens: `--bg`, `--paper`, `--ink`, `--muted`, `--acid`, `--line`, `--acid-soft`.

## 14. Единая среда
Не разделять калькулятор, Studio и крупные блоки на независимые preview-приложения.

Единое рабочее пространство:
**Site + Services + Cases + Knowledge + Calculator + CMS + Studio + Dev Mode + Preview.**

Цель — проверять изменение в реальном контексте продукта.

## 15. Product metrics
На следующем этапе аналитики нужны:
- calculator_start
- calculator_step_completed
- calculator_estimate_viewed
- lead_submitted
- lead_persisted
- service_viewed
- service_to_calculator
- case_viewed

Главная цепочка: **landing → calculator → estimate → lead submitted → lead persisted**.

## 16. Definition of Done
Функция готова, когда:
1. сценарий работает;
2. desktop/tablet/mobile не ломаются;
3. источник данных определён;
4. определён способ изменения;
5. есть error/empty state;
6. соседние блоки не ломаются;
7. есть preview;
8. критическое действие имеет явный результат;
9. функция занесена в FUNCTION-LIBRARY;
10. backend-функция явно отмечена как durable или browser/mock.

## 17. Текущие ключевые разрывы
1. Lead persistence.
2. Реальная notification/integration цепочка.
3. Полная CMS ↔ page ↔ Studio связь.
4. Единый lifecycle для browser draft и CMS draft/publish.
5. Семантический block-level editor поверх текущего raw CSS inspector.

## 18. Следующий порядок работ
1. Lead → DB → notification.
2. CMS UI и сквозная публикация.
3. File Space в Studio.
4. Audit UI.
5. Studio ↔ реальные сущности услуг/кейсов/справочника.
6. Calculator как полноценный управляемый модуль.
7. Затем расширять индивидуальные услуги и только потом возвращаться к P3/P4.

Полная машинно-читаемая библиотека функций и блоков находится в `docs/FUNCTION-LIBRARY.json`.
