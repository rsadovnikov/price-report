---
paths: "**/*.html, **/*.css, **/*.js"
---

# Прототип — протокол работы

Ты создаёшь или дорабатываешь HTML-прототип в стеке vanilla HTML + CSS + JS.
Следуй трём фазам по порядку. Не пропускай фазу 1.

---

## Фаза 1 — Прочитай перед кодом

Перед написанием любого кода прочитай:

1. `_design-system/kit.html` — полный список готовых компонентов
2. `spec.md` текущего прототипа — состояния, механики, структура файлов
3. `.claude/rules/design-system.md` — правила подключения

Если файлов нет — спроси, где они, прежде чем начинать.

---

## Фаза 2 — Анализ (до кода)

Коротко ответь на вопросы, потом приступай:

- **Задача:** что пользователь делает на этом экране? Какое основное действие?
- **Ключевой момент:** какое одно состояние или переход самый важный?
- **Компоненты:** что из kit.html уже подходит? Что придётся создавать новое?
- **Состояния:** какие нужны (empty, filled, disabled, error)?
- **Данные:** что динамическое через JS, что хардкодится?

---

## Фаза 3 — Реализация

### Подключение дизайн-системы

Порядок важен:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../_design-system/tokens.css">
<link rel="stylesheet" href="../../_design-system/components/buttons.css">
<link rel="stylesheet" href="../../_design-system/components/links.css">
<link rel="stylesheet" href="../../_design-system/components/chips.css">
<link rel="stylesheet" href="../../_design-system/components/inputs.css">
<link rel="stylesheet" href="../../_design-system/base.css">
<link rel="stylesheet" href="../../_design-system/web.css">
```

```js
renderHeader('../../_design-system/');
renderSidebar({ active: '...' });
```

Путь `../../_design-system/` — относительно файла прототипа. Корректируй при другой глубине.

---

### Токены — только через переменные

Использовать семантические токены. Legacy-алиасы допустимы для обратной совместимости.

**Текст**
| Токен | Применение |
|---|---|
| `--text-primary-default` (= `--text-primary`) | Основной текст |
| `--text-secondary-default` (= `--text-secondary`) | Вторичный текст |
| `--text-main-default` (= `--text-main`) | Ссылки, акцент |
| `--text-negative-default` | Ошибки |
| `--text-positive-default` | Успех |
| `--text-warning-default` | Предупреждения |
| `--text-inverted-default` | Текст на тёмном фоне |

**Контролы** (у каждого `-default`, `-hovered`, `-pressed`, `-disabled`)
| Токен | Применение |
|---|---|
| `--control-main-primary-*` (= `--control-primary`) | Кнопки CTA |
| `--control-main-secondary-*` (= `--control-secondary`) | Вторичные кнопки |
| `--control-negative-primary-*` | Деструктивные действия |
| `--control-positive-primary-*` | Подтверждающие действия |

**Фон и поверхности**
| Токен | Применение |
|---|---|
| `--background-primary` | Белый фон страницы |
| `--background-secondary` | Серый фон блоков |
| `--surface-main-*` | Голубые подложки |
| `--surface-neutral-*` | Серые подложки |
| `--surface-negative-*` | Красные подложки |
| `--surface-positive-*` | Зелёные подложки |

**Разделители и обводки**
| Токен | Применение |
|---|---|
| `--stroke-divider-neutral` | Лёгкий разделитель |
| `--stroke-divider-default` | Стандартный разделитель |
| `--stroke-control-default` | Обводка контролов |
| `--stroke-control-focused` | Фокус |
| `--stroke-border-default` | Граница блока |

**Иконки** (у каждого `-default`, `-hovered`, `-pressed`, `-disabled`)
`--icon-primary-*`, `--icon-secondary-*`, `--icon-main-*`, `--icon-negative-*`, `--icon-positive-*`, `--icon-inverted-*`

**Акценты**
`--accent-main-primary` (= `--negative` нет, используй `--accent-negative-primary`), `--accent-positive-primary`

**Оверлеи и тени**
`--overlay-default`, `--overlay-popover`, `--shadow-default`

**Отступы:** `--unit0-5` (2px) … `--unit15` (60px). Шаг 4px.
**Скругления:** `--radius-s` (2px), `--radius-m` (4px), `--radius-l` (8px), `--radius-xl` (12px), `--radius-xxl` (16px), `--radius-full` (99px)

Не хардкодить цвета. При необходимости использовать примитивы (`--solid-blue600`) — не hex напрямую.

---

### Кнопки

Схема: `btn-{variant}-{size}`. Проверить по маппингу прежде чем создавать что-то новое:

| Класс | Когда использовать |
|---|---|
| `btn-primary-lg/md/sm` | Главное CTA (создать PDF, выбрать конкурентов) |
| `btn-secondary-lg/md/sm` | Вторичное действие (показать больше, отчёт о цене) |
| `btn-outline-lg/md/sm` | Нейтральные действия (обновить даты, настроить) |
| `btn-outline-sm.style-secondary` | Серые чипы-фильтры |
| `btn-ghost-lg/sm` | Третичное (сохранить и выйти, отмена) |
| `btn-icon` | Только иконка, 28×28 px |

Не создавать классы по контексту: `.btn-report`, `.btn-create-pdf`, `.btn-save`.

---

### Типографика

Все токены и правила: `_design-system/components/typography.md`

Шрифт: только **Lato**. Инлайновые `font-size`/`line-height` допустимы только если ни один токен не подходит.

---

### Action links

Из `links.css`. Цвет `#005EDE`, hover — `text-decoration: underline`, шрифт Bold 700.

| Класс | Размер | Иконка |
|---|---|---|
| `.add-comment` | 14px / 20px | Edit 16×16 |
| `.map-link` | 14px / 20px | SVG карты |
| `.reset-filters` | 14px / 20px | — |
| `.listing-send-link` | 14px / 20px | — |
| `.action-link-icon` | icon only | 28×28 px |

Gap между иконкой и текстом: 8px.

---

### JS-хуки

- Для JS-логики: `id` или `data-action`
- Для визуала: CSS-классы
- Не использовать CSS-классы как JS-селекторы

```html
<!-- Правильно -->
<button class="btn-primary-sm" data-action="add-comment">Добавить</button>

<!-- Неправильно -->
<button class="btn-primary-sm add-comment-btn">Добавить</button>
```

---

### Анимации

Только там, где несёт смысл — появление, исчезновение, feedback:

- `opacity + transform`, 150–200ms ease
- `animation-delay` для staggered reveals если есть список
- Никаких декоративных анимаций без функционального смысла

---

### Ассеты

Всегда указывать явный путь:

```html
<!-- Дизайн-система -->
<img src="../../_design-system/assets/logo.svg">

<!-- Локальные фото прототипа -->
<img src="photos/1.png">

<!-- SVG-иконки из MO/ -->
<img src="MO/positive-changes.svg">
```

Путь указывать в промпте явно — иначе Claude генерирует ассеты программно или пропускает.

---

## Стоп-лист

- Хардкодить цвета из палитры токенов
- Создавать кнопки с контекстными именами классов
- Использовать CSS-классы как JS-хуки
- Менять шрифт с Lato
- Создавать новые CSS-переменные, если подходящий токен уже есть
- Подключать фреймворки или библиотеки (только vanilla JS)
- Писать код до завершения фазы 2
