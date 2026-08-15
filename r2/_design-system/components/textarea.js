/* === MAGENTUM TEXTAREA — авторазмер и счётчик символов ===
   Поведение снято с прод-кита @cian/ui-kit (UI-Kit/Input/Textarea) 2026-08-13:
   поле растёт по содержимому между minRows и maxRows, ручку ресайза не даёт,
   при hasCounter показывает счётчик в нижней полосе.

   Подключение (после inputs.css):
     <script src="../../_design-system/components/textarea.js"></script>

   Разметка:
     <label class="textarea">
       <textarea class="textarea__control" data-min-rows="5" data-max-rows="10"
                 maxlength="300" placeholder="…"></textarea>
       <span class="textarea__counter"></span>
     </label>

   data-min-rows — стартовая высота в строках (прод minRows; по умолчанию rows или 2).
   data-max-rows — потолок, после него включается скролл (прод maxRows; 0 = без потолка).
   Счётчик заполняется сам: «N/max» при maxlength, иначе «N».

   Прод растит поле через теневой textarea-двойник; здесь то же считается по scrollHeight —
   результат тот же, разметки меньше. */

(function () {
  'use strict';

  function rowsOf(el, attr, fallback) {
    var v = parseInt(el.getAttribute(attr), 10);
    return isNaN(v) ? fallback : v;
  }

  function autosize(el) {
    var cs = getComputedStyle(el);
    var line = parseFloat(cs.lineHeight) || 20;
    var vPad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    var vBorder = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    var minRows = rowsOf(el, 'data-min-rows', el.rows || 2);
    var maxRows = rowsOf(el, 'data-max-rows', 0);

    // Схлопываем, чтобы scrollHeight отдал высоту содержимого, а не текущую.
    el.style.height = 'auto';
    var contentRows = Math.ceil((el.scrollHeight - vPad) / line);

    var rows = Math.max(minRows, contentRows);
    var overflows = maxRows > 0 && rows > maxRows;
    if (overflows) rows = maxRows;

    el.style.height = (rows * line + vPad + vBorder) + 'px';
    el.style.overflowY = overflows ? 'auto' : 'hidden';
  }

  function syncCounter(el) {
    var wrap = el.closest('.textarea');
    var counter = wrap && wrap.querySelector('.textarea__counter');
    if (!counter) return;
    var max = el.getAttribute('maxlength');
    counter.textContent = max ? el.value.length + '/' + max : String(el.value.length);
  }

  function initTextarea(el) {
    if (el.__mgTextarea) return;
    el.__mgTextarea = true;
    autosize(el);
    syncCounter(el);
    el.addEventListener('input', function () {
      autosize(el);
      syncCounter(el);
    });
  }

  // Публичный хук: вызывать после динамической вставки разметки.
  window.initTextareas = function (root) {
    (root || document).querySelectorAll('.textarea__control').forEach(initTextarea);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.initTextareas(); });
  } else {
    window.initTextareas();
  }
})();
