/* ==========================================================================
   ВАРИАНТ ОТЧЁТА С НИЖНЕЙ ПОЛКОЙ — report-shelf.html (report.html?shelf=1)
   Макет 2406:37569. Стили — shelf.css.
   ⚠️ С 2026-09-14 — версия ПО УМОЛЧАНИЮ (решение Романа). Обычная открывается
   явным `?shelf=0` или ⌘⇧S; ветка «выключено» ниже осталась ради неё.

   Устройство (правка Романа 2026-09-10, четвёртый заход):
   • Новость о новых конкурентах уезжает в НАЧАЛО списка — первой строкой, с
     разделителем под ней. Новых нет — сверху нет ничего, а хвостовые блоки лент
     («Больше возможных конкурентов», конец подборки) остаются на своих местах,
     как в обычной версии.
   • Внизу — полка с одной круглой кнопкой отчёта по центру. Кругляш Telegram
     встаёт на её линию и в её размер (44), но остаётся самостоятельным.

   Своей логики у варианта НЕТ: наверх переезжает тот же самый бар со своими
   обработчиками, кнопка нажимает спрятанный `#ownerFab`, а порог ухода вниз
   приносит `report.js` вызовом `setLanded` — тот же, что уводит плавающую кнопку.
   ========================================================================== */
window.ReportShelf = (function () {
  if (document.documentElement.getAttribute('data-shelf') !== '1') {
    // выключено — молчим, но интерфейс держим: `report.js` зовёт нас в обеих версиях
    return { update: function () { return false; }, setLanded: function () {} };
  }

  /* === Бар новых конкурентов → в начало списка ===
     Переезжает САМ УЗЕЛ, а не его копия: у него уже есть и обработчик «Посмотреть»,
     и пересчёт стопки в `report.js`. Копия развела бы одно поведение по двум местам —
     та же ловушка, что была с иконкой радара. */
  var CHEVRON = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
    + '<path fill-rule="evenodd" clip-rule="evenodd" d="M6.35355 12.7071L4.93934 11.2929L8.23223 8L4.93934 4.70711L6.35355 3.29289L11.0607 8L6.35355 12.7071Z" fill="currentColor"/></svg>';
  var bar = document.getElementById('newCompetitorsBar');
  var list = document.getElementById('tableBSection');
  if (bar && list && list.parentNode) {
    // Прилипание снимаем: наверху бар — обычная строка списка, а не липкая полка.
    bar.classList.remove('tail-bar--sticky');
    bar.classList.add('tail-bar--lead');
    list.parentNode.insertBefore(bar, list);
    var link = bar.querySelector('.tail-bar__link');
    if (link) link.insertAdjacentHTML('beforeend', CHEVRON);
  }

  /* === Полка: одна круглая кнопка отчёта === */
  var el = document.createElement('div');
  el.className = 'shelf';
  el.id = 'reportShelf';
  el.style.display = 'none';
  /* Фактоид лежит РЯДОМ с кнопкой, а не внутри неё: внутри он попал бы в имя ссылки
     и в её кликабельную область. Обёртка нужна, чтобы текст отсчитывался от края
     кнопки и не участвовал в раскладке — кнопка остаётся по центру полосы. */
  el.innerHTML =
      '<span class="shelf__center">'
    +   '<a href="#" class="shelf__report" id="shelfReportCard">Создать отчёт для собственника</a>'
    +   '<span class="shelf__factoid" id="shelfFactoid">77% риелторов уже отметили, что наглядный отчёт<br>помогает убедить собственника снизить цену</span>'
    + '</span>';

  var card = document.querySelector('.report-card');
  if (card) card.appendChild(el);

  var reportCard = el.querySelector('#shelfReportCard');

  // Нажимаем спрятанный контрол старой вёрстки — переход остаётся один на две версии.
  reportCard.addEventListener('click', function (e) {
    e.preventDefault();
    var fab = document.getElementById('ownerFab');
    if (fab) fab.click();
  });

  var first = true;
  var visible = false;
  var gone = false;

  /* Кругляш Telegram в полку НЕ переносим: он живёт своей жизнью в обеих версиях и
     не уезжает никогда (решение 2026-09-08). Вместо переноса он поднимается на линию
     полки классом на <html> — полка видна и не уехала → кругляш стоит с ней в ряд,
     полки нет → возвращается на свои 24 от низа. */
  function syncFab() {
    document.documentElement.classList.toggle('shelf-bar', visible && !gone);
  }

  /* Уход вниз. Порог считает `report.js` — тот же, по которому уезжает плавающая
     кнопка; полка только применяет. Класс, а не `display`: уезжать надо движением. */
  function setLanded(landed) {
    gone = !!landed;
    el.classList.toggle('is-gone', gone);
    syncFab();
  }

  function update(s) {
    /* Кнопка уходит по тому же правилу, что и плавающая, которую она заменила:
       отбор пуст — собирать отчёт не из чего. Полка при этом уходит целиком: кроме
       кнопки в ней ничего нет. */
    visible = s.tracked > 0;
    el.style.display = visible ? 'flex' : 'none';
    syncFab();

    /* Переходы включаются ПОСЛЕ первого состояния — иначе полка приезжает прямо на
       загрузке страницы. Между состоянием и классом принудительный пересчёт: без него
       оба изменения попадают в один кадр и анимация всё равно играет. */
    if (first) { void el.offsetHeight; el.classList.add('shelf--ready'); first = false; }
    return visible;
  }

  return { update: update, setLanded: setLanded };
})();
