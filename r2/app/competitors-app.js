/* Экран «Конкуренты объекта» (поверхность приложения) — наполнение.
 *
 * Разметка — competitors-app.html, компоненты — ../_design-system/components/app/.
 * Данные — competitors-data.js, тот же мир объектов, что и в вебовом отчёте.
 *
 * Три вкладки, макеты Figma:
 *   Отслеживаются — 563:68758, карточка с кнопкой «убрать»
 *   Подборка      — 393:82207, карточка с переключателем отслеживания
 *   Архивные      — своего макета нет; собрана из состояния «Снято с публикации»
 *                   той же карточки подборки (393:82223)
 *
 * Кнопка под карточкой — ПЕРЕКЛЮЧАТЕЛЬ (64:39388 — включено, 64:39461 — снято).
 * Объявление при нажатии не исчезает: меняется только кнопка, а «отслеживается»
 * живёт признаком объекта. Снятие подтверждается снекбаром с возвратом.
 *
 * Параметры URL:
 *   n — сколько конкурентов отслеживается (по умолчанию 12)
 *   плюс проброс «Моего объекта» (desc/price/photo) — он тут не отображается,
 *   но летит дальше, в кнопку «Создать» и в ссылку «назад».
 *
 * Даты не хранятся в данных (протухнут) — считаются как СЕГОДНЯ − days,
 * по тому же правилу, что в вебовом отчёте.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);

  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  var ICONS = '../_design-system/assets/icons/';

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

  /* Иконка ветки метро: геометрия из экспорта Figma, цвет — из данных через
     currentColor (в самом экспорте он запечён зелёным). */
  var METRO_PATH = 'M0 9.26592V10.6459H5.20833V9.26592H4.375L5.20833 6.30871L7.5 '
    + '9.26592L9.79167 6.30871L10.625 9.26592H9.79167V10.6459H15V9.26592H14.1667L10.4167 '
    + '0L7.5 5.71727L4.58333 0L0.833333 9.26592H0Z';

  /* ------------------------------------------------------------------ *
   *  Фильтры                                                            *
   * ------------------------------------------------------------------ */

  /* Набор — из вебового отчёта (report.html, блок .filters), разложенный по двум
     рядам макета. «Сбросить фильтры» и «На карте» не перенёс: в макете приложения
     их нет, а по высоте они не 36 и ломают ряд. Вернуть — вопрос одной строки.
     Выбранными идут первые два: радиус и комнатность подставляются от объекта. */
  var FILTER_ROWS = [
    [{ t: 'Радиус 3 км', on: true }, { t: '2 комнаты', on: true }, { t: 'До 50 кв. м.' }, { t: '15–25 млн ₽' }],
    [{ t: 'Ремонт' }, { t: 'Тип дома' }, { t: 'Год постройки' }]
  ];
  /* В вебе «За N дней» стоит в том же общем ряду первым и виден только на архиве */
  var ARCHIVE_FILTER = { t: 'За 7 дней' };

  function chipHtml(f) {
    return '<button class="chip-app' + (f.on ? ' chip-app--selected' : '') + '" type="button">'
      + esc(f.t)
      + '<span class="chip-app__icon"><img src="' + ICONS + 'chevron-down-small-16.svg" alt=""></span>'
      + '</button>';
  }

  function renderFilters(tab) {
    var row1 = FILTER_ROWS[0].slice();
    if (tab === 'archive') row1.unshift(ARCHIVE_FILTER);
    document.getElementById('filters-row-1').innerHTML = row1.map(chipHtml).join('');
    document.getElementById('filters-row-2').innerHTML = FILTER_ROWS[1].map(chipHtml).join('');
    /* Контейнер скролла живёт дольше своего содержимого: на архиве в начало ряда
       встаёт «За N дней», и увидеть его надо с первого кадра. */
    document.getElementById('filters').scrollLeft = 0;
  }

  /* Чипсы переключаются, но выдачу не меняют — как и в вебовом отчёте, где фильтры
     витринные. Состояние здесь показать важнее: у чипса это его главная работа. */
  document.getElementById('filters').addEventListener('click', function (e) {
    var chip = e.target.closest('.chip-app');
    if (chip) chip.classList.toggle('chip-app--selected');
  });

  /* ------------------------------------------------------------------ *
   *  Карточка                                                           *
   * ------------------------------------------------------------------ */

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

  /* Кнопка под карточкой — переключатель, а не действие в одну сторону (макеты
     64:39388 и 64:39461). Не отслеживается: залитая синяя «Добавить в отслеживаемые».
     Отслеживается: та же кнопка вторичным стилем — светлая подложка, синий текст,
     галочка. Объявление при этом остаётся на месте, меняется только кнопка. */
  function trackButton(on) {
    if (!on) {
      return '<button class="btn-app btn-app--small btn-app--primary btn-app--main btn-app--block"'
        + ' type="button" data-action="track" aria-pressed="false">Добавить в отслеживаемые</button>';
    }
    return '<button class="btn-app btn-app--small btn-app--secondary btn-app--main btn-app--block"'
      + ' type="button" data-action="track" aria-pressed="true">'
      + '<span class="btn-app__icon btn-app__icon--success"><img src="' + ICONS + 'check-16.svg" alt=""></span>'
      + 'Отслеживается</button>';
  }

  /* mode: tracked — кнопка «убрать» в шапке; pick / archive — переключатель
     под содержимым. Карточка одна и та же, различается только действием. */
  function card(c, idx, mode) {
    var archived = mode === 'archive';
    var chips = [];
    var repair = repairLabel(c.repair);
    if (repair) chips.push(repair);
    var house = houseLabel(c);
    if (house) chips.push(house);

    var remove = mode === 'tracked'
      ? '<button class="competitor-card-app__remove" type="button" data-action="untrack" aria-label="Убрать из отслеживаемых">'
          /* Красный вариант корзины: тот же глиф, что в меню действий, но там
             он нейтрального цвета. Цвет в экспорте запечён, поэтому файла два. */
          + '<img src="' + ICONS + 'trash-negative-16.svg" alt=""></button>'
      : '';
    var footer = mode === 'tracked' ? '' : trackButton(tracked.has(idx));

    return '<article class="competitor-card-app" data-idx="' + idx + '">'
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
              + remove
            + '</div>'
            + (chips.length ? '<div class="competitor-card-app__chips">'
                + chips.map(function (t) { return badge(t); }).join('') + '</div>' : '')
          + '</div>'
          + '<div class="competitor-card-app__figures">'
            + priceBlock(c, archived) + statsBlock(c, archived)
          + '</div>'
        + '</div>'
        + footer
      + '</div>'
      + '</article>';
  }

  /* ------------------------------------------------------------------ *
   *  Состав вкладок                                                     *
   * ------------------------------------------------------------------ */

  var total = (typeof ALL_COMPETITORS !== 'undefined' && ALL_COMPETITORS.length) || 0;
  var n = parseInt(params.get('n') || '12', 10);
  if (!(n > 0)) n = 12;
  n = Math.min(n, total);

  /* «Отслеживается» — ПРИЗНАК объекта, а не принадлежность к вкладке. Раньше три
     вкладки были тремя непересекающимися списками, и добавление означало переезд
     между ними: карточка исчезала из подборки. По макетам 64:39388 / 64:39461 это
     неверно — объявление остаётся на месте, меняется только кнопка. Поэтому:

       SELECTION / ARCHIVE — фиксируются один раз и не меняются;
       tracked             — множество, которое ходит независимо от них.

     Вкладка «Отслеживаются» показывает содержимое множества, две другие — свои
     постоянные списки, а кнопка на карточке читает признак. Один объект может быть
     и в подборке, и в отслеживаемых одновременно — это и есть смысл правки.

     Деление подборка/архив прежнее, из вебового отчёта (report.js: «Подборка —
     только активные; Архивные — только снятые»). */
  var SELECTION = [], ARCHIVE = [];
  var tracked = new Set();
  ALL_COMPETITORS.forEach(function (c, i) {
    if (i < n) { tracked.add(i); return; }
    (c.removed ? ARCHIVE : SELECTION).push(i);
  });

  var listEl = document.getElementById('competitors');
  var filtersEl = document.getElementById('filters');
  var bottomBarEl = document.getElementById("bottom-bar");
  var countEl = document.getElementById('tracked-count');
  var current = 'tracked';
  var filtersFor = null;              // для какой вкладки сейчас отрисован ряд фильтров

  /* «Создать» и «назад» несут тот же набор параметров: объект и число конкурентов
     не должны теряться при переходах. Число живое — оно меняется вместе со списком. */
  var pass = new URLSearchParams();
  ['desc', 'price', 'photo'].forEach(function (k) {
    if (params.get(k)) pass.set(k, params.get(k));
  });
  var backEl = document.getElementById('back');
  var createEl = document.getElementById('create-report');

  function render() {
    var ids = current === 'tracked' ? [...tracked].sort(function (a, b) { return a - b; })
            : current === 'archive' ? ARCHIVE : SELECTION;
    var mode = current === 'tracked' ? 'tracked' : current === 'archive' ? 'archive' : 'pick';
    listEl.innerHTML = ids.map(function (i) { return card(ALL_COMPETITORS[i], i, mode); }).join('');
    syncCount();

    var onTracked = current === 'tracked';
    filtersEl.hidden = onTracked;
    bottomBarEl.hidden = !onTracked;
    listEl.classList.toggle('competitors-list--with-bottom-bar', onTracked);
    /* Ряд перерисовываем только при смене вкладки: иначе «добавить в отслеживаемые»
       сбрасывало бы выбранные чипсы вместе со списком. */
    if (!onTracked && filtersFor !== current) { renderFilters(current); filtersFor = current; }

  }

  /* Счётчик в табе и обе ссылки читают одно число — размер множества. Вынесено
     отдельно, потому что переключение кнопки список не перерисовывает. */
  function syncCount() {
    countEl.textContent = tracked.size;
    var backQs = new URLSearchParams(pass);
    backQs.set('n', tracked.size);
    backEl.setAttribute('href', 'report-app.html?' + backQs);
    /* «Создать» ведёт в настройку отчёта на этой же поверхности (2026-08-15);
       до появления owner-report-app.html ссылка уходила в вебовый report.html.
       Объект тащим целиком — на настройке он нужен для полосы цены. */
    createEl.setAttribute('href', 'owner-report-app.html?' + backQs);
  }

  document.querySelector('.tabs-app').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab-app');
    if (!tab || tab.dataset.tab === current) return;
    current = tab.dataset.tab;
    document.querySelectorAll('.tab-app').forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('tab-app--active', on);
      t.setAttribute('aria-selected', String(on));
    });
    render();
  });

  /* Переключение признака. Список НЕ перерисовываем — меняем кнопку на месте:
     иначе карточка мигает, а на вкладке «Отслеживаются» ещё и уезжает под курсором. */
  function setTracked(idx, on, cardEl) {
    if (on) tracked.add(idx); else tracked.delete(idx);
    if (cardEl) {
      var btn = cardEl.querySelector('[data-action="track"]');
      if (btn) btn.outerHTML = trackButton(on);
    }
    syncCount();
  }

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var cardEl = btn.closest('.competitor-card-app');
    var idx = parseInt(cardEl.dataset.idx, 10);

    /* Корзина на вкладке «Отслеживаются»: там показано само множество, поэтому
       карточке там больше не место и она уходит. Это не то же, что переключатель. */
    if (btn.dataset.action === 'untrack') {
      setTracked(idx, false, null);
      cardEl.remove();
      return;
    }

    var on = !tracked.has(idx);
    setTracked(idx, on, cardEl);
    if (on) {
      showSnackbarApp('Начали отслеживать');
    } else {
      /* Снятие подтверждается снекбаром с возвратом — макет 64:39461 */
      showSnackbarApp('Перестали отслеживать', {
        action: { title: 'Вернуть', onClick: function () { setTracked(idx, true, cardEl); } },
      });
    }
  });

  render();
})();
