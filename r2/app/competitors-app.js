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

  /* Восемь фильтров по раскладке Figma 64:39578. Одна таблица держит всё сразу:
     подпись чипа в ряду, тело шторки, отбор. Разнести это по трём местам значит
     обречь их разъезжаться — формулировка поменяется в чипе и забудется в отборе.

     Тип решает, чем наполнить шторку:
       chips  — мультивыбор из списка (single: true — одиночный)
       range  — пара полей «от / до» с единицей
       slider — одно значение на дорожке

     `match(c, v)` — отбор. Возвращает undefined там, где отбирать нечем: у радиуса
     в данных нет расстояния до объекта, и выдумывать его ради фильтра нельзя. */
  var DS = '../_design-system/';

  /* Мостиков между макетом и данными больше нет. Раньше здесь стояло
     «Евроремонт → Евро» и «Кирпично-монолитный → Монолитно-кирпичный»: прежний
     сборщик скрёб подписи со страницы и получал обрезки. Теперь ремонт и материал
     приезжают из `features` — то есть словами самого ЦИАНа, теми же, что стоят
     в макете. Сопоставлять нечего. */

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

  var FILTERS = [
    /* `always` — фильтр не бывает пустым: радиус включён всегда и не сбрасывается.
       Подтверждается макетом его шторки (64:39747): в шапке только крестик,
       «Сбросить» там нет, в отличие от остальных семи. */
    { key: 'radius', label: 'Радиус', type: 'slider', title: 'Радиус от оцениваемого объекта',
      always: true, min: 200, max: 20000, step: 100, start: 2000,
      format: function (v) { return v >= 1000 ? String(v / 1000).replace('.', ',') + ' км' : v + ' м'; },
      chip: function (v) { return 'Радиус ' + this.format(v); } },

    { key: 'rooms', label: 'Комнаты', type: 'chips', title: 'Сколько комнат',
      options: ['Студия', '1', '2', '3', '4', '5', '6+', 'Свободная планировка'],
      chip: function (v) {
        var allNum = v.every(function (x) { return /^\d/.test(x); });
        return allNum ? v.join(', ') + ' комн.' : joinPlus(v);
      },
      match: function (c, v) {
        var r = parseDesc(c).rooms;
        return v.some(function (x) {
          if (x === '6+') return r >= 6;
          if (/^\d$/.test(x)) return r === Number(x);
          return false;   // «Студия» и «Свободная планировка» в данных не встречаются
        });
      } },

    { key: 'floor', label: 'Этаж', type: 'range', title: 'Какой этаж', unit: '',
      chip: function (v) { return rangeLabel(v, 'этаж').replace(/\s+этаж$/, ' этаж'); },
      match: function (c, v) { return inRange(parseDesc(c).floor, v); } },

    { key: 'area', label: 'Площадь', type: 'range', title: 'Общая площадь', unit: 'м²',
      chip: function (v) { return rangeLabel(v, 'м²'); },
      match: function (c, v) { return inRange(parseDesc(c).area, v); } },

    { key: 'price', label: 'Цена', type: 'range', title: 'Цена', unit: '₽',
      chip: function (v) { return rangeLabel(v, 'млн ₽', mln); },
      match: function (c, v) { return inRange(num(c.currentPrice), v); } },

    { key: 'repair', label: 'Ремонт', type: 'chips', title: 'Ремонт',
      options: ['Без ремонта', 'Косметический', 'Евроремонт', 'Дизайнерский'],
      chip: function (v) {
        /* «Косметический» на чипе становится «Косметический ремонт» — так в макете
           (64:39585). «Без ремонта» и «Евроремонт» слово уже несут. */
        var one = v.length === 1 && /^(Косметический|Дизайнерский)$/.test(v[0]);
        return one ? v[0] + ' ремонт' : joinPlus(v);
      },
      match: function (c, v) { return v.indexOf(c.repair) >= 0; } },

    { key: 'building', label: 'Материал дома', type: 'chips', title: 'Материал дома',
      options: ['Кирпичный', 'Деревянный', 'Монолитный', 'Панельный', 'Блочный',
                'Кирпично-монолитный', 'Сталинский'],
      chip: joinPlus,
      match: function (c, v) { return v.indexOf(c.building) >= 0; } },

    { key: 'year', label: 'Год постройки', type: 'range', title: 'Год постройки дома', unit: 'г',
      chip: function (v) { return rangeLabel(v, 'г'); },
      match: function (c, v) { return inRange(c.buildYear, v); } },

    /* Только на архиве — как в вебовом отчёте, где «За N дней» стоит первым в том же
       общем ряду. Выбор одиночный: период один, а не набор. */
    { key: 'period', label: 'За 7 дней', type: 'chips', title: 'Архивные', archiveOnly: true,
      single: true, options: ['За 7 дней', 'За 14 дней', 'За месяц'],
      chip: function (v) { return v[0]; },
      match: function (c, v) {
        var days = { 'За 7 дней': 7, 'За 14 дней': 14, 'За месяц': 30 }[v[0]];
        return (c.days - (c.removedAfterDays || 0)) <= days;
      } }
  ];

  var byKey = {};
  FILTERS.forEach(function (f) { byKey[f.key] = f; });

  /* --- Предустановка по объекту агента -------------------------------------
     В фиче фильтры приходят на экран не пустыми: они предустановлены по параметрам
     оцениваемого объекта — это и есть «подборка», а не «весь Циан». Предустанавливаем
     три из восьми:

       Радиус  — всегда включён и не сбрасывается. В отборе он не участвует
                 (расстояний в данных нет), так что число видно, а выдача от него
                 не зависит.
       Комнаты — из описания объекта.
       Площадь — ±15% от площади объекта, границы округляются к 4.

     **Цену не предустанавливаем.** Вместе с площадью она схлопывает подборку до
     единиц (промерено по данным: ±20% от 37,5 м² и 19 млн оставляют 2 карточки из
     44). И по смыслу: цена — предмет разговора агента с собственником, спрятать
     заранее то, что дороже или дешевле, значит спрятать сам повод для отчёта.
     **Год и материал — тоже нет:** у 3 объектов из 70 не заполнен год, у 5 —
     материал, и предустановка молча выкинула бы их из выдачи.

     **Объект неизвестен — не сужаем.** Экран открыли без `?desc` — остаётся один
     радиус. То же правило, что у похожести в вебовом отчёте (`report.js`,
     `distanceToBase`: «объект неизвестен — не сужаем выборку»).

     Разбор терпит и «1-комн. кв., 37,5 м²» из «Моих объявлений», и «1-комн., 32 м²»
     из данных конкурентов: между «комн.» и запятой может стоять «кв.» или «апарт.». */
  var BASE_PRESET = AppPreset.from(params.get('desc') || '');

  function preset() {
    var s = { radius: byKey.radius.start };
    if (BASE_PRESET.rooms) s.rooms = BASE_PRESET.rooms.slice();
    if (BASE_PRESET.area) s.area = { from: BASE_PRESET.area.from, to: BASE_PRESET.area.to };
    return s;
  }

  /* Что выбрано сейчас. Пустой фильтр в состоянии не лежит вовсе — так «заполнен»
     проверяется наличием ключа, а не разбором пустых массивов и null-границ. */
  var state = preset();

  function isFilled(f, v) {
    if (v == null) return false;
    if (f.type === 'chips') return v.length > 0;
    if (f.type === 'range') return v.from != null || v.to != null;
    return true;                                   // slider: выбран, если его трогали
  }

  function chipText(f) {
    return isFilled(f, state[f.key]) ? f.chip(state[f.key]) : f.label;
  }

  /* ------------------------------------------------------------------ *
   *  Ряд фильтров                                                       *
   * ------------------------------------------------------------------ */

  function chipHtml(f) {
    var on = isFilled(f, state[f.key]);
    return '<button class="chip-app' + (on ? ' chip-app--selected' : '') + '" type="button"'
      + ' data-filter="' + f.key + '">'
      + esc(chipText(f))
      + '<span class="chip-app__icon"><img src="' + ICONS + 'chevron-down-small-16.svg" alt=""></span>'
      + '</button>';
  }

  function renderFilters(tab) {
    /* Период на архиве встаёт ПЕРВЫМ — он и в вебовом отчёте первый в общем ряду.
       В таблице он объявлен последним, потому что там порядок по смыслу, а не по
       раскладке; здесь переставляем явно, а не полагаемся на порядок объявления. */
    var list = FILTERS.filter(function (f) { return !f.archiveOnly; });
    if (tab === 'archive') {
      list = FILTERS.filter(function (f) { return f.archiveOnly; }).concat(list);
    }
    document.getElementById('filters-row').innerHTML = list.map(chipHtml).join('');
    /* Контейнер скролла живёт дольше своего содержимого: на архиве в начало ряда
       встаёт «За N дней», и увидеть его надо с первого кадра. */
    document.getElementById('filters').scrollLeft = 0;
  }

  document.getElementById('filters').addEventListener('click', function (e) {
    var chip = e.target.closest('[data-filter]');
    if (chip) openFilter(byKey[chip.dataset.filter]);
  });

  /* ------------------------------------------------------------------ *
   *  Шторка фильтра                                                     *
   * ------------------------------------------------------------------ */

  function bodyHtml(f, v) {
    if (f.type === 'chips') {
      return '<div class="filter-sheet__chips">' + f.options.map(function (o) {
        var on = v && v.indexOf(o) >= 0;
        return '<button class="chip-app chip-app--medium' + (on ? ' chip-app--selected' : '')
          + '" type="button" data-option="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    }
    if (f.type === 'range') {
      var pair = [['from', 'от'], ['to', 'до']].map(function (p) {
        var val = v && v[p[0]] != null ? v[p[0]] : '';
        return '<label class="input-app filter-sheet__input">'
          + '<input class="input-app__control" type="text" inputmode="numeric"'
            + ' data-bound="' + p[0] + '" placeholder="' + p[1] + '" value="' + esc(val) + '">'
          + (f.unit ? '<span class="input-app__suffix">' + esc(f.unit) + '</span>' : '')
          + '</label>';
      }).join('');
      return '<div class="filter-sheet__row">' + pair + '</div>';
    }
    return '<div class="filter-sheet__slider"></div>';   // слайдер вставляет JS
  }

  function openFilter(f) {
    /* Правим копию: «Применить» — это подтверждение, а закрытие крестиком должно
       оставить фильтр таким, каким он был. */
    var draft = state[f.key] == null ? null
      : f.type === 'chips' ? state[f.key].slice()
      : f.type === 'range' ? { from: state[f.key].from, to: state[f.key].to }
      : state[f.key];

    /* «Сбросить» относится к ПРИМЕНЁННОМУ фильтру, а не к черновику выбора (решение
       Романа 2026-08-22): пока не нажали «Применить», сбрасывать нечего — незаконченный
       выбор отменяется крестиком. Поэтому действие ставится один раз, при открытии,
       и по ходу выбора не меняется.

       Сам сброс — движение в один тап: очищает фильтр, обновляет выдачу и закрывает
       шторку (уточнено Романом 2026-08-22). «Применить» после него не нужно —
       подтверждать нечего, а шторке с пустым выбором показывать уже нечего. */
    var reset = !f.always && isFilled(f, state[f.key])
      ? { title: 'Сбросить', onClick: function () { delete state[f.key]; renderFresh(); } }
      : null;

    var sheet = openSheet({
      base: DS,
      ariaLabel: f.title,
      title: f.title,
      barAction: reset,
      content: bodyHtml(f, draft),
      footer: '<div class="screen-footer-app"><div class="screen-footer-app__buttons">'
        + '<button class="btn-app btn-app--medium btn-app--primary btn-app--main btn-app--block"'
        + ' type="button" data-action="apply">Применить</button>'
        + '</div></div>'
    });

    var content = sheet.el.querySelector('.sheet-app__content');

    var slider = null;
    function mountSlider() {
      slider = createSliderApp({
        min: f.min, max: f.max, step: f.step, value: draft != null ? draft : f.start,
        format: f.format,
        onInput: function (v) { draft = v; }
      });
      content.querySelector('.filter-sheet__slider').appendChild(slider.el);
      slider.mount();
    }
    if (f.type === 'slider') mountSlider();

    content.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-option]');
      if (!opt || f.type !== 'chips') return;
      var val = opt.dataset.option;
      if (!draft) draft = [];
      if (f.single) {
        draft = draft.indexOf(val) >= 0 ? [] : [val];
        content.querySelectorAll('[data-option]').forEach(function (b) {
          b.classList.toggle('chip-app--selected', draft.indexOf(b.dataset.option) >= 0);
        });
      } else {
        var i = draft.indexOf(val);
        if (i >= 0) draft.splice(i, 1); else draft.push(val);
        opt.classList.toggle('chip-app--selected', draft.indexOf(val) >= 0);
      }
    });

    content.addEventListener('input', function (e) {
      var field = e.target.closest('[data-bound]');
      if (!field) return;
      if (!draft) draft = { from: null, to: null };
      var raw = field.value.replace(/[^\d]/g, '');
      field.value = raw;
      draft[field.dataset.bound] = raw === '' ? null : Number(raw);
    });

    sheet.el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-action="apply"]')) return;
      if (isFilled(f, draft)) state[f.key] = draft; else delete state[f.key];
      sheet.close();
      renderFresh();
    });
  }

  /* Сброс полный: предустановки по объекту НЕ возвращаются (решение Романа
     2026-08-23). Предустановка — стартовое предположение, а не ограничение, и
     агент, который её снял, хотел увидеть больше, а не то же самое. Радиус
     остаётся: он не бывает пустым. */
  function resetFilters() {
    state = { radius: state.radius };
    renderFresh();
  }

  /* Новая выдача начинается с первой страницы. Смена вкладки, фильтр, сброс — всё
     это другой список, и открывать его на тридцатой карточке было бы странно. */
  function renderFresh() {
    shown = PAGE;
    render();
  }

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
      topFlag: marks.freshIds.indexOf(idx) >= 0 ? 'Новый конкурент' : '',
      priceFlag: idx === marks.priceIdx ? 'Цена изменилась' : '',
      statusFlag: idx === marks.removedIdx
        ? 'Сняли с публикации ' + CompetitorCardApp.removedDate(c) : '',
      head: remove,
      footer: mode === 'tracked' ? '' : trackButton(tracked.has(idx))
    });
  }

  /* ------------------------------------------------------------------ *
   *  Состав вкладок                                                     *
   * ------------------------------------------------------------------ */

  var total = (typeof ALL_COMPETITORS !== 'undefined' && ALL_COMPETITORS.length) || 0;
  /* Ноль — законное значение, а не «параметра нет»: агент мог убрать из отслеживаемых
     всех и вернуться сюда с обзора. Со старым `n > 0` ноль подменялся дюжиной, то есть
     удалённые конкуренты воскресали при первом же переходе туда и обратно. */
  var n = parseInt(params.get('n') || '12', 10);
  if (!(n >= 0)) n = 12;
  n = Math.min(n, total);

  /* Сколько изменений у конкурентов с прошлого визита. Приезжает с обзора тем же
     параметром, которым он сам его получил, — иначе список не знал бы, что
     показывать флаги, и объект с флагом на обзоре выглядел бы здесь обычным. */
  var u = parseInt(params.get('u') || '0', 10);
  if (!(u > 0)) u = 0;

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
  /* --- Флаги апдейтов ------------------------------------------------------
     Те же изменения, что перечислены на обзоре конкурентов, обязаны быть видны и
     здесь: агент приходит в список ИЗ обзора, за тем самым объектом. Раскладку
     считает общий модуль `updates-app.js` — по индексам, а не по «примерно тем же»
     объектам, иначе флаг на двух экранах достаётся разным карточкам.

     Каждый флаг стоит рядом с тем, о чём говорит: «Новый конкурент» — над
     заголовком (881:146541), «Цена изменилась» — над строкой цены (881:146648),
     «Сняли с публикации» — ПОД ценой, там же, где на вкладке «Архивные» стоит
     плашка «Снято с публикации» (правка Романа 2026-08-23: два места под один и
     тот же факт — ошибка). Формулировки взяты те же, что на обзоре:
     ⚠️ в свежем макете бейдж подписан «Изменилась цена», а на обзоре и в макете
     обзора — «Цена изменилась». Один и тот же факт в двух порядках слов; выбрал
     формулировку обзора, потому что агент видит её первой и через тап попадает
     на этот экран. Переключается одной строкой. */
  var marks = AppUpdates.allocate(ALL_COMPETITORS, n, u, BASE_PRESET);

  /* Пул — только сравнимое с объектом по природе: апартаменты не сопоставляют с
     квартирами, и наоборот. Это не фильтр (сбросом не снимается), а определение
     того, что вообще считается конкурентом. Если сравнимых нет, все три вкладки
     честно пусты — так устроен случай «отчёт ничего не нашёл». */
  var SELECTION = [], ARCHIVE = [];
  var tracked = new Set();
  var seen = 0;
  ALL_COMPETITORS.forEach(function (c, i) {
    if (!AppPreset.comparable(c, params.get('desc') || '')) return;
    if (seen++ < n) { tracked.add(i); return; }
    (c.removed ? ARCHIVE : SELECTION).push(i);
  });

  var listEl = document.getElementById('competitors');
  var filtersEl = document.getElementById('filters');
  var TPL = {};
  ['empty', 'more', 'end', 'footer'].forEach(function (k) {
    TPL[k] = document.getElementById('tpl-' + k).innerHTML;
  });

  /* Лента показывается по 10 (макет 563:74168). Счётчик живёт до смены вкладки или
     фильтра: и то и другое — новая выдача, показывать её с 30-й карточки странно. */
  var PAGE = 10;
  var shown = PAGE;

  /* «Это всё, что нашлось» на архиве теряет вторую группу: «Добавить из архива»,
     стоя на самом архиве, отправляет туда, где уже находишься. Группы в компоненте
     и заведены списком, поэтому снимается она данными, а не вторым макетом. */
  function endHtml(withArchive) {
    if (withArchive) return TPL.end;
    var box = document.createElement('div');
    box.innerHTML = TPL.end;
    var g = box.querySelector('[data-group="archive"]');
    if (g) g.remove();
    return box.innerHTML;
  }

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
  ['desc', 'price', 'photo', 'u', 'from'].forEach(function (k) {
    if (params.get(k)) pass.set(k, params.get(k));
  });
  var backEl = document.getElementById('back');
  var createEl = document.getElementById('create-report');

  /* Отбор идёт только по заполненным фильтрам — пустых в `state` нет вовсе.
     Фильтр без `match` (радиус) в отборе не участвует: расстояния до объекта в
     данных нет, и подменять его чем попало значит врать в выдаче. */
  function passesFilters(c) {
    return Object.keys(state).every(function (key) {
      var f = byKey[key];
      return !f.match || f.match(c, state[key]);
    });
  }

  function render() {
    var onTracked = current === 'tracked';
    var ids = onTracked ? [...tracked].sort(function (a, b) { return a - b; })
            : current === 'archive' ? ARCHIVE : SELECTION;
    /* «Отслеживаются» фильтры не трогают: это выбор агента, а не выдача. */
    if (!onTracked) {
      ids = ids.filter(function (i) { return passesFilters(ALL_COMPETITORS[i]); });
    }
    var mode = onTracked ? 'tracked' : current === 'archive' ? 'archive' : 'pick';

    /* На «Отслеживаются» лента не режется и хвоста не имеет: это не выдача, а выбор
       агента — он сам знает, сколько объектов взял, и предлагать ему «показать ещё»
       нечего. Резать по 10 имеет смысл там, где список нашли за него. */
    var visible = onTracked ? ids : ids.slice(0, shown);
    var rest = ids.length - visible.length;

    /* Хвост ленты. Пусто — объясняем пустоту; есть непоказанные — «Показать ещё»;
       кончились — «Это всё, что нашлось». Подвал с вопросом про конкретный объект
       идёт последним ВСЕГДА, включая пустую выдачу: в макете 894:146771 он там и
       нарисован, и это единственное действие, которое пустому экрану остаётся —
       текст сам отсылает к «Добавьте его по ссылке». Раньше подвал на пустой
       выдаче прятался. */
    var tail = '';
    if (!onTracked) {
      tail = (ids.length === 0 ? TPL.empty
        : (rest > 0 ? TPL.more : endHtml(current === 'selection'))) + TPL.footer;
    }
    listEl.innerHTML = visible.map(function (i) { return card(ALL_COMPETITORS[i], i, mode); }).join('') + tail;
    syncCount();

    filtersEl.hidden = onTracked;
    bottomBarEl.hidden = !onTracked;
    listEl.classList.toggle('competitors-list--with-bottom-bar', onTracked);
    /* Ряд перерисовываем и при смене вкладки, и после «Применить»: подпись чипа
       несёт выбранное значение, и без перерисовки она осталась бы старой. */
    if (!onTracked) { renderFilters(current); filtersFor = current; }
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
    renderFresh();
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

    /* Действия хвоста разбираем до карточек: они лежат в той же ленте, но карточке
       не принадлежат, и общий разбор ниже полез бы за `dataset.idx` в пустоту. */
    var act = btn.dataset.action;
    if (act === 'reset-filters') { resetFilters(); return; }
    if (act === 'edit-filters') {
      /* Ряд фильтров стоит в шапке экрана: возвращаем к нему, а не открываем
         какой-то один — какой именно менять, знает агент, а не мы.
         `behavior` выбираем сами: `smooth` — явная просьба, и браузер не обязан
         глушить её по prefers-reduced-motion. А прокрутка через весь экран —
         ровно то движение, ради которого эту настройку включают. */
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
      return;
    }
    if (act === 'from-archive') {
      current = 'archive';
      markActiveTab();
      renderFresh();
      window.scrollTo({ top: 0 });
      return;
    }
    if (act === 'show-more') {
      /* Следующие 10 дорисовываются к уже показанным, страница не перезагружается:
         прокрутка остаётся там, где агент её оставил, и кнопка уезжает вниз вместе
         с новыми карточками. */
      shown += PAGE;
      render();
      return;
    }
    if (act === 'add-by-link') return;   // флоу добавления по ссылке не нарисован

    var cardEl = btn.closest('.competitor-card-app');
    if (!cardEl) return;
    var idx = parseInt(cardEl.dataset.idx, 10);

    /* Иконка динамики цены открывает историю изменений (макет 64:39050).
       Саму шторку собирает модуль карточки: он же считает даты и владеет
       разметкой, а на втором экране с карточками нужна ровно та же. */
    if (act === 'price-history') {
      CompetitorCardApp.openPriceHistory(ALL_COMPETITORS[idx]);
      return;
    }

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
