/* Раскладка апдейтов по конкурентам — ОДНА на два экрана.
 *
 * Правило продуктовое, а не оформительское: из N изменений один уходит в «цена
 * изменилась», один в «сняли с публикации», остаток — в новых возможных
 * конкурентов. Взято из вебового отчёта (report.js, markUpdates) и повторено
 * здесь, потому что мобильные экраны показывают те же изменения.
 *
 *   AppUpdates.allocate(ALL_COMPETITORS, n, u)
 *     -> { priceIdx, removedIdx, fresh, freshIds }
 *
 * Почему отдельный файл. До 2026-08-23 правило жило внутри `report-app.js`, и
 * список конкурентов о нём не знал вовсе — то есть на обзоре у объекта стоял флаг,
 * а на экране со списком тот же объект выглядел обычным (замечено Романом). Держать
 * такое правило в одном из двух экранов нельзя: они обязаны сойтись до объекта, а не
 * до «примерно тех же». Отсюда общий модуль, а не копия.
 *
 * Индексы — в исходном массиве, чтобы обе стороны говорили об одном и том же
 * объекте, а не о позиции в своём отфильтрованном списке.
 */
var AppUpdates = (function () {
  'use strict';

  function allocate(list, n, u) {
    var left = u > 0 ? u : 0;
    var shown = (list || []).slice(0, n);
    var priceIdx = -1, removedIdx = -1, i;

    /* Кандидатов выбирают сами данные: цена — первому с непустым priceDelta,
       снятие — первому со признаком removed. Порядок важен, поэтому «снятие»
       ищется уже с оглядкой на выбранного под цену. */
    if (left > 0) {
      for (i = 0; i < shown.length; i++) {
        if (shown[i].priceDelta) { priceIdx = i; left--; break; }
      }
    }
    if (left > 0) {
      for (i = 0; i < shown.length; i++) {
        if (i !== priceIdx && shown[i].removed) { removedIdx = i; left--; break; }
      }
    }

    /* Остаток — новые возможные конкуренты: активные объекты за пределами
       отслеживаемых. Так же делит мир экран конкурентов: до n отслеживаются,
       дальше подборка и архив. */
    var freshIds = [];
    for (i = n; i < list.length && freshIds.length < left; i++) {
      if (!list[i].removed) freshIds.push(i);
    }

    return { priceIdx: priceIdx, removedIdx: removedIdx, fresh: left, freshIds: freshIds };
  }

  return { allocate: allocate };
})();
