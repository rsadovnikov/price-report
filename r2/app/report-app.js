/* Экран «Обзор конкурентов» (поверхность приложения) — наполнение.
 *
 * Разметка — в report-app.html, компоненты — в ../_design-system/components/app/.
 * Здесь только данные: чей объект наверху, сколько конкурентов показать и что у них
 * изменилось с прошлого визита.
 *
 * Параметры URL:
 *   n      — сколько конкурентов показать (по умолчанию 5)
 *   u      — сколько у них апдейтов (по умолчанию 0 — состояние «изменений нет»)
 *   desc   — описание «Моего объекта»
 *   price  — цена «Моего объекта», без «₽»
 *   photo  — путь к фото «Моего объекта»
 *
 * Конкуренты берутся из общей базы мок-данных (mock-connect.js) — того же мира
 * объектов, что и вебовый
 * отчёт. Выбираются ПЕРВЫЕ n: подбор по похожести живёт в отчёте, здесь список —
 * витрина, а не результат подбора. Если понадобится настоящий подбор — тянуть его
 * из report.js, а не переписывать заново.
 *
 * Апдейты раскладываются по тому же правилу, что в вебовом отчёте (report.js,
 * markUpdates): один «Цена изменилась», один «Сняли с публикации», остаток —
 * новые возможные конкуренты из подборки. Макет 696:24081 нарисован с u=3 — и это
 * ровно два бейджа в списке плюс строка-предложение под ним.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function pluralCompetitors(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return n + ' ближайший конкурент';
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return n + ' ближайших конкурента';
    return n + ' ближайших конкурентов';
  }

  /* Формулировка та же, что у вебового бара «N новых возможных конкурентов»
     (report.js, updateNewCompetitorsBar) — не заводим второй вариант копирайта. */
  function pluralNew(n) {
    if (n === 1) return 'Новый возможный конкурент';
    return n + (n < 5 ? ' новых возможных конкурента' : ' новых возможных конкурентов');
  }

  /* Дата снятия с публикации: считается от той же точки, что и дата подачи.
     Формат «5.07» — из макета, как на карточке конкурента (competitors-app.js). */
  function removedDate(c) {
    var d = new Date();
    d.setDate(d.getDate() - (c.days - (c.removedAfterDays || 0)));
    return d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0');
  }

  var total = (typeof ALL_COMPETITORS !== 'undefined' && ALL_COMPETITORS.length) || 0;
  /* Ноль — законное значение, а не «параметра нет»: агент мог убрать из отслеживаемых
     всех, и `competitors-app.js` честно вернёт `n=0`. Раньше здесь стояло `n > 0`, и
     ноль подменялся пятёркой — то есть удалённые конкуренты молча воскресали. */
  var n = parseInt(params.get('n') || '5', 10);
  if (!(n >= 0)) n = 5;
  n = Math.min(n, total);

  var u = parseInt(params.get('u') || '0', 10);
  if (!(u > 0)) u = 0;

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

  var baseRow = document.getElementById('base-object');
  baseRow.querySelector('.ad-row-app__title').textContent = base.desc;
  baseRow.querySelector('.ad-row-app__price').textContent = base.price + ' ₽';
  baseRow.querySelector('.ad-row-app__photo').src = base.photo;

  /* Объект едет по ссылкам целиком, чтобы с любого экрана можно было вернуться
     назад без потери контекста. Апдейты — тоже: иначе заход в список конкурентов
     и обратно сбрасывал бы экран в состояние «изменений нет». */
  var qs = new URLSearchParams({ n: n, desc: base.desc, price: base.price, photo: base.photo });
  if (u > 0) qs.set('u', u);
  /* `from` — какого объявления «Моих» это раздел. Объект тут описан своими полями
     (desc/price/photo), но по ним нельзя найти сниппет обратно, а по выходу надо
     обновить именно его плитку. */
  var from = params.get('from') || '';
  if (from) qs.set('from', from);

  /* --- След для «Моих объявлений» ------------------------------------------
     По выходу из раздела в МО стреляет снекбар «Продолжаем отслеживать N…»
     (макет 841:91652). Выход — это появление «Моих объявлений», а не тап по
     стрелке: назад уходят и системным жестом, и кнопкой браузера, и через
     «Сохранить и выйти» на настройке. Поэтому раздел на каждом заходе кладёт
     своё состояние, а МО его читает и сразу забирает — тогда снекбар случается
     ровно один раз и ровно на выходе, а не на каждое действие внутри.

     Число тут — то же `n`, что показано на экране: сколько конкурентов
     отслеживается. Ноль — законное значение, у него своя формулировка. */
  try {
    sessionStorage.setItem('tracking-exit', JSON.stringify({ from: from, n: n }));
  } catch (_) {}

  /* Вся секция конкурентов ведёт в список отслеживаемых: и заголовок, и плашка,
     и каждая строка. Отдельного экрана под одного конкурента нет, поэтому адрес
     у всех один (просьба Романа, 2026-08-18). */
  var listHref = 'competitors-app.html?' + qs;

  /* --- Апдейты: кому какой бейдж ---
     Раскладка живёт в общем модуле `updates-app.js`: те же флаги обязан показать
     список конкурентов, и правило, лежащее внутри одного из двух экранов, они
     разъезжаются молча — так и вышло до 2026-08-23. */
  /* Показываем только сравнимое с объектом: апартаменты не сопоставляют с
     квартирами (см. preset.js). Сравнимых нет — список пуст, и экран уходит
     в нулевое состояние тем же путём, что при «убрал всех из отслеживаемых». */
  var comparable = ALL_COMPETITORS.filter(function (c) {
    return AppPreset.comparable(c, base.desc);
  });
  var shown = comparable.slice(0, n);
  /* Пресет тот же, что на экране подборки: новый конкурент обязан там найтись,
     иначе строка-предложение ведёт в список, где обещанного объекта нет. */
  var marks = AppUpdates.allocate(ALL_COMPETITORS, n, u, base.desc);
  var priceIdx = marks.priceIdx, removedIdx = marks.removedIdx, fresh = marks.fresh;

  /* --- Конкуренты --- */
  document.getElementById('competitors-title').textContent = pluralCompetitors(n);

  var PLACEHOLDER = '../_design-system/assets/icons/image-placeholder-16.svg';

  function badge(text) {
    return '<span class="badge-app badge-app--warning badge-app--secondary ad-row-app__badge">'
      + '<span class="badge-app__text">' + esc(text) + '</span></span>';
  }

  var listEl = document.getElementById('competitors');
  /* Показываем не сам срез, а его ИНДЕКСЫ в `ALL_COMPETITORS` — в них же считает
     раскладку `AppUpdates`, и в них же говорит соседний экран. Раньше флаг ставился
     по позиции внутри `shown` (то есть внутри сравнимых), и это работало только пока
     первые n сравнимых совпадают с первыми n всего массива. Совпадение данных, а не
     правило: стоило бы несравнимому объекту попасть в начало — и флаг уехал бы на
     чужую строку, как это уже было до общего модуля (2026-08-23). */
  var order = AppUpdates.hoist(shown.map(function (c) {
    return ALL_COMPETITORS.indexOf(c);
  }), marks);
  listEl.innerHTML = order.map(function (idx) {
    var c = ALL_COMPETITORS[idx];
    var photo = c.photos && c.photos[0];
    var mark = idx === priceIdx ? 'Цена изменилась'
             : idx === removedIdx ? 'Сняли с публикации ' + removedDate(c)
             : null;
    return '<a class="ad-row-app' + (mark ? ' ad-row-app--badged' : '') + '"'
      + ' href="' + esc(listHref) + '">'
      + (photo
        ? '<img class="ad-row-app__photo" src="' + esc(photo) + '" alt="">'
        : '<span class="ad-row-app__photo ad-row-app__photo--empty"><img src="' + PLACEHOLDER + '" alt=""></span>')
      + '<span class="ad-row-app__body">'
        + '<span class="ad-row-app__title">' + esc(c.desc) + '</span>'
        + '<span class="ad-row-app__price">' + esc(c.currentPrice) + ' ₽</span>'
        + (mark ? badge(mark) : '')
      + '</span>'
      + '</a>';
  }).join('');

  /* Плашка над списком: без апдейтов рассказывает, что сервис делает, с апдейтами —
     что изменилось. «2 дня назад» — константа макета: прошлый визит прототип не
     отслеживает. */
  if (u > 0) {
    document.getElementById('tracking-hint').innerHTML =
      /* Срок склеен неразрывными пробелами (просьба Романа 2026-08-22): «2 дня назад»
         либо целиком стоит в строке, либо целиком уезжает на следующую. Разорванный
         срок читается как обрывок другой мысли — «…визита, 2» и строкой ниже «дня назад». */
      'Что изменилось с вашего прошлого визита, '
      + '<span class="hint-app__muted">2\u00A0дня\u00A0назад</span>';
  }

  /* --- Строка-предложение --- */
  if (fresh > 0) {
    /* Кандидатов выбрал общий модуль — те же объекты помечены «Новый конкурент»
       в подборке. Показываем первого, счётчик в бейдже говорит, сколько их всего. */
    var suggest = marks.freshIds.length ? ALL_COMPETITORS[marks.freshIds[0]] : null;
    if (suggest) {
      var suggestRow = document.getElementById('suggest-row');
      document.getElementById('suggest-badge').textContent = pluralNew(fresh);
      suggestRow.querySelector('.ad-row-app__photo').src = suggest.photos[0];
      /* Список закрывается разделителем: под ним теперь ещё одна строка. */
      listEl.classList.add('ad-list-app--closed');
      suggestRow.hidden = false;
    }
  }

  /* Вход в отчёт ведёт в настройку на этой же поверхности (2026-08-15).
     Раньше он уходил в вебовый report.html — настройки для приложения просто
     не было. Сам PDF по-прежнему собирается в вебовой версии, кнопка на него
     стоит в конце настройки. */
  document.getElementById('report-entry').setAttribute('href', 'owner-report-app.html?' + qs);

  /* Заголовок секции и плашка над списком — те же ворота в список конкурентов. */
  document.getElementById('all-competitors').setAttribute('href', listHref);
  document.getElementById('tracking-hint-link').setAttribute('href', listHref);

  /* А строка-предложение — сразу на вкладку «Активные»: новый конкурент живёт там,
     а не среди отслеживаемых. */
  var suggestQs = new URLSearchParams(qs);
  suggestQs.set('tab', 'selection');
  document.getElementById('suggest-link').setAttribute('href', 'competitors-app.html?' + suggestQs);

  /* Кнопка нулевого состояния ведёт туда же: выбирать конкурентов негде, кроме
     подборки — вкладка «Отслеживаемые» на этом экране как раз и пуста. */
  document.getElementById('empty-choose').setAttribute('href', 'competitors-app.html?' + suggestQs);

  /* --- Плавающая копия входа в отчёт ---
     Ведёт себя как `position: sticky`: пока место кнопки ниже прижатого положения,
     копия висит у нижнего края; как только место поднялось — копия отдаёт эстафету
     настоящей кнопке ровно в той точке, где та встала. В этот момент обе позиции
     совпадают, поэтому переключения не видно: кнопка не уезжает и не гаснет, а
     приземляется на своё место. Назад — так же, зеркально.

     Нативным `sticky` этого не сделать: он не выходит за пределы родителя, а
     родитель кнопки — карточка отчёта, которой на первом экране ещё нет.

     Считаем на прокрутке, а не наблюдателем: наблюдатель отвечает «пересеклись или
     нет», а нам нужно сравнить две координаты. Пересчёт прижат к кадру через
     requestAnimationFrame — на инерционном скролле событий больше, чем кадров. */
  var floatBar = document.getElementById('report-float');
  var floatLink = document.getElementById('report-float-link');
  var realEntry = document.getElementById('report-entry');
  floatLink.setAttribute('href', 'owner-report-app.html?' + qs);

  var landed = null;
  function place() {
    /* Копию не двигаем, поэтому её собственный бокс и есть прижатое положение —
       вместе с вырезом под home-индикатор, считать его отдельно не нужно.
       `visibility: hidden` бокс не убирает, так что измерение работает и в
       приземлённом состоянии. */
    var pinned = floatLink.getBoundingClientRect().top;
    var home = realEntry.getBoundingClientRect().top;
    var now = home <= pinned + 0.5;
    if (now === landed) return;
    landed = now;
    floatBar.classList.toggle('screen-footer-app--landed', now);
    floatBar.inert = now;
  }

  var scheduled = false;
  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; place(); });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  /* Фото приезжают своими размерами, но подстраховаться дешевле, чем ловить
     сдвиг раскладки после загрузки. */
  addEventListener('load', onScroll);

  place();
  /* Между первым состоянием и включением анимации — принудительный пересчёт:
     без него браузер видит оба изменения в одном кадре и всё равно анимирует.
     Не rAF: тот отдаёт следующему кадру, а зафиксировать надо сейчас. */
  void floatBar.offsetHeight;
  floatBar.classList.add('screen-footer-app--animated');

  /* ------------------------------------------------------------------ *
   *  Первый заход: поиск конкурентов и онбординг                        *
   * ------------------------------------------------------------------ */

  /* Сценарий (решение Романа 2026-08-22): у верхнего объявления в «Моих
     объявлениях» мониторинг ещё не включён, и кнопка там без числа — просто
     «Конкуренты». Тап включает мониторинг, и раздел открывается пустым: список
     ищется 4 секунды. Через полсекунды поверх поднимается онбординг — агент
     читает три экрана, а конкуренты в это время «находятся».

     Дальше онбординг сам не появляется никогда: только по «Что умеет сервис».

     Флаг мониторинга живёт в sessionStorage, а не в localStorage: прототип
     показывают, и сценарий первого входа должен возвращаться с новой вкладкой.
     Принудительно вызвать онбординг — `?onb=1`.

     Параметр тот же, что в вебе (`index.html` → `report.html`): там неактивированное
     объявление тоже открывает отчёт через `?activate=1` и трёхсекундный лоадер.
     Второй конвенции для приложения не заводим. Секунд здесь четыре — под онбординг
     (просьба Романа 2026-08-22), и это расхождение с вебом. */
  var STORE_TRACKING = 'monitoring-on';
  var STEPS = [
    { title: 'Обзор конкурентов объекта',
      note: 'Все похожие объекты в одном месте: выбирайте подходящие и сравнивайте по важным для вас параметрам',
      button: 'И это ещё не всё',
      video: 'media/onb-1.mp4',
      poster: 'media/onb-1.jpg' },
    /* У второго шага ролика пока нет — остаётся плейсхолдер; снимем — добавится теми же
       двумя строками, что у первого и третьего. */
    { title: 'Изменения в онлайн-режиме',
      note: 'Отслеживайте конкурентов в динамике: покажем, если у них изменилась цена, их продали или сняли с публикации',
      button: 'А что ещё есть?' },
    { title: 'Отчёт для собственника',
      note: 'Соберите PDF-отчёт, который поможет обосновать изменение стоимости для клиента',
      button: 'Будем разбираться',
      video: 'media/onb-3.mp4',
      poster: 'media/onb-3.jpg' }
  ];

  function showOnboarding() {
    return openOnboarding({ base: '../_design-system/', steps: STEPS });
  }

  document.getElementById('onboarding-link').addEventListener('click', function (e) {
    e.preventDefault();
    showOnboarding();
  });

  var loadingEl = document.getElementById('report-loading');
  var blockEl = document.getElementById('report-block');
  var ctaEl = document.getElementById('report-cta');
  var emptyEl = document.getElementById('report-empty');
  /* Подвал со «Добавить по ссылке» живёт вместе с пустым состоянием: это его
     вторая половина, а не отдельное состояние экрана. */
  var emptyLinkEl = document.getElementById('report-empty-link');

  /* Коллаж пустого состояния — три кадра из общей базы. В разметке их нет: путь
     к файлу больше не идентификатор объекта, а сама картинка тут декорация, и
     держать её захардкоженной значит однажды сослаться на кадр, которого в
     наборе не осталось. */
  (function fillCollage() {
    var shots = emptyEl ? emptyEl.querySelectorAll('.empty-state-app__photo') : [];
    for (var i = 0; i < shots.length; i++) {
      var c = ALL_COMPETITORS[i];
      if (c && c.photos && c.photos[0]) shots[i].src = c.photos[0];
    }
  })();

  /* --- Ноль отслеживаемых ---
     Это не «список из нуля строк», а другое состояние экрана (макет 696:75455):
     вместо карточки конкурентов встаёт карточка с предложением их выбрать.
     Вместе с ними уезжает и карточка отчёта: отчёт собирается ИЗ конкурентов, и
     звать «настроить и создать» там, где сравнивать не с чем, — тупик. В макете
     под пустой карточкой пусто до низа экрана, то есть отсутствие входа в отчёт
     нарисовано, а не забыто. Плавающая копия кнопки уходит по той же причине.

     Состояние стало достижимым только 2026-08-23: до этого `n=0` подменялся
     пятёркой, и убранные конкуренты воскресали на первом же переходе. */
  /* Пусто по двум причинам, и экран у них общий: агент убрал всех из
     отслеживаемых (`n=0`) — или сравнивать не с чем вовсе. Второе случается,
     когда объект другой природы: у апартаментов нет сопоставимых апартаментов
     поблизости, и подставлять вместо них квартиры значит соврать в отчёте. */
  var isEmpty = n === 0 || shown.length === 0;

  function showContent() {
    emptyEl.hidden = !isEmpty;
    emptyLinkEl.hidden = !isEmpty;
    blockEl.hidden = isEmpty;
    ctaEl.hidden = isEmpty;
    floatBar.hidden = isEmpty;
    /* Пока шёл поиск, мерить было нечего: настоящей кнопки на экране не было,
       и копия осталась бы приземлённой навсегда. */
    place();
  }

  function finishSearch() {
    loadingEl.hidden = true;
    showContent();
  }

  var isNew = params.get('activate') === '1' && !sessionStorage.getItem(STORE_TRACKING);

  if (isNew) {
    try { sessionStorage.setItem(STORE_TRACKING, '1'); } catch (_) {}
    loadingEl.hidden = false;
    emptyEl.hidden = true;
    emptyLinkEl.hidden = true;
    blockEl.hidden = true;
    ctaEl.hidden = true;
    floatBar.hidden = true;
    /* Поиск идёт своим ходом и не зависит от того, дочитали ли онбординг:
       закрыть его на первом шаге — значит вернуться к радару (решение Романа).
       Иначе выходило бы, что загрузка была декорацией к онбордингу. */
    setTimeout(finishSearch, 4000);
    setTimeout(showOnboarding, 500);
  } else {
    showContent();
    if (params.get('onb') === '1') showOnboarding();
  }
})();
