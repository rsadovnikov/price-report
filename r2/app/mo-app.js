/* Экран «Мои объявления» (поверхность приложения) — поведение.
 *
 * Пока здесь одно: меню действий по «•••» в сниппете (макет Figma 563:72835).
 * Сам компонент шторки — в дизайн-системе, тут только состав меню и данные объявления.
 */
(function () {
  'use strict';

  var DS = '../_design-system/';

  /* Состав меню одинаков для всех объявлений — это меню объявления, а не состояния.
     Строка обзора конкурентов помечена, чтобы подставить в неё ссылку и бейдж. */
  var ITEMS = [
    { icon: 'price',    label: 'Изменить цену' },
    { icon: 'edit',     label: 'Редактировать' },
    { icon: 'document', label: 'Договор аренды онлайн' },
    { icon: 'chart',    label: 'Статистика по объявлению' },
    { icon: 'pdf',      label: 'Обзор конкурентов', competitors: true },
    { icon: 'share',    label: 'Поделиться' },
    { icon: 'locker',   label: 'Перенести в архив' },
    { icon: 'trash',    label: 'Удалить объявление' }
  ];

  function pluralUpdates(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return n + ' обновление';
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return n + ' обновления';
    return n + ' обновлений';
  }

  /* Ссылка на обзор конкурентов несёт данные объявления: экран отчёта показывает
     его как «Мой объект». В разметке их не дублируем — читаем из самого сниппета,
     чтобы у объявления остался один источник правды. Без JS ссылка тоже работает:
     экран отчёта подставит значения по умолчанию. */
  function enrichCompetitorLinks() {
    document.querySelectorAll('.snippet-app').forEach(function (snippet) {
      var tile = snippet.querySelector('[data-action="competitors"]');
      if (!tile) return;
      var txt = function (sel) {
        var el = snippet.querySelector(sel);
        return el ? el.textContent.trim() : '';
      };
      var photoEl = snippet.querySelector('.snippet-app__photo');
      var url = new URL(tile.getAttribute('href'), location.href);
      url.searchParams.set('desc', txt('.snippet-app__params'));
      /* Цена в сниппете уже с «₽» — на экране отчёта знак добавляется свой */
      url.searchParams.set('price', txt('.snippet-app__price').replace(/\s*₽\s*$/, ''));
      if (photoEl) url.searchParams.set('photo', photoEl.getAttribute('src'));
      tile.setAttribute('href', url.pathname.split('/').pop() + url.search);
    });
  }
  enrichCompetitorLinks();

  /* Верхнее объявление — сценарий первого входа в раздел (решение Романа 2026-08-22).
     Пока мониторинг не включён, на кнопке нет числа: конкурентов ещё не искали.
     Вернулись после активации — подпись встаёт в общий ряд, «N конкурентов», и
     повторный заход идёт уже без поиска и онбординга.

     Число берём из самой ссылки (`?n=`), чтобы подпись и раздел не разошлись.
     Подпись «Конкуренты» без числа — та же, что у неактивированного объявления
     в вебовых «Моих объявлениях» (index.html). */
  function pluralCompetitors(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return n + ' конкурент';
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return n + ' конкурента';
    return n + ' конкурентов';
  }

  var firstTile = document.getElementById('competitors-first');
  if (firstTile && sessionStorage.getItem('monitoring-on')) {
    var n = parseInt(new URL(firstTile.getAttribute('href'), location.href)
                       .searchParams.get('n') || '5', 10);
    firstTile.querySelector('.action-tile-app__title').textContent = pluralCompetitors(n);
  }

  document.addEventListener('click', function (e) {
    var more = e.target.closest('.snippet-app__more');
    if (!more) return;

    var snippet = more.closest('.snippet-app');
    if (!snippet) return;

    var updates = parseInt(snippet.dataset.updates || '0', 10);
    /* Ссылку на отчёт не дублируем в data-атрибут — берём с самой плитки конкурентов,
       чтобы у объявления был один источник правды. */
    var tile = snippet.querySelector('[data-action="competitors"]');
    var href = tile ? tile.getAttribute('href') : null;

    var items = ITEMS.map(function (item) {
      if (!item.competitors) return item;
      return {
        icon: item.icon,
        label: item.label,
        href: href || undefined,
        /* Бейдж — тот самый «флаг Обновления» из блока конкурентов. Нет обновлений —
           строка остаётся, бейджа нет. */
        badge: updates > 0 ? pluralUpdates(updates) : null
      };
    });

    openSheet({
      title: 'Действия',
      base: DS,
      items: items,
      ariaLabel: 'Действия с объявлением'
    });
  });
})();
