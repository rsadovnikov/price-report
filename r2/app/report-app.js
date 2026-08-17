/* Экран «Обзор конкурентов» (поверхность приложения) — наполнение.
 *
 * Разметка — в report-app.html, компоненты — в ../_design-system/components/app/.
 * Здесь только данные: чей объект наверху и сколько конкурентов показать.
 *
 * Параметры URL:
 *   n      — сколько конкурентов показать (по умолчанию 5)
 *   desc   — описание «Моего объекта»
 *   price  — цена «Моего объекта», без «₽»
 *   photo  — путь к фото «Моего объекта»
 *
 * Конкуренты берутся из competitors-data.js — того же мира объектов, что и вебовый
 * отчёт. Выбираются ПЕРВЫЕ n: подбор по похожести живёт в отчёте, здесь список —
 * витрина, а не результат подбора. Если понадобится настоящий подбор — тянуть его
 * из report.js, а не переписывать заново.
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

  var total = (typeof ALL_COMPETITORS !== 'undefined' && ALL_COMPETITORS.length) || 0;
  var n = parseInt(params.get('n') || '5', 10);
  if (!(n > 0)) n = 5;
  n = Math.min(n, total);

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

  /* --- Конкуренты --- */
  document.getElementById('competitors-title').textContent = pluralCompetitors(n);

  var PLACEHOLDER = '../_design-system/assets/icons/image-placeholder-16.svg';
  var CHEVRON = '../_design-system/assets/icons/chevron-right-12.svg';

  document.getElementById('competitors').innerHTML = ALL_COMPETITORS.slice(0, n).map(function (c) {
    var photo = c.photos && c.photos[0];
    return '<a class="ad-row-app" href="#">'
      + (photo
        ? '<img class="ad-row-app__photo" src="' + esc(photo) + '" alt="">'
        : '<span class="ad-row-app__photo ad-row-app__photo--empty"><img src="' + PLACEHOLDER + '" alt=""></span>')
      + '<span class="ad-row-app__body">'
        + '<span class="ad-row-app__title">' + esc(c.desc) + '</span>'
        + '<span class="ad-row-app__price">' + esc(c.currentPrice) + ' ₽</span>'
      + '</span>'
      + '</a>';
  }).join('');

  /* Объект едет по ссылкам целиком, чтобы с любого экрана можно было вернуться
     назад без потери контекста. */
  var qs = new URLSearchParams({ n: n, desc: base.desc, price: base.price, photo: base.photo });

  /* Вход в отчёт ведёт в настройку на этой же поверхности (2026-08-15).
     Раньше он уходил в вебовый report.html — настройки для приложения просто
     не было. Сам PDF по-прежнему собирается в вебовой версии, кнопка на него
     стоит в конце настройки. */
  document.getElementById('report-entry').setAttribute('href', 'owner-report-app.html?' + qs);

  /* Стрелка у заголовка ведёт в развёрнутый список конкурентов. */
  document.getElementById('all-competitors').setAttribute('href', 'competitors-app.html?' + qs);
})();
