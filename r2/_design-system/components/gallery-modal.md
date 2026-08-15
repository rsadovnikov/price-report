# Gallery Modal (фото-галерея / лайтбокс)

Полноэкранный просмотр фотографий объекта. Тёмный оверлей на весь экран, шапка с заголовком и крестиком, крупное фото по центру, стрелки ‹ ›, счётчик N/M, лента миниатюр снизу, бейдж «Главное фото» на обложечном кадре. Источник дизайна — фото-модалка ЛК CIAN.

Родственник `PromoModal` (тот же движок карусели: flex-трек + `translateX(-index*100%)`) и `Drawer` (общий каркас overlay / Esc / backdrop-close / scroll-lock).

## Файлы

- `components/gallery-modal.css` — стили (`.gallery-overlay`, `.gallery`, `.gallery__header/__stage/__viewport/__track/__slide/__img`, `.gallery__nav`, `.gallery__counter`, `.gallery__thumbs`, `.gallery__cover-badge`).
- `components/gallery-modal.js` — сборка DOM и управление (`openGallery`).

## Подключение

```html
<link rel="stylesheet" href="../../_design-system/components/gallery-modal.css">
<script src="../../_design-system/components/gallery-modal.js"></script>
```

Подключать после `tokens.css`, `base.css` и `web.css`.

## API

```js
openGallery({
  photos:     ['url', ...],   // обязателен, ≥1 фото
  index:      0,              // стартовый слайд
  title:      '',             // заголовок в шапке (слева)
  coverIndex: 0,              // слайд с бейджем «Главное фото» (null — не показывать)
  coverLabel: 'Главное фото',
  ariaLabel:  'Фотографии',
  onClose:    function () {}
}); // -> { close }
```

- **Навигация:** стрелки ‹ ›, клавиши ←/→, клик по миниатюре. Листание зациклено.
- **Закрытие:** крестик, клик по тёмному фону вне фото, `Esc`.
- При `photos.length <= 1` стрелки, счётчик и лента миниатюр скрываются.
- На время показа `body` получает `overflow: hidden`. `z-index` overlay — `1100`.
- Фон — `--overlay-popover` (`#000000cc`, 80% чёрного — самый тёмный токен).

## Триггер (пример из МО)

Клик по миниатюре фото (`data-action="open-gallery"`) открывает галерею с фотографиями объекта; аффорданс наведения — системный курсор `zoom-in` (лупа), без оверлея. См. `report-price-and-competitors/v-next/index.html` и `report.html`.
