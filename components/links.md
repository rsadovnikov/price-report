# Ссылки прототипа — Action Link

Источник: [Figma — Action Link](https://www.figma.com/design/whWaY1l1DYcVDJqHJiXJk2/%D0%9E%D1%82%D1%87%D1%91%D1%82-%D0%BE-%D1%86%D0%B5%D0%BD%D0%B5-%D0%B8-%D0%BA%D0%BE%D0%BD%D0%BA%D1%83%D1%80%D0%B5%D0%BD%D1%82%D0%B0%D1%85?node-id=3018-72073)

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
| **Large** | Heading4: 16px / 24px, −0.2px | — |
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

- Документация: `prototype/links.md`
- Стили: `src/links.css`

Порядок подключения в HTML:
```html
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="buttons.css">
<link rel="stylesheet" href="links.css">
<link rel="stylesheet" href="shared.css">
```
