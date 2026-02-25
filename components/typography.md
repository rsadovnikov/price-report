# Типографика прототипа — Magentum Desktop/Typography

Источник: [Figma — Base 2.0 / Desktop/Typography](https://www.figma.com/design/nvQCTpiPgYAqyZSF0JRZmf/%E2%9A%9B%EF%B8%8F-Base-2.0?node-id=2110-5232)

Шрифт: **Lato** (все токены).

---

## Токены

| CSS-класс | Размер | Вес | Line-height | Letter-spacing | Case | Контекст |
|---|---|---|---|---|---|---|
| `.heading1` | 36px | 700 (Bold) | 40px | 0 | Sentence | Самый большой заголовок — имя контакта, анкета для записи на просмотр |
| `.heading2` | 28px | 700 (Bold) | 36px | -0.5px | Sentence | Вместо H1, заголовки в ленте, шторках и тулбарах |
| `.heading3` | 22px | 700 (Bold) | 28px | -0.5px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.heading4` | 16px | 700 (Bold) | 24px | -0.2px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.heading5` | 14px | 700 (Bold) | 20px | -0.2px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.body1` | 16px | 400 (Regular) | 24px | 0 | Sentence | Текст в шторках, объявлениях, около чекбоксов, большие объёмы текста |
| `.body2` | 14px | 400 (Regular) | 20px | 0 | Sentence | Снекбар, сервисные баннеры, описания |
| `.caption` | 12px | 400 (Regular) | 16px | 0 | Sentence | Подписи под основным текстом чекбокса, дисклеймеры |
| `.overline` | 10px | 700 (Bold) | 16px | 0.7px | ALL CAPS | Особые подзаголовки |

---

## Размерная сетка (Unit)

Каждому токену соответствует Size Unit = кратное базовой единицы (4px):

| Токен | Unit | Итого |
|---|---|---|
| Heading1 | Unit×10 | 40px |
| Heading2 | Unit×9 | 36px |
| Heading3 | Unit×7 | 28px |
| Heading4 | Unit×6 | 24px |
| Heading5 | Unit×5 | 20px |
| Body1 | Unit×6 | 24px |
| Body2 | Unit×5 | 20px |
| Caption | Unit×4 | 16px |
| Overline | Unit×4 | 16px |

---

## Правила применения

1. Все текстовые стили в прототипе должны использовать только токены из этой таблицы.
2. Инлайновые стили `font-size` / `line-height` / `font-weight` допустимы только если нет подходящего токена.
3. При добавлении нового текстового элемента — выбирать ближайший подходящий токен, а не произвольные значения.
4. `letter-spacing` обязателен для Heading1–3 и Overline; для остальных равен 0.
5. `text-transform: uppercase` применяется только к `.overline`.

---

## Файлы

- CSS-токены: `src/shared.css` (секция `TYPOGRAPHY`)
- Эта документация: `prototype/typography.md`
