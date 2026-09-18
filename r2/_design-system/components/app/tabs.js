/**
 * Табы с перетекающей подложкой — поверхность приложения (iOS).
 * Стили: components/app/tabs.css, режим `.tabs-app--slide`.
 *
 *   var tabs = mountTabsApp(document.querySelector('.tabs-app'));
 *   tabs.select(tabEl);                      // подложка перетекает на tabEl
 *   tabs.select(tabEl, { animate: false });  // сразу, без движения — для первого кадра
 *
 * `.tab-app--active` и `aria-selected` ставит `select`, а не экран: подложке надо
 * знать, откуда ехать, до того как активный таб сменится.
 *
 * Контент вкладки экран меняет сам и сразу, в момент тапа — не дожидаясь, пока
 * подложка доедет. Так ведёт себя нативный таб-бар: страница не перезагружается,
 * перерисовывается только список, а подложка едет параллельно.
 *
 * Где сложность. Паддинг табов тоже переходит плавно (см. tabs.css), поэтому
 * конечную геометрию нельзя прочитать сразу после смены класса: браузер отдаст
 * первый кадр перехода. Её снимаем «насухо»: с выключенными переходами ставим
 * новый активный, меряем, возвращаем как было — всё одним синхронным куском,
 * кадр между этими шагами не рисуется.
 */
function mountTabsApp(row) {
  row.classList.add('tabs-app--slide');
  var pill = document.createElement('span');
  pill.className = 'tabs-app__pill';
  pill.setAttribute('aria-hidden', 'true');
  row.insertBefore(pill, row.firstChild);

  var moving = false, doneTimer = null;

  function active() { return row.querySelector('.tab-app--active'); }

  function mark(tab) {
    row.querySelectorAll('.tab-app').forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('tab-app--active', on);
      t.setAttribute('aria-selected', String(on));
    });
  }

  /* Геометрия в координатах ряда с учётом прокрутки — в тех же, в которых
     абсолютная подложка и стоит. По rect, а не offsetLeft: тот округляет до
     целых, и подложка расходилась бы с табом на полпикселя. */
  function rel(el) {
    var r = el.getBoundingClientRect(), o = row.getBoundingClientRect();
    return { x: r.left - o.left - row.clientLeft + row.scrollLeft,
             y: r.top - o.top - row.clientTop + row.scrollTop,
             w: r.width, h: r.height };
  }

  function place(g) {
    pill.style.width = g.w + 'px';
    pill.style.height = g.h + 'px';
    pill.style.transform = 'translate(' + g.x + 'px, ' + g.y + 'px)';
  }

  /* Поставить под активный без движения */
  function snap() {
    var tab = active();
    if (!tab) return;
    row.classList.add('tabs-app--still');
    place(rel(tab));
    void row.offsetWidth;
    row.classList.remove('tabs-app--still');
  }

  function select(tab, opts) {
    var prev = active();
    if (!tab) return;
    if ((opts && opts.animate === false) || !prev || prev === tab) {
      mark(tab);
      snap();
      return;
    }
    var from = rel(pill);               // где подложка сейчас — в том числе недоехавшая

    row.classList.add('tabs-app--still');
    mark(tab);
    var to = rel(tab);
    mark(prev);
    place(from);
    void row.offsetWidth;               // исходное состояние зафиксировано — отсюда и поедет
    row.classList.remove('tabs-app--still');
    mark(tab);
    place(to);

    /* Пока едет, смену размеров табов не ловим: они меняются каждый кадр, и снап
       сорвал бы переход. Время берём из стилей, чтобы не держать число в двух местах. */
    var ms = parseFloat(getComputedStyle(pill).transitionDuration) * 1000 || 0;
    moving = true;
    clearTimeout(doneTimer);
    doneTimer = setTimeout(function () { moving = false; snap(); }, ms + 50);
  }

  /* Ширина таба меняется и без переключения: счётчик «Отслеживаемые 10 → 9»,
     догрузка шрифта. Подложка идёт следом, без движения. */
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { if (!moving) snap(); });
    row.querySelectorAll('.tab-app').forEach(function (t) { ro.observe(t); });
  }

  snap();
  return { select: select };
}
