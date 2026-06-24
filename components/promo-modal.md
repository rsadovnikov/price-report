# PromoModal — модалка с каруселью

Модальное окно со встроенной каруселью для онбординга: слайды «картинка + заголовок + текст», навигация **Назад / Дальше**, точки-пагинация, круглая кнопка закрытия.

Источник дизайна: Figma `PromoModal_Desktop`.

## Файлы

- Стили: `components/promo-modal.css`
- Логика: `components/promo-modal.js` (`openPromoModal`)

## Подключение

```html
<link rel="stylesheet" href="../../_design-system/tokens.css">
<link rel="stylesheet" href="../../_design-system/components/buttons.css">
<link rel="stylesheet" href="../../_design-system/shared.css">
<link rel="stylesheet" href="../../_design-system/components/promo-modal.css">
<script src="../../_design-system/components/promo-modal.js"></script>
```

Требует `buttons.css` (кнопки `btn-secondary-md` / `btn-primary-md`) и `shared.css` (типографика `.heading1` / `.body1`).

## API

```js
var modal = openPromoModal({
  slides: [
    { image: 'photos/1.png', title: 'Заголовок', text: 'Объясняющий текст.' },
    { image: '',             title: 'Второй шаг', text: 'Пустой image → шахматка-плейсхолдер.' },
  ],
  finishLabel: 'Готово',   // лейбл «Дальше» на последнем слайде (по умолч. «Готово»)
  nextLabel:  'Дальше',
  prevLabel:  'Назад',
  onFinish: function () {},  // клик «Готово» (перед закрытием)
  onClose:  function () {},  // любое закрытие
});
// modal.close();
```

`slides` обязателен (≥1). Каждый слайд: `{ image, title, text }`. Пустой `image` → плейсхолдер-шахматка.

## Поведение

- **Назад** задизейблен на первом слайде (виден, лейаут стабилен).
- **Дальше** на последнем слайде → лейбл `finishLabel`; клик вызывает `onFinish` и закрывает.
- **Точки**: ≤5 слайдов — равные (активная тёмная); >5 — окно из 7 вокруг активной, края сжимаются 8→6→4 (iOS-style).
- **Закрытие**: крестик, клик по затемнению (вне карточки), Esc. На время показа блокируется скролл `body`.

## Размеры (по Figma)

- Карточка 640px, скругление 16px, тень `0 8px 16px rgba(0,0,0,0.08)`.
- Картинка слайда 640×340 (`object-fit: cover`).
- Текст: padding `16/32/4`, gap 12. Футер: padding `20/32/32`.
- Кнопка закрытия: круг 28px в углу `12/12`, тень `0 4px 8px rgba(0,0,0,0.08)`, крест 12px.

## JS-хуки

Внутренние действия — через `data-action` (`prev` / `next` / `close`), не через CSS-классы.
