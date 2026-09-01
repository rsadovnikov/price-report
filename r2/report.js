  // Экран «генерации» отчёта: класс html.activating повесил head-скрипт report.html (при ?activate=1).
  // Держим лоадер 3с, затем снимаем класс — отчёт (уже отрендерен за оверлеем) плавно открывается.
  if (document.documentElement.classList.contains('activating')) {
    window.setTimeout(function () { document.documentElement.classList.remove('activating'); }, 3000);
  }

  renderHeader('_design-system/');
  renderSidebar({ active: '' });

  // =========================================================
  // === PROTOTYPE CONFIG ====================================
  // Параметры, специфичные для этого прототипа.
  // Изменяй здесь — логика подхватит автоматически.
  // =========================================================
  var REPORT_CONFIG = {
    id: 'prototype-3',

    // Активная вкладка при загрузке: 'in-report' | 'selection'
    initialTab: 'in-report',

    // Текст кнопки генерации PDF в Sticky Footer
    pdfButtonLabel: 'Создать PDF-отчёт',
  };
  // Применяем конфиг к DOM
  var _btnPdf = document.querySelector('.sticky-footer .btn-primary-lg');
  if (_btnPdf) _btnPdf.textContent = REPORT_CONFIG.pdfButtonLabel;

  (function() {
    // === ФОТО-ГАЛЕРЕЯ (openGallery) — общие хелперы ===
    // Фото принадлежат объекту: набор лежит в данных (competitors-data.js, поле photos),
    // наборы взаимно непересекающиеся. Прежде фото раздавались из общего пула на 12 файлов
    // по кругу, и один снимок попадал в галереи разных квартир.
    // Миниатюра, обёрнутая триггером галереи (клик → openGallery; курсор zoom-in — аффорданс).
    function photoThumbHtml(src) {
      return '<span class="photo-thumb-wrap" data-action="open-gallery" role="button" tabindex="0" aria-label="Открыть фотографии объявления">'
        + '<img class="photo-thumb" src="' + src + '" onerror="this.src=\'https://placehold.co/80x80\'" alt="photo">'
        + '</span>';
    }
    // Обложка объекта — первый кадр его набора.
    function coverPhoto(idx) {
      var d = ALL_COMPETITORS[idx];
      return (d && d.photos && d.photos[0]) || 'https://placehold.co/80x80';
    }
    // Галерея объекта — ровно его набор, без добора и дедупа.
    function galleryPhotos(idx) {
      var d = ALL_COMPETITORS[idx];
      return (d && d.photos && d.photos.length) ? d.photos : [coverPhoto(idx)];
    }
    // Набор объекта пользователя приходит из «Моих объявлений» (?pset=<id объявления>).
    // Раньше в `pset` ехало имя папки с кадрами («mo2»), и путь к файлу был
    // идентификатором объявления. Теперь едет настоящий id, а где лежат байты —
    // знает Mock: у него же спрашивают путь и все остальные экраны.
    function mainObjectPhotos() {
      var pset = parseInt(REPORT_PARAMS.get('pset'), 10);
      if (pset) {
        var own = MY_LISTINGS.filter(function (b) { return b.id === pset; })[0];
        if (own && own.photos.length) return own.photos;
      }
      // Открыли отчёт напрямую, без сниппета — показываем первый объект агента
      return (MY_LISTINGS[0] && MY_LISTINGS[0].photos) || ['https://placehold.co/80x80'];
    }

    // ALL_COMPETITORS и MY_LISTINGS приходят из mock-connect.js

    // === ПАРАМЕТРЫ И СЛУЧАЙНОСТЬ ===
    var REPORT_PARAMS = new URLSearchParams(location.search);
    // Теперь, когда сам объект стабилен, случаен только выбор — какие объекты попали в
    // отчёт и кому прилетел апдейт. Чтобы расклад можно было воспроизвести (показать тот
    // же кейс дважды, прислать ссылку), ?seed=… переводит выбор на детерминированный
    // генератор. Без параметра — обычный Math.random, как и было.
    var rand = (function() {
      var seed = REPORT_PARAMS.get('seed');
      if (!seed) return Math.random;
      var a = 0;
      for (var s = 0; s < seed.length; s++) a = (a * 31 + seed.charCodeAt(s)) | 0;
      return function mulberry32() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    })();

    // === STATE ===
    var checkedIds = new Set();
    var removedIds = new Set();      // ВСЕ снятые с публикации (изначально архивные + снятые как апдейт)
    var removedUpdateIds = new Set(); // снятые с публикации именно как АПДЕЙТ отслеживаемого (красный бейдж)
    var priceUpdatedIds = new Set(); // апдейт «Цена изменилась» (курируемое подмножество отслеживаемых)
    var newIds = new Set();          // апдейт «Новый конкурент» (активные не отслеживаемые из «Подборки»)
    // Добавленные в подборку в текущий заход на вкладку: остаются видимыми со статусом
    // «Отслеживается», пока не уйдёшь с вкладки. Сбрасывается при входе на «Подборку».
    var justAddedInSelection = new Set();
    var removedDates = {}; // idx → formatted date string "D.MM.YY"
    var visitedIds = new Set();
    var visibleCount = 10;
    var activeTab = REPORT_CONFIG.initialTab; // 'in-report' | 'selection' | 'archive'
    var commentTexts = {}; // idx → comment string

    // === DATE HELPERS ===
    var MONTHS_RU_PARSE = {
      'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3, 'мая': 4, 'июня': 5,
      'июля': 6, 'августа': 7, 'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
    };
    function parseRuDate(str) {
      var parts = str.trim().split(' ');
      return new Date(parseInt(parts[2]), MONTHS_RU_PARSE[parts[1]], parseInt(parts[0]));
    }
    // «Сегодня» = реальная текущая дата (обнулена до полуночи → срок в днях точный).
    // Единый источник «сейчас» для всей логики срока/снятий. Раньше был заморожен на 18.02.2026.
    var _now = new Date();
    var TODAY = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate());
    var CURRENT_YEAR = TODAY.getFullYear(); // текущий год = год реального «сегодня»
    // Дата публикации без года, если год — текущий: «9 января 2026» → «9 января»
    // («15 декабря 2025» и любой прошлый год остаётся с годом).
    function stripCurrentYear(str) {
      if (!str) return str;
      return str.replace(/\s+(\d{4})$/, function (m, y) {
        return (parseInt(y, 10) === CURRENT_YEAR) ? '' : m;
      });
    }
    function formatRemovedDate(d) {
      return d.getDate() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getFullYear()).slice(2);
    }
    function parseRemovedDate(str) {
      var parts = str.split('.');
      return new Date(2000 + parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    function daysOnMarket(pubDateStr, removedDateStr) {
      return Math.max(1, Math.round((parseRemovedDate(removedDateStr) - parseRuDate(pubDateStr)) / 86400000));
    }
    // Срок размещения активного объявления = дней от даты публикации до «сегодня».
    function daysSincePublished(pubDateStr) {
      return Math.max(1, Math.round((TODAY - parseRuDate(pubDateStr)) / 86400000));
    }
    var MONTHS_RU_FULL = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    // Дата публикации = «сегодня» минус N дней, в формате «D месяца YYYY» (как в данных).
    function formatDateDaysAgo(days) {
      var d = new Date(TODAY.getTime() - days * 86400000);
      return d.getDate() + ' ' + MONTHS_RU_FULL[d.getMonth()] + ' ' + d.getFullYear();
    }
    function pluralDays(n) {
      var mod10 = n % 10, mod100 = n % 100;
      if (mod100 >= 11 && mod100 <= 19) return n + ' дней';
      if (mod10 === 1) return n + ' день';
      if (mod10 >= 2 && mod10 <= 4) return n + ' дня';
      return n + ' дней';
    }

    // === Даты объектов выводятся из данных, а не бросаются заново ===
    // Раньше здесь сидели два рандома: срок размещения перезаписывался у всех 45 записей,
    // и ~35% помечались снятыми с публикации — на каждой загрузке заново. Один и тот же
    // конкурент в двух заходах выглядел по-разному, а состав отчёта, наоборот, был
    // предсказуем (первые по порядку). Теперь наоборот: объект постоянен, случаен выбор.
    //
    // В данных лежат срок (days), флаг removed и день снятия (removedAfterDays), а не
    // календарные даты: дата протухла бы, и через полгода все объекты «висели» бы по
    // 300 дней. Здесь считаем сами даты — они всегда свежие относительно сегодня.
    (function deriveDates() {
      ALL_COMPETITORS.forEach(function(d, i) {
        d.date = formatDateDaysAgo(d.days);
        if (!d.removed) return;
        removedIds.add(i);
        var pubDate = parseRuDate(d.date);
        var afterDays = Math.min(d.removedAfterDays || d.days, d.days);
        removedDates[i] = formatRemovedDate(new Date(pubDate.getTime() + afterDays * 86400000));
      });
    })();

    // === ПОХОЖЕСТЬ НА ОБЪЕКТ ПОЛЬЗОВАТЕЛЯ ===
    // Конкурент имеет смысл, только если с объектом сопоставим: агент показывает
    // собственнику, почему цена такая. Студия 17 м² рядом с 54-метровой квартирой
    // ничего не объясняет. Раньше в отчёт попадали случайные активные объекты.
    //
    // Считаем по трём признакам, которые доезжают из «Моих объявлений» (?desc, ?perM,
    // ?metro); тип дома и год туда не прокидываются, поэтому в подборе не участвуют.
    var BASE = (function baseParams() {
      function txt(sel) { var el = document.querySelector(sel); return el ? el.textContent.trim() : ''; }
      function num(s) { var m = /([\d\s,.]+)/.exec(s || ''); return m ? parseFloat(m[1].replace(/\s/g, '').replace(',', '.')) : null; }
      var desc = REPORT_PARAMS.get('desc') || txt('#tableA .desc-title');
      var perM = REPORT_PARAMS.get('perM') || txt('#tableA .col-current-price .price-per-m');
      var metro = REPORT_PARAMS.get('metro') || txt('#tableA .metro-station');
      var areaM = /([\d,.]+)\s*м²/.exec(desc);
      var roomsM = /^(\d+)-комн/.exec(desc);
      return {
        area: areaM ? parseFloat(areaM[1].replace(',', '.')) : null,
        rooms: roomsM ? parseInt(roomsM[1], 10) : null,
        perM: num(perM),
        metro: (metro || '').replace(/\s+/g, ' ').trim(),
      };
    })();

    /* Чем меньше, тем ближе объект к пользовательскому. Площадь весит больше цены:
       сравнивать 40 м² с 40 м² по разной цене осмысленно, а 40 м² с 20 м² — нет,
       даже если цена за метр совпала. Разные станции — небольшой штраф, район один.

       Комнатность (решение Романа 2026-08-23) — слагаемое, а не отсечение: похожесть
       в вебе РАНЖИРУЕТ, а не отбирает, и объект с другой комнатностью должен опускаться,
       а не исчезать. Не хватило своих — лучше показать чужие, чем полупустой отчёт.

       Вес 10 подобран так, чтобы штраф был недостижим остальными слагаемыми: площадь
       даёт максимум ~1 на разумных данных, цена ~0.6, станция 0.15. То есть на практике
       это отсечение, пока своей комнатности хватает, и мягкая деградация, когда нет.

       ⚠️ Без этого слагаемого веб полгода работал верно СЛУЧАЙНО: в прежней базе все
       70 записей были однокомнатными, и площадь была точным заместителем комнатности.
       На настоящих данных (50 однушек и 42 двушки, перекрытие в зоне 34–40 м²) двушка
       37,7 м² оказывалась к однушке 37,3 м² ближе, чем однушка 40 м². */
    var ROOMS_PENALTY = 10;

    function roomsOf(desc) {
      var m = /^(\d+)-комн/.exec(desc || '');
      return m ? parseInt(m[1], 10) : null;
    }

    function distanceToBase(d) {
      if (!BASE.area && !BASE.perM) return 0;    // объект неизвестен — не сужаем выборку
      var areaM = /([\d,.]+)\s*м²/.exec(d.desc);
      var area = areaM ? parseFloat(areaM[1].replace(',', '.')) : null;
      var perM = parseFloat(String(d.currentPricePerM).replace(/\s/g, ''));
      var rooms = roomsOf(d.desc);
      var score = 0;
      if (BASE.rooms && rooms && rooms !== BASE.rooms) score += ROOMS_PENALTY;
      if (BASE.area && area) score += Math.abs(area - BASE.area) / BASE.area;
      if (BASE.perM && perM) score += Math.abs(perM - BASE.perM) / BASE.perM * 0.6;
      if (BASE.metro && d.metroStation && d.metroStation !== BASE.metro) score += 0.15;
      return score;
    }

    // === OPT-OUT ===
    // Система по умолчанию отслеживает N подобранных конкурентов.
    // N прокидывается из сниппета «Мои объявления» (?n=…). При прямом открытии — дефолт
    // 4–7 (в среднем ~5–6 активных отслеживаемых, реалистичный курируемый набор).
    // Сколько указано в сниппете — столько ровно и в отчёте (активные в приоритете, добор при нехватке).
    var _np = parseInt(REPORT_PARAMS.get('n'), 10);
    var AUTO_TRACK_COUNT = (_np >= 0 && _np <= ALL_COMPETITORS.length) ? _np : (4 + Math.floor(rand() * 4));
    (function autoTrack() {
      var picked = [];
      function add(i) { if (picked.length < AUTO_TRACK_COUNT && picked.indexOf(i) < 0) picked.push(i); }
      // Только активные: архивные (removedIds) по умолчанию в отслеживаемые НЕ попадают.
      // Если активных меньше N — отслеживаем сколько есть (архивными не добиваем).
      /* Раньше здесь первыми добавлялись «явно отмеченные» — объекты с
         `initialChecked` в данных. Поле уехало вместе с переездом на общую базу:
         кого показать отмеченным — сценарий показа, а не свойство объявления.
         Терять было нечего, `initialChecked` стоял `false` у всех 70 записей и не
         выбирал ни одного объекта ни разу. */

      // Берём из ближнего круга: сортируем активных по похожести и случайно тасуем
      // пул вдвое шире нужного. Так конкуренты сопоставимы с объектом, но состав всё
      // же меняется от захода к заходу — иначе отчёт был бы всегда одинаковым.
      var rest = [];
      ALL_COMPETITORS.forEach(function(d, i) { if (!removedIds.has(i)) rest.push(i); });
      rest.sort(function(a, b) { return distanceToBase(ALL_COMPETITORS[a]) - distanceToBase(ALL_COMPETITORS[b]); });
      var poolSize = Math.min(rest.length, Math.max(AUTO_TRACK_COUNT * 2, 12));
      shuffleArr(rest.slice(0, poolSize)).forEach(add);
      rest.forEach(add);                        // если ближнего круга не хватило — добираем дальше
      picked.forEach(function(i) { checkedIds.add(i); });
    })();

    // === АПДЕЙТЫ КОНКУРЕНТОВ ===
    // Всего апдейтов прокидывается из «Мои объявления» (?u=…, как и ?n=…) — каунтер на
    // кнопке «N конкурентов» = ровно столько апдейтов внутри отчёта. Без параметра — дефолт 3.
    // Раскладка ровно U бейджей: до 2 по отслеживаемым (1 «Цена изменилась» + 1 «Снято с
    // публикации»), остаток — «Новые конкуренты» из подборки. Каунтер таба «Подборка» = остаток.
    // Кол-во апдейтов берём из ?u (синхрон с каунтером на кнопке). Без параметра (прямое
    // открытие) — случайное 1..6. Какие именно объекты получают апдейт — рандомизируем,
    // чтобы на каждой загрузке расклад был разный.
    var _u = parseInt(REPORT_PARAMS.get('u'), 10);
    var TOTAL_UPDATES = (_u >= 0) ? _u : (Math.floor(rand() * 6) + 1);
    // Экспонируем число апдейтов наружу: по нему helpTrigger решает, показывать ли
    // онбординг-модалку автоматически (нет апдейтов = первый заход, есть = юзер уже знаком).
    window.REPORT_TOTAL_UPDATES = TOTAL_UPDATES;
    function shuffleArr(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(rand() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }
    (function markUpdates() {
      var U = TOTAL_UPDATES;
      if (U <= 0) return;
      var used = 0;
      var tracked = [];
      checkedIds.forEach(function(i) { tracked.push(i); });
      shuffleArr(tracked); // случайные отслеживаемые под апдейты

      // 1) «Цена изменилась» — случайный отслеживаемый с непустым priceDelta.
      for (var t = 0; t < tracked.length && used < U; t++) {
        if (ALL_COMPETITORS[tracked[t]].priceDelta) { priceUpdatedIds.add(tracked[t]); used++; break; }
      }
      // 2) «Снято с публикации» — ещё один случайный отслеживаемый, помечаем removed.
      if (used < U) {
        var today = TODAY; // реальное «сегодня» (единый источник)
        for (var r = 0; r < tracked.length; r++) {
          var idx = tracked[r];
          if (priceUpdatedIds.has(idx) || removedIds.has(idx)) continue;
          removedIds.add(idx);
          removedUpdateIds.add(idx); // снятие отслеживаемого = апдейт → красный бейдж
          if (!removedDates[idx]) {
            var pubDate = parseRuDate(ALL_COMPETITORS[idx].date);
            var removedMs = pubDate.getTime() + Math.floor((today.getTime() - pubDate.getTime()) * 0.8);
            removedDates[idx] = formatRemovedDate(new Date(removedMs));
          }
          used++;
          break;
        }
      }
      // 3) Остаток — «Новые конкуренты»: активные НЕ отслеживаемые из подборки.
      // Тоже из ближнего круга: предлагать студию 17 м² владельцу 40-метровой
      // квартиры бессмысленно, он её сразу снимет с отслеживания.
      var pool = [];
      for (var n = 0; n < ALL_COMPETITORS.length; n++) {
        if (!checkedIds.has(n) && !removedIds.has(n)) pool.push(n);
      }
      pool.sort(function(a, b) { return distanceToBase(ALL_COMPETITORS[a]) - distanceToBase(ALL_COMPETITORS[b]); });
      pool = shuffleArr(pool.slice(0, Math.max(U * 3, 12))).concat(pool.slice(Math.max(U * 3, 12)));
      for (var p = 0; p < pool.length && used < U; p++) { newIds.add(pool[p]); used++; }
    })();

    // Есть ли у отслеживаемого объекта апдейт (для сортировки/бейджа).
    function trackedHasUpdate(idx) { return removedUpdateIds.has(idx) || priceUpdatedIds.has(idx); }
    // Сколько новых конкурентов ещё в «Подборке» (не ушли в отслеживаемые) — каунтер таба.
    function newCount() {
      var c = 0;
      newIds.forEach(function(i) { if (!checkedIds.has(i)) c++; });
      return c;
    }

    // === Sticky-бар «N новых возможных конкурентов» (низ вкладки «Отслеживаются») ===
    function updateNewCompetitorsBar() {
      var bar = document.getElementById('newCompetitorsBar');
      if (!bar) return;
      var section = document.querySelector('.report-section');
      var fresh = [];
      newIds.forEach(function(i) { if (!checkedIds.has(i)) fresh.push(i); });
      if (activeTab !== 'in-report' || fresh.length === 0) {
        bar.style.display = 'none';
        if (section) section.classList.remove('no-bottom-gap');
        return;
      }
      if (section) section.classList.add('no-bottom-gap');
      // Стопка — обложки самих новых конкурентов (те же, что в таблицах)
      document.getElementById('ncbStack').innerHTML = fresh.map(function(idx) {
        return '<img src="' + coverPhoto(idx) + '" onerror="this.src=\'https://placehold.co/48x48\'" alt="">';
      }).join('');
      var n = fresh.length;
      var word = n === 1 ? 'новый возможный конкурент'
        : (n < 5 ? 'новых возможных конкурента' : 'новых возможных конкурентов');
      document.getElementById('ncbPill').textContent = n + ' ' + word;
      bar.style.display = 'flex';
    }
    // «Посмотреть» → вкладка «Подборка» (новые отсортированы наверх), доскролл к вкладкам
    document.querySelector('#newCompetitorsBar [data-action="view-new"]')
      .addEventListener('click', function(e) {
        e.preventDefault();
        tabSelection.click();
        scrollToTabs();
      });

    // === Маркер конца подборки → переход в архив (низ вкладки «Подборка») ===
    // Показываем, когда активные конкуренты кончились (нет «Показать ещё») и есть архив.
    // Стопка — тизер фото первых архивных. Ведёт на вкладку «Архивные».
    function updateArchiveEndMarker() {
      var el = document.getElementById('archiveEndMarker');
      if (!el) return;
      var teaser = [];
      removedIds.forEach(function(i) { if (!checkedIds.has(i) && teaser.length < 3) teaser.push(i); });
      var poolExhausted = (visibleCount >= selectionPoolCount());
      if (activeTab !== 'selection' || !poolExhausted || teaser.length === 0) {
        el.style.display = 'none';
        return;
      }
      document.getElementById('aemStack').innerHTML = teaser.map(function(idx) {
        return '<img src="' + coverPhoto(idx) + '" onerror="this.src=\'https://placehold.co/48x48\'" alt="">';
      }).join('');
      el.style.display = 'flex';
    }
    document.querySelector('#archiveEndMarker [data-action="view-archive"]')
      .addEventListener('click', function(e) {
        e.preventDefault();
        tabArchive.click();
        scrollToTabs();
      });

    // === Проброс базового объекта из сниппета «Мои объявления» ===
    // Шапка и Table A показывают тот объект, по которому кликнули. Дизайн не меняется — только содержимое.
    (function propBaseObject() {
      var p = REPORT_PARAMS;
      /* Открыли напрямую, без сниппета — берём первый объект агента из общей базы.
         Раньше в этом случае блок просто не запускался, и на экране оставался
         объект, захардкоженный в разметке. Он не менялся вместе с базой, то есть
         рано или поздно начал бы спорить с «Моими объявлениями» — и молча. */
      var my = (typeof MY_LISTINGS !== 'undefined' && MY_LISTINGS[0]) || {};
      var desc = p.get('desc') || my.desc || '';
      var photo = p.get('photo') || (my.photos && my.photos[0]) || '';
      var metro = p.get('metro') || my.metroStation || '';
      var color = p.get('metroColor') || my.metroColor || '';
      var walk = p.get('walk') || my.walkMin || '';
      var addr = p.get('addr') || my.address || '', zhk = p.get('zhk') || my.zhk || '';
      var price = p.get('price') || my.currentPrice || '', perM = p.get('perM') || my.currentPricePerM || '';
      var addrLine = (zhk ? 'ЖК «' + zhk + '», ' : '') + addr;
      function setText(sel, val) { var el = document.querySelector(sel); if (el && val != null) el.textContent = val; }

      // Шапка больше не показывает объект — заголовок статичный («Обзор конкурентов для объекта»).
      // Объект пробрасывается только в Table A.
      if (photo) { var ph = document.getElementById('mainPhoto'); if (ph) ph.src = photo; }
      setText('#tableA .desc-title', desc);
      setText('#tableA .desc-zhk', addrLine);

      // Метро: сохраняем существующие иконки, меняем станцию / минуты / цвет линии
      function rebuildMetro(el, withWalkText) {
        if (!el) return;
        var svgs = el.querySelectorAll('svg');
        var metroIcon = svgs[0] ? svgs[0].cloneNode(true) : null;
        var walkIcon = svgs[1] ? svgs[1].cloneNode(true) : null;
        if (metroIcon) {
          metroIcon.setAttribute('class', 'metro-icon');
          metroIcon.style.color = color;   // настоящий цвет линии, а не одно из пяти наших имён
        }
        el.innerHTML = '';
        if (metroIcon) el.appendChild(metroIcon);
        el.appendChild(document.createTextNode(' ' + metro + ' '));
        if (walkIcon) el.appendChild(walkIcon);
        if (withWalkText) el.appendChild(document.createTextNode(' ' + walk + ' мин'));
      }
      rebuildMetro(document.querySelector('#tableA .desc-metro'), true);
      rebuildMetro(document.querySelector('#tableA .metro-station'), false);
      var wkEl = document.querySelector('#tableA .metro-walk');
      if (wkEl) {
        var ws = wkEl.querySelector('svg'), wic = ws ? ws.cloneNode(true) : null;
        wkEl.innerHTML = '';
        if (wic) wkEl.appendChild(wic);
        wkEl.appendChild(document.createTextNode(' ' + walk + ' мин'));
      }

      // Цены приводим к кликнутому объекту. Стартовая и история приезжают отдельными
      // параметрами: без них колонка «Стартовая цена» повторяла текущую, а падение цены
      // не показывалось вовсе — дельта и иконка динамики прятались за неимением данных.
      if (price) {
        var startPrice = p.get('startPrice') || my.startPrice;
        var startPerM = p.get('startPerM') || my.startPricePerM;
        var histRaw = p.get('hist'), hist = null;
        try { hist = histRaw ? JSON.parse(histRaw) : null; } catch (_) { hist = null; }
        if (!hist) hist = my.priceHistory || null;

        setText('#tableA .col-start-price .price-main', (startPrice || price) + ' ₽');
        setText('#tableA .col-start-price .price-per-m', (startPerM || perM) + ' ₽/м²');
        setText('#tableA .col-current-price .price-main', price + ' ₽');
        setText('#tableA .col-current-price .price-per-m', perM + ' ₽/м²');

        var cell = document.querySelector('#tableA td.col-current-price');
        var dl = document.querySelector('#tableA .col-current-price .price-delta');
        var dyn = document.querySelector('#tableA .col-current-price .price-tooltip-trigger');
        var delta = hist && hist[0] ? hist[0].delta : null;
        if (delta) {
          // Знак «+» = цена росла; иконки и модификатор те же, что у конкурентов (renderTableB).
          var isUp = delta.charAt(0) === '+';
          if (cell) cell.setAttribute('data-history', JSON.stringify(hist));
          if (dl) {
            dl.textContent = delta + ' ₽';
            dl.classList.toggle('price-delta--up', isUp);
            dl.style.display = '';
          }
          if (dyn) {
            dyn.style.display = '';
            var ic = dyn.querySelector('.dynamics-icon');
            if (ic) ic.src = isUp ? 'MO/negative-changes.svg' : 'MO/positive-changes.svg';
          }
        } else {
          // Цену не меняли: убираем историю из разметки, иначе тултип покажет чужую.
          if (cell) cell.removeAttribute('data-history');
          if (dl) dl.style.display = 'none';
          if (dyn) dyn.style.display = 'none';
        }
      }
    })();

    // === Срок размещения базового объекта «Мой объект» ===
    // Дата публикации в разметке статична — срок пересчитываем от неё до «сегодня»
    // (та же логика, что для активных конкурентов) + прячем текущий год в дате.
    // Дата публикации «Моего объекта» = TODAY − срок из разметки (data-days).
    // Готовую дату кладём в data-pub-ms: она нужна тултипу истории цены, а он живёт
    // в отдельном IIFE и переменных этого блока не видит.
    (function baseObjectDuration() {
      // Именно td: класс col-duration висит ещё и на <col> в colgroup, и он идёт первым.
      var cell = document.querySelector('#tableA td.col-duration');
      var dateEl = document.querySelector('#tableA .duration-date');
      var daysEl = document.querySelector('#tableA .duration-days');
      if (!cell || !dateEl || !daysEl) return;
      var days = parseInt(cell.getAttribute('data-days'), 10) || 36;
      var full = formatDateDaysAgo(days);
      cell.setAttribute('data-pub-ms', parseRuDate(full).getTime());
      daysEl.textContent = pluralDays(days);
      dateEl.textContent = stripCurrentYear(full);
    })();

    // === DOM REFS ===
    var tableALegendScroll = document.getElementById('tableALegendScroll');
    var tableA = document.getElementById('tableA');
    var tableB = document.getElementById('tableB');
    var tableBBody = document.getElementById('tableBBody');
    var tableBWrapper = document.getElementById('tableBWrapper');
    var emptyBState = document.getElementById('emptyBState');
    var trackingBanner = document.getElementById('trackingBanner');
    var selectionBanner = document.getElementById('selectionBanner');
    // Текст баннера «Отслеживаются» зависит от наличия апдейтов у конкурентов — тот же признак,
    // что рисует красный каунтер в «Моих объявлениях» (TOTAL_UPDATES > 0, прокинуто через ?u=):
    //   есть апдейты → «Что изменилось с вашего прошлого визита, N дней назад» (срок серым, текст bold);
    //   нет         → дефолт про мониторинг (остаётся из разметки).
    (function() {
      var textEl = trackingBanner && trackingBanner.querySelector('.tracking-banner__text');
      if (!textEl || !(TOTAL_UPDATES > 0)) return;
      var days = 1 + Math.floor(Math.random() * 10);
      /* Неразрывные пробелы: срок либо целиком в строке, либо целиком на следующей.
         Правило то же, что на поверхности приложения (2026-08-22) — фраза одна, и
         расходиться в переносах ей незачем. */
      var period = days === 1 ? 'вчера'
        : days + '\u00A0' + (days < 5 ? 'дня' : 'дней') + '\u00A0назад';
      textEl.classList.add('is-changed');
      textEl.innerHTML = 'Что изменилось с вашего прошлого визита, '
        + '<span class="tracking-banner__period">' + period + '</span>';
    })();
    var scrollbarMain = document.getElementById('scrollbarMain');
    var scrollbarTrack = document.getElementById('scrollbarTrack');
    var scrollbarThumb = document.getElementById('scrollbarThumb');
    var stickyScrollbarMain = document.getElementById('stickyScrollbarMain');
    var stickyScrollbarTrack = document.getElementById('stickyScrollbarTrack');
    var stickyScrollbarThumb = document.getElementById('stickyScrollbarThumb');
    var tabInReport = document.getElementById('tabInReport');
    var tabSelection = document.getElementById('tabSelection');
    var tabArchive = document.getElementById('tabArchive');
    var stickyFooter = null; // removed in v3
    var stickyTabsBar = document.getElementById('stickyTabsBar');
    var stickyTabInReport = document.getElementById('stickyTabInReport');
    var stickyTabSelection = document.getElementById('stickyTabSelection');
    var stickyTabArchive = document.getElementById('stickyTabArchive');
    var archiveBanner = document.getElementById('archiveBanner');
    var filtersEl = document.querySelector('.filters');
    var resultsCounter = document.querySelector('.results-counter');
    var counterText = document.getElementById('counterText');
    var emptyBText = document.querySelector('#emptyBState .empty-report-text');
    var btnSelectCompetitors = document.getElementById('btnSelectCompetitors');
    var btnShowMore = document.getElementById('btnShowMore');
    var btnAddLink = document.getElementById('btnAddLink');
    var stickyTableHeader = document.getElementById('stickyTableHeader');
    var stickyHeaderScroll = document.getElementById('stickyHeaderScroll');

    // === SVG HELPERS ===
    var BUS_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.86694 4.4748C9.83344 4.4748 10.6169 3.69628 10.6169 2.73594C10.6169 1.77559 9.83344 0.99707 8.86694 0.99707C7.90044 0.99707 7.11694 1.77559 7.11694 2.73594C7.11694 3.51365 7.63078 4.17212 8.33952 4.39444L3.94052 5.68301L2.80273 8.65315L4.67039 9.3686L5.4537 7.3238L6.5739 6.99567L3.64505 15.0034H5.77463L5.8693 14.7446L5.85254 14.7384L8.4092 7.80108L8.66739 7.09434L9.85934 8.0034H13.1972V6.0034H10.535L8.47254 4.43046C8.5993 4.45947 8.73132 4.4748 8.86694 4.4748Z" fill="#7683A0"/><path d="M11.1973 15.0034H9.19734V11.4176L8.42628 10.6466L9.18795 8.57983L11.1973 10.5892V15.0034Z" fill="#7683A0"/></svg>';
    var EYE_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 8C0 8 3 2 8 2C13 2 16 8 16 8C16 8 13 14 8 14C3 14 0 8 0 8ZM8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z" fill="#7683A0"/></svg>';
    var DYN_ICON_POS = '<img class="dynamics-icon" src="MO/positive-changes.svg" alt="">';
    var DYN_ICON_NEG = '<img class="dynamics-icon" src="MO/negative-changes.svg" alt="">';
    var EDIT_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.9727 1.28407C11.594 0.905311 10.9799 0.905311 10.6012 1.28407L9.22956 2.65566L13.3443 6.77044L14.7159 5.39885C15.0947 5.02009 15.0947 4.40601 14.7159 4.02725L11.9727 1.28407Z" fill="#0468FF"/><path d="M11.9727 8.14203L7.85797 4.02725L1 10.8852V15H5.11478L11.9727 8.14203Z" fill="#0468FF"/></svg>';
    var TRASH_ICON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M4 2C4 0.89543 4.89543 0 6 0H10C11.1046 0 12 0.89543 12 2V3H15V5H1V3H4V2ZM10 2V3H6V2H10Z" fill="#C2122D"/><path d="M7 7V12H9V7H7Z" fill="#C2122D"/><path d="M3 6V14C3 15.1046 3.89543 16 5 16H11C12.1046 16 13 15.1046 13 14V6H11V14H5V6H3Z" fill="#C2122D"/></svg>';
    function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    // === MAKE ROW HTML ===
    function makeRow(d, idx, isChecked) {
      // В «Подборке» добавленные строки остаются залитыми (как hover) — маркер «уже добавлен».
      var rowCls = ((activeTab === 'selection' || activeTab === 'archive') && checkedIds.has(idx)) ? ' class="row-added"' : '';
      // Бейдж по контексту вкладки. Красный (.badge-update) = АПДЕЙТ по объекту:
      //   «Отслеживаются» → снятие с публикации / изменение цены отслеживаемого;
      //   «Подборка» → «Новый конкурент».
      // Серый (.badge-removed) = просто статус архивного объявления (фильтр «Архивные»
      //   в «Подборке») — это не апдейт, а признак самого объекта.
      var updateBadge = '';
      if (activeTab === 'in-report') {
        // Красный — только если снятие произошло как апдейт; изначально архивный (добавленный
        // из подборки) сохраняет серый статус.
        if (removedIds.has(idx)) updateBadge = '<div class="label ' + (removedUpdateIds.has(idx) ? 'label-warning badge-update' : 'label-neutral badge-removed') + '">Снято с публикации ' + removedDates[idx] + '</div>';
        else if (priceUpdatedIds.has(idx)) updateBadge = '<div class="label label-warning badge-update">Цена изменилась</div>';
      } else {
        if (newIds.has(idx)) updateBadge = '<div class="label label-warning badge-update">Новый конкурент</div>';
        else if (removedIds.has(idx)) updateBadge = '<div class="label label-neutral badge-removed">Снято с публикации ' + removedDates[idx] + '</div>';
      }
      return '<tr data-idx="' + idx + '"' + rowCls + '>'
        + '<td class="sticky-photo col-photo">' + photoThumbHtml(coverPhoto(idx)) + '</td>'
        + '<td class="col-desc desc-cell">'
        +   '<div class="desc-title' + (removedIds.has(idx) ? ' removed' : '') + '">' + d.desc + '</div>'
        +   '<div class="desc-metro"><svg class="metro-icon" style="color:' + d.metroColor + '" width="13" height="9" viewBox="0 0 13 9" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.0637 0L6.50007 4.55805L3.93659 0L0.893419 7.44203H0V8.66667H4.64332V7.44203H3.64113L4.31065 5.67002L6.50007 8.66667L8.42224 5.85812L9.0637 7.44203H8.35797V8.66667H13V7.44203H12.1066L9.0637 0Z" fill="currentColor"/></svg> ' + d.metroInDesc + ' ' + BUS_ICON + ' ' + d.walkMin + ' мин</div>'
        +   (d.zhk ? '<div class="desc-zhk">ЖК \u00ab' + d.zhk + '\u00bb, ' + d.address + '</div>' : '<div class="desc-zhk">' + d.address + '</div>')
        +   updateBadge
        + '</td>'
        + '<td class="col-start-price"><div class="price-main">' + d.startPrice + '\u00a0\u20bd</div><div class="price-per-m">' + d.startPricePerM + '\u00a0\u20bd/м\u00b2</div></td>'
        + '<td class="col-current-price" data-comp-idx="' + idx + '"><div class="price-main-row"><div class="price-main">' + d.currentPrice + ' \u20bd</div>' + (d.priceDelta ? '<span class="price-tooltip-trigger">' + (d.priceDelta.startsWith('+') ? DYN_ICON_NEG : DYN_ICON_POS) + '</span>' : '') + '</div><div class="price-per-m">' + d.currentPricePerM + ' \u20bd/м\u00b2</div>' + (d.priceDelta ? '<div class="price-delta' + (d.priceDelta.startsWith('+') ? ' price-delta--up' : '') + '">' + d.priceDelta + ' \u20bd</div>' : '') + '</td>'
        + '<td class="col-dynamics"></td>'
        + '<td class="col-duration"><div class="duration-days">' + pluralDays(removedIds.has(idx) ? daysOnMarket(d.date, removedDates[idx]) : daysSincePublished(d.date)) + '</div><div class="duration-date">' + stripCurrentYear(d.date) + '</div></td>'
        + '<td class="col-metro metro-cell"><div class="metro-station"><svg class="metro-icon metro-green" width="13" height="9" viewBox="0 0 13 9" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.0637 0L6.50007 4.55805L3.93659 0L0.893419 7.44203H0V8.66667H4.64332V7.44203H3.64113L4.31065 5.67002L6.50007 8.66667L8.42224 5.85812L9.0637 7.44203H8.35797V8.66667H13V7.44203H12.1066L9.0637 0Z" fill="currentColor"/></svg> ' + d.metroStation + '</div><div class="metro-walk">' + BUS_ICON + ' ' + d.walkMin + ' мин</div></td>'
        + '<td class="col-repair">' + (d.repair || '—') + '</td>'
        + '<td class="col-building">' + (d.building || '—')
        +   (d.buildYear ? '<div class="building-year">' + d.buildYear + '</div>' : '') + '</td>'
        + '<td class="col-views"><div class="views-cell">' + EYE_ICON + ' ' + d.views + '</div></td>'
        + '</tr>';
    }

    // === COMMENT ROW HTML ===
    function makeCommentRow(idx) {
      return '<tr class="comment-row" data-comment-idx="' + idx + '">'
        + '<td class="comment-spacer-2"></td>'
        + '<td class="comment-row-cell" colspan="9">'
        + '<div class="comment-sticky-wrap">'
        + '<span class="row-comment-bubble">' + escHtml(commentTexts[idx]) + '</span>'
        + '<div class="row-comment-controls">'
        + '<button class="btn-icon" data-comment-edit title="Редактировать">' + EDIT_ICON + '</button>'
        + '<button class="btn-icon" data-comment-delete title="Удалить">' + TRASH_ICON + '</button>'
        + '</div>'
        + '</div></td></tr>';
    }

    // === RENDER TABLE B ===
    function renderTableB() {
      var savedScrollLeft = tableB.scrollLeft;
      var items = [];

      if (activeTab === 'in-report') {
        ALL_COMPETITORS.forEach(function(d, i) {
          if (checkedIds.has(i)) items.push({ d: d, i: i });
        });
      } else {
        // Подборка / Архивные: не показываем уже отслеживаемые (ушли в whitelist), кроме
        // добавленных в этот заход (justAddedInSelection). Собираем ВСЕ подходящие без лимита —
        // окно visibleCount применяем ПОСЛЕ сортировки (только в «Подборке»), чтобы новые
        // конкуренты (идут наверх) всегда попадали в показ (иначе каунтер ≠ числу бейджей).
        var wantArchived = (activeTab === 'archive'); // отдельная вкладка вместо чипа «Архивные»
        for (var j = 0; j < ALL_COMPETITORS.length; j++) {
          if (checkedIds.has(j) && !justAddedInSelection.has(j)) continue;
          // «Подборка» — только активные; «Архивные» — только снятые с публикации (removedIds).
          if (wantArchived ? !removedIds.has(j) : removedIds.has(j)) continue;
          items.push({ d: ALL_COMPETITORS[j], i: j });
        }
      }

      // Фильтры отбирают выдачу — до 2026-08-24 ряд был декорацией, и отбора не было
      // вовсе. На «Отслеживаются» фильтры не показываются, значит и не применяются:
      // там не выдача, а выбор агента.
      if (activeTab !== 'in-report') {
        items = items.filter(function (x) { return AppFilters.passes(x.d, filterState); });
      }

      // «Подборка» — по близости к объекту пользователя: сверху то, с чем его реально
      // сравнивают. Порядок массива (то есть порядок выгрузки с ЦИАНа) смысла не несёт.
      if (activeTab === 'selection') {
        items.sort(function(a, b) { return distanceToBase(a.d) - distanceToBase(b.d); });
      }

      // Апдейты — наверх списка (стабильно: с апдейтом сверху, остальные — в прежнем порядке).
      var hasUpd = (activeTab === 'in-report')
        ? trackedHasUpdate
        : function(i) { return newIds.has(i); };
      items = items.filter(function(x) { return hasUpd(x.i); })
        .concat(items.filter(function(x) { return !hasUpd(x.i); }));

      // Подборка: окно показа применяем ПОСЛЕ сортировки — новые конкуренты уже наверху,
      // поэтому все они попадают в показ (каунтер таба = числу бейджей «Новый конкурент»).
      if (activeTab === 'selection') items = items.slice(0, visibleCount);

      if (items.length === 0) {
        tableBBody.innerHTML = '';
        tableBWrapper.style.display = 'none';
        emptyBState.style.display = 'flex';
        /* Пусто бывает по двум разным причинам, и говорить о них одним текстом нельзя.
           «Выберите конкурентов» — про пустой список отслеживаемых; когда выдачу
           обнулили ФИЛЬТРЫ, этот текст отвечает не на тот вопрос и не даёт выхода.
           Вылезло сразу, как фильтры начали отбирать (2026-08-24). */
        var byFilters = activeTab !== 'in-report' && filtersNarrow();
        emptyBText.textContent = byFilters
          ? 'Ничего не нашлось. Попробуйте изменить фильтры'
          : 'Выберите подходящих конкурентов, чтобы отслеживать по ним изменения';
        btnSelectCompetitors.textContent = byFilters ? 'Сбросить фильтры' : 'Выбрать конкурентов';
        btnSelectCompetitors.dataset.mode = byFilters ? 'reset-filters' : 'select';
        requestAnimationFrame(updateEmptyStateHeight);
      } else {
        tableBWrapper.style.display = '';
        emptyBState.style.display = 'none';
        tableBBody.innerHTML = items.map(function(x) {
          var isChecked = checkedIds.has(x.i);
          return makeRow(x.d, x.i, isChecked);
        }).join('');
      }

      // Баннер «Следим за изменениями» — только на вкладке «Отслеживаются» при ≥1 объекте
      if (trackingBanner) {
        trackingBanner.style.display =
          (activeTab === 'in-report' && checkedIds.size > 0) ? 'flex' : 'none';
      }
      // Баннер «Постоянно следим за новыми» — только на вкладке «Подборка»
      if (selectionBanner) {
        selectionBanner.style.display = (activeTab === 'selection') ? 'flex' : 'none';
      }

      // Sticky-бар «N новых возможных конкурентов» — та же точка ре-рендера
      updateNewCompetitorsBar();
      // Маркер конца подборки → архив (низ «Подборки», когда активные кончились)
      updateArchiveEndMarker();

      tableB.scrollLeft = savedScrollLeft;
      syncProxyWidth();
      refreshSelectionBtns(); // персистентные кнопки «Отслеживается» на добавленных строках (Подборка)
    }
    // Хук на персистентные кнопки добавленных строк (реальная реализация — в rowHoverButton).
    var refreshSelectionBtns = function() {};

    // === UI UPDATERS ===
    function updateTabLabels() {
      document.getElementById('tabInReportCounter').textContent = checkedIds.size;
      document.getElementById('stickyTabInReportCounter').textContent = checkedIds.size;
      // Каунтер новых конкурентов на табе «Подборка» убран (по команде Романа) —
      // вкладка без бейджа. newCount() по-прежнему используется баром и кнопкой «Добавить больше».
    }

    // === СВОРАЧИВАНИЕ БАЗОВОГО ОБЪЕКТА (эксперимент) ===
    // Клик по «шеврон + Мой объект» в легенде Таблицы A: разворачивает/сворачивает строку
    // объекта. В свёрнутом — текст легенды = параметры квартиры (.desc-title), строка скрыта.
    // Затрагивает обе копии легенды (обычная + sticky-шапка).
    (function baseObjectCollapse() {
      var baseCollapsed = false;
      // Параметры квартиры читаем ПОСЛЕ propBaseObject (он уже заполнил .desc-title выше).
      var descEl = document.querySelector('#tableA .desc-title');
      var baseParamsText = (descEl && descEl.textContent.trim()) || 'Мой объект';

      function setBaseCollapsed(c) {
        baseCollapsed = c;
        var wrap = document.getElementById('tableAWrapper');
        if (wrap) wrap.classList.toggle('collapsed', c);
        document.querySelectorAll('.base-chevron').forEach(function (el) { el.classList.toggle('collapsed', c); });
        document.querySelectorAll('.base-legend-text').forEach(function (el) { el.textContent = c ? baseParamsText : 'Мой объект'; });
        document.querySelectorAll('.base-toggle').forEach(function (el) { el.setAttribute('aria-expanded', String(!c)); });
      }

      // Делегат: покрывает и легенду, и sticky-копию. Клик + Enter/Space (роль button).
      document.addEventListener('click', function (e) {
        if (e.target.closest('[data-action="toggle-base"]')) setBaseCollapsed(!baseCollapsed);
      });
      document.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-action="toggle-base"]')) {
          e.preventDefault();
          setBaseCollapsed(!baseCollapsed);
        }
      });
    })();

    // === OWNER REPORT BLOCK ===
    var ownerListExpanded = false;

    function renderOwnerCompetitorsList() {
      var tbody = document.getElementById('ownerCompBody');
      if (!tbody) return;
      var rows = [];
      checkedIds.forEach(function(idx) {
        var d = ALL_COMPETITORS[idx];
        if (!d) return;
          var isRemoved = removedIds.has(idx);
        var comment = commentTexts[idx];
        var deltaHtml = d.priceDelta
          ? '<div class="price-delta' + (d.priceDelta.startsWith('+') ? ' price-delta--up' : '') + '">' + d.priceDelta + '\u00a0\u20bd</div>'
          : '';
        var badgeHtml = isRemoved
          ? '<div class="label label-neutral badge-removed" style="margin-top:4px">Снято с публикации ' + (removedDates[idx] || '') + '</div>'
          : '';
        var titleClass = isRemoved ? 'desc-title removed' : 'desc-title';
        var commentHtml = comment
          ? '<div class="occ-comment-wrap">'
            + '<span class="row-comment-bubble">' + escHtml(comment) + '</span>'
            + '<div class="row-comment-controls">'
            + '<button class="btn-icon" data-occ-edit title="Редактировать">' + EDIT_ICON + '</button>'
            + '<button class="btn-icon" data-occ-delete title="Удалить">' + TRASH_ICON + '</button>'
            + '</div></div>'
          : '<a class="add-comment" href="#" data-occ-add style="margin-top:6px">' + EDIT_ICON + ' Добавить комментарий</a>';
        rows.push(
          '<tr data-owner-idx="' + idx + '">'
          + '<td class="occ-photo">' + photoThumbHtml(coverPhoto(idx)) + '</td>'
          + '<td class="occ-desc desc-cell">'
          +   '<div class="' + titleClass + '">' + d.desc + '</div>'
          +   '<div class="desc-metro"><svg class="metro-icon" style="color:' + d.metroColor + '" width="13" height="9" viewBox="0 0 13 9" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.0637 0L6.50007 4.55805L3.93659 0L0.893419 7.44203H0V8.66667H4.64332V7.44203H3.64113L4.31065 5.67002L6.50007 8.66667L8.42224 5.85812L9.0637 7.44203H8.35797V8.66667H13V7.44203H12.1066L9.0637 0Z" fill="currentColor"/></svg> ' + d.metroInDesc + ' ' + BUS_ICON + ' ' + d.walkMin + '\u00a0\u043c\u0438\u043d</div>'
          +   (d.zhk ? '<div class="desc-zhk">\u0416\u041a \u00ab' + d.zhk + '\u00bb, ' + d.address + '</div>' : '<div class="desc-zhk">' + d.address + '</div>')
          +   badgeHtml
          +   commentHtml
          + '</td>'
          + '<td class="occ-start-price">'
          +   '<div class="price-main">' + d.startPrice + '\u00a0\u20bd</div>'
          +   '<div class="price-per-m">' + d.startPricePerM + '\u00a0\u20bd/\u043c\u00b2</div>'
          + '</td>'
          + '<td class="occ-price">'
          +   '<div class="price-main">' + d.currentPrice + '\u00a0\u20bd</div>'
          +   '<div class="price-per-m">' + d.currentPricePerM + '\u00a0\u20bd/\u043c\u00b2</div>'
          +   deltaHtml
          + '</td>'
          + '<td class="occ-dur">'
          +   '<div class="duration-days">' + pluralDays(isRemoved ? daysOnMarket(d.date, removedDates[idx]) : daysSincePublished(d.date)) + '</div>'
          +   '<div class="duration-date">' + stripCurrentYear(d.date) + '</div>'
          + '</td>'
          + '<td class="occ-repair">' + (d.repair || '—') + '</td>'
          + '<td class="occ-build">' + (d.building || '—')
          +   (d.buildYear ? '<div class="building-year">' + d.buildYear + '</div>' : '') + '</td>'
          + '</tr>'
        );
      });
      tbody.innerHTML = rows.join('');
    }

    function updateOwnerReportBlock() {
      var ownerContent = document.getElementById('ownerReportContent');
      var ownerTitle = document.getElementById('ownerReportTitle');
      var ownerSubtitle = document.getElementById('ownerReportSubtitle');
      var stepTitle = document.getElementById('stepCompetitorsTitle');

      updateOwnerFab(); // единая точка синхрона: сюда сходятся все правки checkedIds

      if (checkedIds.size === 0) {
        ownerTitle.classList.add('title-disabled');
        ownerSubtitle.textContent = 'Чтобы создать отчёт, выберите хотя бы одного конкурента';
        ownerContent.classList.add('owner-content-locked');
      } else {
        ownerTitle.classList.remove('title-disabled');
        ownerSubtitle.textContent = '';
        ownerContent.classList.remove('owner-content-locked');
        if (stepTitle) {
          var n = checkedIds.size;
          stepTitle.textContent = n + '\u00a0' + pluralize(n, 'конкурент', 'конкурента', 'конкурентов');
        }
        renderOwnerCompetitorsList();
        // Sync chevron state
        var chevron = document.getElementById('stepListChevron');
        var wrap = document.getElementById('ownerCompWrap');
        if (chevron) chevron.classList.toggle('collapsed', !ownerListExpanded);
        if (wrap) wrap.classList.toggle('collapsed', !ownerListExpanded);
      }
    }

    /* === ФИЛЬТРЫ ===
     *
     * До 2026-08-24 ряд в вебе был ДЕКОРАЦИЕЙ: восемь кнопок с подписями и ни одного
     * обработчика — выдачу определяла только похожесть (`distanceToBase`). Роман
     * попросил сделать как на проде, я сходил на живой отчёт
     * (my.cian.ru/competitors-report) и прокликал все девять выпадаек.
     *
     * Что снято с прода и повторено здесь:
     *
     * — **Триггер — это Button, а не чип.** В DOM он подписан `data-name="FilterButton"`,
     *   размер XS. Отсюда же ответ на «почему выбранный не подсвечивается»: у Button
     *   в ките нет состояния Selected вовсе (132 варианта, ни одного). Значение
     *   сообщает подпись кнопки, а не заливка. Синюю `.is-preset` убрал.
     *
     * — **Два вида подтверждения, и правило в самом контроле.** Чекбоксовые фильтры
     *   применяются СРАЗУ, кнопок у них нет. Диапазон и слайдер — по «Применить»:
     *   галка это законченный выбор, а диапазон незакончен, пока не введены обе
     *   границы. ⚠️ На поверхности приложения «Применить» стоит у всех — там шторка,
     *   и закрывать её тапом по галке значило бы не дать поставить вторую.
     *
     * — **«Сбросить» живёт в подвале рядом с «Применить»**, а не в шапке: шапки у
     *   выпадайки нет.
     *
     * Таблица фильтров — общий `filters.js`, тот же, что у приложения.
     */
    var filterState = AppFilters.preset(REPORT_PARAMS.get('desc') || (function () {
      var el = document.querySelector('#tableA .desc-title');
      return el ? el.textContent.trim() : '';
    })());

    /* Шеврон — экспорт `Icons/Action/16/ChevronDownSmall` из кита, тот же файл, что
       в ряду приложения. До 2026-08-24 здесь стоял текстовый символ `▾`: он рисуется
       ЗАЛИТЫМ треугольником шрифта, а в ките глиф — открытая галка. Нашёл Роман. */
    var CHEV = '_design-system/assets/icons/chevron-down-small-16.svg';
    var CHECK = '_design-system/assets/icons/check-16.svg';

    /* Подпись — отдельным узлом, и это не украшательство разметки. Пока фильтр
       открыт, его кнопка обязана дожить до закрытия: к ней привязана панель и на
       ней держится перевёрнутый шеврон. Перерисовка ряда целиком её заменяла —
       панель оставалась висеть у узла, которого в документе больше нет. Поэтому
       после применения меняется ТОЛЬКО текст подписи (`setFilterLabel`), а ряд
       целиком перерисовывается лишь там, где меняется его состав: вкладка и сброс. */
    function renderFilterRow() {
      var host = document.getElementById('filtersFacets');
      if (!host) return;
      host.innerHTML = AppFilters.row(activeTab).map(function (f) {
        return '<button class="btn-outline-sm style-secondary filter-btn" type="button"'
          + ' data-facet="' + f.key + '" aria-haspopup="dialog" aria-expanded="false">'
          + '<span class="filter-btn__label">' + escHtml(AppFilters.label(f, filterState)) + '</span>'
          + '<span class="icon"><img src="' + CHEV + '" alt=""></span></button>';
      }).join('');
    }

    function setFilterLabel(btn, f) {
      var el = btn.querySelector('.filter-btn__label');
      if (el) el.textContent = AppFilters.label(f, filterState);
    }

    /* Тело выпадайки. Четыре вида, и вид решает КОНТРОЛ, а не мой вкус:
       набор → чекбоксы, одно из списка → строки с галкой, диапазон → пара полей,
       порог → одно поле, радиус → дорожка. */
    function filterBody(f, draft) {
      /* Одиночный выбор — список Suggest (макет 980:64958): строка, галка справа
         у выбранной, никаких чекбоксов. Чекбокс обещает набор, а набрать здесь
         можно ровно одно — до 2026-09-01 период и метро врали об этом квадратом. */
      if (f.type === 'chips' && f.single) {
        return '<div class="popover__list" role="listbox">' + f.options.map(function (o) {
          var on = !!(draft && draft.indexOf(o) >= 0);
          return '<button class="popover__option" type="button" role="option"'
            + ' aria-selected="' + on + '" data-option="' + escHtml(o) + '">'
            + '<span class="popover__option-text">' + escHtml(o) + '</span>'
            + (on ? '<span class="popover__option-check"><img src="' + CHECK + '" alt=""></span>' : '')
            + '</button>';
        }).join('') + '</div>';
      }
      if (f.type === 'chips') {
        return '<div class="popover__group">' + f.options.map(function (o, i) {
          var on = draft && draft.indexOf(o) >= 0;
          return '<label class="checkbox"><input class="checkbox__control" type="checkbox"'
            + ' data-option="' + escHtml(o) + '"' + (on ? ' checked' : '') + '>'
            + '<span class="checkbox__label">' + escHtml(o) + '</span></label>';
        }).join('') + '</div>';
      }
      if (f.type === 'number') {
        return '<div class="popover__number"><span class="input input-m">'
          + '<input class="input__control" type="text" inputmode="numeric" data-num'
          + ' value="' + (draft != null ? draft : '') + '">'
          + (f.unit ? '<span class="input__adornment">' + escHtml(f.unit) + '</span>' : '')
          + '</span></div>';
      }
      if (f.type === 'range') {
        /* Единица живёт ВНУТРИ поля «до», а не висит после пары. В ките у DoubleInput
           для этого есть слот `toAdornments.right` — то есть это его штатное место,
           а не наша находка. До 2026-09-01 у нас был свой `.popover__unit` снаружи
           контрола: такого в ките нет вовсе. */
        return '<div class="popover__range">' + [['from', 'от'], ['to', 'до']].map(function (b) {
          var val = draft && draft[b[0]] != null ? draft[b[0]] : '';
          return '<span class="popover__range-field"><span class="input input-m">'
            + '<input class="input__control" type="text" inputmode="numeric"'
            + ' data-bound="' + b[0] + '" placeholder="' + b[1] + '" value="' + val + '">'
            + (f.unit && b[0] === 'to' ? '<span class="input__adornment">' + escHtml(f.unit) + '</span>' : '')
            + '</span></span>';
        }).join('') + '</div>';
      }
      /* Слайдер: подпись значения сверху, дорожка под ней — как на проде. */
      var v = draft != null ? draft : f.start;
      return '<div class="popover__slider">'
        + '<span class="popover__slider-value">' + escHtml(f.format(v)) + '</span>'
        + '<input class="range-input" type="range" min="' + f.min + '" max="' + f.max
        + '" step="' + f.step + '" value="' + v + '">'
        + '</div>';
    }

    function openFilter(f, btn) {
      /* Правим копию: «Применить» — подтверждение, а закрытие должно оставить фильтр
         таким, каким он был. У чекбоксов копия тоже нужна: они применяются сразу,
         но состояние всё равно собирается по одной галке. */
      var cur = filterState[f.key];
      var draft = cur == null ? null
        : f.type === 'chips' ? cur.slice()
        : f.type === 'range' ? { from: cur.from, to: cur.to }
        : cur;

      /* Кнопки нужны там, где выбор бывает НЕЗАКОНЧЕННЫМ: диапазон без второй
         границы, число без цифры, дорожка, которую ещё возят. Галка и строка
         списка законченны сами по себе — там кнопок нет вовсе, так на проде. */
      var needsApply = f.type !== 'chips';
      /* Колонкой, во всю ширину, кнопки Medium (44) — прод и макет 980:65194.
         «Сбросить» — secondary с голубой заливкой, а не ghost: заливка есть и на
         проде (#e6f0ff), и в макете. */
      var html = filterBody(f, draft)
        + (needsApply
          ? '<div class="popover__footer">'
            + '<button class="btn-primary-md" type="button" data-action="apply">Применить</button>'
            + '<button class="btn-secondary-md" type="button" data-action="reset">Сбросить</button>'
            + '</div>'
          : '');

      /* Шеврон переворачивается на открытой выпадайке (макет 980:65101: у обоих
         триггеров он смотрит вверх). Состояние держит `aria-expanded` — тот же
         атрибут отдаёт его и скринридеру, поэтому второго флага не нужно. */
      btn.setAttribute('aria-expanded', 'true');
      var pop = openPopover({
        anchor: btn, content: html, ariaLabel: f.title,
        onClose: function () { btn.setAttribute('aria-expanded', 'false'); }
      });
      /* Модификатор ставим ДО пересчёта места: у списка свои поля (4/0 против 20/16),
         то есть другая ширина, а от неё зависит переворот у правого края экрана. */
      if (f.type === 'chips' && f.single) {
        pop.el.classList.add('popover--list');
        pop.reposition();
      }

      function commit() {
        if (AppFilters.isFilled(f, draft)) filterState[f.key] = draft;
        else delete filterState[f.key];
        setFilterLabel(btn, f);     // ряд не перерисовываем: панель привязана к кнопке
        visibleCount = 10;          // новая выдача начинается с первой страницы
        renderTableB();
        updateResultsCounter();
        updateShowMoreBtn();
      }

      pop.el.addEventListener('change', function (e) {
        var box = e.target.closest('input[data-option]');
        if (!box || f.type !== 'chips') return;
        var val = box.dataset.option;
        if (!draft) draft = [];
        var i = draft.indexOf(val);
        if (box.checked && i < 0) draft.push(val);
        if (!box.checked && i >= 0) draft.splice(i, 1);
        commit();                   // чекбоксы применяются сразу — так на проде
      });

      pop.el.addEventListener('input', function (e) {
        var num = e.target.closest('[data-num]');
        if (num) {
          var digits = num.value.replace(/[^\d]/g, '');
          num.value = digits;
          draft = digits === '' ? null : Number(digits);
          return;
        }
        var field = e.target.closest('[data-bound]');
        if (field) {
          if (!draft) draft = { from: null, to: null };
          var raw = field.value.replace(/[^\d]/g, '');
          field.value = raw;
          draft[field.dataset.bound] = raw === '' ? null : Number(raw);
          return;
        }
        var slider = e.target.closest('.range-input');
        if (slider) {
          draft = Number(slider.value);
          var out = pop.el.querySelector('.popover__slider-value');
          if (out) out.textContent = f.format(draft);
        }
      });

      pop.el.addEventListener('click', function (e) {
        /* Строка списка: выбор одиночный, значит он закончен в тот же тап —
           применяем и закрываем. У `always`-фильтра повторный тап по выбранной
           НИЧЕГО не снимает: пустого состояния у него нет, и «снять» означало бы
           показать кнопку без значения. */
        var opt = e.target.closest('.popover__option');
        if (opt) {
          var val = opt.dataset.option;
          var было = !!(draft && draft.indexOf(val) >= 0);
          if (!(было && f.always)) draft = было ? [] : [val];
          commit();
          pop.close();
          return;
        }
        if (e.target.closest('[data-action="apply"]')) { commit(); pop.close(); return; }
        if (e.target.closest('[data-action="reset"]')) {
          /* Сброс — движение в один шаг: чистит фильтр, обновляет выдачу и закрывает.
             Подтверждать нечего, а показывать панель с пустым выбором незачем. */
          draft = f.always ? f.start : null;
          commit();
          pop.close();
        }
      });
    }

    /* «Сужают» — то есть в состоянии есть хоть один фильтр С ОТБОРОМ. Радиус не в
       счёт: у него нет `match`, он ничего не выкидывает (расстояния в данных нет). */
    function filtersNarrow() {
      return Object.keys(filterState).some(function (k) {
        var f = AppFilters.byKey[k];
        return f && f.match && AppFilters.isFilled(f, filterState[k]);
      });
    }

    function resetAllFilters() {
      /* Сброс полный: предустановка по объекту НЕ возвращается — она стартовое
         предположение, а не ограничение, и агент, который её снял, хотел увидеть
         больше. Остаются `always` — радиус и период: у них нет пустого состояния,
         сбрасывать их некуда. Перебираем по флагу, а не по имени: следующий такой
         фильтр иначе тихо исчезнет из ряда. То же правило в приложении. */
      var keep = {};
      AppFilters.list.forEach(function (f) {
        if (f.always) keep[f.key] = filterState[f.key] != null ? filterState[f.key] : f.start;
      });
      filterState = keep;
      renderFilterRow();
      visibleCount = 10;
      renderTableB();
      updateResultsCounter();
      updateShowMoreBtn();
    }

    document.getElementById('filtersFacets').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-facet]');
      if (btn) openFilter(AppFilters.byKey[btn.dataset.facet], btn);
    });

    /* Ссылка «Сбросить фильтры» в самом ряду. До 2026-08-24 у неё не было
       обработчика вовсе — сбрасывать было нечего, ряд был декорацией. */
    var resetLink = document.querySelector('.reset-filters');
    if (resetLink) resetLink.addEventListener('click', function (e) {
      e.preventDefault();
      resetAllFilters();
    });

    renderFilterRow();
    // === OWNER REPORT FAB ===
    // Кнопка в правом нижнем углу ведёт к настройке отчёта — и уезжает, когда та
    // на экране. Два условия, и оба про «есть ли ей что делать»:
    //
    //   1. Отслеживаемых нет — вести некуда, карточка отчёта заблокирована.
    //   2. Карточка уже видна — привела, дальше только мешает.
    //
    // ⚠️ Второе условие когда-то было (`!ownerPanelReached()`), но ушло вместе с
    // полкой-teaser, которую кнопка заменила. Последствие нашёл Роман 2026-08-23:
    // кнопка доживала до самого низа страницы и стояла ПОВЕРХ той секции, куда сама
    // же и ведёт, со стрелкой «вниз» — то есть звала туда, где ты уже стоишь.
    // Заодно накрывала нижний край карточки с «Создать PDF-отчёт».
    //
    // Порог — доля экрана, а не пиксели: «дошёл» это когда карточка заняла экран, а
    // не когда снизу показался её край. Считать от края нельзя — при одном конкуренте
    // страница короткая, карточка выглядывает уже на первом экране, и кнопка пропадала
    // бы до того, как агент до неё добрался.
    var ownerFabEl = document.getElementById('ownerFab');
    var OWNER_FAB_REACHED = 0.4;      // верх карточки выше 40% экрана — пришли

    function ownerPanelReached() {
      var card = document.getElementById('ownerReportCard');
      if (!card) return false;
      // Отрицательный top — карточку проскроллили насквозь, она тем более «достигнута»
      return card.getBoundingClientRect().top < window.innerHeight * OWNER_FAB_REACHED;
    }

    // Два повода уехать — и у каждого своё направление, потому что смысл разный:
    // вести некуда → вбок (кнопки тут больше нет), привела → вниз (уступила место
    // содержимому). Классы взаимоисключающие: у обоих свой transform, и вместе они
    // спорили бы за одно свойство.
    function updateOwnerFab() {
      if (!ownerFabEl) return;
      var nothingToShow = checkedIds.size === 0;
      ownerFabEl.classList.toggle('owner-fab--hidden', nothingToShow);
      ownerFabEl.classList.toggle('owner-fab--landed', !nothingToShow && ownerPanelReached());
    }

    // Видимость зависит от прокрутки, а не только от состояния отбора, — значит
    // пересчитывать надо и на скролле. Через rAF: обработчик дёргается сотнями раз.
    (function watchOwnerFab() {
      if (!ownerFabEl) return;
      var queued = false;
      function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; updateOwnerFab(); });
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
    })();

    // В разметке кнопка скрыта и с transition: none — стартовое состояние (его ставит
    // init через updateOwnerReportBlock) не должно проигрываться анимацией. Снимаем
    // стоп-кадр через два кадра: одного мало — снятие успевает попасть в тот же пересчёт
    // стилей, что и смена класса, и переход всё-таки запускается.
    if (ownerFabEl) requestAnimationFrame(function() {
      requestAnimationFrame(function() { ownerFabEl.classList.remove('owner-fab--preload'); });
    });

    if (ownerFabEl) ownerFabEl.addEventListener('click', function() {
      var card = document.getElementById('ownerReportCard');
      if (!card) return;
      var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 67;
      var gap = 80;     // сколько предыдущего раздела показать сверху
      var targetY = card.getBoundingClientRect().top + window.scrollY - headerH - gap;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    });

    // === OWNER COMP LIST COMMENT FORM ===
    function showOwnerCommentForm(idx, prefill) {
      var dataTr = document.querySelector('#ownerCompBody tr[data-owner-idx="' + idx + '"]');
      if (!dataTr) return;

      // Hide the add-link or existing comment wrap (keep in flow for height), overlay form absolutely
      var target = dataTr.querySelector('[data-occ-add]') || dataTr.querySelector('.occ-comment-wrap');
      if (!target) return;

      target.style.visibility = 'hidden';
      var td = target.closest('td');

      var formWrap = document.createElement('div');
      formWrap.className = 'comment-form-wrap occ-inline-form';
      formWrap.style.top = target.offsetTop + 'px';
      formWrap.innerHTML =
        '<span class="input comment-input-wrap"><input class="input__control comment-input-inline" type="text" maxlength="120" placeholder="\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439, \u0435\u0433\u043e \u0443\u0432\u0438\u0434\u0438\u0442 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u0438\u043a \u0432 \u043f\u0434\u0444-\u043e\u0442\u0447\u0451\u0442\u0435"></span>'
        + '<div class="comment-form-actions">'
        + '<button class="btn-primary-sm" data-occ-form-save type="button">\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c</button>'
        + '<button class="btn-ghost-sm" data-occ-form-cancel type="button">\u041e\u0442\u043c\u0435\u043d\u0430</button>'
        + '</div>';
      td.appendChild(formWrap);

      // Expand row height so form doesn't overlap next row
      requestAnimationFrame(function() {
        var excess = (formWrap.offsetTop + formWrap.offsetHeight) - td.offsetHeight;
        if (excess > 0) {
          var curPB = parseInt(getComputedStyle(td).paddingBottom) || 0;
          td.style.paddingBottom = (curPB + excess) + 'px';
        }
      });

      var input = formWrap.querySelector('.comment-input-inline');
      if (prefill) input.value = prefill;
      input.focus();

      function saveAndClose() {
        var text = input.value.trim();
        if (text) { commentTexts[idx] = text; showToast.success('\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d'); }
        else { delete commentTexts[idx]; }
        renderOwnerCompetitorsList();
      }
      function cancelClose() {
        renderOwnerCompetitorsList();
      }

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); saveAndClose(); }
        else if (e.key === 'Escape') { cancelClose(); }
      });
      formWrap.querySelector('[data-occ-form-save]').addEventListener('click', saveAndClose);
      formWrap.querySelector('[data-occ-form-cancel]').addEventListener('click', cancelClose);
      input.addEventListener('blur', function() {
        setTimeout(function() { if (input.isConnected) saveAndClose(); }, 150);
      });
    }

    // === OWNER COMP LIST EVENT DELEGATION ===
    document.getElementById('ownerCompWrap').addEventListener('click', function(e) {
      var tr = e.target.closest ? e.target.closest('tr[data-owner-idx]') : null;
      if (!tr) return;
      var idx = parseInt(tr.getAttribute('data-owner-idx'), 10);
      if (isNaN(idx)) return;

      if (e.target.closest('[data-occ-add]')) {
        e.preventDefault();
        showOwnerCommentForm(idx);
        return;
      }
      if (e.target.closest('[data-occ-edit]') || e.target.closest('.row-comment-bubble')) {
        showOwnerCommentForm(idx, commentTexts[idx]);
        return;
      }
      if (e.target.closest('[data-occ-delete]')) {
        var savedText = commentTexts[idx];
        delete commentTexts[idx];
        renderOwnerCompetitorsList();
        showToast.success('\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439 \u0443\u0434\u0430\u043b\u0451\u043d', {
          actions: [{
            title: '\u0412\u043e\u0441\u0441\u0442\u0430\u043d\u043e\u0432\u0438\u0442\u044c',
            onClick: function() { commentTexts[idx] = savedText; renderOwnerCompetitorsList(); }
          }]
        });
        return;
      }
    });

    // Toggle expand/collapse for step 1 list
    document.getElementById('ownerListToggle').addEventListener('click', function() {
      ownerListExpanded = !ownerListExpanded;
      var chevron = document.getElementById('stepListChevron');
      var wrap = document.getElementById('ownerCompWrap');
      if (chevron) chevron.classList.toggle('collapsed', !ownerListExpanded);
      if (wrap) wrap.classList.toggle('collapsed', !ownerListExpanded);
    });

    // Сколько активных конкурентов доступно в «Подборке» (не в отчёте). Архив — отдельная
    // вкладка, в этот счётчик («Показать ещё» + «Нашли ещё N») не входит.
    /* Сколько объявлений в подборке ПОСЛЕ фильтров. До 2026-08-24 фильтры были
       декорацией, и счётчик их не знал; когда они начали отбирать, он остался бы
       врать — «Нашли ещё 10» при нуле строк на экране. */
    function selectionPoolCount() {
      var c = 0;
      for (var j = 0; j < ALL_COMPETITORS.length; j++) {
        if (checkedIds.has(j) && !justAddedInSelection.has(j)) continue;
        if (removedIds.has(j)) continue;
        if (!AppFilters.passes(ALL_COMPETITORS[j], filterState)) continue;
        c++;
      }
      return c;
    }

    function updateResultsCounter() {
      var shown = Math.min(visibleCount, selectionPoolCount());
      var shownStr = shown + '\u00a0' + pluralize(shown, 'конкурент', 'конкурента', 'конкурентов');
      counterText.innerHTML = 'Нашли ещё <strong>' + shownStr + '</strong>';
    }

    function pluralize(n, one, few, many) {
      var mod10 = n % 10, mod100 = n % 100;
      if (mod100 >= 11 && mod100 <= 14) return many;
      if (mod10 === 1) return one;
      if (mod10 >= 2 && mod10 <= 4) return few;
      return many;
    }

    function updateFooter() {
      // Кнопки находятся внутри блока owner-report-content, управляются через updateOwnerReportBlock
    }

    function updateShowMoreBtn() {
      var addMoreWrap = document.getElementById('addMoreWrap');
      if (activeTab === 'in-report') {
        btnShowMore.style.display = 'none';
        btnAddLink.style.display = 'none';
        // Прячем «Добавить больше объектов», если показан бар «N новых возможных конкурентов»
        // (newCount() > 0) — не дублируем призыв добрать конкурентов.
        if (addMoreWrap) addMoreWrap.style.display = (checkedIds.size > 0 && newCount() === 0) ? 'flex' : 'none';
      } else if (activeTab === 'archive') {
        // Архив показываем целиком (без пагинации и «добавить по ссылке»).
        btnShowMore.style.display = 'none';
        btnAddLink.style.display = 'none';
        if (addMoreWrap) addMoreWrap.style.display = 'none';
      } else {
        // «Показать ещё» — пока в подборке остались нескрытые конкуренты (с учётом архивного фильтра)
        btnShowMore.style.display = visibleCount >= selectionPoolCount() ? 'none' : '';
        btnAddLink.style.display = '';
        if (addMoreWrap) addMoreWrap.style.display = 'none';
      }
    }

    // === PLACEHOLDER BUTTON ===
    document.getElementById('btnSelectCompetitors').addEventListener('click', function() {
      /* Одна кнопка, два смысла — по тому, чем вызвана пустота (см. renderTableB). */
      if (this.dataset.mode === 'reset-filters') { resetAllFilters(); return; }
      tabSelection.click();
    });

    // === FLY-TO-TAB ANIMATION ===
    function flyPhotoToTab(photoImg, counterEl) {
      var srcRect = photoImg.getBoundingClientRect();
      var dstRect = counterEl.getBoundingClientRect();

      var startX = srcRect.left + srcRect.width / 2;
      var startY = srcRect.top + srcRect.height / 2;
      var endX = dstRect.left + dstRect.width / 2;
      var endY = dstRect.top + dstRect.height / 2;

      var dx = endX - startX;
      var dy = endY - startY;

      var clone = document.createElement('img');
      clone.src = photoImg.src;
      clone.style.cssText =
        'position:fixed;' +
        'left:' + startX + 'px;' +
        'top:' + startY + 'px;' +
        'width:' + srcRect.width + 'px;' +
        'height:' + srcRect.height + 'px;' +
        'margin-left:-' + (srcRect.width / 2) + 'px;' +
        'margin-top:-' + (srcRect.height / 2) + 'px;' +
        'border-radius:8px;' +
        'object-fit:cover;' +
        'pointer-events:none;' +
        'z-index:9999;' +
        'transform:translate(0,0) scale(1);' +
        'opacity:1;' +
        'transition:none;' +
        'will-change:transform,opacity;';

      document.body.appendChild(clone);
      clone.offsetHeight; // force reflow

      clone.style.transition = 'transform 1.0s cubic-bezier(0.4,0,0.2,1), opacity 0.9s ease-in';
      clone.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0.12)';
      clone.style.opacity = '0.4';

      function cleanup() {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
      }
      clone.addEventListener('transitionend', cleanup);
      setTimeout(cleanup, 1100);
    }

    // === CHECKBOX CLICK (delegation) ===
    tableB.addEventListener('click', function(e) {
      var cb = e.target.closest ? e.target.closest('.checkbox') : null;
      if (!cb || cb.classList.contains('disabled')) return;
      var tr = cb.parentElement;
      while (tr && tr.tagName !== 'TR') tr = tr.parentElement;
      if (!tr) return;
      var idx = parseInt(tr.getAttribute('data-idx'), 10);
      if (isNaN(idx)) return;

      if (checkedIds.has(idx)) {
        checkedIds.delete(idx);
        cb.classList.remove('checked');
        showToast.success('Объект удалён из отчёта', {
          actions: [{
            title: 'Восстановить',
            onClick: function() {
              checkedIds.add(idx);
              cb.classList.add('checked');
              updateTabLabels();
              updateResultsCounter();
              updateFooter();
              updateOwnerReportBlock();
              if (activeTab === 'in-report') {
                renderTableB();
                updateArrowVisibility();
              }
            }
          }]
        });
      } else {
        checkedIds.add(idx);
        cb.classList.add('checked');

        var photoImg = tr.querySelector('.photo-thumb');
        var stickyBar = document.getElementById('stickyTabsBar');
        var useSticky = stickyBar && stickyBar.classList.contains('visible');
        var counterEl = document.getElementById(useSticky ? 'stickyTabInReportCounter' : 'tabInReportCounter');
        if (photoImg && counterEl) {
          flyPhotoToTab(photoImg, counterEl);
        }
      }

      updateTabLabels();
      updateResultsCounter();
      updateFooter();
      updateOwnerReportBlock();

      if (activeTab === 'in-report') {
        renderTableB();
        updateArrowVisibility();
      }
    });

    // === COMPETITOR LINK CLICK ===
    tableB.addEventListener('click', function(e) {
      var title = e.target.closest ? e.target.closest('.desc-title') : null;
      if (!title) return;
      var tr = title.closest('tr[data-idx]');
      if (!tr) return;
      var idx = parseInt(tr.getAttribute('data-idx'), 10);
      if (!isNaN(idx)) {
        visitedIds.add(idx);
      }
      showToast('Переход на страницу объекта');
    });

    // === КЛИК ПО ФОТО → ФОТО-ГАЛЕРЕЯ (openGallery) ===
    // Делегат на документ: покрывает миниатюры конкурентов (Table B), «Мой объект»
    // (Table A) и блок отчёта собственника. Разные селекторы с чекбоксом/.desc-title/
    // #rowHoverBtn — не конфликтует.
    document.addEventListener('click', function(e) {
      var wrap = e.target.closest ? e.target.closest('[data-action="open-gallery"]') : null;
      if (!wrap || typeof openGallery !== 'function') return;
      var trComp = wrap.closest('tr[data-idx], tr[data-owner-idx]');
      if (trComp) {
        var idx = parseInt(trComp.getAttribute('data-idx') || trComp.getAttribute('data-owner-idx'), 10);
        if (isNaN(idx)) return;
        var d = ALL_COMPETITORS[idx] || {};
        openGallery({
          photos: galleryPhotos(idx),
          title: (d.desc || 'Объявление') + (d.currentPrice ? ', ' + d.currentPrice + ' ₽' : ''),
          coverIndex: 0,
          ariaLabel: 'Фотографии объявления'
        });
      } else {
        // «Мой объект» (#mainPhoto) — заголовок из desc-title той же строки.
        var row = wrap.closest('tr');
        var titleEl = row && row.querySelector('.desc-title');
        openGallery({
          photos: mainObjectPhotos(),
          title: titleEl ? titleEl.textContent.trim() : 'Мой объект',
          coverIndex: 0,
          ariaLabel: 'Фотографии объявления'
        });
      }
    });

    // === COMMENT HELPERS ===

    // Find comment-row TR for a given idx (must be sibling right after data TR)
    function findCommentTr(idx) {
      var dataTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
      if (!dataTr) return null;
      var next = dataTr.nextElementSibling;
      if (next && next.classList.contains('comment-row') && next.getAttribute('data-comment-idx') == idx) return next;
      return null;
    }

    // Auto-save and close any other open comment form
    function closeOtherCommentForms(currentIdx) {
      var openInputs = tableBBody.querySelectorAll('.comment-input-inline');
      openInputs.forEach(function(input) {
        var tr = input.closest('tr[data-comment-idx]');
        if (!tr) return;
        var otherIdx = parseInt(tr.getAttribute('data-comment-idx'), 10);
        if (otherIdx === currentIdx) return;
        var text = input.value.trim();
        var otherDataTr = tableBBody.querySelector('tr[data-idx="' + otherIdx + '"]');
        var otherDescCell = otherDataTr ? otherDataTr.querySelector('.col-desc') : null;
        if (text && otherDescCell) {
          commentTexts[otherIdx] = text;
          renderCommentOrLink(otherIdx);
        } else {
          tr.remove();
          if (otherDescCell) {
            var link = otherDescCell.querySelector('.add-comment');
            if (link) link.style.display = '';
          }
        }
      });
    }

    // Show inline edit/add form inside sticky TR
    function showCommentForm(idx, descCell, prefill) {
      // Close any other open form first (auto-save if has content)
      closeOtherCommentForms(idx);

      // Hide add-comment link in desc cell
      var addLink = descCell.querySelector('.add-comment');
      if (addLink) addLink.style.display = 'none';

      var dataTr = descCell.closest('tr[data-idx]');
      if (!dataTr) return;

      // Find or create comment row
      var commentTr = findCommentTr(idx);
      if (!commentTr) {
        commentTr = document.createElement('tr');
        commentTr.className = 'comment-row';
        commentTr.setAttribute('data-comment-idx', idx);
        dataTr.parentNode.insertBefore(commentTr, dataTr.nextSibling);
      }

      commentTr.innerHTML = '<td class="comment-spacer-2"></td>'
        + '<td class="comment-row-cell" colspan="8">'
        + '<div class="comment-form-wrap">'
        + '<span class="input comment-input-wrap"><input class="input__control comment-input-inline" type="text" maxlength="120" placeholder="Добавьте комментарий…"></span>'
        + '<div class="comment-form-actions">'
        + '<button class="btn-primary-sm" data-comment-add type="button">Добавить</button>'
        + '<button class="btn-ghost-sm" data-comment-cancel type="button">Отмена</button>'
        + '</div>'
        + '</div></td>';

      var input = commentTr.querySelector('.comment-input-inline');
      if (prefill) input.value = prefill;
      input.focus();

      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          var text = input.value.trim();
          if (text) {
            commentTexts[idx] = text;
            renderCommentOrLink(idx);
            showToast.success('Комментарий добавлен');
          } else {
            commentTr.remove();
            var link = descCell.querySelector('.add-comment');
            if (link) link.style.display = '';
          }
        } else if (e.key === 'Escape') {
          commentTr.remove();
          var link = descCell.querySelector('.add-comment');
          if (link) link.style.display = '';
        }
      });

      // Auto-save on blur (click outside the form)
      input.addEventListener('blur', function() {
        // Delay so button clicks fire before blur handler
        setTimeout(function() {
          if (!input.isConnected) return; // already handled by button click
          var text = input.value.trim();
          if (text) {
            commentTexts[idx] = text;
            renderCommentOrLink(idx);
          } else {
            commentTr.remove();
            var link = descCell.querySelector('.add-comment');
            if (link) link.style.display = '';
          }
        }, 150);
      });
    }

    function renderCommentOrLink(idx) {
      if (checkedIds.has(idx)) renderOwnerCompetitorsList();
    }

    // === COMMENT INTERACTION (delegation) ===
    tableB.addEventListener('click', function(e) {
      // Resolve from data TR or comment TR
      var anyTr = e.target.closest ? e.target.closest('tr[data-idx], tr[data-comment-idx]') : null;
      if (!anyTr) return;
      var idx = parseInt(anyTr.getAttribute('data-idx') || anyTr.getAttribute('data-comment-idx'), 10);
      if (isNaN(idx)) return;

      // Always resolve desc cell from data TR
      var dataTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
      var descCell = dataTr ? dataTr.querySelector('.col-desc') : null;
      if (!descCell) return;

      // "Добавить комментарий" link (in desc cell)
      if (e.target.closest('.add-comment')) {
        e.preventDefault();
        showCommentForm(idx, descCell, null);
        return;
      }

      // "Добавить" button in inline form
      if (e.target.closest('[data-comment-add]')) {
        var commentTr = findCommentTr(idx);
        if (!commentTr) return;
        var input = commentTr.querySelector('.comment-input-inline');
        var text = input ? input.value.trim() : '';
        if (text) {
          commentTexts[idx] = text;
          renderCommentOrLink(idx);
          showToast.success('Комментарий добавлен');
        } else {
          commentTr.remove();
          var link = descCell.querySelector('.add-comment');
          if (link) link.style.display = '';
        }
        return;
      }

      // "Отмена" button in inline form
      if (e.target.closest('[data-comment-cancel]')) {
        var commentTr = findCommentTr(idx);
        if (commentTr) commentTr.remove();
        var link = descCell.querySelector('.add-comment');
        if (link) link.style.display = '';
        return;
      }

      // Pencil icon OR click on bubble — edit comment
      if (e.target.closest('[data-comment-edit]') || e.target.closest('.row-comment-bubble')) {
        showCommentForm(idx, descCell, commentTexts[idx]);
        return;
      }

      // Trash — delete comment
      if (e.target.closest('[data-comment-delete]')) {
        var savedText = commentTexts[idx];
        delete commentTexts[idx];
        renderCommentOrLink(idx);
        showToast.success('Комментарий удалён', {
          actions: [{
            title: 'Восстановить',
            onClick: function() {
              commentTexts[idx] = savedText;
              renderCommentOrLink(idx);
            }
          }]
        });
        return;
      }
    });

    // === TABS ===
    // Доскролл к ряду вкладок. Нативный scrollIntoView + scroll-margin-top — без ручной
    // математики window.scrollY, которая промахивается при смене высоты документа.
    // Слепое пятно: когда шапка Table A уходит за хедер, sticky-легенда таблицы
    // (#stickyTableHeader — шапка колонок + скроллбар) пиннится на top:header-h и
    // перекрывает вкладки. Поэтому закладываем её высоту в смещение, иначе вкладки
    // оказываются под легендой. rAF — чтобы мерить после reflow от смены вкладки.
    function scrollToTabs() {
      requestAnimationFrame(function () {
        var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 67;
        var legendH = stickyTableHeader ? stickyTableHeader.offsetHeight : 0;
        tabsRowEl.style.scrollMarginTop = (headerH + legendH + 8) + 'px';
        tabsRowEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    tabInReport.addEventListener('click', function() {
      var wasScrolledDown = stickyTabsBar.classList.contains('visible');
      if (activeTab === 'in-report') {
        if (wasScrolledDown) scrollToTabs();
        return;
      }
      activeTab = 'in-report';
      setActiveTabChrome(tabInReport, stickyTabInReport);
      filtersEl.style.display = 'none';
      resultsCounter.style.display = 'none';
      archiveBanner.style.display = 'none';
      renderFilterRow();
      renderTableB();
      updateShowMoreBtn();
      updateArrowVisibility();
      if (wasScrolledDown) scrollToTabs();
    });

    tabSelection.addEventListener('click', function() {
      if (activeTab === 'selection') return;
      activeTab = 'selection';
      justAddedInSelection.clear(); // заход на вкладку — пересобираем список, добавленные ранее уходят
      setActiveTabChrome(tabSelection, stickyTabSelection);
      filtersEl.style.display = '';
      resultsCounter.style.display = '';
      archiveBanner.style.display = 'none';
      renderFilterRow();
      renderTableB();
      updateShowMoreBtn();
      updateArrowVisibility();
    });

    // Вкладка «Архивные»: снятые с публикации объекты (реальные цены сделок, ориентир по
    // экспозиции). Баннер ценности + ТОТ ЖЕ фасетный ряд, что в «Подборке» (общий `.filters`,
    // синхронное состояние) + архив-специфичный «За N дней» допом в конце. Счётчик скрыт.
    tabArchive.addEventListener('click', function() {
      var wasScrolledDown = stickyTabsBar.classList.contains('visible');
      if (activeTab === 'archive') {
        if (wasScrolledDown) scrollToTabs();
        return;
      }
      activeTab = 'archive';
      justAddedInSelection.clear();
      setActiveTabChrome(tabArchive, stickyTabArchive);
      filtersEl.style.display = '';        // общий фасетный ряд — как в «Подборке» (синхрон)
      resultsCounter.style.display = 'none';
      archiveBanner.style.display = 'flex';
      renderFilterRow();   // на архиве в ряд встаёт «За N дней» первым
      renderTableB();
      updateShowMoreBtn();
      updateArrowVisibility();
      if (wasScrolledDown) scrollToTabs();
    });

    // Подсветка активной вкладки (основной ряд + sticky-зеркало) для трёх вкладок разом.
    function setActiveTabChrome(mainTab, stickyTab) {
      [tabInReport, tabSelection, tabArchive].forEach(function(t) {
        t.classList.toggle('active', t === mainTab);
      });
      [stickyTabInReport, stickyTabSelection, stickyTabArchive].forEach(function(t) {
        t.classList.toggle('active', t === stickyTab);
      });
    }

    // Фильтр «Активные/Архивные» (чипы в «Подборке») удалён — архив вынесен в отдельную вкладку.

    // === STICKY TABS (mirror original tabs) ===
    stickyTabInReport.addEventListener('click', function() {
      tabInReport.click();
    });
    stickyTabSelection.addEventListener('click', function() {
      tabSelection.click();
    });
    stickyTabArchive.addEventListener('click', function() {
      tabArchive.click();
    });

    // === SHOW MORE ===
    btnShowMore.addEventListener('click', function() {
      btnShowMore.classList.add('loading');
      setTimeout(function() {
        btnShowMore.classList.remove('loading');
        visibleCount = Math.min(visibleCount + 10, ALL_COMPETITORS.length);
        renderTableB();
        updateShowMoreBtn();
        updateTabLabels();
        updateArrowVisibility();
      }, 1000);
    });

    // === V-next: hover-кнопка вместо чекбокса ===
    // «Отслеживаются»: «Удалить» → строка схлопывается + снекбар с «Восстановить».
    // «Подборка»: «Добавить» (синяя) ↔ «Отслеживается» — тоггл на месте, со снекбарами; строка остаётся.
    (function rowHoverButton() {
      var section = document.getElementById('tableBSection');
      var btn = document.getElementById('rowHoverBtn');
      if (!section || !btn) return;
      var hoverIdx = null;

      function clearRowHighlight() {
        var hl = tableBBody.querySelectorAll('tr.row-hovered');
        Array.prototype.forEach.call(hl, function(r) { r.classList.remove('row-hovered'); });
      }
      function hide() {
        btn.className = btn.className.replace(/\bvisible\b/, '').trim();
        clearRowHighlight();
        hoverIdx = null;
      }

      function applyBtn(idx) {
        if (activeTab === 'in-report') {
          btn.className = 'btn-negative-secondary-sm visible';
          btn.textContent = 'Перестать отслеживать';
        } else if (checkedIds.has(idx)) {
          btn.className = 'btn-secondary-sm visible';
          btn.textContent = 'Отслеживается';
        } else {
          btn.className = 'btn-primary-sm visible';
          btn.textContent = 'Добавить';
        }
      }

      function positionFor(tr) {
        var idx = parseInt(tr.getAttribute('data-idx'), 10);
        if (isNaN(idx)) return;
        // Добавленная строка в «Подборке» — плавающую кнопку не показываем: на ней уже
        // висит персистентная «Отслеживается». Заливка строки держится классом .row-added.
        if ((activeTab === 'selection' || activeTab === 'archive') && checkedIds.has(idx)) { hide(); return; }
        hoverIdx = idx;
        // Подсветка строки держится классом, а не только :hover — чтобы не гасла,
        // когда курсор переходит на плавающую кнопку (она вне строки).
        clearRowHighlight();
        tr.classList.add('row-hovered');
        applyBtn(idx); // сначала размер/текст — чтобы offsetHeight был верным
        var sr = section.getBoundingClientRect();
        var rr = tr.getBoundingClientRect();
        // снизу строки с отступом 12px (низ кнопки = низ самого большого блока — параметров)
        btn.style.top = (rr.top - sr.top + rr.height - 12 - btn.offsetHeight) + 'px';
      }

      function syncMeta() {
        updateTabLabels();
        updateResultsCounter();
        updateFooter();
        updateOwnerReportBlock();
        updateShowMoreBtn();
      }
      function refreshTracking() {
        syncMeta();
        renderTableB();
        updateArrowVisibility();
      }

      // Плавно схлопывает строку конкурента (и её строку-комментарий, если есть),
      // затем вызывает done(). Контент ячеек оборачивается в .row-collapse-inner,
      // max-height анимируется фикс.высота → 0, паддинги ячеек → 0.
      function collapseRow(idx, done) {
        var dataTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
        if (!dataTr) { done(); return; }
        var trs = [dataTr];
        var nxt = dataTr.nextElementSibling;
        if (nxt && nxt.classList.contains('comment-row') && nxt.getAttribute('data-comment-idx') == idx) trs.push(nxt);

        trs.forEach(function(tr) {
          Array.prototype.forEach.call(tr.children, function(td) {
            var inner = document.createElement('div');
            inner.className = 'row-collapse-inner';
            while (td.firstChild) inner.appendChild(td.firstChild);
            td.appendChild(inner);
            inner.style.maxHeight = inner.scrollHeight + 'px'; // стартовая высота для перехода
          });
          tr.classList.add('row-collapsing');
        });
        void tableBBody.offsetHeight; // reflow — фиксируем стартовый max-height
        trs.forEach(function(tr) {
          Array.prototype.forEach.call(tr.querySelectorAll('.row-collapse-inner'), function(inner) {
            inner.style.maxHeight = '0px';
          });
        });
        setTimeout(done, 300);
      }

      // Обратная анимация collapseRow: после «Вернуть» строка раскрывается тем же приёмом,
      // но в другую сторону — max-height 0 → полная, паддинги ячеек 0 → норма. Строка к этому
      // моменту уже отрисована renderTableB на полную высоту; мгновенно сворачиваем (transition
      // none), форсим reflow, затем анимируем разворот. По завершении — разворачиваем контент
      // ячеек обратно и чистим инлайн-стили.
      function expandRow(idx) {
        var dataTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
        if (!dataTr) return;
        var trs = [dataTr];
        var nxt = dataTr.nextElementSibling;
        if (nxt && nxt.classList.contains('comment-row') && nxt.getAttribute('data-comment-idx') == idx) trs.push(nxt);

        var inners = [];
        trs.forEach(function(tr) {
          Array.prototype.forEach.call(tr.children, function(td) {
            var inner = document.createElement('div');
            inner.className = 'row-collapse-inner';
            while (td.firstChild) inner.appendChild(td.firstChild);
            td.appendChild(inner);
            inner._fullH = inner.scrollHeight;        // целевая высота до сворачивания
            inner.style.transition = 'none';          // ставим свёрнутое мгновенно, без вспышки
            inner.style.maxHeight = '0px';
            inner.style.opacity = '0';
            td.style.transition = 'none';
            td.style.paddingTop = '0';
            td.style.paddingBottom = '0';
            inners.push(inner);
          });
        });
        void tableBBody.offsetHeight;                 // reflow — фиксируем свёрнутый старт
        inners.forEach(function(inner) {
          var td = inner.parentNode;
          inner.style.transition = '';                // вернуть транзишены .row-collapse-inner
          td.style.transition = 'padding 0.28s ease';
          inner.style.maxHeight = inner._fullH + 'px';
          inner.style.opacity = '1';
          td.style.paddingTop = '';                   // → анимируется к норме (12px)
          td.style.paddingBottom = '';
        });
        setTimeout(function() {
          trs.forEach(function(tr) {
            Array.prototype.forEach.call(tr.querySelectorAll('.row-collapse-inner'), function(inner) {
              var td = inner.parentNode;
              td.style.transition = '';
              while (inner.firstChild) td.appendChild(inner.firstChild);
              td.removeChild(inner);
            });
          });
        }, 320);
      }

      // Кнопка схлопывается вместе со строкой: сжимается по вертикали (как «задвигается»
      // строка) + гаснет. Тот же приём, что и в collapseRow: задаём старт, форсим reflow,
      // затем конечные значения — иначе переход не стартует. После анимации прячем/сбрасываем.
      function collapseBtn() {
        if (!btn.classList.contains('visible')) return;
        btn.style.transition = 'transform 0.28s ease, opacity 0.2s ease';
        btn.style.transformOrigin = 'top center';
        btn.style.transform = 'scaleY(1)';
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'none';
        void btn.offsetHeight; // reflow — фиксируем стартовое состояние
        btn.style.transform = 'scaleY(0)';
        btn.style.opacity = '0';
        setTimeout(function() {
          hide();
          btn.style.transition = '';
          btn.style.transform = '';
          btn.style.opacity = '';
          btn.style.transformOrigin = '';
          btn.style.pointerEvents = '';
        }, 300);
      }

      // Персистентные кнопки «Отслеживается» — по одной на каждую добавленную строку в
      // «Подборке». Плавают у правого края секции (как #rowHoverBtn), но остаются. Чисто
      // визуальный маркер «уже добавлен»; клик снимает объект из отслеживаемых.
      function renderPersistentBtns() {
        var old = section.querySelectorAll('.persistent-track-btn');
        Array.prototype.forEach.call(old, function(b) { if (b.parentNode) b.parentNode.removeChild(b); });
        if (activeTab !== 'selection' && activeTab !== 'archive') return;
        var sr = section.getBoundingClientRect();
        var rows = tableBBody.querySelectorAll('tr[data-idx]');
        Array.prototype.forEach.call(rows, function(tr) {
          var idx = parseInt(tr.getAttribute('data-idx'), 10);
          if (isNaN(idx) || !checkedIds.has(idx)) return;
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn-secondary-sm persistent-track-btn';
          b.textContent = 'Отслеживается';
          b.setAttribute('data-idx', String(idx));
          section.appendChild(b);
          var rr = tr.getBoundingClientRect();
          b.style.top = (rr.top - sr.top + rr.height - 12 - b.offsetHeight) + 'px';
        });
      }
      refreshSelectionBtns = renderPersistentBtns; // отдать хук в renderTableB

      // Клик по персистентной кнопке = снять объект из отслеживаемых (делегирование).
      section.addEventListener('click', function(e) {
        var pb = e.target.closest ? e.target.closest('.persistent-track-btn') : null;
        if (!pb) return;
        var idx = parseInt(pb.getAttribute('data-idx'), 10);
        if (isNaN(idx)) return;
        checkedIds.delete(idx);
        justAddedInSelection.delete(idx);
        var tr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
        if (tr) tr.classList.remove('row-added');
        showToast.success('Перестали отслеживать', { actions: [{ title: 'Вернуть', onClick: function() {
          checkedIds.add(idx);
          justAddedInSelection.add(idx);
          var undoTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
          if (undoTr) undoTr.classList.add('row-added');
          syncMeta();
          renderPersistentBtns();
        } }] });
        syncMeta();
        renderPersistentBtns();
      });

      window.addEventListener('resize', renderPersistentBtns); // перепозиционирование

      tableB.addEventListener('mouseover', function(e) {
        var tr = e.target.closest ? e.target.closest('tr[data-idx]') : null;
        if (!tr || tr.classList.contains('comment-row')) return;
        positionFor(tr);
      });
      section.addEventListener('mouseleave', hide);

      btn.addEventListener('click', function() {
        if (hoverIdx == null) return;
        var idx = hoverIdx;
        if (activeTab === 'in-report') {
          // Удаление: строка плавно схлопывается, затем уходит из списка; снекбар с восстановлением
          checkedIds.delete(idx);
          showToast.success('Перестали отслеживать', { actions: [{ title: 'Вернуть', onClick: function() {
            checkedIds.add(idx);
            refreshTracking();   // строка снова в списке (на полную высоту)
            expandRow(idx);      // …и раскрывается обратной анимацией
          } }] });
          collapseBtn(); // кнопка схлопывается вместе со строкой (а не исчезает мгновенно)
          syncMeta(); // счётчики/футер/блок отчёта — сразу
          // Восстановление в момент анимации безопасно: refreshTracking вернёт строку,
          // а отложенный renderTableB её уже не уберёт (idx снова в checkedIds).
          collapseRow(idx, function() { renderTableB(); updateArrowVisibility(); });
        } else {
          // Подборка: клик по плавающей кнопке = «Добавить» (она показывается только на
          // не-добавленных строках). После добавления строка фризится заливкой, плавающую
          // прячем — её место занимает персистентная «Отслеживается» (см. renderPersistentBtns).
          checkedIds.add(idx);
          justAddedInSelection.add(idx);
          showToast.success('Начали отслеживать');
          var addedTr = tableBBody.querySelector('tr[data-idx="' + idx + '"]');
          if (addedTr) addedTr.classList.add('row-added');
          hide();
          syncMeta();
          renderPersistentBtns();
        }
      });
    })();

    // === V-next: «Добавить больше объектов» → вкладка подборки ===
    (function() {
      var b = document.getElementById('btnAddMore');
      if (b) b.addEventListener('click', function() {
        tabSelection.click();
        scrollToTabs(); // доскролл наверх к вкладкам — видно, что открыта «Подборка»
      });
    })();

    // === CUSTOM SCROLLBAR STATE ===
    var currentScrollLeft = 0;

    function getMaxScroll() {
      var tableEl = tableA.querySelector('table') || tableB.querySelector('table');
      if (!tableEl) return 0;
      return Math.max(0, tableEl.scrollWidth - tableA.clientWidth);
    }

    function applyScrollLeft(val) {
      var max = getMaxScroll();
      currentScrollLeft = Math.max(0, Math.min(val, max));
      isSyncing = true;
      tableALegendScroll.scrollLeft = currentScrollLeft;
      tableA.scrollLeft = currentScrollLeft;
      tableB.scrollLeft = currentScrollLeft;
      stickyHeaderScroll.scrollLeft = currentScrollLeft;
      isSyncing = false;
      updateScrollbarThumb();
      updateArrowVisibility();
      updateHeaderLabels();
    }

    function updateScrollbarThumb() {
      var tableEl = tableA.querySelector('table') || tableB.querySelector('table');
      if (!tableEl) return;
      var scrollWidth = tableEl.scrollWidth;
      var clientWidth = tableA.clientWidth;
      var maxScroll = Math.max(0, scrollWidth - clientWidth);

      // Hide both scrollbars when no horizontal overflow
      var hasOverflow = maxScroll > 1;
      scrollbarMain.style.display = hasOverflow ? '' : 'none';
      stickyScrollbarMain.style.display = hasOverflow ? '' : 'none';
      if (!hasOverflow) return;

      function setThumb(track, thumb) {
        var trackWidth = track.clientWidth;
        if (trackWidth <= 0) return;
        var thumbWidth = Math.max(Math.round(trackWidth * clientWidth / scrollWidth), 32);
        var maxThumbLeft = trackWidth - thumbWidth;
        var thumbLeft = Math.round(currentScrollLeft / maxScroll * maxThumbLeft);
        thumb.style.width = thumbWidth + 'px';
        thumb.style.transform = 'translateX(' + thumbLeft + 'px)';
      }

      setThumb(scrollbarTrack, scrollbarThumb);
      setThumb(stickyScrollbarTrack, stickyScrollbarThumb);
    }

    function setupThumbDrag(thumb, track) {
      thumb.addEventListener('mousedown', function(e) {
        e.preventDefault();
        var dragStartX = e.clientX;
        var dragStartScrollLeft = currentScrollLeft;
        thumb.classList.add('dragging');

        function onMouseMove(e) {
          var dx = e.clientX - dragStartX;
          var trackWidth = track.clientWidth;
          var thumbWidth = thumb.offsetWidth || 32;
          var maxThumbLeft = trackWidth - thumbWidth;
          if (maxThumbLeft <= 0) return;
          applyScrollLeft(dragStartScrollLeft + dx * getMaxScroll() / maxThumbLeft);
        }

        function onMouseUp() {
          thumb.classList.remove('dragging');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // Click on track (not thumb) → jump to position
      track.addEventListener('mousedown', function(e) {
        if (e.target === thumb) return;
        var rect = track.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var thumbWidth = thumb.offsetWidth || 32;
        var maxThumbLeft = rect.width - thumbWidth;
        if (maxThumbLeft <= 0) return;
        var ratio = (clickX - thumbWidth / 2) / maxThumbLeft;
        applyScrollLeft(ratio * getMaxScroll());
      });
    }

    setupThumbDrag(scrollbarThumb, scrollbarTrack);
    setupThumbDrag(stickyScrollbarThumb, stickyScrollbarTrack);

    // === SCROLL SYNC ===
    function syncProxyWidth() {
      updateScrollbarThumb();
    }

    function updateEmptyStateHeight() {
      if (!emptyBState || emptyBState.style.display === 'none') return;
      emptyBState.style.minHeight = '';
      emptyBState.style.height = '400px';
    }

    syncProxyWidth();
    requestAnimationFrame(updateScrollbarThumb); // ensure thumb renders after first layout pass
    window.addEventListener('load', updateScrollbarThumb);
    window.addEventListener('resize', syncProxyWidth);
    window.addEventListener('resize', updateEmptyStateHeight);
    window.addEventListener('load', updateEmptyStateHeight);

    var isSyncing = false;

    tableA.addEventListener('scroll', function() {
      if (isSyncing) return;
      currentScrollLeft = tableA.scrollLeft;
      isSyncing = true;
      tableALegendScroll.scrollLeft = currentScrollLeft;
      tableB.scrollLeft = currentScrollLeft;
      stickyHeaderScroll.scrollLeft = currentScrollLeft;
      isSyncing = false;
      updateScrollbarThumb();
      updateArrowVisibility();
      updateHeaderLabels();
    });

    tableB.addEventListener('scroll', function() {
      if (isSyncing) return;
      currentScrollLeft = tableB.scrollLeft;
      isSyncing = true;
      tableA.scrollLeft = currentScrollLeft;
      stickyHeaderScroll.scrollLeft = currentScrollLeft;
      isSyncing = false;
      updateScrollbarThumb();
      updateArrowVisibility();
      updateHeaderLabels();
    });

    // Легенда верхней таблицы теперь нативно прокручивается (кастомный скроллбар законсервирован).
    // Перетаскивание её нативного скролла синхронит обе таблицы и sticky-шапку.
    tableALegendScroll.addEventListener('scroll', function() {
      if (isSyncing) return;
      currentScrollLeft = tableALegendScroll.scrollLeft;
      isSyncing = true;
      tableA.scrollLeft = currentScrollLeft;
      tableB.scrollLeft = currentScrollLeft;
      stickyHeaderScroll.scrollLeft = currentScrollLeft;
      isSyncing = false;
      updateScrollbarThumb();
      updateArrowVisibility();
      updateHeaderLabels();
    });

    function handleWheel(e) {
      if (Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        applyScrollLeft(currentScrollLeft + e.deltaX);
      }
    }
    tableA.addEventListener('wheel', handleWheel, { passive: false });
    tableB.addEventListener('wheel', handleWheel, { passive: false });

    function updateArrowVisibility() {}

    function animateRows() {
      var rows = tableBBody.querySelectorAll('tr');
      rows.forEach(function(row, i) {
        row.style.animationDelay = (i * 60) + 'ms';
        row.classList.add('row-animated');
      });
    }

    var animationId = null;

    window.addEventListener('resize', function() { syncProxyWidth(); updateArrowVisibility(); });

    // === STICKY BARS: shared state + visibility logic ===
    var tabsRowEl = document.querySelector('.tabs');
    var tableBSectionEl = document.getElementById('tableBSection');
    var tabsOutOfView = false;
    var filtersOutOfView = false;
    var stickyBarsActivated = false;
    var tableAHeadOutOfView = false;

    // Измеряем реальные высоты хедера и таб-бара и прокидываем в CSS-переменные
    function measureStickyHeights() {
      var headerEl = document.querySelector('.header');
      var HEADER_H = headerEl ? headerEl.offsetHeight : 67;
      var TABS_BAR_H = tabsRowEl ? tabsRowEl.offsetHeight : 44;
      document.documentElement.style.setProperty('--header-h', HEADER_H + 'px');
      document.documentElement.style.setProperty('--tabs-bar-h', TABS_BAR_H + 'px');
      return { HEADER_H: HEADER_H, TABS_BAR_H: TABS_BAR_H };
    }
    var stickyH = measureStickyHeights();

    function updateStickyBars() {
      var bodyRect = tableBBody.getBoundingClientRect();
      // Порог = хедер + таб-бар + шапка таблицы (~49px)
      var tableInViewport = bodyRect.bottom > stickyH.HEADER_H + stickyH.TABS_BAR_H + 49;

      // Вкладки прилипают как только уходят за верхний край — без ожидания tableExtendsBelow
      stickyBarsActivated = tabsOutOfView && tableInViewport;

      stickyTabsBar.classList.toggle('visible', stickyBarsActivated);

      // Sticky-шапка таблицы: появляется когда thead ушёл за хедер,
      // скрывается вместе со sticky вкладками (когда конец таблицы B или вкладки вернулись).
      var showStickyHeader = tableAHeadOutOfView && (!tabsOutOfView || stickyBarsActivated);
      stickyTableHeader.classList.toggle('visible', showStickyHeader);
      stickyTableHeader.classList.toggle('tabs-visible', stickyBarsActivated);
    }

    var tabsObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        tabsOutOfView = !entry.isIntersecting;
        updateStickyBars();
      });
    }, { rootMargin: '-' + stickyH.HEADER_H + 'px 0px 0px 0px', threshold: 1 });
    tabsObserver.observe(tabsRowEl);

    var headerObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        filtersOutOfView = !entry.isIntersecting;
        updateStickyBars();
      });
    }, { rootMargin: '-' + (stickyH.HEADER_H + stickyH.TABS_BAR_H) + 'px 0px 0px 0px' });
    headerObserver.observe(filtersEl);

    // Прямая проверка при каждом скролле: как только нижний край thead таблицы A
    // уходит выше хедера — показываем sticky-шапку (без задержки observer'а)
    var tableAHeadRow = document.querySelector('#tableALegendScroll thead tr');
    function checkTableAHead() {
      if (!tableAHeadRow) return;
      var rect = tableAHeadRow.getBoundingClientRect();
      // Показываем fixed шапку как только верхний край thead касается хедера —
      // она перекрывает реальную шапку и выглядит как одна прилипающая сущность.
      tableAHeadOutOfView = rect.top <= stickyH.HEADER_H;
    }

    checkTableAHead(); // инициализация при загрузке
    window.addEventListener('scroll', function() {
      checkTableAHead();
      updateStickyBars();
    }, { passive: true });
    window.addEventListener('resize', function() {
      stickyH = measureStickyHeights();
      updateStickyBars();
    });

    function syncStickyHeader() {
      stickyHeaderScroll.scrollLeft = currentScrollLeft;
    }

    // === HIDE HEADER LABEL ON HORIZONTAL SCROLL ===
    var headerLabels = document.querySelectorAll('.col-header-label');
    var LABEL_FADE_START = 180; // price text starts approaching first cell text
    var LABEL_FADE_END   = 260; // price text reaches first cell text start
    function updateHeaderLabels() {
      var ratio = Math.max(0, Math.min(1,
        (LABEL_FADE_END - currentScrollLeft) / (LABEL_FADE_END - LABEL_FADE_START)
      ));
      headerLabels.forEach(function(label) {
        label.style.opacity = ratio;
      });
    }

    // === PRICE MODE TOGGLE ===
    var priceChipSingle = document.getElementById('priceChipSingle');
    var priceChipRange = document.getElementById('priceChipRange');
    var priceFieldsRange = document.getElementById('priceFieldsRange');
    var priceFieldsSingle = document.getElementById('priceFieldsSingle');

    priceChipRange.addEventListener('click', function() {
      priceChipRange.classList.add('active');
      priceChipSingle.classList.remove('active');
      priceFieldsRange.style.display = '';
      priceFieldsSingle.style.display = 'none';
    });

    priceChipSingle.addEventListener('click', function() {
      priceChipSingle.classList.add('active');
      priceChipRange.classList.remove('active');
      priceFieldsSingle.style.display = '';
      priceFieldsRange.style.display = 'none';
    });

    // === METRICS CHECKBOXES (нативный input DS-чекбокса) ===
    document.getElementById('statsMetricsWrap').addEventListener('change', function(e) {
      var cb = e.target.closest ? e.target.closest('.checkbox__control') : null;
      if (!cb || cb.disabled) return;
      var row = cb.closest('.metrics-row');
      if (!row) return;
      row.classList.toggle('unchecked', !cb.checked);
    });

    // === STATS VISIBILITY ===
    var statsMetricsWrap = document.getElementById('statsMetricsWrap');
    document.querySelectorAll('input[name="stats-include"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        if (this.nextElementSibling.textContent.trim() === 'Не показывать') {
          statsMetricsWrap.classList.add('hidden');
        } else {
          statsMetricsWrap.classList.remove('hidden');
        }
      });
    });

    // === CIAN ESTIMATE VISIBILITY ===
    var cianEstimateVisual = document.querySelector('.price-estimate-visual');
    document.querySelectorAll('input[name="cian-estimate"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        if (this.value === 'hide' || this.nextElementSibling.textContent.trim() === 'Не показывать') {
          cianEstimateVisual.classList.add('hidden');
        } else {
          cianEstimateVisual.classList.remove('hidden');
        }
      });
    });

    // === ONBOARDING TOOLTIP (first competitor add) ===
    // NOTE: element is after this script tag — look up lazily on first call
    var onboardingShown = false;
    var onboardingCloseListener = null;

    function updateOnboardingTooltipPosition() {
      var el = document.getElementById('onboardingTooltip');
      if (!el || el.style.display === 'none') return;
      var stickyBar = document.getElementById('stickyTabsBar');
      var useSticky = stickyBar && stickyBar.classList.contains('visible');
      var tab = document.getElementById(useSticky ? 'stickyTabInReport' : 'tabInReport');
      if (!tab) return;
      var rect = tab.getBoundingClientRect();
      el.style.left = (rect.left + rect.width / 2) + 'px';
      el.style.top = (rect.bottom + 10) + 'px';
    }

    function showOnboardingTooltip() {
      if (onboardingShown) return;
      var el = document.getElementById('onboardingTooltip');
      if (!el) return;
      onboardingShown = true;

      // Register close button now that element is in DOM
      var closeBtn = el.querySelector('.onboarding-tooltip-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          closeOnboardingTooltip();
        });
      }

      el.style.transform = 'translateX(-50%)';
      el.style.display = 'block';
      updateOnboardingTooltipPosition();
      el.style.opacity = '0';
      el.offsetHeight; // force reflow
      el.style.transition = 'opacity 0.2s';
      el.style.opacity = '1';

      window.addEventListener('scroll', updateOnboardingTooltipPosition, { passive: true });

      setTimeout(function() {
        onboardingCloseListener = function() { closeOnboardingTooltip(); };
        document.addEventListener('click', onboardingCloseListener, { capture: true, once: true });
      }, 80);
    }

    function closeOnboardingTooltip() {
      var el = document.getElementById('onboardingTooltip');
      window.removeEventListener('scroll', updateOnboardingTooltipPosition);
      if (onboardingCloseListener) {
        document.removeEventListener('click', onboardingCloseListener, true);
        onboardingCloseListener = null;
      }
      if (!el) return;
      el.style.transition = 'opacity 0.15s';
      el.style.opacity = '0';
      setTimeout(function() {
        var e2 = document.getElementById('onboardingTooltip');
        if (e2) e2.style.display = 'none';
      }, 160);
    }

    // === INIT ===
    var mainPhotoEl = document.getElementById('mainPhoto');
    if (mainPhotoEl) {
      mainPhotoEl.onerror = function() { this.src = 'https://placehold.co/80x80'; };
    }
    // initialTab is 'in-report' — hide filters and counter on load
    if (activeTab === 'in-report') {
      filtersEl.style.display = 'none';
      resultsCounter.style.display = 'none';
    }
    renderTableB();
    updateTabLabels();
    updateResultsCounter();
    updateFooter();
    updateOwnerReportBlock();
    updateShowMoreBtn();
    syncProxyWidth();
    syncStickyHeader();
    updateHeaderLabels();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateEmptyStateHeight);
    }

    // Счётчик символов и авторазмер поля комментария — в DS-компоненте
    // (components/textarea.js, прод-проп hasCounter). Локальной логики больше нет.
  })();

  // === SAVE & EXIT BUTTON ===
  document.getElementById('btnSaveExit').addEventListener('click', function() {
    window.location.href = 'index.html?saved=1';
  });

  // === PRICE HISTORY TOOLTIP ===
  (function() {
    var tooltipEl   = document.getElementById('priceTooltip');
    var tooltipBody = tooltipEl.querySelector('.price-tooltip-body');
    var hideTimer;

    var MONTHS_PARSE = {
      'января':0,'февраля':1,'марта':2,'апреля':3,'мая':4,'июня':5,
      'июля':6,'августа':7,'сентября':8,'октября':9,'ноября':10,'декабря':11
    };
    var MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

    function parseRuDate(str) {
      var p = str.trim().split(' ');
      return new Date(+p[2], MONTHS_PARSE[p[1]], +p[0]);
    }

    function fmtDate(d) {
      return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
    }

    function buildContent(d) {
      var listingDate = parseRuDate(d.date);
      var changeDate  = new Date(listingDate);
      changeDate.setDate(changeDate.getDate() + Math.max(1, Math.floor(d.days * 0.35)));

      var isUp   = d.priceDelta.startsWith('+');
      var cls    = isUp ? 'price-tooltip-delta--down' : 'price-tooltip-delta--up';
      var arrow  = isUp ? '▲' : '▼';
      var amount = d.priceDelta.replace('−','').replace('+','').trim();

      return '<div class="price-tooltip-row">'
        + '<span class="price-tooltip-date">' + fmtDate(changeDate) + '</span>'
        + '<span class="price-tooltip-price">' + d.currentPrice + '\u00a0\u20bd</span>'
        + '<span class="price-tooltip-delta ' + cls + '">' + arrow + '\u00a0' + amount + '\u00a0\u20bd</span>'
        + '</div>'
        + '<div class="price-tooltip-row">'
        + '<span class="price-tooltip-date">' + fmtDate(listingDate) + '</span>'
        + '<span class="price-tooltip-price">' + d.startPrice + '\u00a0\u20bd</span>'
        + '</div>';
    }

    // rows приходят из двух мест: у конкурентов история хранится смещениями в днях от
    // публикации (dayOffset) — чтобы не разъезжаться со сроком размещения; у «Моего
    // объекта» она лежит календарными датами прямо в разметке (data-history).
    function buildContentFromHistory(rows, pubDate) {
      return rows.map(function(row) {
        var when = row.date || (pubDate
          ? fmtDate(new Date(pubDate.getTime() + row.dayOffset * 86400000))
          : '');
        var html = '<div class="price-tooltip-row">'
          + '<span class="price-tooltip-date">' + when + '</span>'
          + '<span class="price-tooltip-price">' + row.price + '\u00a0\u20bd</span>';
        if (row.delta) {
          var cls   = row.isUp ? 'price-tooltip-delta--down' : 'price-tooltip-delta--up';
          var arrow = row.isUp ? '▲' : '▼';
          var amt   = row.delta.replace('−','').replace('+','').trim();
          html += '<span class="price-tooltip-delta ' + cls + '">' + arrow + '\u00a0' + amt + '\u00a0\u20bd</span>';
        }
        return html + '</div>';
      }).join('');
    }

    function positionAndShow(trigger) {
      var trigRect = trigger.getBoundingClientRect();
      var ttW = tooltipEl.offsetWidth;
      var ttH = tooltipEl.offsetHeight;

      var idealLeft = trigRect.left + trigRect.width / 2 - ttW / 2;
      var left = Math.max(8, Math.min(idealLeft, window.innerWidth - ttW - 8));
      var top  = trigRect.top - ttH - 10;
      if (top < 8) top = trigRect.bottom + 10;

      var caretLeft = Math.max(14, Math.min(trigRect.left + trigRect.width / 2 - left, ttW - 14));

      tooltipEl.style.left = left + 'px';
      tooltipEl.style.top  = top  + 'px';
      tooltipEl.style.setProperty('--caret-left', caretLeft + 'px');
      tooltipEl.classList.add('visible');
    }

    function showTooltip(trigger) {
      var td = trigger.closest('td[data-history]');
      if (td) {
        // Дату публикации «Моего объекта» посчитал блок baseObjectDuration и положил
        // рядом с ячейкой срока — история цены хранится смещениями от неё.
        var pubMs = document.querySelector('#tableA td.col-duration[data-pub-ms]');
        tooltipBody.innerHTML = buildContentFromHistory(
          JSON.parse(td.getAttribute('data-history')),
          pubMs ? new Date(+pubMs.getAttribute('data-pub-ms')) : null);
        positionAndShow(trigger);
        return;
      }
      td = trigger.closest('td[data-comp-idx]');
      if (!td) return;
      var d = ALL_COMPETITORS[+td.getAttribute('data-comp-idx')];
      if (!d || !d.priceDelta) return;
      tooltipBody.innerHTML = d.priceHistory
        ? buildContentFromHistory(d.priceHistory, parseRuDate(d.date))
        : buildContent(d);
      positionAndShow(trigger);
    }

    function hideTooltip() {
      tooltipEl.classList.remove('visible');
    }

    // Триггер — иконка динамики (.price-tooltip-trigger), не вся ячейка.
    function attachTooltipListeners(el) {
      el.addEventListener('mouseover', function(e) {
        var trigger = e.target.closest ? e.target.closest('.price-tooltip-trigger') : null;
        if (!trigger) return;
        clearTimeout(hideTimer);
        showTooltip(trigger);
      });
      el.addEventListener('mouseout', function(e) {
        var trigger = e.target.closest ? e.target.closest('.price-tooltip-trigger') : null;
        if (!trigger) return;
        hideTimer = setTimeout(hideTooltip, 80);
      });
    }

    attachTooltipListeners(document.getElementById('tableA'));
    attachTooltipListeners(document.getElementById('tableB'));
  })();

  // === Справка в шапке («Что полезного умеет этот сервис») ===
  // Открывает онбординг-модалку (компонент ДС PromoModal). Контент — плейсхолдер,
  // финальные слайды/картинки подставим позже.
  (function helpTrigger() {
    var link = document.querySelector('[data-action="open-help"]');
    if (!link || typeof openPromoModal !== 'function') return;
    var slides = [
      { image: '', title: 'Все конкуренты по объекту', text: 'Смотрите всех подобранных конкурентов в одной таблице и сравнивайте по любому параметру — цена, срок экспозиции, ремонт, тип дома, расстояние до метро.' },
      { image: '', title: 'Изменения у конкурентов', text: 'Возвращайтесь и отслеживайте апдейты: кто снизил цену, кто ещё в продаже, а кто уже снят с публикации.' },
      { image: '', title: 'Отчёт для собственника', text: 'Соберите наглядный отчёт по выбранным конкурентам. 77% агентов отмечают, что он помогает в разговоре с собственником о цене.' },
    ];
    function openHelp() {
      openPromoModal({
        originEl: link, // «Готово» → модалка схлопывается в сторону этой ссылки
        slides: slides,
      });
    }
    link.addEventListener('click', openHelp);

    // Автопоказ — только если у конкурентов нет апдейтов. Есть апдейты = пользователь
    // уже знаком с сервисом и взаимодействовал с ним → повторный онбординг не нужен.
    // Ручной клик по ссылке-справке остаётся доступным всегда.
    if (!(window.REPORT_TOTAL_UPDATES > 0)) {
      setTimeout(openHelp, 500);
    }
  })();

  // === Справка под заголовком «Отчёт для собственника» («Чем он помогает и как выглядит») ===
  // Открывает модалку (PromoModal). КОНТЕНТ — ПЛЕЙСХОЛДЕР: финальные слайды/картинки
  // (как выглядит отчёт + чем помогает в разговоре с собственником) подставим позже.
  (function ownerHelpTrigger() {
    var link = document.querySelector('[data-action="open-owner-help"]');
    if (!link || typeof openPromoModal !== 'function') return;
    link.addEventListener('click', function () {
      openPromoModal({
        originEl: link,
        slides: [
          { image: '', title: 'Чем он помогает', text: 'Наглядный отчёт по выбранным конкурентам помогает обосновать цену в разговоре с собственником. 77% агентов отмечают, что он упрощает этот разговор. (Контент — черновик, уточним.)' },
          { image: '', title: 'Как выглядит', text: 'Здесь будет превью готового отчёта: подборка конкурентов, динамика цен и вывод по позиционированию объекта. (Картинку добавим позже.)' },
        ],
      });
    });
  })();
