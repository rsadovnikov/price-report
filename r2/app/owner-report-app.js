/**
 * Экран «Отчёт для собственника» — поверхность приложения (iOS).
 * Макет: Figma «Доработки отчёта о цене и конкурентах», node 563:69622.
 *
 * Четыре шага настройки перед PDF: конкуренты → цена → статистика → комментарий.
 * Последнее звено цепочки mo-app → report-app → competitors-app → сюда.
 *
 * Что берётся из данных, а что из макета:
 *   — число конкурентов и склонение — из `?n=`;
 *   — цены конкурентов, границы «оценки от Циана» и статистика объявления
 *     собственника — константы из макета.
 *
 * ⚠️ Почему цены конкурентов НЕ считаются по competitors-data.js, хотя данные
 * есть. Сначала считал: при `n=6` выходит минимум 15,5 млн, средняя 25,5 млн,
 * максимум 31,8 млн. И тогда экран начинает противоречить сам себе — рыночная
 * оценка в макете зашита как 14,9…17,5 млн, объект 19,13 млн подписан «выше
 * рынка», а по реальным конкурентам он ниже средней почти на треть. Вывести
 * границы оценки из данных значит придумать формулу оценки — этого не делаю.
 * Поэтому весь ценовой блок живёт на числах макета и внутренне согласован.
 * Решение, что здесь источник правды, — за Романом.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var n = parseInt(params.get('n') || '5', 10);
  if (!isFinite(n) || n < 1) n = 5;

  var base = {
    desc:  params.get('desc')  || '1-комн. кв., 50 м², 2/12 этаж',
    price: params.get('price') || '19 130 000',
    photo: params.get('photo') || '../photos/mo/mo1-1.jpg'
  };

  /* Границы рыночной оценки — из макета. Внутри них «Хорошая цена». */
  var MARKET_MIN = 14900000;
  var MARKET_MAX = 17500000;

  /* Статистика объявления собственника — из макета. `on: false` у «Показов»
     тоже из макета: там стоит вариант строки с выключенным тумблером. */
  var METRICS = [
    { name: 'Показы',      short: '1 473', total: '28 473', on: false },
    { name: 'Просмотры',   short: '573',   total: '5 041',  on: true },
    { name: 'В избранном', short: '45',    total: '473',    on: true },
    { name: 'Отклики',     short: '0',     total: '36',     on: true },
    { name: 'Звонки',      short: '17',    total: '64',     on: true },
    { name: 'Чаты',        short: '22',    total: '77',     on: true }
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  /* Цены в данных лежат строками с пробелами-разделителями: «27 500 000». */
  function toNumber(s) {
    return parseInt(String(s).replace(/\D+/g, ''), 10) || 0;
  }
  function format(num) {
    return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* --- Шаг 1: сколько конкурентов и куда ведёт кнопка комментариев -------- */

  function plural(count, one, few, many) {
    var mod10 = count % 10;
    var mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }

  document.getElementById('step-competitors').textContent =
    'Выбрано ' + n + ' ' + plural(n, 'конкурент', 'конкурента', 'конкурентов');

  var qs = new URLSearchParams({ n: n, desc: base.desc, price: base.price, photo: base.photo });
  document.getElementById('comments-link').setAttribute('href', 'competitors-app.html?' + qs);
  document.getElementById('back-link').setAttribute('href', 'report-app.html?' + qs);
  document.getElementById('save-exit').setAttribute('href', 'report-app.html?' + qs);
  /* PDF по-прежнему собирается в вебовой версии — экран приложения довёл
     настройку до конца, но самого PDF на этой поверхности нет. */
  document.getElementById('create-pdf').setAttribute('href', '../report.html?n=' + n);

  /* --- Шаг 2: цены у выбранных конкурентов -------------------------------- */

  var COMPETITOR_PRICES = { min: 13000000, avg: 15000000, max: 17000000 };
  document.getElementById('price-min').textContent = format(COMPETITOR_PRICES.min) + ' ₽';
  document.getElementById('price-avg').textContent = format(COMPETITOR_PRICES.avg) + ' ₽';
  document.getElementById('price-max').textContent = format(COMPETITOR_PRICES.max) + ' ₽';

  /* Сегментный контрол: точная сумма или диапазон */
  var exact = document.getElementById('price-exact');
  var range = document.getElementById('price-range');
  var options = document.querySelectorAll('.segmented-app__option');

  Array.prototype.forEach.call(options, function (opt) {
    opt.addEventListener('click', function () {
      Array.prototype.forEach.call(options, function (o) {
        var active = o === opt;
        o.classList.toggle('segmented-app__option--active', active);
        o.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      var isRange = opt.dataset.mode === 'range';
      exact.hidden = isRange;
      range.hidden = !isRange;
    });
  });

  /* Ссылка «Цены у выбранных конкурентов» сворачивает сводку.
     Поворот шеврона висит на [aria-expanded] в base.css, поэтому здесь
     переключается только атрибут. */
  var pricesToggle = document.getElementById('prices-toggle');
  var pricesSummary = document.getElementById('prices-summary');
  pricesToggle.addEventListener('click', function () {
    var open = pricesToggle.getAttribute('aria-expanded') === 'true';
    pricesToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    pricesSummary.hidden = open;
  });

  /* --- Полоса положения цены --------------------------------------------- */

  var ownPrice = toNumber(base.price);
  document.getElementById('range-own').textContent = format(ownPrice) + ' ₽';

  /* Маркер стоит там, где цена попадает относительно границ рынка.
     Зоны делят полосу на три равные части, поэтому «Хорошая цена» — это
     отрезок 33.3…66.7%, а границы рынка — его концы.
     ⚠️ Цена вне рынка прижимается к границе, а не уходит в глубину зоны:
     так стоит маркер в макете (19 130 000 при максимуме 17 500 000 нарисован
     ровно на стыке). Насколько именно цена выше рынка, полоса не показывает —
     это вопрос к макету, а не дефект вёрстки. */
  var t = (ownPrice - MARKET_MIN) / (MARKET_MAX - MARKET_MIN);
  if (!isFinite(t)) t = 0.5;
  t = Math.max(0, Math.min(1, t));
  document.getElementById('range-marker').style.left = (33.333 + t * 33.333).toFixed(2) + '%';

  /* Тумблер «Показывать оценку от Циана»: гасит саму полосу, подпись остаётся. */
  var cianSwitch = document.getElementById('cian-switch');
  var marketRange = document.getElementById('market-range');
  cianSwitch.addEventListener('click', function () {
    var on = cianSwitch.getAttribute('aria-checked') === 'true';
    cianSwitch.setAttribute('aria-checked', on ? 'false' : 'true');
    marketRange.hidden = on;
  });

  /* --- Шаг 3: статистика ------------------------------------------------- */

  function metricRow(m, i) {
    var zero = m.short === '0' ? ' metric-row-app__value--zero' : '';
    return '<div class="metric-row-app' + (m.on ? '' : ' metric-row-app--off') + '" data-metric="' + i + '">'
      + '<div class="metric-row-app__main">'
        + '<div class="metric-row-app__text">'
          + '<span class="metric-row-app__name">' + esc(m.name) + '</span>'
          + '<span class="metric-row-app__values">'
            + '<span class="metric-row-app__value' + zero + '">' + esc(m.short) + '</span>'
            + '<span class="metric-row-app__value metric-row-app__value--wide">' + esc(m.total) + '</span>'
          + '</span>'
        + '</div>'
        + '<button class="switch-app" type="button" role="switch"'
          + ' aria-checked="' + (m.on ? 'true' : 'false') + '"'
          + ' aria-label="Показывать «' + esc(m.name) + '» в отчёте">'
          + '<span class="switch-app__knob"></span>'
        + '</button>'
      + '</div>'
      + '<div class="divider-app divider-app--dashed"></div>'
    + '</div>';
  }

  document.getElementById('metrics').innerHTML = METRICS.map(metricRow).join('');

  /* Тумблер строки гасит только свою строку. Слушатель один на контейнере:
     строк шесть, и каждой свой обработчик не нужен. */
  document.getElementById('metrics').addEventListener('click', function (e) {
    var sw = e.target.closest('.switch-app');
    if (!sw) return;
    var row = sw.closest('.metric-row-app');
    var on = sw.getAttribute('aria-checked') === 'true';
    sw.setAttribute('aria-checked', on ? 'false' : 'true');
    row.classList.toggle('metric-row-app--off', on);
  });

  /* Общий тумблер прячет весь список метрик вместе с шапкой колонок. */
  var statsSwitch = document.getElementById('stats-switch');
  var statsBody = document.getElementById('stats-body');
  statsSwitch.addEventListener('click', function () {
    var on = statsSwitch.getAttribute('aria-checked') === 'true';
    statsSwitch.setAttribute('aria-checked', on ? 'false' : 'true');
    statsBody.hidden = on;
  });

  /* --- Шаг 4: счётчик символов ------------------------------------------- */

  var comment = document.getElementById('comment');
  var counter = document.getElementById('comment-counter');
  comment.addEventListener('input', function () {
    counter.textContent = comment.value.length + '/300';
  });
})();
