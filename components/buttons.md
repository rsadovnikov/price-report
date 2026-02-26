# Кнопки прототипа — Magentum Button

Источник: [Figma — Button](https://www.figma.com/design/whWaY1l1DYcVDJqHJiXJk2/%D0%9E%D1%82%D1%87%D1%91%D1%82-%D0%BE-%D1%86%D0%B5%D0%BD%D0%B5-%D0%B8-%D0%BA%D0%BE%D0%BD%D0%BA%D1%83%D1%80%D0%B5%D0%BD%D1%82%D0%B0%D1%85?node-id=3009-34505)

Шрифт: **Lato, Bold (700)** для всех кнопок.

---

## Размеры (Size)

| Size | Padding (v / h) | Border-radius | Gap (icon ↔ text) | Min-width | Типографика |
|---|---|---|---|---|---|
| **Large** | 16px / 18px | 8px (`--l`) | 6px | 56px | Heading4: 16/24, -0.2px |
| **Medium** | 10px / 14px | 8px (`--l`) | 6px | 44px | Heading4: 16/24, -0.2px |
| **Small** | 4px / 10px | 4px (`--m`) | 4px | 28px | Heading5: 14/20, -0.2px |

---

## Стили (Style × ColorType)

### Primary (заливка основным цветом)

| ColorType | Background | Text | Hover bg |
|---|---|---|---|
| **Main** | `#0468FF` | white | `#0356D4` |
| Positive | `#34AC0A` | white | — |
| Warning | `#DB6F0A` | white | — |
| Negative | `#DB1F36` | white | — |

### Secondary (заливка фоновым цветом)

| ColorType | Background | Text | Hover bg |
|---|---|---|---|
| **Main** | `#E6F0FF` | `#005EDE` | `#D6E6FF` |
| Positive | `#EBF9E6` | `#227E01` | — |
| Warning | `#FFF2E6` | `#A14F00` | — |
| Negative | `#FFE9EB` | `#C2122D` | — |

### Stroke (обводка, без заливки)

| ColorType | Border | Text | Background | Hover bg |
|---|---|---|---|---|
| **Main** | 1px solid `#2777F0` | `#005EDE` | transparent | `rgba(39, 119, 240, 0.06)` |

### Inverted

| Background | Text |
|---|---|
| white | `#0D162E` |

### Disabled (единый для всех)

| Background | Text |
|---|---|
| `#E1E6F4` | `#B1BAD2` |

---

## Маппинг на прототип

Какие кнопки дизайн-системы используются в прототипе отчёта:

| CSS-класс | Файл | DS-вариант | Size | Назначение |
|---|---|---|---|---|
| `.btn-primary` | shared.css | Primary / Main | Large | Хедер «Разместить» |
| `.btn-create-pdf` | report.html | Primary / Main | Large | Футер «Сгенерировать PDF» |
| `.btn-select-manually` | report.html | Primary / Main | Large | Empty state «Выбрать вручную» |
| `.btn-show-more` | report.html | Secondary / Main | Large | «Показать больше объектов» |
| `.btn-report` | index.html | Secondary / Main | Small | «Отчёт о цене» в карточке |
| `.btn-auto-fill` | report.html | Secondary / Main | Small | «Заполнить автоматически» |
| `.btn-boost` | index.html | Secondary / Main | Small | «Поднять» в карточке |
| `.btn-outline` | index.html | Stroke / Main | Medium | «Обновить даты», «Настроить календарь» |
| `.btn-save-exit` | report.html | Ghost (text-only) | Large | Футер «Сохранить и выйти» |
| `.btn-add-link` | report.html | Ghost (text-only) | Small | «Добавить по ссылке» |

---

## Расхождения с дизайн-системой

Все расхождения исправлены (2026-02-26):
- `btn-outline` (все размеры): обновлены цвета под DS Stroke/Main — синий бордер `#2777F0`, синий текст `#005EDE`, прозрачный фон

Примечание: `.chip` в report.html — отдельный компонент (фильтр-чип), не является кнопкой. Их стили сходятся по палитре, но не по назначению.

---

## Файлы

- Документация: `prototype/buttons.md`
- Токены: `src/tokens.css` — CSS-переменные (цвета, радиусы, отступы)
- Кнопки: `src/buttons.css` — все классы кнопок
- Лейаут: `src/shared.css` — reset, body, header, sidebar

Порядок подключения в HTML:
```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="buttons.css">
<link rel="stylesheet" href="shared.css">
```
