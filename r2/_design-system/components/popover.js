/* === POPOVER (веб) — механика ===
 * Одна панель на странице: открыли вторую — первая закрывается сама. Так на проде,
 * и иначе выпадайки фильтров наезжали бы друг на друга.
 *
 * `openPopover({ anchor, content, onClose })` → { el, close }
 *
 * Что сделано и почему:
 *
 * — **Позиционируем от документа, а не от родителя.** Панель кладём в `<body>`:
 *   у ряда фильтров есть предок с `overflow`, и панель внутри него обрезалась бы
 *   по его границе. Отсюда координаты через `scrollX/scrollY`.
 *
 * — **Переворот только по горизонтали.** У правого края панель прижимается правым
 *   краем к правому краю триггера. Вертикального переворота нет намеренно: ряд
 *   фильтров стоит в верхней трети страницы, места вниз всегда хватает, а «иногда
 *   вверх, иногда вниз» — поведение, которое некому проверить.
 *
 * — **Закрытие по клику вне — на `mousedown`, а не на `click`.** С `click` панель
 *   успевает закрыться от того же нажатия, которым её открыли: событие всплывает
 *   до документа уже после того, как обработчик триггера её создал.
 *
 * — **Повторный клик по триггеру закрывает панель, и решается это ЗДЕСЬ.**
 *   Обработчик `mousedown` по самому якорю намеренно молчит (иначе панель
 *   закрывалась бы тем же нажатием, которым её открыли), поэтому клик доходит до
 *   потребителя, тот зовёт `openPopover` снова — и панель пересоздаётся. Внешне
 *   это выглядит как «кнопка не работает»: что-то мигает, состояние не меняется.
 *   Нашёл Роман 2026-09-01.
 *   Проверка стоит в компоненте, а не у потребителя, по той же причине, по какой
 *   тут живёт «одна панель на странице»: это свойство пары «якорь ↔ панель», и
 *   каждый следующий потребитель иначе переоткрывал бы этот баг заново.
 */
function openPopover(opts) {
  var anchor = opts.anchor;

  /* Тот же якорь — значит это переключатель: закрываем и НИЧЕГО не возвращаем.
     `null` вместо панели заставляет потребителя обработать случай явно: забывший
     проверку споткнётся сразу, а не получит молча вернувшийся баг. */
  if (openPopover._current && openPopover._current.anchor === anchor) {
    closePopover();
    return null;
  }

  closePopover();                       // одна панель на странице

  var el = document.createElement('div');
  el.className = 'popover';
  el.setAttribute('role', 'dialog');
  if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);
  if (typeof opts.content === 'string') el.innerHTML = opts.content;
  else el.appendChild(opts.content);
  document.body.appendChild(el);

  place();

  /* Класс появления — следующим кадром, иначе переход не сыграет: браузер увидит
     оба состояния в одной пачке стилей и нарисует сразу конечное. */
  requestAnimationFrame(function () { el.classList.add('is-open'); });

  function place() {
    var a = anchor.getBoundingClientRect();
    var w = el.offsetWidth;
    /* Верх — впритык к низу триггера, зазора нет (замер прода: триггер кончается
       на 154, панель с него же и начинается). */
    el.style.top = (a.bottom + window.scrollY) + 'px';
    var left = a.left + window.scrollX;
    var overflowRight = a.left + w - document.documentElement.clientWidth;
    if (overflowRight > 0) left = a.right + window.scrollX - w;
    el.style.left = Math.max(window.scrollX + 8, left) + 'px';
  }

  function onDocDown(e) {
    if (el.contains(e.target) || anchor.contains(e.target)) return;
    close();
  }
  function onKey(e) { if (e.key === 'Escape') { close(); anchor.focus(); } }

  var closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('mousedown', onDocDown, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    el.remove();
    if (openPopover._current === api) openPopover._current = null;
    if (opts.onClose) opts.onClose();
  }

  document.addEventListener('mousedown', onDocDown, true);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', place);
  /* Страница едет — панель едет с триггером. `capture: true` ловит и прокрутку
     внутренних контейнеров, а не только окна. */
  window.addEventListener('scroll', place, true);

  var api = { el: el, close: close, reposition: place, anchor: anchor };
  openPopover._current = api;
  return api;
}

function closePopover() {
  if (openPopover._current) openPopover._current.close();
}
