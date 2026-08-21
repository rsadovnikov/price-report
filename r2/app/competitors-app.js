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

  /* Карточка и её хелперы живут в общем модуле competitor-card-app.js: тот же
     рендер стоит на экране «Конкуренты в отчёте». Здесь остаются только действия —
     они у экранов свои. */
  var esc = CompetitorCardApp.esc;
  var ICONS = CompetitorCardApp.icons;

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
    var remove = mode === 'tracked'
      ? '<button class="competitor-card-app__remove" type="button" data-action="untrack" aria-label="Убрать из отслеживаемых">'
          /* Красный вариант корзины: тот же глиф, что в меню действий, но там
             он нейтрального цвета. Цвет в экспорте запечён, поэтому файла два. */
          + '<img src="' + ICONS + 'trash-negative-16.svg" alt=""></button>'
      : '';
    return CompetitorCardApp.render(c, {
      idx: idx,
      archived: mode === 'archive',
      head: remove,
      footer: mode === 'tracked' ? '' : trackButton(tracked.has(idx))
    });
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
  /* Вкладку можно открыть сразу нужной: строка «Новый возможный конкурент» на
     обзоре ведёт в «Подборку» — там кандидат и лежит, среди отслеживаемых его нет. */
  var TABS = ['tracked', 'selection', 'archive'];
  var current = TABS.indexOf(params.get('tab')) >= 0 ? params.get('tab') : 'tracked';
  var filtersFor = null;              // для какой вкладки сейчас отрисован ряд фильтров

  /* «Создать» и «назад» несут тот же набор параметров: объект, число конкурентов и
     апдейты не должны теряться при переходах. Число живое — оно меняется вместе
     со списком. Без `u` возврат на обзор сбрасывал бы его в «изменений нет». */
  var pass = new URLSearchParams();
  ['desc', 'price', 'photo', 'u'].forEach(function (k) {
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

  function markActiveTab() {
    document.querySelectorAll('.tab-app').forEach(function (t) {
      var on = t.dataset.tab === current;
      t.classList.toggle('tab-app--active', on);
      t.setAttribute('aria-selected', String(on));
    });
  }

  document.querySelector('.tabs-app').addEventListener('click', function (e) {
    var tab = e.target.closest('.tab-app');
    if (!tab || tab.dataset.tab === current) return;
    current = tab.dataset.tab;
    markActiveTab();
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

  markActiveTab();
  render();
})();
