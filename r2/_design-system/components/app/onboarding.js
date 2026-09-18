/**
 * Онбординг-карусель — поверхность приложения (iOS).
 * Стили: components/app/onboarding.css. Требует sheet.css + sheet.js.
 *
 *   openOnboarding({
 *     base:  '../../_design-system/',        // путь к ДС — нужен шторке для иконок
 *     steps: [
 *       { title: 'Обзор конкурентов объекта',
 *         note:  'Все похожие объекты в одном месте…',
 *         button: 'И это ещё не всё',
 *         image: 'photos/onb-1.jpg' },       // нет image и нет video — серый плейсхолдер, как в макете
 *       { title: 'Отчёт для собственника',
 *         video:  'media/onb-3.mp4',         // вместо картинки; играет сам, без звука, в цикле,
 *                                            //   поверх — полоска прогресса по currentTime
 *         poster: 'media/onb-3.jpg',         // первый кадр, пока файл грузится
 *         … },
 *       { title:   'Чем полезен этот сервис',
 *         content: '<div>…</div>',           // своя вёрстка вместо картинки и пояснения:
 *         button:  'Ок, как с ним работать' },//   заголовок встаёт НАД ней, точки и кнопка — свои
 *       …
 *     ],
 *     onClose: function (step) {}            // step — на каком шаге закрыли, с нуля
 *   }) -> { close, el, go }
 *
 * `content` — HTML-строка от страницы, компонент её не экранирует и не стилизует:
 * у такого шага своя раскладка (макет 2751:137754 — карточки пользы), и держать её
 * в компоненте значило бы тащить в ДС вёрстку одного экрана.
 *
 * Кнопка последнего шага закрывает карусель — отдельного «Готово» в макете нет,
 * там на третьем шаге просто своя подпись («Будем разбираться»).
 *
 * Перелистывание перерисовывает тело и подпись кнопки, а не пересоздаёт шторку:
 * иначе на каждом шаге проигрывался бы выезд снизу, будто открыли заново.
 */
function openOnboarding(config) {
  config = config || {};
  var steps = config.steps || [];
  if (!steps.length) return null;

  var idx = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function body(i) {
    var s = steps[i];
    var dots = steps.map(function (_, j) {
      return '<span class="onboarding-app__dot' + (j === i ? ' onboarding-app__dot--active' : '') + '"></span>';
    }).join('');
    /* Видео крутится в цикле (решение Романа 2026-09-03): шаг живёт столько, сколько
       на него смотрят, и замерший последний кадр читался бы как остановка. Стык кадров
       ролик держит сам — петля показывает его каждый оборот.
       `muted` + `playsinline` обязательны: без них iOS автозапуск не даст.
       При `prefers-reduced-motion` сам не стартует: показываем постер и контролы —
       ролик остаётся доступен, но движение начинает человек, а не страница. */
    var dotsRow = '<div class="onboarding-app__dots" role="tablist" aria-label="Шаг ' + (i + 1) + ' из ' + steps.length + '">'
        + dots
      + '</div>';
    if (s.content) {
      return '<div class="onboarding-app onboarding-app--content">'
        + '<div class="onboarding-app__lead">'
          + '<h2 class="onboarding-app__title">' + esc(s.title) + '</h2>'
          + s.content
        + '</div>'
        + dotsRow
      + '</div>';
    }
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* Полоска прогресса поверх ролика (макет 830:89439): видно, где сейчас видео и
       когда петля пошла сначала. При `calm` её нет — там свои контролы с ползунком,
       и вторая полоса легла бы на него. */
    var media = s.video
      ? '<video src="' + esc(s.video) + '"' + (s.poster ? ' poster="' + esc(s.poster) + '"' : '')
        + ' muted playsinline loop preload="auto"' + (calm ? ' controls' : ' autoplay') + '></video>'
        + (calm ? '' : '<span class="onboarding-app__progress" aria-hidden="true"></span>')
      : s.image ? '<img src="' + esc(s.image) + '" alt="">' : '';
    return '<div class="onboarding-app">'
      + '<div class="onboarding-app__image' + (media ? '' : ' onboarding-app__image--placeholder') + '">'
        + media
      + '</div>'
      + '<div class="onboarding-app__text">'
        + '<h2 class="onboarding-app__title">' + esc(s.title) + '</h2>'
        + '<p class="onboarding-app__note">' + esc(s.note) + '</p>'
      + '</div>'
      + dotsRow
    + '</div>';
  }

  function footer(i) {
    return '<div class="screen-footer-app">'
      + '<div class="screen-footer-app__buttons">'
        + '<button class="btn-app btn-app--medium btn-app--primary btn-app--main btn-app--block"'
          + ' type="button" data-action="onboarding-next">' + esc(steps[i].button) + '</button>'
      + '</div>'
    + '</div>';
  }

  var sheet = openSheet({
    base: config.base,
    ariaLabel: config.ariaLabel || 'Что умеет сервис',
    content: body(0),
    footer: footer(0),
    onClose: function () {
      cancelAnimationFrame(raf);
      if (config.onClose) config.onClose(idx);
    }
  });

  var panel = sheet.el.querySelector('.sheet-app');
  panel.classList.add('sheet-app--onboarding');

  var contentEl = sheet.el.querySelector('.sheet-app__content');
  var footerEl = sheet.el.querySelector('.screen-footer-app');

  /* Полоска идёт за `currentTime` каждый кадр, а не по `timeupdate`: то событие
     приходит раза четыре в секунду, и полоса ползла бы ступеньками. Конец ролика
     отдельно ловить не нужно: на петле `currentTime` сам падает в ноль, и полоса
     возвращается к началу вместе с ним. Цикл живёт, пока на шаге есть ролик, и
     гаснет при перелистывании и закрытии. */
  var raf = 0;
  function trackProgress() {
    cancelAnimationFrame(raf);
    var video = contentEl.querySelector('.onboarding-app__image video');
    var bar = contentEl.querySelector('.onboarding-app__progress');
    if (!video || !bar) return;
    (function tick() {
      if (video.duration) {
        bar.style.transform = 'scaleX(' + Math.min(1, video.currentTime / video.duration) + ')';
      }
      raf = requestAnimationFrame(tick);
    })();
  }
  trackProgress();

  function go(i) {
    if (i >= steps.length) { sheet.close(); return; }
    idx = i;
    contentEl.innerHTML = body(i);
    footerEl.querySelector('[data-action="onboarding-next"]').textContent = steps[i].button;
    trackProgress();
  }

  sheet.el.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="onboarding-next"]')) go(idx + 1);
  });

  return { close: sheet.close, el: sheet.el, go: go };
}
