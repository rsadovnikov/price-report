/* Подключение прототипа к общей базе мок-данных.
 *
 * Порядок подключения на странице:
 *
 *   <script src="../_mock-data/mock.js"></script>
 *   <script src="../_mock-data/datasets/cian-secondary/listings.js"></script>
 *   <script src="mock-scenario.js"></script>
 *   <script src="mock-connect.js"></script>
 *
 * После него на странице есть `ALL_COMPETITORS` — ровно то же имя и та же форма
 * записи, что раньше отдавал `competitors-data.js`. Экраны читают его как читали.
 *
 * Здесь живёт то, что специфично ДЛЯ ЭТОГО ПРОТОТИПА и потому не может лежать ни
 * в данных, ни в общем клиенте: у другого прототипа те же объявления будут
 * пересчитываться иначе.
 */
(function () {
  'use strict';

  if (typeof Mock === 'undefined') throw new Error('mock-connect: сначала подключите mock.js');
  Mock.use('cian-secondary', typeof MOCK_SCENARIO !== 'undefined' ? MOCK_SCENARIO : {});

  /* ── Просмотры ─────────────────────────────────────────────────────────────
   *
   * ЦИАН отдаёт строку своими словами: «711 просмотров, 25 за сегодня». Отчёт
   * показывает пару чисел, и раньше в данных лежало «35 / 881» — за 10 дней и за
   * всё время.
   *
   * ⚠️ Десятидневного окна у источника НЕТ. Это не разница форматов, а другая
   * величина, и достать её неоткуда. Поэтому вторым числом идёт «за сегодня», а
   * подписи в разметке говорят «за сегодня», а не «за 10 дней». Выдумывать
   * десятидневку ради сохранения подписи мы не будем.
   *
   * Разбор живёт здесь, а не в `mock.js`: пара чисел в таком порядке нужна
   * конкретно отчёту (решение Романа 2026-08-23). Хранится строка словами прода.
   */
  var VIEWS_RE = /^\s*(\d+)\s+просмотр\S*,\s*(\d+)\s+за\s+сегодня\s*$/;

  function splitViews(s) {
    var m = VIEWS_RE.exec(String(s || ''));
    return m ? { total: +m[1], today: +m[2] } : null;
  }

  /* Форма записи — та же, что была в `competitors-data.js`. Копируем, а не правим
     на месте: `Mock` отдаёт свой кеш, и он общий для всех, кто его спросит. */
  function adapt(x) {
    var v = splitViews(x.views);
    var o = {};
    for (var k in x) if (Object.prototype.hasOwnProperty.call(x, k)) o[k] = x[k];
    o.views = v ? v.today + ' / ' + v.total : '';
    /* Числами — «Моим объявлениям»: там просмотры показываются одной цифрой с
       приростом, а не парой. Строка для отчёта и число для кабинета — разные
       вопросы к одному факту. */
    o.viewsTotal = v ? v.total : 0;
    o.viewsToday = v ? v.today : 0;
    return o;
  }

  window.ALL_COMPETITORS = Mock.listings().map(adapt);

  /* Объявления агента. `MY_LISTINGS[i]` — то же, что `Mock.base(i)`, но в форме
     записи прототипа. Статистику кабинета (звонки, ставка, позиция) сюда не
     подмешиваем: её нет и не может быть в публичной выдаче, она живёт у экрана. */
  window.MY_LISTINGS = Mock.bases().map(adapt);

  /* Объект агента по индексу, слитый со статистикой кабинета. `cabinet` — объект
     с полями экрана; поля объявления всегда берут верх, чтобы захардкоженное
     число не пережило переезд молча. */
  window.myListing = function (i, cabinet) {
    var b = window.MY_LISTINGS[i];
    if (!b) return null;
    var o = {};
    var k;
    for (k in (cabinet || {})) if (Object.prototype.hasOwnProperty.call(cabinet, k)) o[k] = cabinet[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
    /* Два имени, оставшихся с прежней разметки «Моих объявлений». */
    o.metro = b.metroStation;
    o.photo = b.photos[0] || '';
    o.pricePerM = b.currentPricePerM;
    o.price = b.currentPrice;
    return o;
  };
})();
