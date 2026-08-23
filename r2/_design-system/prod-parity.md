# Сверка дизайн-системы прототипа с прод-китом

Что расходится между нашей `_design-system/` и прод-компонентами ЦИАН, и что с этим решили.

**Источник:** storybook `@cian/ui-kit v7.84.0` (`ui-kit-storybook.micro.ycloud.cian.tech`), снят
через служебный Chrome по CDP 2026-08-12. Обе стороны замерены computed-стилями, не на глаз:
прод — со story-канвасов (`iframe.html?viewMode=story&id=…`), наш — headless-замером `kit.html`.

> **Источник истины — кит, а не текущая страница ЛК** (решение Романа, 2026-08-12): в проде
> обновлены не все компоненты, поэтому живой ЛК местами отстаёт от кита. Прототип пересобираем
> на новых компонентах, а не консервируем старый прод-вид. Это меняет прежнее правило
> «прод важнее DS-привычки» — оно остаётся для **раскладки страницы**, но не для метрик компонента.

**Как читать статусы:** ✅ починено · 🔴 чинить · 🟡 чинить, когда дойдут руки · ⚪ принято как есть.

---

## Как ходим в витрину

Кит закрыт, обычные инструменты туда не ходят — только через служебный Chrome по CDP
(предусловие и запуск — в корневом `CLAUDE.md`). Инструмент: [tools/cdp-eval.mjs](tools/cdp-eval.mjs).

```bash
# свою вкладку не занимаем — открываем новую
curl -s -X PUT "http://localhost:9222/json/new?<url>"
node tools/cdp-eval.mjs storybook <файл-с-выражением> --nav "<url>"
```

**Три адреса.** `/index.json` — все 451 запись, отсюда story id. `?path=/docs/<id>` — таблица
пропов, но рендерится **внутри `#storybook-preview-iframe`**, доставать через `contentDocument`.
`iframe.html?viewMode=story&id=<id>` — канвас в верхнем документе, для замера надёжнее.

**Пять граблей, каждая уже дала неверный вывод:**

1. **Интерактивные состояния замером не снимаются.** `dispatchEvent` не поднимает `:hover`,
   `.focus()` не даёт `:focus-visible`. Читать правила из `document.styleSheets` — там же видны
   имена токенов, которых в вычисленном значении уже нет. Подробно —
   в [measure-production.md](../../../.claude/skills/cian-layout/references/measure-production.md).
2. **Нет пропа у компонента — смотреть его атом.** `indeterminate` не у `Checkbox`, а у
   `CheckToggle`, из которого кит собирает чекбоксы, ячейки и чипсы.
3. **Foundation важнее рендера компонента.** Если компонент расходится со своей же страницей
   `Typography` / `Tokens` — ведём по foundation и пишем находку сюда (случай `letter-spacing`).
4. **`args=…` в URL молча не применяется**, если story хардкодит пропы, — отдаёт дефолт, и это
   читается как «такого состояния в проде нет». Проверять, что аргумент реально доехал.
5. **При сверке токенов нормализовать цвет** (прод пишет `rgba()`, мы 8-значный hex) и не считать
   расхождением `DeprecatedPalette` — это 100 из 117 «пробелов».

---

## Сводка

Колонка **story id** — чтобы не искать компонент в витрине заново. Открывается как
`…/?path=/docs/<id>` (страница с пропами) или `…/iframe.html?viewMode=story&id=<id>` (канвас).

| Компонент | Прод-аналог | story id | Статус |
|---|---|---|---|
| `typography.md` / `base.css` | `UI-Kit/Typography` | `ui-kit-typography--docs` | ✅ совпало 10 из 10 (2026-08-13) |
| `tokens.css` — размерная единица | `Tokens/SizeUnits` | `ui-kit-tokens-sizeunits--docs` | ✅ совпала, кроме хвоста шкалы |
| `tokens.css` — цвета | `Tokens/ColorsPalette` | `ui-kit-tokens-colorspalette--semantic-palette` | ✅ 371 общее имя, 0 расхождений (2026-08-13) |
| `buttons.css` | `Button/Button` | `ui-kit-button-button--docs` | ✅ приведён 2026-08-12 |
| `checkbox.css` | `Checkbox/Checkbox` + `CheckToggle` | `ui-kit-checkbox-checkbox--docs` · `ui-kit-checkbox-checktoggle--docs` | ✅ приведён 2026-08-12, `indeterminate` добавлен 2026-08-13 |
| `radio.css` | `Radio/Radio` | `ui-kit-radio-radio--docs` | ✅ заведён 2026-08-13 |
| `badges.css` — `.label` | `Label/Label` | `ui-kit-label-label--docs` | ✅ заведён 2026-08-13 |
| `badges.css` — `.counter` | `Counter/Counter` | `ui-kit-counter-counter--docs` | ✅ заведён 2026-08-13 |
| `spinner.css` / `spinner.js` | `Loader/Spinner` | `ui-kit-loader-spinner--docs` | ✅ заведён 2026-08-13 |
| `tabs.css` | `Tabs/Tabs` | `ui-kit-tabs-tabs--docs` | ✅ приведён 2026-08-12 (кроме анимации индикатора) |
| `chips.css` | `Chips/Chips` | `ui-kit-chips-chips--docs` | ✅ цвета и состояния 2026-08-12; геометрия оставлена нашей |
| `inputs.css` | `Input/Input` | `ui-kit-input-input--docs` | ✅ заведён `.input`; `.filter-select` — на токенах |
| `inputs.css` — textarea | `Input/Textarea` | `ui-kit-input-textarea--docs` | ✅ заведён `.textarea` + `textarea.js` (2026-08-13) |
| `inputs.css` — select | `Select/Select` | `ui-kit-select-select--docs` | ✅ заведён `.select` 2026-08-13 |
| `links.css` | `Link/Link` + `ActionLink` | `ui-kit-link-link--docs` · `ui-kit-link-actionlink--docs` | ✅ на токенах, состояния добавлены; тем по-прежнему одна |
| `snackbar.css` | `Snackbar` — **deprecated** | `ui-kit-snackbar-snackbar--docs` | ✅ вытеснен `toast.css` / `toast.js`; в прототипе не подключён, шим остался только в ките |
| `toast.css` / `toast.js` | `Toast/Методы API тоста` | `ui-kit-toast-методы-api-тоста--docs` | ✅ заведён 2026-08-12 |
| `promo-modal.*` | `Modals/PromoModal` | `ui-kit-modals-promomodal--docs` | ⬜ не сверялся |
| `segmented.*` | кандидаты: `Radio/RadioButtonGroup`, `Checkbox/CheckboxButtonGroup` | `ui-kit-radio-radiobuttongroup--docs` | ⬜ гипотеза не проверена |
| `drawer.*` | в ките нет (проверено по `/index.json`) | — | ближайшее `Modals/ModalWindow` |
| `gallery-modal.*` | в ките нет | — | собран по скриншотам ЛК |
| `header.js` / `sidebar.js` | нет | — | обвязка страницы, не ui-kit |

**Локальные компоненты прототипа, у которых прод-аналог есть, а в нашей ДС их нет:**

| Наше | Прод | story id |
|---|---|---|
| онбординг-тултип | `Tooltips/OnboardingTooltip` | `ui-kit-tooltips-onboardingtooltip--docs` |
| `.price-tooltip-*` | `Tooltips/Tooltip` | `ui-kit-tooltips-tooltip--docs` |

Закрыто 2026-08-13: `.comment-textarea` → `.textarea` · `.radio-input` → `.radio` ·
`.badge-update` / `.badge-removed` / `.ncb-pill` → `.label` · `.comp-update-badge` → `.counter` ·
`.report-loader__spinner` → `.spinner` · `.filter-select` и `.search-input` в ЛК → `.select` и `.input`.

⚠️ **`.filter-select` в `inputs.css` остался без потребителей** — прототип целиком переехал
на `.select`, и `smoke-lk-ds` это фиксирует. Не удаляю: это задокументированный DS-компонент,
но при следующей уборке решить, нужен ли он вообще.

Замер 24.08 добавил к этому третий довод: **демо в ките показывает не компонент.** В `kit.html`
лежит локальная копия `.filter-select` в инлайновом `<style>` — она идёт после `<link>` и
побеждает. Рендерит 34px с `padding-right: 28px` и шевроном фоновой картинкой `#697797`;
у компонента `padding: 6px 12px` и шеврон отдельным `.icon`. Внутри копии живут хардкоды
`#B1BAD2` и `rgba(4,104,255,0.2)` — ровно те, что 12.08 перевели на токены. Плюс демо
собрано на `<div>` с классами `.open` / `.filled` / `.disabled`, а у компонента API
атрибутный (`[aria-expanded]`, `:disabled`). То есть чинить пришлось бы и стиль, и разметку —
у компонента, которым никто не пользуется.

**Не компоненты, хотя назывались похоже** — проверено 2026-08-13, переносить нечего:
`.results-counter` — строка текста «Найдено N объектов», а не `Counter`;
`.tab-counter` — число рядом с ярлыком вкладки, часть прод-`Tabs` и уже сверено там.

✅ **`.accordion-*` — мёртвый код, удалён 2026-08-13** (50 строк из `v-next/report.css`).
Разметка его не использовала ни в HTML, ни в JS. Прод-аналог `UI-Kit/Accordion` есть —
заводить под задачу, а не воскрешать удалённое.

---

## Типографика ✅ — совпала 10 из 10

Сверено 2026-08-13 со страницей `UI-Kit/Typography` (кит успел обновиться до **v7.84.2**).

| Стиль | Прод | Наш |
|---|---|---|
| Heading1 | 28/36 bold, ls −0.5 | ✔ |
| Heading2 | 22/28 bold, ls −0.5 | ✔ |
| Heading3 | 18/24 bold, ls −0.5 | ✔ |
| Heading4 | 16/24 bold, ls −0.2 | ✔ |
| Heading5 | 14/20 bold, ls −0.2 | ✔ |
| Heading6 | 12/16 bold, ls −0.2 | ✔ |
| Body1 / Body2 / Caption | 16/24 · 14/20 · 12/16, regular, ls normal | ✔ |
| Overline | 10/16 bold, ls **1px** | ✔ |
| `ArticleHeading0` | 38/46 bold, ls normal | ❌ нет у нас — статейный стиль, в интерфейсе не нужен |

### 🔑 Это закрыло вопрос про letter-spacing у кнопок — в обратную сторону

12 августа я снял `letter-spacing: -0.2px` с кнопок, потому что прод-Button рендерит лейбл
с `normal`. Страница Typography **того же кита** объявляет Heading4/5 с `ls −0.2`, и Figma
говорит то же. Значит, Button просто не применяет к своему лейблу текстовый стиль кита —
это дефект прода, а не намерение. **`letter-spacing` возвращён** (13 августа).

Правило на будущее: **шкала важнее рендера отдельного компонента.** Если компонент кита
расходится с его же foundation-страницей, ведём по foundation и пишем находку сюда.

---

## Цветовые токены ✅ — 371 общее имя, ноль расхождений

Сверено 2026-08-13. Метод: дамп **всех** CSS-переменных с корня прод-превью
(`getComputedStyle` по story-канвасу, 488 штук) против такого же дампа с нашего `kit.html`
(446). Сравнение по нормализованному цвету, а не по строке — прод пишет `rgba()`, мы
8-значным hex, это одно и то же.

| | |
|---|---|
| Общих имён | **371** |
| Значения разошлись | **0** |
| Есть у прода, нет у нас | 117 |
| Есть у нас, нет у прода | 75 |

**Ни один общий токен не разошёлся** — семантический слой (`--control-*`, `--text-*`,
`--surface-*`, `--stroke-*`, `--icon-*`, `--accent-*`) и примитивы (`--solid-*`,
`--transparent-*`) совпадают с продом один в один.

### Чего нет у нас — почти всё устаревшее

Из 117 прод-имён **100 — это `DeprecatedPalette`** (стори `Tokens/ColorsPalette/Deprecated
Colors`, прямая пометка «устаревшая палитра, не рекомендуем использовать»): `black_10`,
`superblack_*`, `primary_100`, `fill_*_hover_*`, `success_*`, `error_*`, `purple_label_*`
и ветки метро под старыми именами (`arbatskaya_100`, `filevskaya_100`, …). Заводить не нужно.

Реальных пробелов — **17**, все декоративные:

- `--brand-*` (13) — градиенты вертикалей: b2b, commercial, mortgage, owner, public,
  плюс `--brand-cornflowerblue` / `--brand-royalblue` под прод-именами
- `--cian-logo`, `--cian-logo-inverted`
- `--skeleton-primary` — градиент скелетона
- `--decorative-deeporange-vas`

### Чего нет у прода — наши соглашения

Из 75: **36 — цвета веток метро** (`--msk-*`, `--spb-*`, `--nn-*`, `--nsk-*`, `--ekb-*`,
`--kzn-*`, `--smr-*`). В актуальной прод-палитре их нет вовсе — метро живёт только в
устаревшей. То есть наша схема именования метро **не с чем сверять**, это наше решение.

Остальное — `--radius-*` (у прода радиусы через `--unit_*`), `--unit*` в нашей записи без
подчёркивания, `--font-base` и семь легаси-алиасов (`--control-primary`, `--text-primary`,
`--negative`, …), заведённых для обратной совместимости.

---

## Размерная единица ✅ — почти совпала

Сверено со страницей `Tokens/SizeUnits`. База 4px, шкала `--unit_N`. Значения 2 → 48 совпали.

| | Прод | Наш |
|---|---|---|
| 2px | `--unit_0` | `--unit0-5` — другое имя, то же значение |
| 4 … 48 | `--unit_1` … `--unit_12` | ✔ один в один |
| 56px | `--unit_13` | ❌ нет |
| 60px | — | `--unit15` — **нашего изобретения**, в проде такого нет |

Прод-шкала в хвосте не строго кратна индексу (`--unit_13` = 56, а не 52). При заведении
новых значений сверяться с продом, а не считать `N × 4`.

---

## Button ✅

Сверен и приведён к проду 2026-08-12 — детали в [components/buttons.md](components/buttons.md),
лог в [v-next/CHANGELOG.md](../report-price-and-competitors/v-next/CHANGELOG.md).

---

## Checkbox

**Совпало:** 20×20, radius 4, gap 8, checked `#006cfd`, invalid в обоих состояниях
(`#e41f36` рамка / `#db1f36` заливка), disabled+checked с серой галкой `#b1bad2`, лейбл 14/20 Lato 400.

| # | Расхождение | Прод | Наш |
|---|---|---|---|
| ✅ | Толщина рамки | `2px` | `2px` — приведено 12.08, замерено рендером 24.08 |
| ✅ | Рамка disabled | `--stroke-control-default` #d0d8e9 (`!important`) | тот же токен — приведено 12.08 |
| ✅ | `:active` | unchecked → `--surface-inverted-pressed` + `--stroke-control-pressed`; checked → `--control-main-primary-pressed` | оба заведены 12.08 (плюс `indeterminate`) |
| ✅ | Hover | есть у checked (`--control-main-primary-hovered`) и invalid (`--control-negative-primary-hovered`) | заведены оба 12.08 |
| ✅ | `focus-visible` | `outline-offset: 2px` | `2px` — приведено 12.08 |
| ⚪ | Выравнивание | `align-items: flex-start`, центрирование — модификатор `.checkbox-center` | всегда `center` |
| ✅ | `indeterminate` | проп атома `CheckToggle` | добавлен 2026-08-13 |

### `indeterminate` ✅ — контракт снят с `CheckToggle`, а не с `Checkbox`

У самого `UI-Kit/Checkbox/Checkbox` **такого пропа нет** — таблица пропов кита его не содержит
(`checked`, `defaultChecked`, `invalid`, `disabled`, `inProgress`, `icon`, `description`, `error`,
`underline`, …). Промежуточное состояние живёт в атоме `UI-Kit/Checkbox/CheckToggle`
(«Не существует в интерфейсе самостоятельно. Используем атом для создания Checkbox и селектов
с кастомным контентом»), проп `indeterminate` — «Промежуточное состояние (минус)».
Замер со story `CheckToggle → Состояния` (2026-08-13):

| Состояние | Заливка / рамка | Глиф |
|---|---|---|
| `indeterminate` | `#006cfd` = `--control-main-primary-default` | белый минус, viewBox 12×12, `M1 5h10v2H1z` |
| + `invalid` | `#db1f36` = `--control-negative-primary-default` | белый минус |
| + `disabled` | `#e1e6f4` = `--surface-inverted-disabled` | `#b1bad2` минус |

Ставится только из JS (`el.indeterminate = true`) — у нативного input это IDL-свойство,
HTML-атрибута нет. В CSS блок идёт **после** `:checked`: специфичность равная, а состояния
у input независимы, поэтому минус должен побеждать галку. Заодно у hover/active «пустого»
бокса добавлен `:not(:indeterminate)` — иначе промежуточный (он же unchecked) терял синюю рамку.

**Правило поиска на будущее:** если пропа нет у компонента — смотреть его атом. Кит собирает
`Checkbox`, `CheckboxCell`, `CheckboxChipButton` и селекты из одного `CheckToggle`.

**Архитектура — не дефект.** Прод прячет нативный `input` (`opacity:0`, 0×0) и рисует
`span[role="checkbox"]` с SVG. У нас нативный `input` с `appearance:none` и глифом фоном.
Прод так сделан ради своего SVG; наш путь проще и доступен нативно. Не меняем.

**Не заведено:** слоты `description`, `icon`, `error`, проп `inProgress`.

---

## Tabs

Прод — две размерные ветки, обе **bold**:

| Size | Padding | Height | Текст |
|---|---|---|---|
| `small` | `4px 0` | 28px | 14/20 700 |
| `medium` | `8px 0` | 38px | 16/22 700 |

Ряд: `column-gap: 24px`, `.tabs--divider` → `border-bottom: 1px --stroke-divider-default`.
Индикатор активного — **`::after` на ряду** (2px, `--control-main-primary-default`, `bottom:-1px`),
ездит по CSS-переменным `--indicator-offset` / `--indicator-width` → анимация перехода.

| # | Расхождение | Прод | Наш |
|---|---|---|---|
| ✅ | Высота таба | 28 / 38 | `.tab` **38** (padding 8/0, 16/22), `.tab-s` **28** (4/0, 14/20) — приведено 12.08, замерено 24.08 |
| 🟡 | Индикатор | `::after` на ряду, **ездит** по `--indicator-offset` / `--indicator-width` | механизм тот же (`::after`, `bottom: -1px`) с 12.08, но **статичный**: переменных нет, при переключении вкладки подчёркивание перескакивает. Открыт только ход, не устройство |
| ✅ | Hover | серая подложка-подчёркивание `--surface-neutral-hovered`, цвет текста не меняется | то же — приведено 12.08, хардкода `#17203A` в файле нет |
| ✅ | Disabled | `pointer-events:none`, текст `--text-primary-disabled` | заведён 12.08, вместе с `focus-visible` |
| ⚪ | Размерная сетка | `small` / `medium` | один размер |

Совпало: gap ряда 24, gap иконка↔текст 8, цвет активного `--text-main-default`, счётчик в активном
табе перекрашивается в `--text-main-default`.

---

## Chips

Прод `chip-button` (medium): height **44**, padding `10px 16px`, radius **8**, border 1px, текст 14/20.

| Состояние | Border | Background |
|---|---|---|
| Default | `#d0d8e9` | white |
| Checked | `#3686ff` | `#e6f0ff` |
| Disabled | `#d0d8e9` | white |
| Checked + disabled | `#d0d8e9` | `#e1e6f4` |
| Invalid | `#c2122d` | white |
| Invalid + checked | `#c2122d` | `#ffe9eb` |

У нас **два** варианта, и ни один не совпадает целиком:

| | height | radius | active border | active bg |
|---|---|---|---|---|
| прод | 44 | 8 | `#3686ff` | `#e6f0ff` |
| `.chip` | 34 | 8 | `#006cfd` | white |
| `.chip-s` | 38 | 4 | `#3686ff` ✔ | `#e6f0ff` ✔ |

То есть `.chip-s` попал в прод-цвета, но не в радиус; `.chip` — наоборот. 🟡

⚠️ **Маппинг под вопросом.** Прод `Chips` — это группа радио/чекбокс-чипсов (`chip-button`),
а наши `.chip` / `.chip-s` работают как фильтр-чипы. Возможно, правильный прод-аналог —
`UI-Kit/Tags/Tags`. **Перед правкой сверить с `Tags`**, иначе подгоним под чужой компонент.

---

## Input

Прод `Input` — обёртка `input-wrapper` с рамкой, внутри голый `input`:

| Size | Height | Radius | Border | Текст | Внутр. отступ |
|---|---|---|---|---|---|
| XS (десктоп) | 36 | 8 | 1px `--stroke-control-default` | 14/20 | `0 8px` |
| M (мобильный) | 44 | 8 | 1px | 16/22 | `0 12px` |

Invalid → рамка `--stroke-border-negative`; disabled → рамка и заливка `#e1e6f4`;
фокус — `box-shadow: 0 0 0 1px var(--stroke-control-focused)`. Есть адорнменты (34×36), `loading`.

✅ **Заведён 12.08, замерено рендером 24.08:** `.input` 36 / `.input-m` 44, radius 8,
рамка 1px `--stroke-control-default`, поле 14/20, слот `.input__adornment` (демо в ките с 22.08).

Прежняя запись «у нас текстового инпута нет вообще, `inputs.css` содержит только
`.filter-select`» устарела дважды: инпут заведён, а `.filter-select` остался **без единого
потребителя** — прототип целиком на `.select`, и `smoke-lk-ds` это фиксирует. Решить,
удалять ли его: в ките он живёт демо на `<div>` с локальной копией стилей.

---

## Spinner ✅ — заведён 2026-08-13

**Это оказался другой компонент, а не другой размер.** Наш лоадер крутил рамку
(`border-top-color` + `rotate 360°`), прод рисует **12 лучей по кругу**: каждый в базе
`opacity: 0.2` и `scale(0.9)`, анимация возвращает его в `opacity: 1` / `scale(1)`,
цикл 1.2s, сдвиг фазы 0.1s на луч. Ни один параметр старого лоадера не переносился.

| | Прод |
|---|---|
| Размеры | small **20**, medium **40** (плюс произвольный) |
| Цвет | `--icon-secondary-default` (у нас был синий `--text-main-default`) |
| Разметка | SVG `viewBox 0 0 16 16`, 12 `path`, `fill: currentColor` |
| Анимация | 1.2s infinite, `nth-of-type(N)` → задержка `N × 0.1s` |

12 путей в каждое место использования не копируются, поэтому разметку раскладывает
[spinner.js](components/spinner.js); динамическая вставка — `window.initSpinners(root)`.

🟢 **Наше добавление:** `prefers-reduced-motion` — анимация бесконечная, прод про это не думает.

---

## Label и Counter ✅ — заведены 2026-08-13

Два разных прод-компонента, у нас в одном файле [badges.css](components/badges.css).
**Не путать:** `Label` — плашка с текстом (высота 24, цвет снаружи, может нести иконку);
`Counter` — только число (16 или 20, ровно две темы).

| Label | Прод |
|---|---|
| Высота / padding | 24 · `4px 8px`; только иконка (`.label-empty`) — `4px`, квадрат 24×24 |
| Радиус | `--unit_12` (48px) — на высоте 24 это полная пилюля, ведём своим `--radius-full` |
| Текст | 14/20 400, `white-space: nowrap` |
| Отступ между детьми | `> :not(:last-child) { margin-right: 4px }` — не `gap` |
| Модификаторы | `bold`, `shadow` (`drop-shadow(0 4px 16px --shadow-default)`), `clickable` (`:active { opacity: .5 }`) |

⚠️ **`bold` в проде — `font-weight: 600`, которого у Lato нет** (есть 400 и 700): браузер
синтезирует начертание. Взяли 700 — ближайшее настоящее.

| Counter | small | medium |
|---|---|---|
| Высота и `min-width` | 16 | 20 |
| Текст | 12/16 400 | 14/20 400, `padding-bottom: 1px` |

Общее: `padding: 0 4px`, `border-radius: 100px`, цвет цифры `--text-inverted-default`.
Темы ровно две: `info` → `--accent-main-primary`, `critical` → `--accent-negative-primary`.
Многозначное число растягивает круг в пилюлю за счёт `min-width`.

**Что поменялось в прототипе.** `.comp-update-badge` (бейдж апдейтов на кнопке «Конкуренты»)
был размечен как Overline — 10/16 bold, трекинг 1px, uppercase — и красился
`--control-negative-primary-default` (#db1f36). По контракту стал 12/16 400 на
`--accent-negative-primary` (#c2122d): цифре capital-стиль ни к чему, а темы у Counter две.

---

## Radio ✅ — заведён 2026-08-13

**Контракт снят чтением CSS-правил кита, а не замером состояний.** Это метод, а не деталь:
`:hover`, `:active` и `:focus-visible` через `getComputedStyle` не поймать — синтетические
`dispatchEvent` не поднимают CSS-псевдоклассы, а `.focus()` не даёт `:focus-visible`.
Первый заход показал «у радио нет ни ховера, ни фокуса» — и это было неверно.
**Правило: интерактивные состояния снимать из `document.styleSheets`, не замером.**

| Состояние | Рамка | Заливка | Точка |
|---|---|---|---|
| Невыбранный | `--stroke-control-default` | `--surface-inverted-default` | скрыта |
| Hover | `--stroke-control-hovered` | `--surface-inverted-hovered` | — |
| Pressed | `--stroke-control-pressed` | `--surface-inverted-pressed` | — |
| Выбранный | `--control-main-primary-default` | то же | белая 10×10 |
| Выбранный hover / pressed | `--control-main-primary-hovered` / `-pressed` | то же | — |
| Invalid | `--stroke-border-negative` | `--surface-negative-default` | скрыта |
| Invalid + выбран | `--control-negative-primary-default` | то же | белая |
| Disabled | `--stroke-control-disabled` | `--surface-inverted-disabled` | скрыта |
| Disabled + выбран | то же | то же | **остаётся белой** |

Круг 20×20, `border-radius: 50%`, рамка 2px. Точка 10×10 центрируется, скрыта
через `visibility` — прод переключает её правилом `input:checked + .toggle::before`.
Фокус — `box-shadow: 0 0 0 2px var(--stroke-control-focused)`, без `outline-offset`.
Заголовок 16/24 400, описание 14/20 `--text-secondary-default`, отступ до текста 8,
у выключенного текст `--text-secondary-disabled`.

### 🔴 Находка: в проде часть селекторов не работает

В CSS кита написано `input:active .indicator` и `.invalid:hover input .indicator` —
**потомок вместо соседа**. `.indicator` лежит рядом с `input`, а не внутри него, поэтому
нажатое состояние невыбранной радиокнопки и hover/pressed у invalid **не срабатывают вовсе**.
Намерение читается однозначно (для выбранной те же правила написаны верно, через `+`),
поэтому у нас селекторы исправлены. Кандидат к владельцам ДС.

### 🟡 Непоследовательность кита: точка у выключенной выбранной

Прод не гасит точку у `disabled + checked` — она остаётся белой на сером `#e1e6f4`.
У чекбокса в том же ките галка в этом состоянии уходит в `#b1bad2`. Сделано **по проду**,
но это второй пункт того же списка к владельцам.

### 🟡 Размер: наши контролы 14/20 против прод 16/24

У прод-`Radio` размер один — 16/24. У нашего `.checkbox__label` осознанно 14/20
(«размер текста контролов в продукте»). Чтобы панель настройки отчёта не разъехалась,
заведён модификатор `.radio-s` (14/20) — им и размечен прототип; дефолтный `.radio` держит
прод-размер. Общий вопрос «какой размер у контролов в нашей ДС» остаётся открытым:
решать разом для чекбокса и радио, а не по одному компоненту.

---

## Select ✅ — заведён 2026-08-13

**Прод-Select собран поверх Input**, а не отдельным контролом: тот же `input-wrapper`
(36 / radius 8 / рамка `--stroke-control-default` / текст 14/20), внутри контент
с `padding-left: 8px` и правый адорнмент 34×36 с шевроном 16×16.

| | Прод |
|---|---|
| Шеврон | `--icon-main-default` (#006cfd) — **синий**, у нас был серый `#697797` |
| Адорнмент | 34×36, `padding: 0 8px`; выходит за рамку на 1px (`height: calc(100% + 2px); margin: -1px 0`), чтобы скругление совпало с полем |
| Плейсхолдер | `--text-secondary-default`, ellipsis, `user-select: none` |
| Disabled | шеврон гаснет в `--icon-main-disabled` |

⚠️ **Наше отступление: прод-Select — свой дропдаун с поповером, у нас нативный `<select>`
под `appearance: none`.** Совпадает всё, кроме самой раскрывающейся панели: там у нас список
операционной системы. Сделано осознанно — панель это хром браузера, а нативный контрол
бесплатно даёт клавиатуру и доступность. Заводить поповер имеет смысл, только если
понадобится мультивыбор или своя разметка пунктов (в ките для этого есть `MultiSelect`
и `GroupedSelect`).

Прежний `.filter-select` (34px, серый шеврон, рамка `--stroke-divider-default`) в прототипе
не используется — ЛК переведён на `.select`.

---

## Textarea ✅ — заведён 2026-08-13

Прод-пропы: `invalid`, `size` (XS десктопный / M мобильный), `width`, `minRows`, `maxRows`,
`hasCounter`. Снят размер **XS** — прототип десктопный; M не снимался.

| Свойство | Прод |
|---|---|
| Padding | `8px`; со счётчиком `8px 8px 20px` |
| Радиус | 8 (`--radius-l`) |
| Рамка | 1px `--stroke-control-default` |
| Текст | 14/20 400, `--text-primary-default`, трекинг normal |
| Placeholder | `#b1bad2` |
| Высота | по содержимому между `minRows` (по умолчанию 2) и `maxRows` |
| `resize` | `none` — ручку прод не даёт |
| Invalid | рамка `--stroke-border-negative` |
| Disabled | заливка и рамка `#e1e6f4`, курсор `not-allowed`, **цвет текста не гаснет** |
| Счётчик | `position:absolute` в нижней полосе, 12/16 400, `--text-secondary-default` |

**Авторазмер.** Прод меряет содержимое теневым `textarea`-двойником (в DOM их всегда два).
У нас то же считается по `scrollHeight` в [textarea.js](components/textarea.js) — результат
тот же, разметки вдвое меньше. `data-min-rows` / `data-max-rows` = прод `minRows` / `maxRows`.

### 🔴 Находка: у прод-Textarea нет индикации фокуса

Замер 2026-08-13: при фокусе на прод-`Textarea` **не меняется ничего** — ни рамка, ни `outline`,
ни `box-shadow`. Поле не показывает, что в нём каретка. При этом `Input` того же кита на фокусе
даёт `box-shadow: 0 0 0 1px var(--stroke-control-focused)`.

Расценено как **дефект прода**, а не решение: тот же класс, что `letter-spacing` у кнопок —
компонент расходится со своей же семьёй. Фокус у нас сделан как у `.input`. Кандидат отнести
владельцам ДС вместе с контрастом кнопки в тосте.

---

## Link / ActionLink

Прод: `Link` — это `<a>`, `ActionLink` — `<button>` с той же визуалкой. Текст **14/20 400**,
`--icon-gap: 8px` (у размера XS — 4px), без подчёркивания по умолчанию (есть варианты
`underline` и `dashed`). Высота задаётся `spacing-size`: XS = 28, M = 44, auto = по контенту.

Цветовые темы: `--text-main-default` #005ede · positive #227e01 · warning #a14f00 ·
negative #c2122d · inverted white · disabled #b1bad2.

| # | Расхождение | Прод | Наш |
|---|---|---|---|
| ✅ | Цвет | токен `--text-main-default` | тот же токен — переведено 12.08, замерено 24.08 (`rgb(0, 94, 222)`) |
| 🟡 | Цветовые темы | 6 | одна (синяя) |
| 🟡 | Размерная сетка | XS 28 / M 44 / auto — задаётся любой ссылке | у **иконочной** обе ступени есть (`.action-link-icon` 28, `.action-link-icon-m` 44); у текстовых высота всегда по контенту, ступень им не назначить |
| ⚪ | Вес | 400 | наши action-линки объявлены Bold 700 в [components/links.md](components/links.md) |

Вес — расхождение того же класса, что `letter-spacing` у кнопок: прод-код против нашей
Figma-документации. Решать вместе с ним, отдельно не трогать.

---

## Snackbar → Toast ✅

**Прод-страница `UI-Kit/Snackbar/Snackbar` помечена `@deprecated`: «Используйте компонент Toast».**
Поэтому снекбар не чинили, а завели `toast.css` / `toast.js` / [components/toast.md](components/toast.md)
по контракту `UI-Kit/Toast` (2026-08-12). `showSnackbar()` остался тонким шимом в `showToast()` —
старые вызовы работают, разметка `.snackbar-item` больше не строится.

Контракт и находка по контрасту кнопки действия — в [components/toast.md](components/toast.md).
Регресс: `v-next/tests/smoke-toast.js`, 25 проверок.

**Попутно снят прежний «долг».** В CHANGELOG 2026-07-30 значилось, что текст снекбара 16/24 —
это ошибка и надо привести к Body2 14/20. Прод-Toast использует **ровно 16/24**, так что
приводить было нечего: долг закрыт в обратную сторону.

**Осталось:** в `report.html` живёт собственная копия снекбара с ~10 вызовами — на общий компонент
не смотрит и не мигрирована.

---

## Сделано 2026-08-12

Одной волной, после решения «источник — кит»: **смоук 24/24 до и после**, ни один тест не
потребовал правки; повторный замер `kit.html` сошёлся с продом; скриншоты `index.html` /
`report.html` на 1440 — раскладка цела, переполнения нет, 0 JS-ошибок.

- **Checkbox:** рамка 1.5 → **2px**; disabled-рамка на `--stroke-control-default` (была невидимой);
  `:active` для checked и unchecked; hover у checked и invalid; `outline-offset` 1 → 2.
- **Tabs:** размерная сетка под прод — `.tab` = medium (**38px**, `8px 0`, 16/22),
  `.tab-s` = small (**28px**, `4px 0`, 14/20). Индикатор вынесен из потока в `::after`
  (`bottom: -1px`) — раньше `border-bottom` добавлял 2px и таб был 40 вместо 38. Hover больше не
  красит текст (в проде это серая подложка-подчёркивание), добавлены `disabled` и `focus-visible`.
- **Chips:** выбранный чип теперь заливка `--surface-main-default` + рамка
  `--stroke-control-selected` (**#3686ff, ΔE 0 к проду** — токен нашёлся, раньше стоял хардкод и
  комментарий «точного токена нет»). Добавлены `:active`, `focus-visible`, `disabled` и
  «выбранный + disabled». Рамка по умолчанию — `--stroke-control-default`.
- **Input:** заведён отдельный компонент `.input` / `.input-m` по прод-контракту
  (36 / 44, radius 8, placeholder, invalid, disabled, слот адорнмента). `.filter-select`
  переведён на токены (disabled был хардкодом `#B1BAD2`) и получил `focus-visible` через
  `box-shadow`, как в проде.
- **Links:** цвет с хардкода `#005EDE` на `--text-main-default`, добавлены `:active`, `disabled`,
  `focus-visible`; у иконочной ссылки — размер M (44×44) как прод `spacing-size M`.
- **Кит:** добавлены демо `.tab-s`, `disabled`-таб, вся линейка `.input`.

## Отнести владельцам ДС

Накопилось за 12–13 августа. Это **не** наши расхождения — мы у себя сделали по проду
(кроме п.2 и п.3, где явно отступили и написали почему). Каждый пункт воспроизводится
на витрине, ссылки — story id из сводки выше.

| # | Что | Где | Почему это дефект |
|---|---|---|---|
| 1 | Кнопка действия в тосте — `#006cfd` на тёмном `#0d162e` | `ui-kit-toast-методы-api-тоста--docs` | **3.90:1**, ниже порога WCAG AA (4.5:1). Белый текст того же тоста даёт 17.93:1. Нужен токен вроде `text-main-on-dark` |
| 2 | У `Textarea` нет никакой индикации фокуса | `ui-kit-input-textarea--docs` | Ни рамки, ни `outline`, ни тени — поле не показывает каретку. `Input` того же кита даёт `box-shadow: 0 0 0 1px --stroke-control-focused`. Мы сделали как у `Input` |
| 3 | `Button` не применяет к лейблу собственный текстовый стиль | `ui-kit-button-button--docs` | Рендерит `letter-spacing: normal`, тогда как `Typography` того же кита объявляет Heading4/5 с `−0.2`. Мы ведём по шкале |
| 4 | У `Radio` часть селекторов написана потомком вместо соседа | `ui-kit-radio-radio--docs` | `input:active .indicator` и `.invalid:hover input .indicator` — `.indicator` лежит **рядом** с `input`. Нажатие невыбранной и hover/pressed у invalid не срабатывают вовсе. Для выбранной те же правила написаны верно через `+` |
| 5 | У `Radio` точка в `disabled + checked` остаётся белой | `ui-kit-radio-radio--docs` | Галка `Checkbox` в том же состоянии уходит в `#b1bad2`. Непоследовательность внутри кита |
| 6 | В палитре нет цветов веток метро | `ui-kit-tokens-colorspalette--semantic-palette` | Метро живёт только в `DeprecatedPalette`. Наши 36 имён `--msk-*` / `--spb-*` не с чем сверять |

---

## Что осталось

1. **Анимация индикатора табов** — в проде он ездит по `--indicator-offset` / `--indicator-width`;
   у нас статичный `::after` на активном табе. Нужен JS на переключении вкладок.
2. **Цветовые темы ссылок** — заведена одна из шести. Заводить под задачу.
3. **Геометрия чипсов** — прод `chip-button` 44px против наших 34 / 38. Наши чипсы живут в плотной
   строке фильтров, поэтому оставлены; сводить два варианта (`.chip` / `.chip-s`) в один — отдельно.
4. **Вес action-линков** (наш Bold 700 против прод 400) — тот же класс конфликта, что
   `letter-spacing` у кнопок: прод-код против нашей Figma-документации. Решать оба разом.

Тесты — в том же коммите, что и CSS. До и после каждой волны — `./tests/run.sh`.
