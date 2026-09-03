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
 *         video:  'media/onb-3.mp4',         // вместо картинки; играет сам, без звука, в цикле
 *         poster: 'media/onb-3.jpg',         // первый кадр, пока файл грузится
 *         … },
 *       …
 *     ],
 *     onClose: function (step) {}            // step — на каком шаге закрыли, с нуля
 *   }) -> { close, el, go }
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
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var media = s.video
      ? '<video src="' + esc(s.video) + '"' + (s.poster ? ' poster="' + esc(s.poster) + '"' : '')
        + ' muted playsinline loop preload="auto"' + (calm ? ' controls' : ' autoplay') + '></video>'
      : s.image ? '<img src="' + esc(s.image) + '" alt="">' : '';
    return '<div class="onboarding-app">'
      + '<div class="onboarding-app__image' + (media ? '' : ' onboarding-app__image--placeholder') + '">'
        + media
      + '</div>'
      + '<div class="onboarding-app__text">'
        + '<h2 class="onboarding-app__title">' + esc(s.title) + '</h2>'
        + '<p class="onboarding-app__note">' + esc(s.note) + '</p>'
      + '</div>'
      + '<div class="onboarding-app__dots" role="tablist" aria-label="Шаг ' + (i + 1) + ' из ' + steps.length + '">'
        + dots
      + '</div>'
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
    onClose: function () { if (config.onClose) config.onClose(idx); }
  });

  var panel = sheet.el.querySelector('.sheet-app');
  panel.classList.add('sheet-app--onboarding');

  var contentEl = sheet.el.querySelector('.sheet-app__content');
  var footerEl = sheet.el.querySelector('.screen-footer-app');

  function go(i) {
    if (i >= steps.length) { sheet.close(); return; }
    idx = i;
    contentEl.innerHTML = body(i);
    footerEl.querySelector('[data-action="onboarding-next"]').textContent = steps[i].button;
  }

  sheet.el.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="onboarding-next"]')) go(idx + 1);
  });

  return { close: sheet.close, el: sheet.el, go: go };
}
