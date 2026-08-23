/* Клиент мок-данных. Подключается двумя строками:
 *
 *   <script src="../../_mock-data/mock.js"></script>
 *   <script src="../../_mock-data/datasets/cian-secondary/listings.js"></script>
 *   …
 *   Mock.use('cian-secondary', SCENARIO);
 *   Mock.base();                     объект агента
 *   Mock.listings({ rooms: [1, 2] }); конкуренты
 *
 * ── ДАННЫЕ И СЦЕНАРИЙ ───────────────────────────────────────────────────────
 *
 * В датасете лежат только объявления — 96 одинаково устроенных записей, каждая
 * зеркало страницы ЦИАНа. Различий между ними на уровне хранения нет: нет ни
 * «моих», ни «чужих», ни отдельной сущности под объект агента.
 *
 * Кто чей и что показывать снятым — решает СЦЕНАРИЙ, второй аргумент `use()`:
 *
 *   { base:     [id, id, …],   объявления агента, по порядку показа
 *     archived: [id, id, …] }  показать снятыми с публикации
 *
 * Почему так, а не полем в записи: у объявления на ЦИАНе нет свойства «оно моё» —
 * моим его делает то, с чьей стороны на него смотрят. Один и тот же объект в
 * одном прототипе объект агента, в другом конкурент, и заводить ради этого две
 * записи незачем. До 2026-08-23 роль лежала в данных полем `role`; убрана вместе
 * с `initialChecked` по одному правилу — факт сценария в зеркало не пишем.
 *
 * ⚠️ `archived` — МОДЕЛЬ, а не факт. Настоящее снятие приезжает с прода в
 * `offer.status: "deactivated"`, и его клиент читает сам, без списка. Список
 * нужен, пока такого в наборе нет: собранное вчера объявление снятым быть не
 * может, а показать вкладку «Архивные» надо. Дату снятия при этом не выдумываем —
 * берём настоящий `editDate`. Появится настоящий архив (набор полежит, `refresh`
 * его застанет) — список убирается, ничего больше не меняя. Сколько записей
 * сейчас смоделировано, говорит `Mock.meta().simulated`.
 *
 * У клиента ровно три обязанности, и ни одной лишней.
 *
 * 1. ПУТИ К ФОТО. Имя файла лежит в данных, базу клиент вычисляет из своего
 *    `<script src>`. Поэтому путь верен и локально, и в проде под префиксом, и с
 *    любой глубины вложенности — и в сборщике не нужны `sed`, переписывающие
 *    «photos/» в «../photos/».
 *
 * 2. СДВИГ ВРЕМЕНИ. В данных лежат абсолютные даты ЦИАНа, как он их отдаёт.
 *    Сами по себе они протухают: через год объявление, поданное вчера, окажется
 *    поданным год назад. Поэтому возраст считается не от «сейчас», а от даты
 *    сбора: `days` замирает на том значении, каким было в день набега, и мир
 *    остаётся молодым. Зеркало при этом честное — в хранении ничего не сдвинуто.
 *
 * 3. РЕНДЕР-СЛОЙ. Плоские поля с теми же именами, что читают экраны сегодня:
 *    `desc`, `currentPrice`, `days`, `removed`, `repair`… Это не мост, который мы
 *    придумали, а копия того, как устроен сам ЦИАН: он тоже отдаёт нормализованный
 *    `offer` и рядом готовые `features` / `factoids` с русскими подписями. Сырой
 *    `offer` доступен на той же записи — брать можно любой слой.
 *
 * ⚠️ Словарь значений мы НЕ ведём. «Косметический», «Монолитный», «5 из 5» берутся
 * из `features` и `factoids` — то есть словами прода. Свой словарь разошёлся бы с
 * ЦИАНом на первом же новом значении.
 */
var Mock = (function () {
  'use strict';

  /* База путей — каталог, из которого загрузился этот файл. `document.currentScript`
     доступен, пока скрипт исполняется; фолбэк на последний тег — для случая, когда
     файл подключили динамически. */
  var BASE = (function () {
    var s = document.currentScript;
    if (!s) {
      var all = document.getElementsByTagName('script');
      s = all[all.length - 1];
    }
    return String((s && s.src) || '').replace(/[^/]*$/, '');
  })();

  var ds = null;        // выбранный датасет
  var dsName = '';
  var cache = null;     // рендер-слой, считается один раз
  var sc = { base: [], archived: [] };   // сценарий подключения

  // ── форматирование ────────────────────────────────────────────────────────
  // Числа в подписи. Разряды неразрывным пробелом? Нет: в прототипе прижилась
  // обычная тонкая расстановка через пробел, менять её тут нечего.
  function money(n) {
    return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  var MINUS = '−';   // типографский минус, как в прежних данных
  function signed(n) {
    if (!n) return '';
    return (n > 0 ? '+' : MINUS) + money(Math.abs(n));
  }
  var DAY = 86400000;

  /* Подпись характеристики — из features ЦИАНа по ярлыку. Нет ярлыка — нет
     значения: пропуски не выдумываем, у самого ЦИАНа половина характеристик
     заполнена через раз. */
  function feature(rec, label) {
    var groups = rec.features || [];
    for (var i = 0; i < groups.length; i++) {
      var list = groups[i].features || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].label === label) return list[j].value;
      }
    }
    return '';
  }
  function factoid(rec, title) {
    var list = rec.factoids || [];
    for (var i = 0; i < list.length; i++) if (list[i].title === title) return list[i].value;
    return '';
  }

  // ── рендер-слой ───────────────────────────────────────────────────────────

  function history(rec, base) {
    /* `priceChanges` приходит от свежего к старому. Наш формат — тот же порядок,
       плюс смещение в днях от подачи и величина изменения относительно предыдущей
       (то есть следующей в массиве) цены. У самой ранней записи изменения нет:
       это публикация. */
    var ch = rec.priceChanges || [];
    /* Одна запись — это публикация, а не история: показывать нечего. У ЦИАНа
       `priceChanges` всегда содержит подачу, поэтому «история из одной точки»
       встречается у большинства объявлений, и без этой отсечки экраны считали бы
       такие объекты изменившимися. */
    if (ch.length < 2) return [];
    var out = [];
    for (var i = 0; i < ch.length; i++) {
      var price = ((ch[i].priceData || {}).price) || 0;
      var prev = i + 1 < ch.length ? ((ch[i + 1].priceData || {}).price || 0) : null;
      var d = prev === null ? null : price - prev;
      out.push({
        dayOffset: Math.max(0, Math.round((new Date(ch[i].changeTime) - base) / DAY)),
        price: money(price),
        delta: d === null ? undefined : signed(d),
        isUp: d === null ? undefined : d > 0
      });
    }
    return out;
  }

  function flatten(rec, collectedAt) {
    var o = rec.offer || {};
    var b = o.building || {};
    var metro = ((o.geo || {}).undergrounds || [])[0] || {};
    var created = new Date(o.creationDate || collectedAt);
    var edited = new Date(o.editDate || o.creationDate || collectedAt);

    var ch = rec.priceChanges || [];
    var current = o.priceTotal || ((ch[0] || {}).priceData || {}).price || 0;
    var start = ch.length ? ((ch[ch.length - 1].priceData || {}).price || current) : current;
    var area = parseFloat(o.totalArea) || 0;

    /* Площадь и этаж берём готовыми подписями ЦИАНа, а число — из offer: так
       «37,15 м²» пишется его правилами, а отбор идёт по значению. */
    var areaText = factoid(rec, 'Общая площадь') || (String(o.totalArea || '').replace('.', ',') + ' м²');

    /* Снято — либо по правде (так сказал прод), либо по сценарию (так попросил
       прототип). Порядок именно такой: настоящий статус сценарием не отменяется. */
    var removed = o.status === 'deactivated' || sc.archived.indexOf(o.id) >= 0;

    return {
      // ── что мы показываем
      /* «апарт.» — не украшение: апартаменты это другая юридическая природа и
         другие ожидания по цене, и объект, которому не с чем сравниваться, должен
         объяснять себя сам. Квартиры не помечаем — немаркированное и есть квартира.
         Слово берём не из текста объявления, а из поля `isApartments`. */
      desc: o.roomsCount + '-комн.' + (o.isApartments ? ' апарт.' : '') + ', ' + areaText
            + (o.floorNumber && b.floorsCount ? ', ' + o.floorNumber + '/' + b.floorsCount + ' этаж' : ''),
      currentPrice: money(current),
      startPrice: money(start),
      currentPricePerM: money((rec.priceInfo || {}).pricePerSquareValue || (area ? current / area : 0)),
      startPricePerM: money(area ? start / area : 0),
      priceDelta: current !== start ? signed(current - start) : '',
      priceHistory: history(rec, created),

      /* Возраст замирает на дате сбора — см. обязанность 2 в шапке файла. */
      days: Math.max(0, Math.round((new Date(collectedAt) - created) / DAY)),
      removed: removed,
      /* Сколько провисело до снятия. Дата снятия — настоящий `editDate`, последний
         момент, когда объявление менялось: им ЦИАН и помечает снятое. Поэтому у
         смоделированного архива дата такая же честная, как у настоящего. */
      removedAfterDays: removed ? Math.max(0, Math.round((edited - created) / DAY)) : undefined,

      repair: feature(rec, 'Ремонт'),
      building: feature(rec, 'Тип дома'),
      buildYear: b.buildYear || (rec.bti && rec.bti.houseData && rec.bti.houseData.yearRelease) || undefined,

      metroStation: metro.name || '',
      /* Настоящий цвет линии, а не наши пять придуманных названий. */
      metroColor: metro.lineColor ? '#' + metro.lineColor : '',
      metroInDesc: metro.name || '',
      walkMin: metro.travelTime || 0,

      zhk: ((o.geo || {}).jk || {}).name || '',
      address: ((o.geo || {}).address || []).map(function (a) { return a.fullName || a.name; }).join(', '),
      /* Короткий адрес — город, улица, дом: без округа и района. Они у ЦИАНа
         отдельными частями (`okrug`, `raion`), и в узкой строке от них шума
         больше, чем пользы. Собираем из тех же частей, а не режем строку. */
      addressShort: ((o.geo || {}).address || [])
        .filter(function (a) { return a.type === 'location' || a.type === 'street' || a.type === 'house'; })
        .map(function (a) { return a.fullName || a.name; }).join(', '),
      views: (rec.stats || {}).totalViewsFormattedString || '',

      photos: (rec.files || []).map(function (f) { return photo(f.full || f.mini); }),
      thumbs: (rec.files || []).map(function (f) { return photo(f.mini || f.full); }),

      // ── и что под ними: модель ЦИАНа целиком, если нужна не подпись, а значение
      offer: o,
      rooms: o.roomsCount,
      area: area,
      floor: o.floorNumber,
      floors: b.floorsCount,
      price: current,
      coords: (o.geo || {}).coordinates || null,
      id: o.id,
      role: sc.base.indexOf(o.id) >= 0 ? 'base' : 'rival'
    };
  }

  function photo(name) {
    return name ? BASE + 'datasets/' + dsName + '/photos/' + name : '';
  }

  function build() {
    if (cache) return cache;
    cache = (ds.listings || []).map(function (r) { return flatten(r, ds.collectedAt); });
    return cache;
  }

  // ── публичное ─────────────────────────────────────────────────────────────

  /* Сценарий можно передать вторым аргументом или объявить глобально
     (`var MOCK_SCENARIO = {...}` отдельным файлом рядом с подключением) —
     как и сам датасет. Не передали вовсе: объектов агента нет, архив только
     настоящий. Это законное состояние — так датасет читает прототип, которому
     нужны просто объявления. */
  function use(name, scenario) {
    if (typeof MOCK_DATASET === 'undefined') {
      throw new Error('Mock: датасет не подключён. Добавьте <script src="'
        + BASE + 'datasets/' + name + '/listings.js"> перед вызовом Mock.use().');
    }
    var s = scenario || (typeof MOCK_SCENARIO !== 'undefined' ? MOCK_SCENARIO : null) || {};
    sc = { base: s.base || [], archived: s.archived || [] };
    ds = MOCK_DATASET;
    dsName = name;
    cache = null;

    var known = {};
    (ds.listings || []).forEach(function (r) { if (r.offer) known[r.offer.id] = true; });
    /* Опечатка в id тихо превратила бы объект агента в конкурента, а весь экран —
       в «объект не найден». Пусть лучше скажет вслух. */
    sc.base.concat(sc.archived).forEach(function (id) {
      if (!known[id]) throw new Error('Mock: в сценарии id ' + id + ', которого нет в датасете «' + name + '».');
    });
    return build().length;
  }

  /* Объект агента — тот, что назван в сценарии, и в его порядке: в «Моих
     объявлениях» три сниппета, и какой из них первый, решает сценарий, а не
     порядок сбора. Отсюда `base(i)`. */
  function base(i) {
    var id = sc.base[i || 0];
    if (id === undefined) return null;
    return build().filter(function (x) { return x.id === id; })[0] || null;
  }

  function bases() {
    return sc.base.map(function (_, i) { return base(i); }).filter(Boolean);
  }

  /* Конкуренты. Отбор — по значениям, а не по подписям: `rooms`, `area`, `price`
     лежат числами рядом с текстом. */
  function listings(f) {
    f = f || {};
    return build().filter(function (x) {
      if (x.role === 'base') return false;
      if (f.rooms && f.rooms.indexOf(x.rooms) < 0) return false;
      if (f.areaFrom != null && x.area < f.areaFrom) return false;
      if (f.areaTo != null && x.area > f.areaTo) return false;
      if (f.priceFrom != null && x.price < f.priceFrom) return false;
      if (f.priceTo != null && x.price > f.priceTo) return false;
      if (f.removed != null && !!x.removed !== !!f.removed) return false;
      return true;
    });
  }

  /* `simulated` называет вслух, сколько записей показаны снятыми по сценарию, а
     не по правде. Молчащая подделка — худший вид: по экрану её не отличить. */
  function meta() {
    var real = (ds.listings || []).filter(function (r) {
      return (r.offer || {}).status === 'deactivated';
    }).length;
    return {
      name: dsName,
      collectedAt: ds && ds.collectedAt,
      count: build().length,
      base: BASE,
      scenario: { base: sc.base.length, archived: sc.archived.length },
      simulated: build().filter(function (x) { return x.removed; }).length - real
    };
  }

  return { use: use, base: base, bases: bases, listings: listings, meta: meta };
})();
