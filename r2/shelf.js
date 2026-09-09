/* ==========================================================================
   НИЖНЯЯ ПОЛКА — вариант отчёта на report-shelf.html (report.html?shelf=1)
   Макеты 2361:77577. Стили — shelf.css, там же разобрано, что полка забирает.

   Устройство: две карточки. Слева — переход в следующий список, и он же несёт
   новость о новых конкурентах; справа — вход в отчёт для собственника.

   Своих правил у полки НЕТ. Что показывать, ей приносит `report.js` одним
   вызовом `ReportShelf.update(...)` — из того же места, где он обновляет
   хвостовые бары, и теми же наборами. Иначе полка и бары разошлись бы в том,
   что считают «новым конкурентом», а версий отчёта две и сверять их некому.

   Переходы полка тоже не пишет заново, а НАЖИМАЕТ спрятанные контролы старой
   вёрстки: у них уже есть обработчики («открыть вкладку и доскроллить к табам»,
   «доскроллить к карточке отчёта»). Скрытый элемент кликается программно, а
   реализация перехода остаётся одна на обе версии.
   ========================================================================== */
window.ReportShelf = (function () {
  if (document.documentElement.getAttribute('data-shelf') !== '1') {
    return { update: function () { return false; } };   // выключено — молчим
  }

  var PDF_ICON = '<svg width="18" height="24" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path d="M3.83105 12.0156C4.19889 12.0156 4.4707 12.1263 4.64648 12.3477C4.82227 12.569 4.91016 12.9043 4.91016 13.3535V13.3682C4.91016 13.8141 4.82227 14.1494 4.64648 14.374C4.4707 14.5954 4.19726 14.7061 3.82617 14.7061H3.25V12.0156H3.83105Z" fill="currentColor"/>'
    + '<path d="M8.8584 12.0498C9.20334 12.0498 9.49322 12.1345 9.72754 12.3037C9.96509 12.4697 10.1426 12.7335 10.2598 13.0947C10.3802 13.4528 10.4404 13.9216 10.4404 14.501V14.5156C10.4404 15.1048 10.3802 15.5817 10.2598 15.9463C10.1426 16.3108 9.96672 16.5778 9.73242 16.7471C9.4981 16.913 9.2066 16.9961 8.8584 16.9961H8.37988V12.0498H8.8584Z" fill="currentColor"/>'
    + '<path fill-rule="evenodd" clip-rule="evenodd" d="M11 0V7H18V22C18 23.1046 17.1046 24 16 24H2C0.895431 24 3.22133e-08 23.1046 0 22V2C0 0.895431 0.895431 8.05332e-09 2 0H11ZM2 18.0459H3.25V15.7119H4.06055C4.51953 15.7119 4.90528 15.6159 5.21777 15.4238C5.53353 15.2318 5.77279 14.9616 5.93555 14.6133C6.09831 14.2617 6.17969 13.8451 6.17969 13.3633V13.3535C6.17969 12.8685 6.09831 12.4518 5.93555 12.1035C5.77279 11.752 5.53353 11.4801 5.21777 11.2881C4.90528 11.096 4.51953 11 4.06055 11H2V18.0459ZM7.12988 18.0459H8.99512C9.58746 18.0459 10.0857 17.9157 10.4893 17.6553C10.8928 17.3949 11.1973 17.0042 11.4023 16.4834C11.6107 15.9593 11.7148 15.3033 11.7148 14.5156V14.501C11.7148 13.7133 11.6107 13.0605 11.4023 12.543C11.1973 12.0255 10.8912 11.6396 10.4844 11.3857C10.0808 11.1286 9.5842 11 8.99512 11H7.12988V18.0459ZM12.665 18.0459H13.915V15.1602H15.9902V14.1445H13.915V12.0498H16.1904V11H12.665V18.0459Z" fill="currentColor"/>'
    + '<path d="M18 5H13V0L18 5Z" fill="currentColor"/></svg>';

  var el = document.createElement('div');
  el.className = 'shelf';
  el.id = 'reportShelf';
  el.style.display = 'none';
  el.innerHTML =
      '<a href="#" class="shelf__card shelf__card--list" id="shelfListCard">'
    +   '<span class="shelf__cell"><span class="photo-stack" id="shelfStack"></span></span>'
    +   '<span class="shelf__body">'
    +     '<span class="shelf__title" id="shelfTitle"></span>'
    +     '<span class="label label-warning" id="shelfPill"></span>'
    +     '<span class="shelf__link">Посмотреть</span>'
    +   '</span>'
    + '</a>'
    + '<a href="#" class="shelf__card shelf__card--report" id="shelfReportCard">'
    +   '<span class="shelf__icon">' + PDF_ICON + '</span>'
    +   '<span class="shelf__body">'
    +     '<span class="shelf__title">Создать отчёт для собственника</span>'
    +     '<span class="shelf__note">77% агентов отметили, что отчёт помогает в переговорах</span>'
    +   '</span>'
    + '</a>';

  /* Полка живёт там же, где жил sticky-бар новых конкурентов: последним ребёнком
     карточки отчёта, ВНЕ `main`, — иначе нижний отступ секции оставляет под ней
     зазор, и прилипание видно щелью. */
  var anchor = document.getElementById('newCompetitorsBar');
  if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling);
  else document.querySelector('.report-card').appendChild(el);

  var listCard = el.querySelector('#shelfListCard');
  var reportCard = el.querySelector('#shelfReportCard');
  var stack = el.querySelector('#shelfStack');
  var title = el.querySelector('#shelfTitle');
  var pill = el.querySelector('#shelfPill');

  // Нажимаем спрятанный контрол старой вёрстки — переход остаётся один на две версии.
  function relay(selector) {
    return function (e) {
      e.preventDefault();
      var target = document.querySelector(selector);
      if (target) target.click();
    };
  }
  var listAction = null;
  listCard.addEventListener('click', function (e) {
    e.preventDefault();
    if (listAction) listAction(e);
  });
  reportCard.addEventListener('click', relay('#ownerFab'));

  /* Что показать слева — решает вкладка и то, что на ней есть. Порядок важен:
     новые конкуренты перебивают «больше возможных», как и в старой вёрстке, где
     второй бар прячется при newCount() > 0. */
  function pickList(s) {
    if (s.tab === 'in-report') {
      if (s.fresh.ids.length) {
        return { ids: s.fresh.ids, pill: s.fresh.label, muted: false,
                 action: relay('#newCompetitorsBar [data-action="view-new"]') };
      }
      if (s.tracked > 0 && s.more.ids.length) {
        return { ids: s.more.ids, title: 'Больше возможных конкурентов', muted: false,
                 action: relay('#moreCompetitorsBar [data-action="view-more"]') };
      }
      return null;
    }
    /* На «Активных» полка зовёт в архив ВСЕГДА, пока там есть что показать, — в
       отличие от блока конца подборки, который ждал, когда активные кончатся.
       Так нарисовано в макете 2361:73332: карточка стоит посреди списка. */
    if (s.tab === 'selection' && s.archive.ids.length) {
      return { ids: s.archive.ids, title: 'Похожие архивные объявления', muted: true,
               action: relay('#archiveEndMarker [data-action="view-archive"]') };
    }
    return null;   // «Архивные» — дальше вести некуда, остаётся одна карточка отчёта
  }

  function update(s) {
    var list = pickList(s);
    // Карточка отчёта уходит по тому же правилу, что и плавающая кнопка: отбор пуст —
    // собирать отчёт не из чего.
    var reportShown = s.tracked > 0;

    if (list) {
      s.fillStack(stack, list.ids);
      stack.classList.toggle('photo-stack--muted', !!list.muted);
      title.textContent = list.title || '';
      title.hidden = !list.title;
      pill.textContent = list.pill || '';
      pill.hidden = !list.pill;
      listAction = list.action;
    }
    listCard.style.display = list ? '' : 'none';
    reportCard.style.display = reportShown ? '' : 'none';

    var shown = !!list || reportShown;
    el.style.display = shown ? 'flex' : 'none';
    return shown;
  }

  return { update: update };
})();
