/* === SNACKBAR — снекбар (тост) ===
   Транзиентное уведомление. Подключать вместе со snackbar.css.

   API:
     showSnackbar(text)                       — простой тост с зелёной галкой
     showSnackbar(text, {label, callback})    — + кнопка-действие (напр. undo)
     showSnackbar(text, null, true)           — без иконки (прогресс/навигация)

   Контейнер #snackbarContainer создаётся автоматически, если его нет в разметке. */
(function () {
  var SNACKBAR_ICON =
    '<div class="snackbar-icon"><svg width="12" height="10" viewBox="0 0 12 10" fill="none">' +
    '<path d="M1 5l3.5 3.5L11 1" stroke="#0D162E" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg></div>';

  function getContainer() {
    var c = document.getElementById('snackbarContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'snackbarContainer';
      c.className = 'snackbar-container';
      c.setAttribute('aria-live', 'polite');
      document.body.appendChild(c);
    }
    return c;
  }

  function showSnackbar(text, action, noIcon) {
    var container = getContainer();
    var item = document.createElement('div');
    item.className = 'snackbar-item';
    var actionHtml = action ? '<button class="snackbar-action">' + action.label + '</button>' : '';
    var iconHtml = noIcon ? '' : SNACKBAR_ICON;
    item.innerHTML = iconHtml + '<span class="snackbar-text">' + (text || 'Готово') + '</span>' + actionHtml;
    container.appendChild(item);

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      item.classList.remove('visible');
      item.classList.add('hiding');
      setTimeout(function () {
        if (item.parentNode) item.parentNode.removeChild(item);
      }, 250);
    }

    if (action) {
      item.querySelector('.snackbar-action').addEventListener('click', function () {
        if (typeof action.callback === 'function') action.callback();
        dismiss();
      });
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        item.classList.add('visible');
      });
    });

    setTimeout(dismiss, 3000);
    return { dismiss: dismiss, el: item };
  }

  window.showSnackbar = showSnackbar;
})();
