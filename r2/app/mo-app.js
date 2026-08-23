/* Экран «Мои объявления» (поверхность приложения) — поведение.
 *
 * Две вещи: меню действий по «•••» в сниппете (макет Figma 563:72835) и возвращение
 * из раздела конкурентов — снекбар «Продолжаем отслеживать N…» (макет 841:91652)
 * плюс обновлённая плитка того объявления, в раздел которого ходили.
 * Компоненты шторки и снекбара — в дизайн-системе, тут только состав и данные.
 */
(function () {
  'use strict';

  var DS = '../_design-system/';

  /* Объявления агента приходят из общей базы. В разметке остаётся только каркас
     сниппета: цена, описание, адрес и кадр — факты объявления, и держать их в
     HTML значит однажды разойтись с базой молча. Порядок сниппетов на экране —
     порядок `MOCK_SCENARIO.base`.

     `data-listing` не трогаем: это ключ сниппета, по которому раздел конкурентов
     возвращается к нужной плитке, а не идентификатор объявления. */
  (function fillListings() {
    if (typeof MY_LISTINGS === 'undefined') return;
    document.querySelectorAll('.snippet-app').forEach(function (snippet, i) {
      var b = MY_LISTINGS[i];
      if (!b) return;
      var set = function (sel, text) {
        var el = snippet.querySelector(sel);
        if (el) el.textContent = text;
      };
      var photo = snippet.querySelector('.snippet-app__photo');
      if (photo) photo.src = b.photos[0] || '';
      set('.snippet-app__price', b.currentPrice + ' ₽');
      set('.snippet-app__params', b.desc);
      set('.snippet-app__addr', 'м. ' + b.metroStation + ', ' + b.addressShort);

      /* Объекту, которому не с чем сравниваться, число на плитке не рисуем.
         «0 конкурентов» читается как ошибка, а любое другое число было бы
         неправдой: внутри раздела его встретит пустое состояние. Подпись
         «Конкуренты» для этого уже нарисована — ею же помечен объект, по
         которому мониторинг ещё не включали. */
      var rivals = (typeof ALL_COMPETITORS === 'undefined') ? 1
        : ALL_COMPETITORS.filter(function (c) {
            return !c.removed && AppPreset.comparable(c, b.desc);
          }).length;
      if (!rivals) {
        var tile = snippet.querySelector('[data-action="competitors"]');
        if (tile) {
          var t = tile.querySelector('.action-tile-app__title');
          if (t) t.textContent = 'Конкуренты';
          var u = new URL(tile.getAttribute('href'), location.href);
          u.searchParams.set('n', '0');
          tile.setAttribute('href', u.pathname.split('/').pop() + u.search);
        }
        snippet.removeAttribute('data-updates');
      }
    });
  })();

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
      /* Кто именно ушёл в раздел. Объект описан своими полями, но найти по ним
         сниппет обратно нельзя — а по выходу надо обновить именно его плитку. */
      if (snippet.dataset.listing) url.searchParams.set('from', snippet.dataset.listing);
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
  /* Число и его существительное склеены неразрывным пробелом (просьба Романа
     2026-08-23): в снекбаре строка переносится, и «Продолжаем отслеживать 5» с
     «конкурентов» на следующей строке читается как обрывок. То же правило, что
     у «2 дня назад» на плашке обзора. */
  function pluralCompetitors(n) {
    var t = n % 10, h = n % 100;
    if (t === 1 && h !== 11) return n + ' конкурент';
    if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return n + ' конкурента';
    return n + ' конкурентов';
  }

  var firstTile = document.getElementById('competitors-first');
  if (firstTile && sessionStorage.getItem('monitoring-on')) {
    var n = parseInt(new URL(firstTile.getAttribute('href'), location.href)
                       .searchParams.get('n') || '5', 10);
    firstTile.querySelector('.action-tile-app__title').textContent = pluralCompetitors(n);
  }

  /* ------------------------------------------------------------------ *
   *  Возврат из раздела конкурентов                                     *
   * ------------------------------------------------------------------ */

  /* След оставляет `report-app.js` на каждом своём заходе: `{ from, n }` —
     чьё это объявление и сколько конкурентов сейчас отслеживается. «Мои
     объявления» его читают, потому что появление этого экрана и есть выход
     из раздела: назад уходят и стрелкой, и системным жестом, и «Сохранить и
     выйти» с настройки — ловить каждый из путей по отдельности значило бы
     развести одно событие по трём местам.

     Снекбар — один раз на выход (`seen`), а плитка обновляется при каждом
     показе экрана: число в ней должно пережить перезагрузку, а всплывающее
     уведомление — нет. */
  var EXIT_STORE = 'tracking-exit';

  function readExit() {
    try { return JSON.parse(sessionStorage.getItem(EXIT_STORE) || 'null'); }
    catch (_) { return null; }
  }

  /* Плитка несёт и подпись, и адрес: без правки адреса повторный заход в раздел
     открыл бы его прежним составом — то есть удалённые конкуренты вернулись бы. */
  function setTileCount(snippet, count) {
    var tile = snippet.querySelector('[data-action="competitors"]');
    if (!tile) return;
    var note = tile.querySelector('.action-tile-app__note');

    if (count > 0) {
      tile.querySelector('.action-tile-app__title').textContent = pluralCompetitors(count);
    } else {
      /* Нуля числом в макетах нет, а «0 конкурентов» читается как ошибка. Берём
         подпись, которая для «не отслеживаем» уже нарисована, — ту же, что у
         объявления до включения мониторинга. Заодно снимаем флаг обновлений:
         конкурентов нет, значит и меняться нечему — и в плитке, и в меню «•••». */
      tile.querySelector('.action-tile-app__title').textContent = 'Конкуренты';
      tile.classList.remove('action-tile-app--warning');
      if (note) note.remove();
      snippet.dataset.updates = '0';
    }

    var url = new URL(tile.getAttribute('href'), location.href);
    url.searchParams.set('n', count);
    /* Поиск уже прошёл — второй раз показывать радар и онбординг незачем. */
    url.searchParams.delete('activate');
    if (count === 0) url.searchParams.delete('u');
    tile.setAttribute('href', url.pathname.split('/').pop() + url.search);
  }

  var exit = readExit();
  if (exit && typeof exit.n === 'number') {
    var fromEl = exit.from
      ? document.querySelector('.snippet-app[data-listing="' + exit.from + '"]')
      : null;
    if (fromEl) setTileCount(fromEl, exit.n);

    if (!exit.seen) {
      exit.seen = true;
      try { sessionStorage.setItem(EXIT_STORE, JSON.stringify(exit)); } catch (_) {}
      /* Формулировки из макета 841:91652 и карты коммуникаций 809:23579.
         Оба снекбара тёмные (это режим по умолчанию у компонента), различаются
         типом: продолжаем следить — success, не следим ни за кем — neutral. */
      if (exit.n > 0) {
        showSnackbarApp.success(
          'Продолжаем отслеживать ' + pluralCompetitors(exit.n)
          + ' — сообщим, когда будут изменения', { closable: true });
      } else {
        showSnackbarApp('Не отслеживаем конкурентов по этому объекту', { closable: true });
      }
    }
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
