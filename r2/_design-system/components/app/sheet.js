/**
 * Шторка снизу (bottom sheet) — поверхность приложения (iOS).
 * Стили: components/app/sheet.css.
 *
 * openSheet({
 *   title:  'Действия',                  // заголовок (Cells / Title)
 *   base:   '../../_design-system/',     // путь к дизайн-системе — нужен для иконок
 *   items: [
 *     { icon: 'pdf', label: 'Обзор конкурентов', badge: '3 обновления', href: 'report.html' },
 *     { icon: 'trash', label: 'Удалить объявление', onSelect: function(){} }
 *   ],
 *
 * Бейдж — компонент app/badge.css. Строкой задаётся текст (по умолчанию warning
 * secondary), объектом — ещё и оси: { text: '3 обновления', color: 'main', style: 'primary' }.
 * Требует подключённого components/app/badge.css.
 *   ariaLabel: 'Действия с объявлением',
 *   onClose: function(){}
 * }) -> { close, el }
 *
 * Второй режим — шторка-диалог: вместо списка действий произвольное содержимое.
 *
 *   openSheet({
 *     barTitle: 'Комментарий',                       // заголовок В шапке (Heading4)
 *     barAction: { title: 'Удалить', tone: 'negative', onClick: fn },  // справа в шапке
 *     content: '<div class="textarea-app">…</div>',  // тело шторки, поля 20
 *     footer:  '<div class="screen-footer-app">…</div>'
 *   })
 *
 * Действие в шапке по умолчанию закрывает шторку — и «Удалить», и «Сбросить» в
 * фильтрах: оба движения в один тап, после которых показывать нечего. Есть оно или
 * нет, решается при открытии; по ходу работы шторки не меняется.
 *
 * `keepOpen: true` — для действий, которые шторку не заканчивают («Отправить» в
 * просмотре PDF: системная панель шаринга поднимается ПОВЕРХ, и убирать из-под неё
 * сам просмотр незачем).
 *
 * Третий режим — `fullscreen: true`: та же поверхность во весь экран (iOS-модалка
 * fullScreen вместо pageSheet). Добавляет мок статус-бара, убирает скругление и
 * home-индикатор, отдаёт всю высоту содержимому. Так открывается просмотр PDF
 * (809:74592): крестик слева, имя файла по центру, действие справа.
 *
 * `items` и `content` — разные способы наполнить шторку, вместе не используются.
 * Заголовков тоже два: `title` — строкой под шапкой (меню действий), `barTitle` —
 * в самой шапке (диалог). Так нарисовано в макетах, и это не одно и то же место.
 *
 * Закрытие: крестик, тап по затемнению, Esc, свайп вниз за шапку. На время показа
 * блокируется скролл body.
 *
 * Строка без href и без onSelect остаётся кликабельной, но ничего не делает —
 * так удобно набирать меню-заглушку в прототипе.
 */
function openSheet(config) {
  config = config || {};

  var ICONS = {
    price:    'vas-paid-16.svg',
    edit:     'edit-16.svg',
    document: 'document-16.svg',
    chart:    'chart-16.svg',
    pdf:      'pdf-16.svg',
    share:    'share-ios-16.svg',
    locker:   'locker-16.svg',
    trash:    'trash-16.svg'
  };
  var base = config.base || '../../_design-system/';
  var icons = base + 'assets/icons/';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function badgeHtml(badge) {
    if (!badge) return '';
    var b = typeof badge === 'string' ? { text: badge } : badge;
    if (!b.text) return '';
    return '<span class="badge-app badge-app--' + esc(b.color || 'warning')
      + ' badge-app--' + esc(b.style || 'secondary') + '">'
      + '<span class="badge-app__text">' + esc(b.text) + '</span></span>';
  }

  var rows = (config.items || []).map(function (item) {
    var tag = item.href ? 'a' : 'button';
    var attrs = item.href ? ' href="' + esc(item.href) + '"' : ' type="button"';
    var file = ICONS[item.icon];
    return '<' + tag + ' class="sheet-app-row"' + attrs + '>'
      + (file
        ? '<span class="sheet-app-row__icon sheet-app-row__icon--' + esc(item.icon) + '">'
          + '<img src="' + icons + file + '" alt=""></span>'
        : '')
      + '<span class="sheet-app-row__label">' + esc(item.label) + '</span>'
      + badgeHtml(item.badge)
      + '</' + tag + '>';
  }).join('');

  var barAction = config.barAction;
  /* Полноэкранный режим — та же модальная поверхность, только во весь экран
     (iOS: fullScreen вместо pageSheet). Отсюда и мок статус-бара: шторка накрывает
     экран целиком вместе с его полкой, и без своей вверху осталась бы дыра.
     На настоящем телефоне мок прячется сам — медиазапрос живёт в navbar.css. */
  var full = !!config.fullscreen;
  var overlay = document.createElement('div');
  overlay.className = 'sheet-app-overlay';
  overlay.innerHTML =
    '<div class="sheet-app' + (full ? ' sheet-app--fullscreen' : '') + '" role="dialog" aria-modal="true"'
      + (config.ariaLabel ? ' aria-label="' + esc(config.ariaLabel) + '"' : '') + '>'
      + (full
        ? '<div class="statusbar-app" aria-hidden="true">'
          + '<img class="statusbar-app__time" src="' + icons + 'statusbar-time.svg" alt="">'
          + '<div class="statusbar-app__island"></div>'
          + '<img class="statusbar-app__indicators" src="' + icons + 'statusbar-indicators.svg" alt="">'
          + '</div>'
        : '')
      + '<div class="sheet-app__bar' + (barAction ? ' sheet-app__bar--action' : '') + '">'
        + '<button class="sheet-app__close" type="button" data-action="close" aria-label="Закрыть">'
          + '<img src="' + icons + 'close-24.svg" alt=""></button>'
        + (config.barTitle ? '<h2 class="sheet-app__bar-title">' + esc(config.barTitle) + '</h2>' : '')
        + (barAction
          ? '<button class="sheet-app__bar-action'
            + (barAction.tone ? ' sheet-app__bar-action--' + esc(barAction.tone) : '')
            + '" type="button" data-action="bar-action">' + esc(barAction.title) + '</button>'
          : '')
      + '</div>'
      + (config.title ? '<h2 class="sheet-app__title">' + esc(config.title) + '</h2>' : '')
      + (config.content
        ? '<div class="sheet-app__content">' + config.content + '</div>'
        : '<div class="sheet-app__list">' + rows + '</div>')
      + (config.footer || '')
      /* Полоска home-индикатора — примета шторки, которая не достаёт до низа экрана.
         Полноэкранная достаёт: там индикатор рисует система, а содержимое обязано
         прокручиваться до самого края. */
      + (full ? '' : '<div class="sheet-app__home" aria-hidden="true"></div>')
    + '</div>';

  var panel = overlay.querySelector('.sheet-app');
  var bodyOverflow = document.body.style.overflow;
  var closed = false;

  function close() {
    if (closed) return;
    closed = true;
    overlay.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = bodyOverflow;
    // Ждём конец анимации, но не полагаемся на событие: если transition не случился
    // (reduced motion, вкладка в фоне), таймер всё равно уберёт узел.
    var done = false;
    function remove() {
      if (done) return;
      done = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof config.onClose === 'function') config.onClose();
    }
    panel.addEventListener('transitionend', remove, { once: true });
    /* Страховка длиннее самой анимации (0.35s): раньше стояло 400мс — впритык,
       и после удлинения выезда узел успевал бы исчезнуть, не доехав. */
    setTimeout(remove, 600);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
    else if (e.target.closest('[data-action="close"]')) close();
    else if (e.target.closest('[data-action="bar-action"]')) {
      /* По умолчанию закрываем сами: «Удалить» и «Сбросить» — движения в один тап,
         после которых показывать нечего. `keepOpen` — для действий, которые модалку
         не заканчивают: «Отправить» в просмотре PDF поднимает системную панель
         шаринга, и закрыть под ней сам просмотр значило бы отменить то, чем делятся.

         Флаг снимаем ДО обработчика: он вправе тронуть саму шторку, и читать
         `barAction` после вызова — читать уже не то, на что нажали. */
      var keepOpen = !!(barAction && barAction.keepOpen);
      if (barAction && typeof barAction.onClick === 'function') barAction.onClick();
      if (!keepOpen) close();
    }
  });

  // Выбор строки: сначала отдаём обработчик, потом закрываем. Ссылку не перехватываем —
  // переход случится сам.
  overlay.addEventListener('click', function (e) {
    var row = e.target.closest('.sheet-app-row');
    if (!row) return;
    var idx = Array.prototype.indexOf.call(row.parentNode.children, row);
    var item = (config.items || [])[idx];
    if (item && typeof item.onSelect === 'function') item.onSelect(item);
    if (!row.hasAttribute('href')) close();
  });

  // Свайп вниз за шапку. Только за шапку: иначе жест перехватывал бы прокрутку списка.
  var startY = null;
  var bar = overlay.querySelector('.sheet-app__bar');
  bar.addEventListener('touchstart', function (e) { startY = e.touches[0].clientY; }, { passive: true });
  bar.addEventListener('touchmove', function (e) {
    if (startY === null) return;
    var dy = e.touches[0].clientY - startY;
    if (dy <= 0) return;
    panel.style.transition = 'none';
    panel.style.transform = 'translateY(' + dy + 'px)';
  }, { passive: true });
  bar.addEventListener('touchend', function (e) {
    if (startY === null) return;
    var dy = (e.changedTouches[0] || {}).clientY - startY;
    panel.style.transition = '';
    panel.style.transform = '';
    startY = null;
    if (dy > 80) close();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  // Кадр на применение начального состояния, иначе анимации не будет.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
  });

  return { close: close, el: overlay };
}
