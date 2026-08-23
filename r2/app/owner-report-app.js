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
  /* Ноль — законное значение: агент мог убрать из отслеживаемых всех. Со старым
     `n < 1` он подменялся пятёркой, и «Сохранить и выйти» возвращало на обзор пять
     воскресших конкурентов — а следом «Мои объявления» рапортовали, что следим за
     пятью. Отчёт без конкурентов собирать не из чего, но врать об этом хуже. */
  var n = parseInt(params.get('n') || '5', 10);
  if (!isFinite(n) || n < 0) n = 5;

  /* --- Мой объект ---
     Значения по умолчанию — первый объект агента из общей базы. Раньше здесь
     стояли числа из макета: страница открывалась без параметров, но показывала
     объект, которого нет ни в одном списке. */
  var ALL_MY = (typeof MY_LISTINGS !== 'undefined' && MY_LISTINGS) || [];
  /* Объект ищем целиком, а не добираем по полям. Иначе ссылка с одним `desc`
     собирает химеру: описание от одного объявления, цена и кадр — от первого в
     списке. Не нашли по описанию — ничего не подставляем: пустая строка честнее
     чужой цены. */
  var my = ALL_MY.filter(function (b) { return b.desc === params.get('desc'); })[0]
        || (params.get('desc') ? {} : ALL_MY[0]) || {};
  var base = {
    desc:  params.get('desc')  || my.desc  || '',
    price: params.get('price') || my.currentPrice || '',
    photo: params.get('photo') || (my.photos && my.photos[0]) || ''
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

  /* --- Стопка превью под заголовком (макет 842:92056, просьба Романа) -------
     Объекты те же и в том же порядке, что везде в разделе: первые `n` из общего
     массива — раздел отличает отслеживаемых от остальных именно так. Заводить
     здесь свой выбор нельзя, иначе на настройке окажутся не те лица, что в
     списке.

     ⚠️ Больше восьми плиток в ряд не помещается: стопка занимает 32×(N−1)+36,
     а под неё остаётся 292 при самом узком вьюпорте (360 − поля карточки 40 −
     номер шага с зазором 28). Девятая как раз добивает до 292 впритык, и внешнее
     кольцо вылезло бы в поле карточки. Поэтому хвост сворачивается в «+N». Своего
     макета у такой плитки нет — в макете конкурентов шесть и все влезли, — но
     молча обрезать ряд под заголовком «Выбрано 12 конкурентов» было бы хуже. */
  var STACK_MAX = 8;
  var stackEl = document.getElementById('step-competitors-photos');
  /* Без фото плитку не рисуем: пустой `src` браузер всё равно пойдёт качать, а
     заглушка 16×16, растянутая на 32, — не превью. В нынешних данных фото есть
     у всех 70 объектов, так что отбор ничего не отсекает. */
  var tracked = (typeof ALL_COMPETITORS !== 'undefined' ? ALL_COMPETITORS : [])
    .slice(0, n)
    .filter(function (c) { return c.photos && c.photos[0]; });
  var visible = tracked.length > STACK_MAX ? tracked.slice(0, STACK_MAX - 1) : tracked;

  /* Картинка обёрнута спаном не для красоты: кольцо-обводка рисуется
     псевдоэлементом поверх фото, а у `<img>` своего псевдоэлемента нет. */
  stackEl.innerHTML = visible.map(function (c) {
    return '<span class="photo-stack-app__item">'
      + '<img src="' + esc(c.photos[0]) + '" alt=""></span>';
  }).join('') + (tracked.length > visible.length
    ? '<span class="photo-stack-app__item photo-stack-app__item--more">+'
      + (tracked.length - visible.length) + '</span>'
    : '');
  stackEl.hidden = tracked.length === 0;

  var qs = new URLSearchParams({ n: n, desc: base.desc, price: base.price, photo: base.photo });
  /* `from` едет дальше вместе с объектом: «Сохранить и выйти» возвращает на обзор,
     а тот по выходу обновляет плитку того самого объявления в «Моих».
     `u` — по той же причине: без него возврат на обзор сбрасывал экран в «изменений
     нет», и флаги апдейтов пропадали. Тот же баг, что нашёл Роман 2026-08-23 на
     переходе в список конкурентов, только на другом пути — соседние экраны
     (`competitors-app`, `comments-app`) параметр везли, а настройка теряла. */
  ['u', 'from'].forEach(function (k) {
    if (params.get(k)) qs.set(k, params.get(k));
  });
  /* «Добавить комментарии» ведёт на свой экран (2026-08-18), а не в общий список
     конкурентов: там выбор объектов, здесь приписки к уже выбранным. */
  document.getElementById('comments-link').setAttribute('href', 'comments-app.html?' + qs);
  document.getElementById('back-link').setAttribute('href', 'report-app.html?' + qs);
  document.getElementById('save-exit').setAttribute('href', 'report-app.html?' + qs);
  /* --- Просмотр PDF ---------------------------------------------------------
     Макет 809:74592. На телефоне отчёт открывается модалкой поверх настройки:
     крестик слева, имя файла по центру, «Отправить» справа. Новой вкладкой уходит
     только вебовая кнопка — там системный просмотрщик и есть привычное поведение,
     а здесь он выбросил бы агента из приложения вместе с настройкой.

     Показываем рендер страницы (`pdf-report-preview.jpg`), а делимся настоящим
     файлом (`pdf-report.pdf`). Причина в айфоне: PDF в `<iframe>` там открывается
     не страницей, а встроенным просмотрщиком со своей панелью — окно в окне.
     Страница в семпле одна, так что картинка показывает отчёт целиком. */
  var PDF_FILE = '../pdf-report.pdf';
  var PDF_NAME = 'report-1';

  document.getElementById('create-pdf').addEventListener('click', function () {
    openSheet({
      base: '../_design-system/',
      fullscreen: true,
      ariaLabel: 'Отчёт для собственника, PDF',
      barTitle: PDF_NAME,
      /* keepOpen: панель шаринга поднимается ПОВЕРХ просмотра, и убирать из-под неё
         сам просмотр значило бы отменять то, чем делятся. */
      barAction: { title: 'Отправить', keepOpen: true, onClick: sharePdf },
      content: '<img class="pdf-page" src="pdf-report-preview.jpg"'
        + ' alt="Отчёт о цене и конкурентах">'
    });
  });

  /* Нативная панель «Поделиться». Файлом, а не ссылкой: собственнику отправляют
     отчёт, а не адрес прототипа. Порядок отступления — от лучшего к рабочему:
     файл → ссылка на страницу → открыть PDF отдельной вкладкой.

     Отказ пользователя (`AbortError`) — не ошибка и запасной путь не запускает:
     панель закрыли осознанно, а не «не получилось». */
  function sharePdf() {
    var canFiles = typeof File === 'function' && navigator.canShare;
    if (!navigator.share) return openPdfTab();

    fetch(PDF_FILE).then(function (r) { return r.blob(); }).then(function (blob) {
      var file = canFiles ? new File([blob], PDF_NAME + '.pdf', { type: 'application/pdf' }) : null;
      if (file && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Отчёт о цене и конкурентах' });
      }
      return navigator.share({ title: 'Отчёт о цене и конкурентах', url: location.href });
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      openPdfTab();
    });
  }

  function openPdfTab() {
    /* Панели шаринга нет вовсе (десктопный браузер) — открываем файл вкладкой,
       чтобы прототип не упирался в тупик. Снекбар объясняет, почему не панель. */
    window.open(PDF_FILE, '_blank', 'noopener');
    if (typeof showSnackbarApp === 'function') {
      showSnackbarApp('Панель «Поделиться» есть только на телефоне');
    }
  }


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

  /* Ссылка «Цены у выбранных конкурентов» сворачивает сводку — с выездом.
     Поворот шеврона висит на [aria-expanded] в base.css, поэтому его тут не трогаем.

     Почему высота считается в JS: `height` не интерполируется к `auto`, а зашить
     число нельзя — на 360 сводка может встать в две строки. Поэтому перед каждым
     переходом ставим измеренную высоту, а после раскрытия отпускаем обратно в
     `auto`, чтобы блок жил своей высотой, если содержимое поменяется.

     Атрибут `hidden` тут не используется намеренно: `display: none` не анимируется.
     Из а11y-дерева и обхода табом блок убирает `inert`. */
  var pricesToggle = document.getElementById('prices-toggle');
  var pricesSummary = document.getElementById('prices-summary');

  function animates(el) {
    return getComputedStyle(el).transitionDuration !== '0s';
  }

  pricesSummary.addEventListener('transitionend', function (e) {
    /* Раскрылись — снимаем фиксированную высоту. На схлопывании она обязана
       остаться нулевой, поэтому условие по классу. */
    if (e.propertyName === 'height' && !pricesSummary.classList.contains('price-summary-app--collapsed')) {
      pricesSummary.style.height = '';
    }
  });

  pricesToggle.addEventListener('click', function () {
    var open = pricesToggle.getAttribute('aria-expanded') === 'true';
    pricesToggle.setAttribute('aria-expanded', open ? 'false' : 'true');

    /* Отсчёт всегда от измеренной высоты: и когда схлопываем (от неё к нулю),
       и когда раскрываем (от нуля к ней). */
    var full = pricesSummary.scrollHeight;

    if (open) {
      pricesSummary.style.height = full + 'px';
      pricesSummary.inert = true;
      /* Принудительный пересчёт между «зафиксировали высоту» и «поехали к нулю»:
         без него браузер склеит оба значения в одно и перехода не будет. Чтение
         offsetHeight, а не requestAnimationFrame, — чтобы всё случилось в этом же
         обработчике: отложенный кадр при двойном клике добавлял бы класс уже после
         того, как блок снова раскрыли. */
      void pricesSummary.offsetHeight;
      pricesSummary.classList.add('price-summary-app--collapsed');
      pricesSummary.style.height = '0px';
    } else {
      pricesSummary.inert = false;
      pricesSummary.classList.remove('price-summary-app--collapsed');
      pricesSummary.style.height = full + 'px';
      /* Переход выключен (reduced-motion) — transitionend не придёт, отпускаем сразу. */
      if (!animates(pricesSummary)) pricesSummary.style.height = '';
    }
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
