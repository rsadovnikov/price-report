# Segmented — сегмент-переключатель

Открытый переключатель из двух и более сегментов в ряд (бордеры смёрджены). Альтернатива дропдауну, когда вариантов мало и важна наглядность. Источник дизайна: Figma «Tab» (#Web, v2).

## Файлы

- Стили: `components/segmented.css`

## Подключение

```html
<link rel="stylesheet" href="../../_design-system/tokens.css">
<link rel="stylesheet" href="../../_design-system/base.css">
<link rel="stylesheet" href="../../_design-system/web.css">
<link rel="stylesheet" href="../../_design-system/components/segmented.css">
```

## Разметка

```html
<div class="segmented" id="archiveFilter" role="group" aria-label="Активные или архивные">
  <button class="segmented-item is-active" type="button" data-archived="0" aria-pressed="true">Активные</button>
  <button class="segmented-item" type="button" data-archived="1" aria-pressed="false">Архивные</button>
</div>
```

## Поведение

- `.is-active` — выбранный сегмент: светлый фон (`--surface-neutral-default`) + тёмный бордер (`#35415e`), рисуется поверх соседнего (z-index).
- Неактивные — белый фон, светлый бордер (`--stroke-control-default`).
- Соседние бордеры смёрджены (`margin-left: -1px`), крайние сегменты скруглены снаружи (4px).
- Переключение — JS: по клику снять `.is-active`/`aria-pressed` со всех, выставить на нажатом.

## JS-хуки

`id`/`data-*` на контейнере и сегментах. `.is-active` — только визуал, не селектор логики.

## Токены

- Текст: `--text-primary-default`; фон сегмента: `--background-primary`; бордер: `--stroke-control-default`.
- Активный фон: `--surface-neutral-default`. Активный бордер `#35415e` (Stroke/Selected) — точного токена в системе нет, задан hex по Figma.
