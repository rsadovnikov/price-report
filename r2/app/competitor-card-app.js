/* Карточка конкурента — общий рендер для экранов приложения.
 *
 * Стили: ../_design-system/components/app/competitor-card.css.
 * Пользуются двое: «Конкуренты объекта» (competitors-app) и «Конкуренты в отчёте»
 * (comments-app). Карточка у них одна и та же, различаются только действия —
 * поэтому действия приходят слотами, а не режимом.
 *
 *   CompetitorCardApp.render(c, {
 *     idx:      3,                       // индекс в ALL_COMPETITORS — уезжает в data-idx
 *     archived: false,                   // снят с публикации: статус вместо цены-«было»
 *     topFlag:    'Новый конкурент',        // бейдж над заголовком: про объект
 *     priceFlag:  'Цена изменилась',        // бейдж над строкой цены: про цену
 *     statusFlag: 'Сняли с публикации 7.08',// бейдж под ценой: про судьбу объявления
 *     head:     '<button …>',            // правый верхний слот (корзина)
 *     tail:     '<div …>',               // слот внутри содержимого, зазор 12
 *     footer:   '<button …>'             // слот под содержимым, зазор 16
 *   })
 *
 * ⚠️ Слотов под кнопку два, и это не дублирование. В макетах «Конкурентов объекта»
 * (563:68768) кнопка-переключатель отбита от цифр на 16 — она про карточку целиком.
 * В макете «Конкурентов в отчёте» (818:83925) действие и комментарий отбиты на 12 —
 * они часть содержимого. Числа разные, поэтому и слота два: `footer` и `tail`.
 *
 * Даты не хранятся в данных (протухнут) — считаются как СЕГОДНЯ − days, по тому же
 * правилу, что в вебовом отчёте.
 */
var CompetitorCardApp = (function () {
  'use strict';

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  var DS = '../_design-system/';
  var ICONS = DS + 'assets/icons/';

  /* Иконка ветки метро: геометрия из экспорта Figma, цвет — из данных через
     currentColor (в самом экспорте он запечён зелёным). */
  var METRO_PATH = 'M0 9.26592V10.6459H5.20833V9.26592H4.375L5.20833 6.30871L7.5 '
    + '9.26592L9.79167 6.30871L10.625 9.26592H9.79167V10.6459H15V9.26592H14.1667L10.4167 '
    + '0L7.5 5.71727L4.58333 0L0.833333 9.26592H0Z';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function pluralDays(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return n + ' день,';
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return n + ' дня,';
    return n + ' дней,';
  }

  function dateFromDays(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /* Короткая дата, без года — так подписаны строки истории цены (64:39198).
     Год там не нужен: все записи внутри срока размещения одного объявления. */
  function shortDate(days) {
    var d = new Date();
    d.setDate(d.getDate() - days);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  /* Дата снятия с публикации: считается от той же точки, что и дата подачи.
     Формат «7.02» — из макета. В вебовом отчёте он длиннее («7.02.26»): там
     объект может провисеть больше года, а на карточке приложения год не помещается. */
  function removedDate(c) {
    var d = new Date();
    d.setDate(d.getDate() - (c.days - (c.removedAfterDays || 0)));
    return d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function badge(text, dark) {
    /* Плашки характеристик — ghost × secondary: серый текст на светло-сером.
       У статуса «Снято с публикации» на том же фоне текст основной, а не вторичный.
       Это ColorType=Custom из набора: пару «акцент / подложка» задаём снаружи. */
    if (!dark) {
      return '<span class="badge-app badge-app--ghost badge-app--secondary">'
        + '<span class="badge-app__text">' + esc(text) + '</span></span>';
    }
    return '<span class="badge-app badge-app--custom badge-app--secondary stats-row-app__status"'
      + ' style="--badge-app-accent: var(--text-primary-default);'
      + ' --badge-app-soft: var(--accent-ghost-secondary)">'
      + '<span class="badge-app__text">' + esc(text) + '</span></span>';
  }

  /* --- Флаги апдейтов ------------------------------------------------------
     Три слота, и у каждого своя точка привязки — флаг стоит рядом с тем, о чём
     говорит:

       topFlag    — над заголовком (макет 881:146541): «Новый конкурент», то есть
                    новость про сам объект целиком;
       priceFlag  — над строкой цены (881:146648): «Цена изменилась»;
       statusFlag — ПОД ценой, перед статистикой: «Сняли с публикации 7.08».

     Нижний слот появился 2026-08-23 по правке Романа: сперва снятие с публикации
     стояло наверху, вместе с «Новым конкурентом». Но у карточки уже есть место под
     эту новость — там, где на вкладке «Архивные» стоит плашка «Снято с публикации»
     (макет 393:82223). Два места под один и тот же факт — это и была ошибка.

     Все три — Badge warning × secondary, тот же, что несут строки на обзоре. */
  function flag(text) {
    if (!text) return '';
    return '<span class="badge-app badge-app--warning badge-app--secondary'
      + ' competitor-card-app__flag"><span class="badge-app__text">'
      + esc(text) + '</span></span>';
  }

  /* В данных ремонт лежит прилагательным («Дизайнерский»), и слепое «+ ремонт»
     давало «Евро ремонт» и «Без ремонта ремонт». Тип дома в макете подписан
     («Кирпичный дом, 1967»), в данных — одним словом. Пустое поле остаётся пустым:
     пропуски не выдумываем. */
  function repairLabel(r) {
    if (!r) return '';
    if (/ремонт/i.test(r)) return r;
    return r + ' ремонт';
  }

  function houseLabel(c) {
    if (c.building && c.buildYear) return c.building + ' дом, ' + c.buildYear;
    return c.building || (c.buildYear ? String(c.buildYear) : '');
  }

  function priceBlock(c, archived) {
    var changed = !!c.priceDelta && !archived;
    var isUp = /^\+/.test(c.priceDelta || '');
    var current = '<span class="price-row-app__new">'
      + '<span class="price-row-app__sum">' + esc(c.currentPrice) + ' ₽</span>'
      + '<span class="price-row-app__per-m">' + esc(c.currentPricePerM) + ' ₽/м²</span>'
      + '</span>';
    if (!changed) {
      return '<div class="price-row-app"><span class="price-row-app__values">' + current + '</span></div>';
    }
    return '<div class="price-row-app">'
      + '<span class="price-row-app__values">'
        + '<span class="price-row-app__old">'
          + '<span class="price-row-app__sum">' + esc(c.startPrice) + ' ₽</span>'
          + '<span class="price-row-app__per-m">' + esc(c.startPricePerM) + ' ₽/м²</span>'
        + '</span>'
        + '<span class="price-row-app__arrow" aria-hidden="true">→</span>'
        + current
      + '</span>'
      /* Иконка динамики — кнопка: по ней открывается история изменений цены
         (макет 64:39050). Была `<img>`, стала `<button>` с тем же экспортом
         внутри — сама картинка не изменилась, изменилась её роль. */
      + '<button class="price-row-app__icon" type="button" data-action="price-history"'
        + ' aria-label="' + (isUp ? 'Цена выросла' : 'Цена снизилась') + '. История цены">'
        + '<img src="' + ICONS + (isUp ? 'price-up-36.svg' : 'price-down-36.svg') + '" alt="">'
      + '</button>'
      + '</div>';
  }

  /* --- История цены ---------------------------------------------------------
     Шторка со списком изменений (макет 64:39050, шторка 64:39194). Открывается
     кнопкой динамики на карточке; вызывают её экраны — здесь только то, что
     показать, потому что данные и даты карточка уже умеет считать.

     Даты берутся так же, как срок размещения: `dayOffset` — это сколько дней
     прошло от подачи объявления, значит запись случилась `days − dayOffset`
     дней назад. Запись без `delta` — первая цена, она и есть «Публикация».

     Порядок в данных уже от новой к старой, как нарисовано; не пересортировываем. */
  var ARROW = '<svg viewBox="0 0 12.162 12.9857" aria-hidden="true"><path fill-rule="evenodd" '
    + 'clip-rule="evenodd" d="M8.6978 5.4247V1.30839C8.6978 0.585787 8.11201 0 7.38941 '
    + '0H4.77263C4.05002 0 3.46424 0.585786 3.46424 1.30839V5.4247H1.311C0.156626 5.4247 '
    + '-0.43211 6.81076 0.369388 7.64153L5.13941 12.5858C5.65389 13.119 6.50815 13.119 7.02263 '
    + '12.5858L11.7926 7.64153C12.5941 6.81076 12.0054 5.4247 10.851 5.4247H8.6978Z"/></svg>';

  function historyRow(c, h) {
    /* Знак несёт стрелка, а не число: «↓ 450 000 ₽», а не «↓ −450 000 ₽».
       То же правило в вебовом тултипе истории (report.js, buildContentFromHistory). */
    var amount = String(h.delta || '').replace(/[−+-]/g, '').trim();
    var second = '';
    if (!h.delta) {
      second = '<span class="price-history-app__note">Публикация</span>';
    } else {
      second = '<span class="price-history-app__delta price-history-app__delta--'
        + (h.isUp ? 'up' : 'down') + '">' + ARROW
        + '<span>' + esc(amount) + ' ₽</span></span>';
    }
    return '<div class="price-history-app__row">'
      + '<div class="price-history-app__line">'
        + '<span class="price-history-app__date">' + esc(shortDate(c.days - h.dayOffset)) + '</span>'
        + '<span class="price-history-app__sum">' + esc(h.price) + ' ₽</span>'
      + '</div>'
      + '<div class="price-history-app__line">' + second + '</div>'
      + '</div>';
  }

  function openPriceHistory(c) {
    if (!c || !c.priceHistory || !c.priceHistory.length) return null;
    return openSheet({
      base: DS,
      ariaLabel: 'История цены',
      title: 'История цены',
      content: '<div class="price-history-app">'
        + c.priceHistory.map(function (h) { return historyRow(c, h); }).join('')
        + '</div>'
    });
  }

  function statsBlock(c, archived) {
    /* В данных просмотры лежат строкой «25 / 711»: за сегодня и за всё время.
       У снятого объекта короткое окно уже неинформативно — в макете его нет.
       ⚠️ Раньше первым числом было «за 10 дней». Такого окна у ЦИАНа нет вовсе —
       он отдаёт «N просмотров, M за сегодня», и подпись пошла за источником. */
    var v = String(c.views || '').split('/');
    var recent = (v[0] || '').trim(), total = (v[1] || '').trim();
    var pair = function (count, period) {
      return '<span class="stats-row-app__pair"><span class="stats-row-app__count">' + esc(count)
        + '</span><span class="stats-row-app__period">' + period + '</span></span>';
    };
    /* У снятого объекта срок — это сколько он провисел до снятия, а не до сегодня.
       Дата под ним в обоих случаях одна: когда объект подали. */
    var days = archived ? (c.removedAfterDays || c.days) : c.days;

    return '<div class="stats-row-app">'
      + (archived ? badge('Снято с публикации ' + removedDate(c), true) : '')
      + '<div class="stats-row-app__age">'
        + '<p class="stats-row-app__days">' + pluralDays(days) + '</p>'
        + '<p class="stats-row-app__date">' + dateFromDays(c.days) + '</p>'
      + '</div>'
      + '<div class="stats-row-app__views">'
        + '<span class="stats-row-app__eye"><img src="' + ICONS + 'views-16.svg" alt=""></span>'
        + '<span class="stats-row-app__counts">'
          + (archived ? '' : pair(recent, 'за сегодня,'))
          + pair(total, 'за всё время')
        + '</span>'
      + '</div>'
      + '</div>';
  }

  function render(c, opts) {
    opts = opts || {};
    var archived = !!opts.archived;
    var chips = [];
    var repair = repairLabel(c.repair);
    if (repair) chips.push(repair);
    var house = houseLabel(c);
    if (house) chips.push(house);

    return '<article class="competitor-card-app" data-idx="' + opts.idx + '">'
      + '<img class="competitor-card-app__photo" src="' + esc((c.photos && c.photos[0]) || '') + '" alt="">'
      + '<div class="competitor-card-app__body">'
        + '<div class="competitor-card-app__content">'
          + '<div class="competitor-card-app__main">'
            + '<div class="competitor-card-app__head">'
              + '<div class="competitor-card-app__titles">'
                + flag(opts.topFlag)
                + '<p class="competitor-card-app__title">' + esc(c.desc) + '</p>'
                + '<div class="competitor-card-app__geo">'
                  + '<div class="competitor-card-app__metro-row">'
                    + '<span class="competitor-card-app__metro">'
                      + '<span class="metro-icon-app" style="color:' + esc(c.metroColor || 'currentColor') + '">'
                        + '<svg viewBox="0 0 15 10.6459" fill="none" aria-hidden="true">'
                        + '<path d="' + METRO_PATH + '"/></svg></span>'
                      + '<p>' + esc(c.metroInDesc || c.metroStation) + '</p>'
                    + '</span>'
                    + '<span class="competitor-card-app__walk">'
                      + '<span class="walk-icon-app"><img src="' + ICONS + 'walk-16.svg" alt=""></span>'
                      + '<p>' + esc(c.walkMin) + ' мин</p>'
                    + '</span>'
                  + '</div>'
                  + '<p class="competitor-card-app__addr">' + esc(c.address) + '</p>'
                + '</div>'
              + '</div>'
              + (opts.head || '')
            + '</div>'
            + (chips.length ? '<div class="competitor-card-app__chips">'
                + chips.map(function (t) { return badge(t); }).join('') + '</div>' : '')
          + '</div>'
          + '<div class="competitor-card-app__figures">'
            + flag(opts.priceFlag) + priceBlock(c, archived)
            + flag(opts.statusFlag) + statsBlock(c, archived)
          + '</div>'
          + (opts.tail || '')
        + '</div>'
        + (opts.footer || '')
      + '</div>'
      + '</article>';
  }

  return {
    render: render,
    badge: badge,
    esc: esc,
    icons: ICONS,
    pluralDays: pluralDays,
    dateFromDays: dateFromDays,
    shortDate: shortDate,
    removedDate: removedDate,
    openPriceHistory: openPriceHistory
  };
})();
