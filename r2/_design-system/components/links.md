# Ссылки прототипа — Action Link

---

## Компоненты DS

| Компонент | Назначение |
|---|---|
| **Action Link** | Действие на текущем экране (не меняет URL) |
| Link | Навигация между экранами (меняет URL) — в прототипе не используется |

---

## Action Link

**Шрифт:** Lato, Bold 700
**Цвет:** `#005EDE`
**Gap (иконка ↔ текст):** `8px`
**Иконка:** 16×16 px
**Hover:** `text-decoration: underline`

### Размеры

| Size | Типографика | Размер |
|---|---|---|
| **Small** | Heading5: 14px / 20px, −0.2px | — |
| **Icon only** | — | 28×28 px, иконка 16×16 |

---

## Маппинг на прототип

| CSS-класс | Файл | DS-вариант | Иконка | Назначение |
|---|---|---|---|---|
| `.map-link` | report.html | Action Link / Small | SVG карты | «На карте» |
| `.add-comment` | report.html | Action Link / Small | Edit 16 | «Добавить комментарий» |
| `.reset-filters` | report.html | Action Link / Small | — | «Сбросить фильтры» |
| `.listing-send-link` | index.html | Action Link / Small | — | «Отправить рассылку» |
| `.action-link-icon` | — | Action Link / Icon only | любая 16×16 | иконка без текста |

---

## Файлы

- Документация: `prototype/components/links.md`
- Стили: `components/links.css`

Порядок подключения в HTML:
```html
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../components/buttons.css">
<link rel="stylesheet" href="../components/links.css">
<link rel="stylesheet" href="../base.css">
<link rel="stylesheet" href="../web.css">
```
