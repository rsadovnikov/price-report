/* Предустановка фильтров по объекту агента — ОДНА на все экраны раздела.
 *
 * В фиче фильтры приходят не пустыми: они выведены из параметров оцениваемого
 * объекта, и **именно этот пресет формирует релевантную выдачу конкурентов**
 * (формулировка Романа 2026-08-23). Отсюда следствие, ради которого модуль и
 * появился: «Новый конкурент» по определению проходит пресет — предлагать в
 * качестве конкурента объект, которого нет в выдаче, значит обещать то, чего
 * агент не найдёт.
 *
 *   AppPreset.parse('1-комн. кв., 37,5 м², 10/22 этаж')  -> { rooms, area, floor }
 *   AppPreset.from(desc)     -> { rooms: ['1'], area: { from: 32, to: 44 } }
 *   AppPreset.matches(c, p)  -> проходит ли объект пресет
 *
 * Разбор терпит оба формата: «1-комн. кв., 37,5 м²» из «Моих объявлений» и
 * «1-комн., 32 м²» из данных конкурентов — между «комн.» и запятой может стоять
 * «кв.» или «апарт.». Он же используется фильтрами экрана, чтобы регулярка жила
 * в одном месте.
 *
 * Объект неизвестен — пресет пустой, и тогда не сужается ничего. То же правило,
 * что у похожести в вебовом отчёте (report.js, distanceToBase).
 */
var AppPreset = (function () {
  'use strict';

  var DESC_RE = /^(\d+)-комн\.[^,]*,\s*([\d,.]+)\s*м²(?:,\s*(\d+)\/)?/;
  /* Апартаменты — не «квартира подешевле», а другая юридическая природа и другие
     ожидания по цене. Сравнивать их с квартирами нельзя ни в ту, ни в другую
     сторону, поэтому вид жилья читается из описания и участвует в подборе. */
  var APART_RE = /апарт/i;

  /* Допуск по площади. ±15% на данных прототипа оставляет 33 карточки из 44:
     лента остаётся полной, а выдача — похожей на объект. */
  var AREA_TOLERANCE = 0.15;

  var cache = {};

  function parse(desc) {
    if (cache[desc]) return cache[desc];
    var m = DESC_RE.exec(desc || '') || [];
    var parsed = {
      rooms: parseInt(m[1], 10),
      area: parseFloat(String(m[2] || '').replace(',', '.')),
      floor: parseInt(m[3], 10),
      apart: APART_RE.test(desc || '')
    };
    cache[desc] = parsed;
    return parsed;
  }

  function from(desc) {
    var p = parse(desc);
    var out = {};
    /* Вид жилья ставим только когда описание разобралось: объект неизвестен —
       не сужаем ничего, включая вид. */
    if (p.rooms > 0) out.apart = p.apart;
    if (p.rooms > 0) out.rooms = [p.rooms >= 6 ? '6+' : String(p.rooms)];
    if (p.area > 0) {
      /* Границы кратны 4 — как отступы: замер объекта точен до десятых, а фильтр
         агенту показывается числом, и «31,9–43,1 м²» читалось бы как ошибка. */
      var to4 = function (x) { return Math.round(x / 4) * 4; };
      out.area = { from: to4(p.area * (1 - AREA_TOLERANCE)), to: to4(p.area * (1 + AREA_TOLERANCE)) };
    }
    return out;
  }

  function matches(c, preset) {
    if (!preset) return true;
    var p = parse(c.desc);
    if (preset.apart != null && p.apart !== preset.apart) return false;
    if (preset.rooms && preset.rooms.length) {
      var ok = preset.rooms.some(function (x) {
        return x === '6+' ? p.rooms >= 6 : p.rooms === Number(x);
      });
      if (!ok) return false;
    }
    if (preset.area) {
      if (isNaN(p.area)) return false;
      if (preset.area.from != null && p.area < preset.area.from) return false;
      if (preset.area.to != null && p.area > preset.area.to) return false;
    }
    return true;
  }

  /* Сравнимо ли объявление с объектом ПО ПРИРОДЕ — отдельно от фильтров.
     Фильтры агент сбрасывает, и это законно: он хочет увидеть больше. А вот
     «покажите мне квартиры вместо апартаментов» сбросом не делается — это не
     более широкая выдача, а другая. Поэтому вид жилья режет пул до фильтров и
     сбросу не поддаётся. */
  function comparable(c, desc) {
    var p = parse(desc || '');
    if (!(p.rooms > 0)) return true;              // объект неизвестен — не сужаем
    return parse(c.desc).apart === p.apart;
  }

  /* Радиус по умолчанию — 2 км (решение Романа 2026-08-23; в вебе до этого стояло
     «Радиус 3 км»). Значение живёт здесь, потому что его спрашивает предустановка;
     подпись чипа строит таблица `FILTERS` в `filters.js`. */
  var RADIUS_DEFAULT = 2000;

  /* `row` отсюда убран 2026-09-04. Ряд фильтров обе поверхности рисуют из
     `AppFilters.row` (`filters.js`), а эта копия никем не вызывалась и успела
     разойтись с таблицей и по порядку, и по подписи «Тип дома» — то есть работала
     ровно так, как предупреждает протокол: неиспользуемое читается как рабочий
     сценарий, и следующий пошёл бы править её. Порядок ряда теперь в одном месте. */
  return { parse: parse, from: from, matches: matches, comparable: comparable,
           radiusDefault: RADIUS_DEFAULT, areaTolerance: AREA_TOLERANCE };
})();
