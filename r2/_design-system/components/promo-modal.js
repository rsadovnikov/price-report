/**
 * PromoModal — модальное окно со встроенной каруселью (онбординг).
 * Стили: components/promo-modal.css. Дока: components/promo-modal.md.
 *
 * openPromoModal({
 *   slides: [{ image: 'url'|'', title: '...', text: '...' }, ...],  // обязателен, ≥1
 *                               // { video: 'url', poster: 'url' } — ролик вместо картинки
 *                               // (лейаут 'promo'): встроенный плеер браузера, сам не стартует.
 *                               // + autoplay: true — сам играет на активном слайде, с начала,
 *                               // в цикле, с полоской прогресса (как в приложении).
 *   layout: 'promo' | 'window', // 'window' — заголовок сверху, под ним картинка-иллюстрация
 *                               // (слайд { title, image, width, height, alt, bodyHeight }); см. promo-modal.md
 *                               // Слайд может переопределить: { layout: 'promo' } — смешанная карусель;
 *                               // { nextLabel: '…' } — своя подпись «Дальше» на этом слайде.
 *                               // { content: '<div>…</div>' } — своя вёрстка тела вместо картинки
 *                               // (HTML страницы, компонент его не экранирует и не стилизует).
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

  var windowLayout = config.layout === 'window';
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var overlay = document.createElement('div');
  overlay.className = 'promo-modal-overlay';
  overlay.innerHTML =
    '<div class="promo-modal' + (windowLayout ? ' promo-modal--window' : '') + '" role="dialog" aria-modal="true">'
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
    if (s.layout ? s.layout === 'window' : windowLayout) {
      /* width/height — размер картинки в CSS-пикселях (файл — @2x). Без них слайд
         до загрузки картинки нулевой высоты, и модалка прыгает, когда та доедет. */
      slide.innerHTML = '<div class="promo-modal__header"><div class="heading1">' + (s.title || '') + '</div></div>'
        + '<div class="promo-modal__body"' + (s.bodyHeight ? ' style="min-height:' + s.bodyHeight + 'px"' : '') + '>'
          + (s.content ? s.content
            : s.image
            ? '<img class="promo-modal__art" src="' + s.image + '" width="' + s.width + '" height="' + s.height + '" alt="' + (s.alt || '') + '">'
            : '<div class="promo-modal__image--placeholder promo-modal__art" style="width:100%;height:333px"></div>')
        + '</div>';
      track.appendChild(slide);
      return;
    }
    /* Ролик. По умолчанию — встроенный плеер браузера (`controls`): постер, Play, шкала,
       полный экран. Сам не стартует и не зациклен — запускает человек, когда готов
       смотреть; досмотрел — ролик стоит на последнем кадре (решение Романа 2026-09-21:
       самозапуск сбивал, «не сразу схватываешь, что происходит в ролике»).
       Звука в роликах нет и не будет (Роман), поэтому кнопки звука у плеера нет — её
       прячет promo-modal.css. Скачивание и трансляция из меню плеера убраны — ролик часть
       онбординга, а не файл. Сам `controls` здесь не ставится: его вешает settlePlayer,
       когда слайд доехал до места (почему — там).
       `autoplay: true` у слайда — прежний режим, как в онбординге приложения
       (components/app/onboarding.js): без звука, в цикле, полоска прогресса по нижней
       кромке. Атрибута `autoplay` нет и там: слайды карусели живут в DOM все сразу, и
       ролик крутился бы за кадром — стартует только активный слайд (syncVideos), с начала.
       При `prefers-reduced-motion` такой слайд тоже получает плеер. */
    var auto = s.autoplay && !calm;
    var imgHtml = s.video
      ? '<div class="promo-modal__media">'
        + '<video class="promo-modal__image" src="' + s.video + '"' + (s.poster ? ' poster="' + s.poster + '"' : '')
          + ' playsinline'
          + (auto ? ' muted loop preload="auto" data-autoplay'
                  : ' data-player controlslist="nodownload noremoteplayback" disablepictureinpicture preload="metadata"')
          + '></video>'
        + (auto ? '<span class="promo-modal__progress" aria-hidden="true"></span>' : '')
      + '</div>'
      : s.image
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
    nextBtn.textContent = last ? finishLabel : (slides[index].nextLabel || nextLabel);
    renderDots();
    syncVideos();
  }

  /* Уход со слайда ставит его ролик на паузу — любой, и плеер тоже: иначе запущенный
     агентом ролик доигрывал бы за кадром. Плеер при этом помнит место. Ролик `autoplay`
     активного слайда — с начала. Полоска идёт за `currentTime`
     каждый кадр, а не по `timeupdate` (тот приходит раза четыре в секунду — полоса ползла
     бы ступеньками). Конец ролика ловить не нужно: на петле `currentTime` сам падает в
     ноль, и полоса уходит в начало вместе с ним. */
  var raf = 0;
  function syncVideos() {
    cancelAnimationFrame(raf);
    cancelSettle();
    var active = null;
    Array.prototype.forEach.call(track.children, function (slide, i) {
      var v = slide.querySelector('video');
      if (!v) return;
      var player = v.hasAttribute('data-player');
      if (i !== index) { v.pause(); if (player) v.controls = false; return; }
      if (player) { settlePlayer(v); return; } // плеер: запускает человек
      active = slide;
      v.muted = true;
      v.currentTime = 0;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    });
    var bar = active && active.querySelector('.promo-modal__progress');
    if (!bar) return;
    var video = active.querySelector('video');
    bar.style.transform = 'scaleX(0)';
    (function tick() {
      if (video.duration) bar.style.transform = 'scaleX(' + Math.min(1, video.currentTime / video.duration) + ')';
      raf = requestAnimationFrame(tick);
    })();
  }

  /* Панель плеера — только у слайда, который стоит на месте. Chrome раскладывает её по
     ВИДИМОЙ части ролика: пока трек едет, у въезжающего слайда видна полоса слева, и панель
     застывала этой ширины — на треть ролика, со срезом по вертикали (поймал Роман
     2026-09-21, воспроизводится только в видимом окне; в фоновом Chrome и в тестовом
     браузере — нет). Поэтому `controls` ставится, когда трек доехал (transitionend или
     запасной таймер — перехода может не быть), а у ушедших слайдов снимается. */
  var settle = null;
  function cancelSettle() {
    if (!settle) return;
    clearTimeout(settle.timer);
    track.removeEventListener('transitionend', settle.onEnd);
    settle = null;
  }
  function settlePlayer(v) {
    function done() { cancelSettle(); v.controls = true; }
    var dur = parseFloat(getComputedStyle(track).transitionDuration) || 0;
    if (!dur) { done(); return; }
    settle = {
      onEnd: function (e) { if (e.target === track) done(); },
      timer: setTimeout(done, dur * 1000 + 150),
    };
    track.addEventListener('transitionend', settle.onEnd);
  }

  var bodyOverflow = document.body.style.overflow;

  function close() {
    cancelAnimationFrame(raf);
    cancelSettle();
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
    cancelAnimationFrame(raf);
    cancelSettle();
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
