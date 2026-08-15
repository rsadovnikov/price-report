# Toast — транзиентное уведомление

> Это **вебовый** компонент. У приложения свой — `components/app/snackbar.css` +
> `snackbar.js` (`showSnackbarApp`), собранный по библиотеке iOS. Он не «тот же с
> другими отступами»: там тип задаёт и фон плашки, действие одно и оформлено ссылкой
> с разделителем, а стопки нет. Сравнение — в [surface-app.md](../surface-app.md).

Заменяет Snackbar: прод-страница `UI-Kit/Snackbar/Snackbar` помечена `@deprecated` —
«Используйте компонент Toast».

> **Сверено с продом 2026-08-12** — `@cian/ui-kit v7.84.0`, storybook `UI-Kit/Toast`
> (снято через служебный Chrome по CDP: тосты живут за хуком `useToast`, поэтому контракт
> снимался кликом по триггеру story-канваса). Регресс: `v-next/tests/smoke-toast.js`.

## Подключение

```html
<link rel="stylesheet" href="../../_design-system/components/toast.css">
<script src="../../_design-system/components/toast.js"></script>
```

Контейнер создаётся сам при первом вызове — в разметке ничего не нужно.

## API

```js
showToast('Текстовый контент тоста')
showToast.success('Отчёт сохранён')
showToast.error('Не удалось сохранить')
showToast.info('Идёт проверка')
showToast.loading('Формируем отчёт…')        // duration по умолчанию 0 — висит, пока не закроешь

showToast('Объект удалён из отслеживаемых', {
  type: 'success',                            // success | error | info | loading | base
  actions: [{ title: 'Восстановить', onClick: fn }],  // до двух
  size: 'm',                                  // s | m | l
  position: 'bottom-right',                   // top-center | top-right | bottom-center | bottom-right
  duration: 4000,                             // 0 — не скрывать автоматически
  closable: false,                            // крестик справа
})
```

Возвращает `{ close, el }`.

## Контракт

| Свойство | Значение |
|---|---|
| Фон | `--text-primary-default` (#0d162e) — прод берёт именно текстовый токен |
| Радиус | 8px (`--radius-l`) |
| Высота | min 52 / max 90; мобильный — min 44 / max 84, ширина 100% |
| Ширина | S — 100% (min 288, max 616) · **M — 368** · L — 616 |
| Текст | 16/24 400, `--text-inverted-default` |
| Иконка | 24×24, слева, отступ `12px 0 12px 12px` |
| Появление | `opacity` 0→1 + сдвиг 10px от своего края, 300ms |
| Контейнер | `position: fixed`, `z-index: 101`, `pointer-events: none` |
| Стопка | `gap: 8px`, отступ 24 от края экрана |

**Типы и иконки:**

| Тип | Глиф | Подложка |
|---|---|---|
| `success` | ✓ в круге, `--control-positive-primary-default` (#34ac0a) | белый круг |
| `error` | ! в круге, `--control-negative-primary-default` (#db1f36) | белый круг |
| `info` | нет иконки | — |
| `loading` | спиннер, `--icon-secondary-default` | — |
| `base` | нет иконки | — |

**Кнопки действия:** `8px 12px`, 16/24, цвет `--control-main-primary-default`.
При **двух** кнопках встают в колонку — в проде так же (`right-adornment` 141×93 при кнопках
140×47). В строку они распирают тост шире его размера.

## Находка: контраст кнопки действия

Прод красит действие в `#006cfd` прямо на тёмном `#0d162e` — это **3.90:1**, ниже порога
WCAG AA для обычного текста (4.5:1). Для сравнения: белый текст тоста даёт 17.93:1, а прежний
самодельный светло-синий снекбара (`#7EB3FF`) — 8.35:1.

Сделано **по проду** — источник истины кит. Но это кандидат отнести владельцам ДС:
нужен токен вроде `text-main-on-dark`. Пока не менять в одностороннем порядке, иначе разъедемся.

## Миграция со Snackbar

`showSnackbar()` остался тонким шимом и делегирует в `showToast()` — старые вызовы работают,
но новую разметку `.snackbar-item` больше никто не строит.

| Было | Стало |
|---|---|
| `showSnackbar('Готово')` | `showToast.success('Готово')` |
| `showSnackbar('Идём в форму', null, true)` | `showToast('Идём в форму')` |
| `showSnackbar('Удалено', {label, callback})` | `showToast.success('Удалено', { actions: [{ title, onClick }] })` |

**`report.html` мигрирован 2026-08-12:** собственная копия снекбара (реализация + CSS + контейнер)
удалена, все 10 вызовов переписаны на `showToast` напрямую. Регресс — `v-next/tests/smoke-report-toast.js`.

**Осталось:** `index.html` всё ещё зовёт `showSnackbar()` через шим.
