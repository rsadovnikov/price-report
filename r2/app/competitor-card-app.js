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

  var ICONS = '../_design-system/assets/icons/';

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

  /* В данных ремонт лежит прилагательным («Дизайнерский»), и слепое «+ ремонт»
     давало «Евро ремонт» и «Без ремонта ремонт». Тип дома в макете подписан
     («Кирпичный дом, 1967»), в данных — одним словом. Пустое поле остаётся пустым:
     пропуски не выдумываем. */
  function repairLabel(r) {
    if (!r) return '';
    if (r === 'Евро') return 'Евроремонт';
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
      + '<img class="price-row-app__icon" src="' + ICONS + (isUp ? 'price-up-36.svg' : 'price-down-36.svg')
        + '" alt="' + (isUp ? 'Цена выросла' : 'Цена снизилась') + '">'
      + '</div>';
  }

  function statsBlock(c, archived) {
    /* В данных просмотры лежат строкой «35 / 881»: за 10 дней и за всё время.
       У снятого объекта короткое окно уже неинформативно — в макете его нет. */
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
          + (archived ? '' : pair(recent, 'за 10 дней,'))
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
                + '<p class="competitor-card-app__title">' + esc(c.desc) + '</p>'
                + '<div class="competitor-card-app__geo">'
                  + '<div class="competitor-card-app__metro-row">'
                    + '<span class="competitor-card-app__metro">'
                      + '<span class="metro-icon-app metro-' + esc(c.metroColor || 'green') + '">'
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
            + priceBlock(c, archived) + statsBlock(c, archived)
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
    removedDate: removedDate
  };
})();
