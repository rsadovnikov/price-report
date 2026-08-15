/* === TOAST ===
   Сверено с прод-китом @cian/ui-kit v7.84.0 (UI-Kit/Toast) 2026-08-12.
   Заменяет Snackbar (в проде помечен @deprecated).

   API (повторяет смысл прод-хука useToast, но в vanilla):
     showToast('Текст')                                  → базовый (без иконки)
     showToast.success('Отчёт сохранён')
     showToast.error('Не удалось сохранить')
     showToast.info('Идёт проверка')
     showToast.loading('Формируем отчёт…')
     showToast('Объект удалён', {
       type: 'success',                                  // success | error | info | loading | base
       actions: [{ title: 'Восстановить', onClick }],    // до двух
       size: 'm',                                        // s | m | l  (прод S/M/L)
       position: 'bottom-right',                         // top-center | top-right | bottom-center | bottom-right
       duration: 4000,                                   // 0 = не скрывать автоматически
       closable: false,                                  // крестик справа
     })
   Возвращает { close }.

   Разметку и контейнер строит сам, руками ничего не нужно. */

(function () {
  'use strict';

  var ICONS = {
    success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.4 5.4 0 12 0s12 5.4 12 12-5.4 12-12 12S0 18.6 0 12m18.207-2.793-1.414-1.414-6.293 6.293-3.293-3.293-1.414 1.414 4.707 4.707z"/></svg>',
    error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.4 5.4 0 12 0s12 5.4 12 12-5.4 12-12 12S0 18.6 0 12m13 2V7h-2v7zm.25 2.75a1.25 1.25 0 1 0-2.5 0 1.25 1.25 0 0 0 2.5 0"/></svg>',
  };

  var CLOSE_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path fill="currentColor" d="M20 5.41 18.59 4 12 10.59 5.41 4 4 5.41 10.59 12 4 18.59 5.41 20 12 13.41 18.59 20 20 18.59 13.41 12z"/></svg>';

  var POSITIONS = ['top-center', 'top-right', 'bottom-center', 'bottom-right'];
  var holders = {};

  function holderFor(position) {
    if (holders[position]) return holders[position];
    var container = document.createElement('div');
    container.className = 'toast-container toast-container--' + position;
    var holder = document.createElement('section');
    holder.className = 'toast-holder';
    holder.setAttribute('role', 'status');
    holder.setAttribute('aria-live', 'polite');
    container.appendChild(holder);
    document.body.appendChild(container);
    holders[position] = holder;
    return holder;
  }

  function showToast(text, options) {
    var opts = options || {};
    var type = opts.type || 'base';
    var position = POSITIONS.indexOf(opts.position) > -1 ? opts.position : 'bottom-right';
    var size = opts.size || 'm';
    var duration = opts.duration === undefined ? 4000 : opts.duration;

    var el = document.createElement('div');
    el.className = 'toast toast-' + size;
    el.setAttribute('data-type', type);

    if (ICONS[type] || type === 'loading') {
      var adornment = document.createElement('div');
      adornment.className = 'toast__adornment';
      var icon = document.createElement('span');
      icon.className = 'toast__icon';
      icon.innerHTML = ICONS[type] || '';
      adornment.appendChild(icon);
      el.appendChild(adornment);
    }

    var content = document.createElement('section');
    content.className = 'toast__content';
    var p = document.createElement('p');
    p.className = 'toast__text';
    p.textContent = text;
    content.appendChild(p);
    el.appendChild(content);

    var actions = (opts.actions || []).slice(0, 2);
    if (actions.length) {
      var wrap = document.createElement('div');
      wrap.className = 'toast__actions';
      actions.forEach(function (a) {
        var btn = document.createElement('button');
        btn.className = 'toast__action';
        btn.type = 'button';
        btn.textContent = a.title;
        btn.addEventListener('click', function () {
          if (typeof a.onClick === 'function') a.onClick();
          close();
        });
        wrap.appendChild(btn);
      });
      el.appendChild(wrap);
    }

    if (opts.closable) {
      var closeBtn = document.createElement('button');
      closeBtn.className = 'toast__close';
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Закрыть');
      closeBtn.innerHTML = CLOSE_ICON;
      closeBtn.addEventListener('click', function () { close(); });
      el.appendChild(closeBtn);
    }

    holderFor(position).appendChild(el);
    // следующий кадр — чтобы transition отработал с исходного состояния
    requestAnimationFrame(function () { el.classList.add('is-visible'); });

    var timer = null;
    var closed = false;
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

  ['success', 'error', 'info', 'loading'].forEach(function (type) {
    showToast[type] = function (text, options) {
      var o = {};
      for (var k in (options || {})) o[k] = options[k];
      o.type = type;
      if (type === 'loading' && o.duration === undefined) o.duration = 0;
      return showToast(text, o);
    };
  });

  window.showToast = showToast;
})();
