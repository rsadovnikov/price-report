/* === SNACKBAR — DEPRECATED ===
   Прод-компонент Snackbar в @cian/ui-kit помечен @deprecated: «Используйте компонент Toast».
   Здесь остался только тонкий шим: showSnackbar() делегирует в showToast(), чтобы старые
   вызовы продолжали работать, пока их переносят на новый API.

   Переезд вызова:
     showSnackbar('Готово')                          → showToast.success('Готово')
     showSnackbar('Идём в форму', null, true)        → showToast('Идём в форму')
     showSnackbar('Удалено', {label, callback})      → showToast.success('Удалено',
                                                         { actions: [{ title, onClick }] })

   Требует подключённого toast.js. Старая разметка (.snackbar-item и т.п.) больше не строится. */
(function () {
  'use strict';

  function showSnackbar(text, action, noIcon) {
    if (typeof window.showToast !== 'function') {
      console.warn('[snackbar] toast.js не подключён — showSnackbar не сработает');
      return { dismiss: function () {}, el: null };
    }
    var opts = {
      type: noIcon ? 'base' : 'success',
      position: 'bottom-right',
      duration: 3000,
    };
    if (action) {
      opts.actions = [{ title: action.label, onClick: action.callback }];
    }
    var t = window.showToast(text || 'Готово', opts);
    return { dismiss: t.close, el: t.el };
  }

  window.showSnackbar = showSnackbar;
})();
