/**
 * Gallery (фото-галерея / лайтбокс) — полноэкранный просмотр фотографий.
 * Стили: components/gallery-modal.css. Дока: components/gallery-modal.md.
 *
 * openGallery({
 *   photos:     ['url', ...],   // обязателен, ≥1
 *   index:      0,              // стартовый слайд
 *   title:      '',             // заголовок в шапке (слева)
 *   coverIndex: 0,              // на этом слайде — бейдж «Главное фото» (null — не показывать)
 *   coverLabel: 'Главное фото',
 *   ariaLabel:  'Фотографии',
 *   onClose:    function(){}
 * }) -> { close }
 *
 * Навигация: стрелки ‹ ›, клавиши ←/→, клик по миниатюре. Листание зациклено.
 * Закрытие: крестик, клик по тёмному фону вне фото, Esc. На показ — блокировка скролла body.
 */
function openGallery(config) {
  config = config || {};
  var photos = config.photos || [];
  if (!photos.length) return null;

  var index = config.index || 0;
  if (index < 0 || index >= photos.length) index = 0;
  var coverIndex = (config.coverIndex === null || config.coverIndex === undefined) ? 0 : config.coverIndex;
  var coverLabel = config.coverLabel || 'Главное фото';
  var multi = photos.length > 1;

  var CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 2l16 16M18 2L2 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var PREV_SVG = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M20 8l-8 8 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var NEXT_SVG = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M12 8l8 8-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PIN_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" fill="currentColor"/></svg>';

  function esc(s) { return String(s).replace(/"/g, '&quot;'); }

  var slidesHtml = photos.map(function (src, i) {
    var badge = (i === coverIndex)
      ? '<div class="gallery__cover-badge">' + PIN_SVG + '<span>' + coverLabel + '</span></div>'
      : '';
    return '<div class="gallery__slide"><img class="gallery__img" src="' + esc(src) + '" alt="">' + badge + '</div>';
  }).join('');

  var thumbsHtml = multi
    ? photos.map(function (src, i) {
        return '<img class="gallery__thumb" data-thumb="' + i + '" src="' + esc(src) + '" alt="">';
      }).join('')
    : '';

  var overlay = document.createElement('div');
  overlay.className = 'gallery-overlay';
  overlay.innerHTML =
    '<div class="gallery" role="dialog" aria-modal="true"' + (config.ariaLabel ? ' aria-label="' + esc(config.ariaLabel) + '"' : '') + '>'
      + '<div class="gallery__header">'
        + '<div class="gallery__title">' + (config.title || '') + '</div>'
        + '<button class="gallery__close" type="button" data-action="close" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
      + '</div>'
      + '<div class="gallery__stage">'
        + (multi ? '<button class="gallery__nav gallery__prev" type="button" data-action="prev" aria-label="Предыдущее фото">' + PREV_SVG + '</button>' : '')
        + '<div class="gallery__viewport"><div class="gallery__track">' + slidesHtml + '</div></div>'
        + (multi ? '<button class="gallery__nav gallery__next" type="button" data-action="next" aria-label="Следующее фото">' + NEXT_SVG + '</button>' : '')
        + (multi ? '<div class="gallery__counter"></div>' : '')
      + '</div>'
      + (multi ? '<div class="gallery__thumbs">' + thumbsHtml + '</div>' : '')
    + '</div>';

  var track = overlay.querySelector('.gallery__track');
  var counter = overlay.querySelector('.gallery__counter');
  var thumbs = Array.prototype.slice.call(overlay.querySelectorAll('.gallery__thumb'));

  function update() {
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    if (counter) counter.textContent = (index + 1) + '/' + photos.length;
    thumbs.forEach(function (t, i) { t.classList.toggle('is-active', i === index); });
    var active = thumbs[index];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function go(n) { index = (n + photos.length) % photos.length; update(); }

  var bodyOverflow = document.body.style.overflow;

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('is-open');
    document.body.style.overflow = bodyOverflow;
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
    if (config.onClose) config.onClose();
  }

  function onKey(e) {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === 'ArrowRight') go(index + 1);
  }

  overlay.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (btn) {
      var a = btn.getAttribute('data-action');
      if (a === 'close') close();
      else if (a === 'prev') go(index - 1);
      else if (a === 'next') go(index + 1);
      return;
    }
    var thumb = e.target.closest('[data-thumb]');
    if (thumb) { go(+thumb.getAttribute('data-thumb')); return; }
    // Клик по тёмному фону (не по фото/бейджу/ленте/шапке) — закрыть.
    if (!e.target.closest('.gallery__img') && !e.target.closest('.gallery__cover-badge')
      && !e.target.closest('.gallery__thumbs') && !e.target.closest('.gallery__header')) close();
  });

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);
  update();
  requestAnimationFrame(function () { overlay.classList.add('is-open'); });

  return { close: close };
}

if (typeof window !== 'undefined') window.openGallery = openGallery;
