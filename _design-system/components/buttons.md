# Кнопки прототипа — Magentum Button

Шрифт: **Lato, Bold (700)** для всех кнопок.

> **Сверено с продом 2026-08-12** — `@cian/ui-kit v7.84.0`, storybook `UI-Kit / Button / Button`
> (снято через служебный Chrome по CDP). Размеры и состояния ниже — прод-контракт,
> наши `sm / md / lg` = прод `XS / M / L`. Расхождения и что осталось — в конце файла.

---

## Сетка классов

Имена классов строятся по схеме `btn-{variant}-{size}`:

| | `lg` | `md` | `sm` |
|---|---|---|---|
| **primary** | `btn-primary-lg` | `btn-primary-md` | `btn-primary-sm` |
| **secondary** | `btn-secondary-lg` | `btn-secondary-md` | `btn-secondary-sm` |
| **outline** | `btn-outline-lg` | `btn-outline-md` | `btn-outline-sm` |
| **ghost** | `btn-ghost-lg` | — | `btn-ghost-sm` |
| **negative-secondary** | — | `btn-negative-secondary-md` | `btn-negative-secondary-sm` |

Плюс `btn-icon` — иконочная кнопка 28×28 (без текста).

---

## Размеры (Size)

| Size | Прод | Height | Padding (v / h) | Border-radius | Gap | Min-width | Типографика |
|---|---|---|---|---|---|---|---|
| **Large** | `L` | 56px | 16px / 20px | 8px (`--l`) | 8px | 56px | Heading4: 16/24 |
| **Medium** | `M` | 44px | 16px / 16px | 8px (`--l`) | 8px | 44px | Heading4: 16/24 |
| **Small** | `XS` | 36px | 8px / 12px | 8px (`--l`) | 6px | 36px | Heading5: 14/20 |

**`height` задан явно** — вертикальный padding нейтрализуется центровкой, как в проде.
**У базового правила `border: 1px solid transparent`** — рамка есть у всех вариантов, иначе
обводочная кнопка на 2px выше залитой того же размера (был баг: outline-lg 58px, outline-md 46px).
**`min-width` = height** — иконочная кнопка без текста получается квадратом.

**`letter-spacing: -0.2px` — по типографической шкале кита, а не по рендеру кнопки.**
Прод-Button рендерит лейбл с `normal`, но страница `UI-Kit/Typography` того же кита объявляет
Heading4/5 с `ls −0.2` (сверено 2026-08-13, совпало с нашей `typography.md` 10 из 10) — и Figma
говорит то же. То есть Button просто не применяет к лейблу собственный текстовый стиль:
это **дефект прода**, а не решение. Ведём по шкале. Вернуть к рендеру = убрать три строки.

---

## Стили (Style × ColorType)

Все цвета — только токенами. Хардкод hex запрещён: прошлые значения (`#0357D8`, `#0247B0`,
`#D6E6FF`, `#2777F0`, `rgba(39,119,240,.06)`) разошлись с продом и заменены.

### Primary = прод `main_primary`

| State | Background | Text |
|---|---|---|
| **Default** | `--control-main-primary-default` | `--text-on-bright-default` |
| **Hover** | `--control-main-primary-hovered` | — |
| **Pressed** | `--control-main-primary-pressed` | — |
| **Disabled** | `--control-main-primary-disabled` | `--text-on-bright-disabled` |

### Secondary = прод `main_secondary`

| State | Background | Text |
|---|---|---|
| **Default** | `--control-main-secondary-default` | `--text-main-default` |
| **Hover** | `--control-main-secondary-hovered` | — |
| **Pressed** | `--control-main-secondary-pressed` | — |
| **Disabled** | `--control-main-secondary-disabled` | `--text-main-disabled` |

### Outline = прод `stroke_primary`

| State | Border | Background | Text |
|---|---|---|---|
| **Default** | `--stroke-border-main` | transparent | `--text-main-default` |
| **Hover** | — | `--surface-inverted-hovered` | — |
| **Pressed** | — | `--surface-inverted-pressed` | — |
| **Disabled** | `--stroke-control-disabled` | transparent | `--text-main-disabled` |

### Outline `.style-secondary` = прод `stroke_secondary`

| State | Border | Background | Text |
|---|---|---|---|
| **Default** | `--stroke-control-default` | transparent | `--text-primary-default` |
| **Hover** | `--stroke-control-hovered` | `--surface-inverted-hovered` | — |
| **Pressed** | `--stroke-control-pressed` | `--surface-inverted-pressed` | — |
| **Disabled** | `--stroke-control-disabled` | transparent | `--text-primary-disabled` |

Модификатор `.style-secondary` применяется на `.btn-outline-*` для «серых» фильтр-кнопок.

### Ghost (текст, без заливки и обводки)

| Background | Text | Hover |
|---|---|---|
| transparent | `#005EDE` | opacity: 0.75 |

⚠️ **Ghost — наш самодел, в прод-Button такого варианта нет** (там для этого отдельный
компонент `LinkButton`). Размеры и фокус общие, цвета не сверены. `btn-ghost-md` объявлен
в размерах, но своего цветового правила не имеет.

### Negative Secondary (светло-красная заливка — деструктивное действие)

| State | Background | Text |
|---|---|---|
| **Default** | `#FFE9EB` (`--control-negative-secondary-default`) | `#C2122D` (`--text-negative-default`) |
| **Hover** | `#FFDDE1` (`--control-negative-secondary-hovered`) | `--text-negative-hovered` |
| **Pressed** | `#FFD2D6` (`--control-negative-secondary-pressed`) | `--text-negative-pressed` |

Только размер `md` (44px target, Heading4 16/24). Пример: «Удалить». Все цвета — через токены `--control-negative-secondary-*` / `--text-negative-*`, без хардкода.

### Focus (клавиатура)

`:focus-visible` → `outline: 2px solid var(--stroke-control-focused); outline-offset: 2px`.
По прод-контракту, на всех вариантах включая `btn-icon`.

---

## Не покрыто (осознанно)

Что есть в прод-компоненте, но не заведено у нас — фиксирую, чтобы не искать заново:

- **Темы:** `positive_*`, `warning_*`, `negative_primary`, `inverted`. Заводить под задачу.
- **Обрезка лейбла.** В проде title всегда `overflow:hidden; text-overflow:ellipsis; text-align:center`.
  У нас только `white-space: nowrap` (длинный текст выпирает), ellipsis прикручен точечно
  к `negative-secondary`. Не добавлял: меняет клиппинг во всех таблицах прототипа — отдельной волной.
- **Слот `subtitle`** (12/16 regular, `margin-top:-5px`, колонка под заголовком) — не используется.
- **`loading`.** В проде это проп на любой теме и размере (спиннер + `pointer-events:none`);
  у нас только `.btn-secondary-lg.loading`.
- **Иконочные.** `btn-icon` (28×28, radius 4) не совпадает ни с icon-only Button в проде
  (квадрат 36/44/56, `padding:0`), ни с круглыми `IconButton` / `RoundButton` (28/40, radius 50%).
  Это отдельные компоненты кита — нужна своя сверка.

---

## Маппинг на прототип

| CSS-класс | Файл | DS-вариант | Назначение |
|---|---|---|---|
| `btn-primary-lg` | report.html | Primary / Main / Large | «Выбрать конкурентов» (empty state), «Создать PDF-отчёт» |
| `btn-secondary-lg` | report.html | Secondary / Main / Large | «Показать больше объектов» |
| `btn-ghost-lg` | report.html | Ghost / Large | «Сохранить и выйти» |
| `btn-ghost-sm` | report.html | Ghost / Small | «Добавить по ссылке», «Отмена» (форма комментария) |
| `btn-primary-sm` | report.html | Primary / Main / Small | «Добавить» (форма комментария) |
| `btn-outline-sm.style-secondary` | report.html | Outline / Secondary / Small | Фильтры-чипы конкурентов |
| `btn-secondary-sm` | index.html | Secondary / Main / Small | «Отчёт о цене», «Поднять» (карточка объявления) |
| `btn-outline-sm` | index.html | Outline / Main / Small | «Обновить даты», «Настроить календарь» |
| `btn-icon` | report.html | Icon only | Редактировать / удалить комментарий (28×28) |

---

## Файлы

- Документация: `prototype/components/buttons.md`
- Токены: `tokens.css` — CSS-переменные (цвета, радиусы, отступы)
- Кнопки: `components/buttons.css` — все классы кнопок
- Лейаут: `base.css` — reset, body, типографика; `web.css` — header, sidebar

Порядок подключения в HTML:
```html
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../components/buttons.css">
<link rel="stylesheet" href="../base.css">
<link rel="stylesheet" href="../web.css">
```
