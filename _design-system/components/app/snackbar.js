/* === SNACKBAR, ПОВЕРХНОСТЬ ПРИЛОЖЕНИЯ (iOS) ===
 *
 * Компонент библиотеки «🍏 iOS» Snackbar (19135:34320). Оформление — snackbar.css.
 *
 * API — по образцу вебового showToast, но уже компонента: слот действия один,
 * а тип задаёт не только иконку, но и фон плашки.
 *
 *   showSnackbarApp('Начали отслеживать')
 *   showSnackbarApp.success('Отчёт сохранён')
 *   showSnackbarApp.warning('Проверьте цену')
 *   showSnackbarApp.error('Не удалось сохранить')
 *
 *   showSnackbarApp('Начали отслеживать', {
 *     type: 'default',                            // default | success | warning | error
 *     icon: true,                                 // Icon content в наборе
 *     action: { title: 'Отменить', onClick: fn }, // слот один, это ссылка
 *     closable: false,                            // крестик справа
 *     duration: 4000,                             // 0 — не скрывать самому
 *     dark: true,                                 // тёмный Colors Mode (так в макетах)
 *   })
 *
 * Возвращает { close, el }.
 *
 * Глифы лежат тут строками, а не файлами в assets/icons: у всех четырёх один путь
 * с одной заливкой, и двухцветными они выглядят за счёт fill-rule="evenodd". Значит
 * цвет можно отдать в currentColor и закрыть оба режима (светлый и тёмный) одним
 * файлом вместо восьми экспортов. Тот же приём, что у вебового toast.js.
 */
(function () {
  'use strict';

  var GLYPHS = {
    default: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" '
      + 'd="M0 12C0 5.4 5.4 0 12 0C18.6 0 24 5.4 24 12C24 18.6 18.6 24 12 24C5.4 24 0 18.6 0 12ZM13.25 '
      + '7.25C13.25 7.94036 12.6904 8.5 12 8.5C11.3096 8.5 10.75 7.94036 10.75 7.25C10.75 6.55964 11.3096 '
      + '6 12 6C12.6904 6 13.25 6.55964 13.25 7.25ZM11 17L11 10H13L13 17H11Z"/></svg>',
    success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" '
      + 'd="M0 12C0 5.4 5.4 0 12 0C18.6 0 24 5.4 24 12C24 18.6 18.6 24 12 24C5.4 24 0 18.6 0 12ZM18.2071 '
      + '9.20711L16.7929 7.79289L10.5 14.0858L7.20711 10.7929L5.79289 12.2071L10.5 16.9142L18.2071 '
      + '9.20711Z"/></svg>',
    /* Единственный не круглый глиф: свой viewBox и свой размер листа */
    warning: '<svg class="snackbar-app__glyph--warning" viewBox="0 0 22.5566 19.9844" aria-hidden="true">'
      + '<path fill-rule="evenodd" clip-rule="evenodd" d="M12.1465 0.503861C11.7626 -0.167954 10.7939 '
      + '-0.167954 10.4101 0.503861L0.133235 18.4883C-0.247712 19.155 0.233654 19.9844 1.00148 '
      + '19.9844H21.5551C22.3229 19.9844 22.8043 19.155 22.4234 18.4883L12.1465 0.503861ZM12.2783 '
      + '5.98444H10.2783L10.2783 12.9844H12.2783L12.2783 5.98444ZM12.5283 15.7344C12.5283 15.0441 11.9687 '
      + '14.4844 11.2783 14.4844C10.5879 14.4844 10.0283 15.0441 10.0283 15.7344C10.0283 16.4248 10.5879 '
      + '16.9844 11.2783 16.9844C11.9687 16.9844 12.5283 16.4248 12.5283 15.7344Z"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" '
      + 'd="M0 12C0 5.4 5.4 0 12 0C18.6 0 24 5.4 24 12C24 18.6 18.6 24 12 24C5.4 24 0 18.6 0 12ZM15.5351 '
      + '7.05029L16.9493 8.46451L13.4138 12L16.9493 15.5356L15.5351 16.9498L11.9996 13.4143L8.46402 '
      + '16.9498L7.0498 15.5356L10.5853 12L7.0498 8.46451L8.46402 7.05029L11.9996 10.5858L15.5351 '
      + '7.05029Z"/></svg>',
  };

  var CLOSE_GLYPH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M16 1.41L14.59 0L8 6.59L1.41 '
    + '0L0 1.41L6.59 8L0 14.59L1.41 16L8 9.41L14.59 16L16 14.59L9.41 8L16 1.41Z"/></svg>';

  var container = null;

  function holder() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'snackbar-app-container';
    container.setAttribute('role', 'status');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
    return container;
  }

  function showSnackbarApp(text, options) {
    var opts = options || {};
    var type = GLYPHS[opts.type] ? opts.type : 'default';
    var duration = opts.duration === undefined ? 4000 : opts.duration;

    var el = document.createElement('div');
    el.className = 'snackbar-app' + (opts.dark === false ? '' : ' snackbar-app--dark');
    el.setAttribute('data-type', type);

    if (opts.icon !== false) {
      var icon = document.createElement('span');
      icon.className = 'snackbar-app__icon';
      icon.innerHTML = GLYPHS[type];
      el.appendChild(icon);
    }

    var p = document.createElement('p');
    p.className = 'snackbar-app__text';
    p.textContent = text;
    el.appendChild(p);

    if (opts.action && opts.action.title) {
      var wrap = document.createElement('div');
      wrap.className = 'snackbar-app__action';
      var divider = document.createElement('span');
      divider.className = 'snackbar-app__divider';
      var link = document.createElement('button');
      link.className = 'snackbar-app__link';
      link.type = 'button';
      link.textContent = opts.action.title;
      link.addEventListener('click', function () {
        if (typeof opts.action.onClick === 'function') opts.action.onClick();
        close();
      });
      wrap.appendChild(divider);
      wrap.appendChild(link);
      el.appendChild(wrap);
    }

    if (opts.closable) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'snackbar-app__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.innerHTML = CLOSE_GLYPH;
      closeBtn.addEventListener('click', function () { close(); });
      el.appendChild(closeBtn);
    }

    holder().appendChild(el);
    // следующий кадр — чтобы transition отработал с исходного состояния
    requestAnimationFrame(function () { el.classList.add('is-visible'); });

    var timer = null, closed = false;
    function close() {
      if (closed) return;
      closed = true;
      if (timer) clearTimeout(timer);
      el.classList.remove('is-visible');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }
    if (duration > 0) timer = setTimeout(close, duration);

    return { close: close, el: el };
  }

  ['success', 'warning', 'error'].forEach(function (type) {
    showSnackbarApp[type] = function (text, options) {
      var o = {};
      for (var k in (options || {})) o[k] = options[k];
      o.type = type;
      return showSnackbarApp(text, o);
    };
  });

  window.showSnackbarApp = showSnackbarApp;
})();
