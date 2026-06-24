# Типографика прототипа — Magentum Desktop/Typography

Шрифт: **Lato** (все токены).

> ⚠️ **Lato с Google Fonts НЕ содержит кириллицу** (только latin/latin-ext) — кириллический текст падает в системный шрифт, а латиница/цифры остаются в Lato (визуальный рассинхрон). В прототипах подключать Lato из источника с кириллицей, напр. `https://fonts.cdnfonts.com/css/lato`, а не `fonts.googleapis.com`.

---

## Токены

| CSS-класс | Размер | Вес | Line-height | Letter-spacing | Case | Контекст |
|---|---|---|---|---|---|---|
| `.heading1` | 28px | 700 (Bold) | 36px | -0.5px | Sentence | Самый большой заголовок — имя контакта, анкета для записи на просмотр |
| `.heading2` | 22px | 700 (Bold) | 28px | -0.5px | Sentence | Вместо H1, заголовки в ленте, шторках и тулбарах |
| `.heading3` | 18px | 700 (Bold) | 24px | -0.5px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.heading4` | 16px | 700 (Bold) | 24px | -0.2px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.heading5` | 14px | 700 (Bold) | 20px | -0.2px | Sentence | Кнопки, баннеры, табы, подзаголовки |
| `.heading6` | 12px | 700 (Bold) | 16px | -0.2px | Sentence | Мелкие подзаголовки, метки |
| `.body1` | 16px | 400 (Regular) | 24px | 0 | Sentence | Текст в шторках, объявлениях, около чекбоксов, большие объёмы текста |
| `.body2` | 14px | 400 (Regular) | 20px | 0 | Sentence | Снекбар, сервисные баннеры, описания |
| `.caption` | 12px | 400 (Regular) | 16px | 0 | Sentence | Подписи под основным текстом чекбокса, дисклеймеры |
| `.overline` | 10px | 700 (Bold) | 16px | 1px | ALL CAPS | Особые подзаголовки |

---

## Размерная сетка (Unit)

Каждому токену соответствует Size Unit = кратное базовой единицы (4px):

| Токен | Unit | Итого |
|---|---|---|
| Heading1 | Unit×9 | 36px |
| Heading2 | Unit×7 | 28px |
| Heading3 | Unit×6 | 24px |
| Heading4 | Unit×6 | 24px |
| Heading5 | Unit×5 | 20px |
| Heading6 | Unit×4 | 16px |
| Body1 | Unit×6 | 24px |
| Body2 | Unit×5 | 20px |
| Caption | Unit×4 | 16px |
| Overline | Unit×4 | 16px |

---

## Правила применения

1. Все текстовые стили в прототипе должны использовать только токены из этой таблицы.
2. Инлайновые стили `font-size` / `line-height` / `font-weight` допустимы только если нет подходящего токена.
3. При добавлении нового текстового элемента — выбирать ближайший подходящий токен, а не произвольные значения.
4. `letter-spacing` обязателен для Heading1–6 и Overline; для остальных равен 0.
5. `text-transform: uppercase` применяется только к `.overline`.
6. Для всех текстовых стилей: `font-feature-settings: 'liga' off, 'clig' off` (лигатуры выключены, как в Figma-спеке) и `font-family: var(--font-base, 'Lato', sans-serif)` с фолбэком.

---

## Файлы

- CSS-токены: `shared.css` (секция `TYPOGRAPHY`)
- Эта документация: `prototype/components/typography.md`
