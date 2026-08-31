---
paths: "**/*.html, **/*.js, **/*.css"
---

# Дизайн-система — подключение

Единая библиотека: `_design-system/`

Расхождения с прод-китом ЦИАН (`@cian/ui-kit`) и порядок их правки: [prod-parity.md](prod-parity.md).
Сверять по нему перед тем, как менять компонент «на глаз».

## Устройство

```
tokens.css              палитра, отступы, радиусы + роли типографики (значения вебовые)
tokens/surface-app.css  поверхность приложения: SF Pro и своя шкала. Переопределяет ТОЛЬКО --type-*
base.css                общее для обеих поверхностей: reset, применение ролей, .icon, метро
web.css                 только веб: шапка, лейаут, сайдбар
fonts.css + fonts/      Lato. У приложения файла нет — SF Pro системная
components/             веб: кнопки, инпуты, чипы, шторка, выпадайка, тосты…
components/app/         приложение: кнопки, бейдж, чипсы, навбар, табы, сниппет,
                        шторка снизу, снекбар
assets/icons/           иконки, экспорт из Figma, общие для поверхностей
kit.html / kit-app.html витрины веба и приложения
```

**Что общее, что разное.** Общие — палитра, отступы, радиусы, иконки и *имена* ролей
типографики. Разные — *значения* ролей, шрифт и компоненты. Поверхность подключается
одной строкой и не трогает ничего, кроме типографики.

## Подключение в прототипе

Порядок важен: токены → поверхность → база → надстройка → компоненты.

**Веб:**

```html
<link rel="stylesheet" href="../../_design-system/fonts.css">
<link rel="stylesheet" href="../../_design-system/tokens.css">
<link rel="stylesheet" href="../../_design-system/base.css">
<link rel="stylesheet" href="../../_design-system/web.css">
<link rel="stylesheet" href="../../_design-system/components/buttons.css">
<script src="../../_design-system/components/header.js"></script>
```

```js
renderHeader('../../_design-system/');
```

**Приложение:** шрифт файлом не нужен (SF Pro системная), `web.css` не подключаем —
шапки и сайдбара на этой поверхности нет.

```html
<link rel="stylesheet" href="../../_design-system/tokens.css">
<link rel="stylesheet" href="../../_design-system/tokens/surface-app.css">
<link rel="stylesheet" href="../../_design-system/base.css">
<link rel="stylesheet" href="../../_design-system/components/app/buttons.css">
```

Про поверхность приложения целиком — [surface-app.md](surface-app.md).

## Кнопки

Сетка: `btn-{variant}-{size}`
- variant: `primary` | `secondary` | `outline` | `ghost`
- size: `lg` | `md` | `sm`
- Иконочные: `btn-icon` (28×28)

Перед созданием новой кнопки — убедись, что существующий вариант не подходит. Не создавай классы по контексту (`.btn-report`, `.btn-create-pdf`).

## JS-хуки

`id` или `data-action` — не CSS-классы. CSS-классы только для визуала.

## Ассеты

Всегда указывай явную директорию в промпте. Иначе инструмент генерирует ассеты программно или пропускает их.
