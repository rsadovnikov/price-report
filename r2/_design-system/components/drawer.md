# Drawer (шторка)

Правая выезжающая панель в формате модального окна. Формат: затемняющий overlay на всю область + панель, прижатая к правому краю и выезжающая по X. Родственник `PromoModal` (та же логика overlay / Esc / блокировки скролла), но панель не по центру, а сбоку и на всю высоту.

## Файлы

- `components/drawer.css` — стили (`.drawer-overlay`, `.drawer`, `.drawer__body`, `.drawer__close`).
- `components/drawer.js` — сборка DOM и управление (`openDrawer`).

## Подключение

```html
<link rel="stylesheet" href="../../_design-system/components/drawer.css">
<script src="../../_design-system/components/drawer.js"></script>
```

Подключать после `tokens.css`, `base.css` и `web.css`.

## API

```js
openDrawer({
  content:   HTMLElement | string,  // содержимое панели (по умолчанию пусто)
  width:     '720px',               // ширина панели (по умолчанию из CSS)
  ariaLabel: 'Объявление',          // метка диалога для скринридера
  onClose:   function () {}         // вызывается при любом закрытии
}); // -> { close, el }
```

- Возвращает `{ close, el }`: `close()` — программное закрытие, `el` — DOM-узел панели.
- **Закрытие:** крестик, клик по затемнению, `Esc`.
- На время показа `body` получает `overflow: hidden` (скролл фона заблокирован).
- `z-index` overlay — `1100` (как у `PromoModal`).

## Состояние

MVP: панель пустая (только chrome — крестик закрытия). Наполнение (карусель фото, цена, описание, кнопки действий) добавляется через `config.content` на следующем этапе.
