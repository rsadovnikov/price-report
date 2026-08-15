/**
 * Drawer (шторка) — правая выезжающая панель в формате модального окна.
 * Стили: components/drawer.css. Дока: components/drawer.md.
 *
 * openDrawer({
 *   content:   HTMLElement | string,  // содержимое (по умолчанию пусто)
 *   width:     '720px',               // ширина панели (по умолчанию из CSS)
 *   ariaLabel: 'Объявление',          // метка диалога для скринридера
 *   onClose:   function(){}           // вызывается при любом закрытии
 * }) -> { close, el }
 *
 * Закрытие: крестик, клик по затемнению, Esc. На время показа блокируется скролл body.
 */
function openDrawer(config) {
  config = config || {};

  var CLOSE_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">'
    + '<path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  var overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  overlay.innerHTML =
    '<div class="drawer" role="dialog" aria-modal="true"'
      + (config.ariaLabel ? ' aria-label="' + config.ariaLabel + '"' : '') + '>'
      + '<button class="drawer__close" type="button" data-action="close" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '<div class="drawer__body"></div>'
    + '</div>';

  var panel = overlay.querySelector('.drawer');
  var body = overlay.querySelector('.drawer__body');

  if (config.width) panel.style.width = config.width;

  // Наполнение (на этом этапе обычно пусто).
  if (config.content instanceof HTMLElement) body.appendChild(config.content);
  else if (typeof config.content === 'string') body.innerHTML = config.content;

  var bodyOverflow = document.body.style.overflow;

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('is-open');
    document.body.style.overflow = bodyOverflow;
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 280);
    if (config.onClose) config.onClose();
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { close(); return; } // клик по затемнению вне панели
    if (e.target.closest('[data-action="close"]')) close();
  });

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(function () { overlay.classList.add('is-open'); });

  return { close: close, el: panel };
}

if (typeof window !== 'undefined') window.openDrawer = openDrawer;
