# Кнопки прототипа — Magentum Button

Шрифт: **Lato, Bold (700)** для всех кнопок.

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

| Size | Padding (v / h) | Border-radius | Gap (icon ↔ text) | Min-width | Типографика |
|---|---|---|---|---|---|
| **Large** | 16px / 20px | 8px (`--l`) | 6px | 56px | Heading4: 16/24, -0.2px |
| **Medium** | 10px / 16px | 8px (`--l`) | 6px | 44px | Heading4: 16/24, -0.2px |
| **Small** | 8px / 12px | 8px (`--l`) | 4px | 28px (h 36px) | Heading5: 14/20, -0.2px |

---

## Стили (Style × ColorType)

### Primary (заливка основным цветом)

| ColorType | Background | Text | Hover bg |
|---|---|---|---|
| **Main** | `#006CFD` | white | `#0357D8` |

### Secondary (заливка фоновым цветом)

| ColorType | Background | Text | Hover bg |
|---|---|---|---|
| **Main** | `#E6F0FF` | `#005EDE` | `#D6E6FF` |

### Outline (обводка, без заливки)

| ColorType | Border | Text | Background | Hover bg |
|---|---|---|---|---|
| **Main** | 1px solid `#2777F0` | `#005EDE` | transparent | `rgba(39, 119, 240, 0.06)` |
| **Secondary** | 1px solid `#D0D8E9` | `#697797` | transparent | `#F3F5FA` |

Модификатор `.style-secondary` применяется на `.btn-outline-*` для «серых» фильтр-кнопок.

### Ghost (текст, без заливки и обводки)

| Background | Text | Hover |
|---|---|---|
| transparent | `#005EDE` | opacity: 0.75 |

### Negative Secondary (светло-красная заливка — деструктивное действие)

| State | Background | Text |
|---|---|---|
| **Default** | `#FFE9EB` (`--control-negative-secondary-default`) | `#C2122D` (`--text-negative-default`) |
| **Hover** | `#FFDDE1` (`--control-negative-secondary-hovered`) | `--text-negative-hovered` |
| **Pressed** | `#FFD2D6` (`--control-negative-secondary-pressed`) | `--text-negative-pressed` |

Только размер `md` (44px target, Heading4 16/24). Пример: «Удалить». Все цвета — через токены `--control-negative-secondary-*` / `--text-negative-*`, без хардкода.

### Disabled (единый для всех)

| Background | Text |
|---|---|
| `#E1E6F4` | `#B1BAD2` |

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
- Лейаут: `shared.css` — reset, body, header, sidebar

Порядок подключения в HTML:
```html
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../components/buttons.css">
<link rel="stylesheet" href="../shared.css">
```
