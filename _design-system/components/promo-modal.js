/**
 * PromoModal — модальное окно со встроенной каруселью (онбординг).
 * Стили: components/promo-modal.css. Дока: components/promo-modal.md.
 *
 * openPromoModal({
 *   slides: [{ image: 'url'|'', title: '...', text: '...' }, ...],  // обязателен, ≥1
 *   finishLabel: 'Готово',     // лейбл «Дальше» на последнем слайде
 *   nextLabel:  'Дальше',
 *   prevLabel:  'Назад',
 *   onFinish:   function(){},  // вызывается при клике «Готово» (перед закрытием)
 *   onClose:    function(){}   // вызывается при любом закрытии
 * }) -> { close }
 *
 * Закрытие: крестик, клик по затемнению, Esc. На время показа блокируется скролл body.
 */
function openPromoModal(config) {
  config = config || {};
  var slides = config.slides || [];
  if (!slides.length) return null;

  var finishLabel = config.finishLabel || 'Готово';
  var nextLabel = config.nextLabel || 'Дальше';
  var prevLabel = config.prevLabel || 'Назад';
  var index = 0;

  var CLOSE_SVG = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">'
    + '<path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  var overlay = document.createElement('div');
  overlay.className = 'promo-modal-overlay';
  overlay.innerHTML =
    '<div class="promo-modal" role="dialog" aria-modal="true">'
      + '<div class="promo-modal__viewport"><div class="promo-modal__track"></div></div>'
      + '<div class="promo-modal__footer">'
        + '<button class="btn-secondary-md" type="button" data-action="prev">' + prevLabel + '</button>'
        + '<div class="promo-modal__dots"></div>'
        + '<button class="btn-primary-md" type="button" data-action="next">' + nextLabel + '</button>'
      + '</div>'
      + '<button class="promo-modal__close" type="button" data-action="close" aria-label="Закрыть">' + CLOSE_SVG + '</button>'
    + '</div>';

  var modalEl = overlay.querySelector('.promo-modal');
  var track = overlay.querySelector('.promo-modal__track');
  var dotsEl = overlay.querySelector('.promo-modal__dots');
  var prevBtn = overlay.querySelector('[data-action="prev"]');
  var nextBtn = overlay.querySelector('[data-action="next"]');

  // Слайды
  slides.forEach(function (s) {
    var slide = document.createElement('div');
    slide.className = 'promo-modal__slide';
    var imgHtml = s.image
      ? '<img class="promo-modal__image" src="' + s.image + '" alt="">'
      : '<div class="promo-modal__image promo-modal__image--placeholder"></div>';
    slide.innerHTML = imgHtml
      + '<div class="promo-modal__text">'
        + '<div class="heading1">' + (s.title || '') + '</div>'
        + '<div class="body1">' + (s.text || '') + '</div>'
      + '</div>';
    track.appendChild(slide);
  });

  // Точки: ≤5 — все равные; >5 — окно из 7 вокруг активной, края сжимаются 8→6→4.
  function renderDots() {
    var total = slides.length;
    var html = '';
    if (total <= 5) {
      for (var i = 0; i < total; i++) {
        html += '<div class="promo-modal__dot' + (i === index ? ' is-active' : '') + '"></div>';
      }
    } else {
      var w = Math.min(7, total);
      var start = Math.max(0, Math.min(index - 3, total - w));
      for (var p = 0; p < w; p++) {
        var gi = start + p;
        var cls = 'promo-modal__dot';
        if (gi === index) cls += ' is-active';
        else if (p === 0 || p === w - 1) cls += ' is-edge-far';
        else if (p === 1 || p === w - 2) cls += ' is-edge';
        html += '<div class="' + cls + '"></div>';
      }
    }
    dotsEl.innerHTML = html;
  }

  function update() {
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    prevBtn.disabled = index === 0;
    var last = index === slides.length - 1;
    nextBtn.textContent = last ? finishLabel : nextLabel;
    renderDots();
  }

  var bodyOverflow = document.body.style.overflow;

  function close() {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('is-open');
    document.body.style.overflow = bodyOverflow;
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 200);
    if (config.onClose) config.onClose();
  }

  // Закрытие «в источник»: карточка уменьшается и улетает к элементу, который её
  // вызывает (config.originEl — напр. ссылка «Что полезного умеет этот сервис»),
  // затем удаляется. Показывает пользователю, куда можно вернуться. Если источника
  // нет или он вне DOM — обычное закрытие.
  function closeToOrigin() {
    var origin = config.originEl;
    if (!origin || !origin.getBoundingClientRect || !origin.isConnected) { close(); return; }
    document.removeEventListener('keydown', onKey);
    var m = modalEl.getBoundingClientRect();
    var o = origin.getBoundingClientRect();
    var dx = (o.left + o.width / 2) - (m.left + m.width / 2);
    var dy = (o.top + o.height / 2) - (m.top + m.height / 2);
    modalEl.style.transformOrigin = 'center center';
    modalEl.style.transition = 'transform 0.42s cubic-bezier(0.4, 0, 0.9, 1), opacity 0.42s ease';
    modalEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(0.06)';
    modalEl.style.opacity = '0';
    overlay.classList.remove('is-open'); // затемнение гаснет параллельно
    document.body.style.overflow = bodyOverflow;
    setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 440);
    if (config.onClose) config.onClose();
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) { close(); return; } // клик по затемнению вне карточки
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    if (action === 'prev') {
      if (index > 0) { index--; update(); }
    } else if (action === 'next') {
      if (index === slides.length - 1) { if (config.onFinish) config.onFinish(); closeToOrigin(); }
      else { index++; update(); }
    } else if (action === 'close') {
      close();
    }
  });

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);
  update();
  requestAnimationFrame(function () { overlay.classList.add('is-open'); });

  return { close: close };
}

if (typeof window !== 'undefined') window.openPromoModal = openPromoModal;
