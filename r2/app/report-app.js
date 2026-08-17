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
 * Конкуренты берутся из competitors-data.js — того же мира объектов, что и вебовый
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
  var n = parseInt(params.get('n') || '5', 10);
  if (!(n > 0)) n = 5;
  n = Math.min(n, total);

  var u = parseInt(params.get('u') || '0', 10);
  if (!(u > 0)) u = 0;

  /* --- Мой объект ---
     Значения по умолчанию — из макета, чтобы страница открывалась и без параметров. */
  var base = {
    desc:  params.get('desc')  || '1-комн. кв., 50 м², 2/12 этаж',
    price: params.get('price') || '19 130 000',
    photo: params.get('photo') || '../photos/mo/mo1-1.jpg'
  };

  var baseRow = document.getElementById('base-object');
  baseRow.querySelector('.ad-row-app__title').textContent = base.desc;
  baseRow.querySelector('.ad-row-app__price').textContent = base.price + ' ₽';
  baseRow.querySelector('.ad-row-app__photo').src = base.photo;

  /* --- Апдейты: кому какой бейдж ---
     Кандидатов выбирают сами данные: цена — первому с непустым priceDelta, снятие —
     первому со признаком removed. Остаток апдейтов уходит в строку-предложение. */
  var shown = ALL_COMPETITORS.slice(0, n);
  var priceIdx = -1, removedIdx = -1, left = u;

  if (left > 0) {
    for (var i = 0; i < shown.length; i++) {
      if (shown[i].priceDelta) { priceIdx = i; left--; break; }
    }
  }
  if (left > 0) {
    for (var j = 0; j < shown.length; j++) {
      if (j !== priceIdx && shown[j].removed) { removedIdx = j; left--; break; }
    }
  }
  var fresh = left;

  /* --- Конкуренты --- */
  document.getElementById('competitors-title').textContent = pluralCompetitors(n);

  var PLACEHOLDER = '../_design-system/assets/icons/image-placeholder-16.svg';

  function badge(text) {
    return '<span class="badge-app badge-app--warning badge-app--secondary ad-row-app__badge">'
      + '<span class="badge-app__text">' + esc(text) + '</span></span>';
  }

  var listEl = document.getElementById('competitors');
  listEl.innerHTML = shown.map(function (c, i) {
    var photo = c.photos && c.photos[0];
    var mark = i === priceIdx ? 'Цена изменилась'
             : i === removedIdx ? 'Сняли с публикации ' + removedDate(c)
             : null;
    return '<a class="ad-row-app' + (mark ? ' ad-row-app--badged' : '') + '" href="#">'
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
      'Что изменилось с вашего прошлого визита, <span class="hint-app__muted">2 дня назад</span>';
  }

  /* --- Строка-предложение --- */
  if (fresh > 0) {
    /* Кандидат — первый активный объект за пределами списка: так же делит мир и
       экран конкурентов (competitors-app.js): до n отслеживаются, дальше подборка
       и архив. */
    var suggest = null;
    for (var k = n; k < ALL_COMPETITORS.length; k++) {
      if (!ALL_COMPETITORS[k].removed) { suggest = ALL_COMPETITORS[k]; break; }
    }
    if (suggest) {
      var suggestRow = document.getElementById('suggest-row');
      document.getElementById('suggest-badge').textContent = pluralNew(fresh);
      suggestRow.querySelector('.ad-row-app__photo').src = suggest.photos[0];
      /* Список закрывается разделителем: под ним теперь ещё одна строка. */
      listEl.classList.add('ad-list-app--closed');
      suggestRow.hidden = false;
    }
  }

  /* Объект едет по ссылкам целиком, чтобы с любого экрана можно было вернуться
     назад без потери контекста. Апдейты — тоже: иначе заход в список конкурентов
     и обратно сбрасывал бы экран в состояние «изменений нет». */
  var qs = new URLSearchParams({ n: n, desc: base.desc, price: base.price, photo: base.photo });
  if (u > 0) qs.set('u', u);

  /* Вход в отчёт ведёт в настройку на этой же поверхности (2026-08-15).
     Раньше он уходил в вебовый report.html — настройки для приложения просто
     не было. Сам PDF по-прежнему собирается в вебовой версии, кнопка на него
     стоит в конце настройки. */
  document.getElementById('report-entry').setAttribute('href', 'owner-report-app.html?' + qs);

  /* Стрелка у заголовка ведёт в развёрнутый список конкурентов. */
  document.getElementById('all-competitors').setAttribute('href', 'competitors-app.html?' + qs);

  /* А строка-предложение — сразу на вкладку «Подборка»: новый конкурент живёт там,
     а не среди отслеживаемых. */
  var suggestQs = new URLSearchParams(qs);
  suggestQs.set('tab', 'selection');
  document.getElementById('suggest-link').setAttribute('href', 'competitors-app.html?' + suggestQs);
})();
