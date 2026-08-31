/* === ФИЛЬТРЫ КОНКУРЕНТОВ — ОБЩИЕ ДЛЯ ОБЕИХ ПОВЕРХНОСТЕЙ ===
 *
 * Одна таблица держит четыре вещи сразу: подпись пустой кнопки, подпись
 * заполненной, тело выпадайки и отбор. Разнести их по трём местам значит обречь
 * разъезжаться — формулировка поменяется в подписи и забудется в отборе.
 *
 * До 2026-08-24 таблица лежала внутри `competitors-app.js`, то есть внутри файла
 * ОДНОГО экрана приложения. Веб о ней не знал вовсе: его ряд был декорацией из
 * восьми неинтерактивных кнопок. Вынесено сюда, когда веб научился отбирать.
 *
 * --- Что снято с прода 2026-08-24 -----------------------------------------
 * Источник: my.cian.ru/competitors-report (живой отчёт, прошёл по всем девяти
 * выпадайкам). Прод — версия ДО наших доработок, поэтому расхождения с ним
 * бывают двух родов, и путать их нельзя:
 *
 *   • наша доработка — «До метро» (прода нет), архив отдельной вкладкой вместо
 *     фильтра «Активные / Архивные»;
 *   • наш недосмотр — всё остальное: варианты, порядок, подписи.
 *
 * Порядок и списки вариантов ниже — прода. Решение Романа 2026-08-24.
 *
 * --- Правило подтверждения (тоже с прода) ---------------------------------
 * Чекбоксовые фильтры применяются СРАЗУ, у них нет кнопок вовсе. Диапазон и
 * слайдер подтверждаются кнопкой «Применить». Логика в самом контроле: галка —
 * законченный выбор, а диапазон незакончен, пока не введены обе границы.
 * У поверхности приложения «Применить» стоит у всех — там шторка, а не выпадайка,
 * и закрывать её тапом по галке значило бы не дать поставить вторую.
 */
var AppFilters = (function () {
  'use strict';

  /* Разбор описания живёт в `preset-app.js`: та же регулярка нужна пресету, а две
     копии одной регулярки — это две копии её будущих ошибок. */
  function parseDesc(c) { return AppPreset.parse(c.desc); }
  function num(s) { return parseInt(String(s).replace(/\D/g, ''), 10); }

  function joinPlus(vals) {
    return vals.length > 1 ? vals[0] + ' +' + (vals.length - 1) : vals[0];
  }
  function rangeLabel(v, unit, fmt) {
    var f = fmt || function (x) { return x; };
    if (v.from != null && v.to != null) return f(v.from) + '–' + f(v.to) + ' ' + unit;
    if (v.from != null) return 'от ' + f(v.from) + ' ' + unit;
    return 'до ' + f(v.to) + ' ' + unit;
  }
  function inRange(x, v) {
    if (isNaN(x)) return false;
    if (v.from != null && x < v.from) return false;
    if (v.to != null && x > v.to) return false;
    return true;
  }
  function mln(x) { return String(Math.round(x / 100000) / 10).replace('.', ','); }

  /* Подпись кнопки у комнат — винительный падеж: «2-комнатную», а не «2-комн.».
     Так на проде, и это читается как продолжение фразы «показать …». Держим
     таблицей, а не правилом: «Свободную планировку» и «Студию» никакое правило
     из именительного не выведет. */
  var ROOMS_ACC = {
    '1-комн.': '1-комнатную', '2-комн.': '2-комнатную', '3-комн.': '3-комнатную',
    '4-комн.': '4-комнатную', '5-комн.': '5-комнатную',
    'Многокомнатная': 'Многокомнатную',
    'Свободная планировка': 'Свободную планировку',
    'Студия': 'Студию'
  };

  var LIST = [
    /* `always` — фильтр не бывает пустым: радиус показывает значение с первого
       кадра. ⚠️ На проде у радиуса «Сбросить» ЕСТЬ, а в макете шторки приложения
       (64:39747) в шапке только крестик. Поверхности тут расходятся намеренно. */
    { key: 'radius', label: 'Радиус', type: 'slider', title: 'Радиус от оцениваемого объекта',
      always: true, min: 200, max: 20000, step: 100, start: 2000,
      format: function (v) { return v >= 1000 ? String(v / 1000).replace('.', ',') + ' км' : v + ' м'; },
      chip: function (v) { return 'Радиус ' + this.format(v); } },

    /* Наша доработка — на проде фильтра нет. Выбор одиночный: это порог «не дальше
       N», а не набор. Ступени у ЦИАНа, не подогнаны под выдачу: в наших 97
       объявлениях максимум 18 минут, так что 20 и 30 ничего не отсекают. */
    { key: 'metro', label: 'До метро', type: 'chips', title: 'Сколько идти до метро',
      single: true, options: ['5 мин', '10 мин', '15 мин', '20 мин', '30 мин'],
      chip: function (v) { return v[0] + ' до метро'; },
      match: function (c, v) {
        var limit = parseInt(v[0], 10);
        var walk = parseInt(c.walkMin, 10);
        /* Станции нет или время не заполнено — объявление не проходит порог:
           «не дальше 10 минут» про объект без метро сказать нечего. */
        return !isNaN(walk) && walk > 0 && walk <= limit;
      } },

    /* Восемь вариантов прода. Было пять с «6+» и «Студия» первой — то есть
       выдуманный набор, не совпадавший с продом ни составом, ни порядком. */
    { key: 'rooms', label: 'Комнаты', type: 'chips', title: 'Сколько комнат',
      options: ['1-комн.', '2-комн.', '3-комн.', '4-комн.', '5-комн.',
                'Многокомнатная', 'Свободная планировка', 'Студия'],
      chip: function (v) {
        var acc = v.map(function (x) { return ROOMS_ACC[x] || x; });
        return joinPlus(acc);
      },
      match: function (c, v) {
        var r = parseDesc(c).rooms;
        return v.some(function (x) {
          if (x === 'Многокомнатная') return r >= 6;
          var m = /^(\d)-комн/.exec(x);
          if (m) return r === Number(m[1]);
          return false;   // «Студия» и «Свободная планировка» в данных не встречаются
        });
      } },

    { key: 'area', label: 'Площадь', type: 'range', title: 'Общая площадь', unit: 'м²',
      chip: function (v) { return rangeLabel(v, 'м²'); },
      match: function (c, v) { return inRange(parseDesc(c).area, v); } },

    { key: 'price', label: 'Цена', type: 'range', title: 'Цена', unit: '₽',
      chip: function (v) { return rangeLabel(v, 'млн ₽', mln); },
      match: function (c, v) { return inRange(num(c.currentPrice), v); } },

    { key: 'repair', label: 'Ремонт', type: 'chips', title: 'Ремонт',
      options: ['Без ремонта', 'Косметический', 'Евроремонт', 'Дизайнерский'],
      chip: function (v) {
        /* «Косметический» на кнопке становится «Косметический ремонт» — так в макете
           (64:39585). «Без ремонта» и «Евроремонт» слово уже несут. */
        var one = v.length === 1 && /^(Косметический|Дизайнерский)$/.test(v[0]);
        return one ? v[0] + ' ремонт' : joinPlus(v);
      },
      match: function (c, v) { return v.indexOf(c.repair) >= 0; } },

    /* Одиннадцать вариантов прода в его же порядке. Было семь. ⚠️ Подпись —
       «Материал дома»: так на проде. В обоих макетах стоит «Тип дома», но макеты
       тут старше — решение Романа 2026-08-24 брать продовую. */
    { key: 'building', label: 'Материал дома', type: 'chips', title: 'Материал дома',
      options: ['Кирпичный', 'Монолитный', 'Панельный', 'Блочный', 'Деревянный',
                'Сталинский', 'Кирпично-монолитный', 'Каркасный',
                'Газосиликатный', 'Газобетонный', 'Пенобетонный'],
      chip: joinPlus,
      match: function (c, v) { return v.indexOf(c.building) >= 0; } },

    /* Этаж стоит ПОСЛЕ материала дома — так на проде. */
    { key: 'floor', label: 'Этаж', type: 'range', title: 'Какой этаж', unit: '',
      chip: function (v) { return rangeLabel(v, 'этаж').replace(/\s+этаж$/, ' этаж'); },
      match: function (c, v) { return inRange(parseDesc(c).floor, v); } },

    { key: 'year', label: 'Год постройки', type: 'range', title: 'Год постройки дома', unit: 'г',
      chip: function (v) { return rangeLabel(v, 'г'); },
      match: function (c, v) { return inRange(c.buildYear, v); } },

    /* Только на архиве и первым в ряду. Наша доработка: на проде архив выбирается
       фильтром «Активные / Архивные», а у нас это отдельная вкладка — значит и
       период уместен только внутри неё. Выбор одиночный: период один, а не набор. */
    /* ⚠️ Заголовок шторки «Архивные» оставлен как был. Для выбора периода он
       читается странно — шторка спрашивает срок, а названа состоянием, — но своего
       макета у неё нет, и менять копирайт без просьбы я не стал. Вопрос Роману. */
    { key: 'period', label: 'За 7 дней', type: 'chips', title: 'Архивные',
      archiveOnly: true, single: true,
      options: ['За 7 дней', 'За 14 дней', 'За 30 дней'],
      chip: function (v) { return v[0]; },
      match: function (c, v) {
        var days = { 'За 7 дней': 7, 'За 14 дней': 14, 'За 30 дней': 30 }[v[0]];
        return (c.days - (c.removedAfterDays || 0)) <= days;
      } }
  ];

  var BY_KEY = {};
  LIST.forEach(function (f) { BY_KEY[f.key] = f; });

  /* Порядок ряда: на архиве период встаёт ПЕРВЫМ. В таблице он объявлен последним,
     потому что там порядок по смыслу; здесь переставляем явно, а не полагаемся на
     порядок объявления. */
  function row(tab) {
    var main = LIST.filter(function (f) { return !f.archiveOnly; });
    if (tab !== 'archive') return main;
    return LIST.filter(function (f) { return f.archiveOnly; }).concat(main);
  }

  /* Пустой фильтр в состоянии не лежит вовсе — «заполнен» проверяется наличием
     ключа, а не разбором пустых массивов и null-границ. */
  function isFilled(f, v) {
    if (v == null) return false;
    if (f.type === 'chips') return v.length > 0;
    if (f.type === 'range') return v.from != null || v.to != null;
    return true;                                   // slider: выбран, если его трогали
  }

  function label(f, state) {
    return isFilled(f, state[f.key]) ? f.chip(state[f.key]) : f.label;
  }

  /* Предустановка по объекту агента: радиус всегда, комнаты и площадь — из
     описания. Цену, год и материал не предустанавливаем (см. preset-app.js). */
  function preset(desc) {
    var p = AppPreset.from(desc || '');
    var s = { radius: BY_KEY.radius.start };
    if (p.rooms) s.rooms = p.rooms.map(function (n) { return n + '-комн.'; });
    if (p.area) s.area = { from: p.area.from, to: p.area.to };
    return s;
  }

  /* Отбор идёт только по заполненным фильтрам — пустых в состоянии нет вовсе.
     Фильтр без `match` (радиус) не участвует: расстояния до объекта в данных нет,
     и подменять его чем попало значит врать в выдаче. */
  function passes(c, state) {
    return Object.keys(state).every(function (key) {
      var f = BY_KEY[key];
      return !f || !f.match || f.match(c, state[key]);
    });
  }

  return { list: LIST, byKey: BY_KEY, row: row, isFilled: isFilled,
           label: label, preset: preset, passes: passes };
})();
