/**
 * Слайдер — поверхность приложения (iOS).
 * Стили: components/app/slider.css. Макет: `64:39754`.
 *
 *   var s = createSliderApp({
 *     min: 200, max: 20000, step: 100, value: 3000,
 *     format: function (v) { return v >= 1000 ? (v / 1000) + ' км' : v + ' м'; },
 *     onInput: function (v) {}
 *   });
 *   container.appendChild(s.el);
 *   s.mount();          // после вставки в DOM: без ширины баббл не спозиционировать
 *   s.value();          // текущее значение
 *   s.set(5000);        // выставить снаружи
 *
 * `mount()` отдельным шагом намеренно: положение баббла считается от ширины
 * дорожки, а у неотрисованного элемента она нулевая. Вызвать до вставки — баббл
 * прилипнет к левому краю, и это не будет видно в коде.
 *
 * Ручку рисует псевдоэлемент нативного input — она едет сама. Скрипт двигает
 * только заполненную часть и баббл.
 */
function createSliderApp(config) {
  config = config || {};
  var min = config.min != null ? config.min : 0;
  var max = config.max != null ? config.max : 100;
  var step = config.step || 1;
  var format = config.format || function (v) { return String(v); };

  var el = document.createElement('div');
  el.className = 'slider-app';
  el.innerHTML =
    '<div class="slider-app__bubble"><span class="slider-app__bubble-value"></span></div>'
    + '<div class="slider-app__track">'
      + '<span class="slider-app__line"></span>'
      + '<span class="slider-app__fill"></span>'
      + '<input class="slider-app__input" type="range">'
    + '</div>'
    + '<div class="slider-app__labels"><span></span><span></span></div>';

  var input = el.querySelector('.slider-app__input');
  var fill = el.querySelector('.slider-app__fill');
  var bubble = el.querySelector('.slider-app__bubble-value');
  var ends = el.querySelectorAll('.slider-app__labels span');

  input.min = min;
  input.max = max;
  input.step = step;
  input.value = config.value != null ? config.value : min;
  ends[0].textContent = format(min);
  ends[1].textContent = format(max);

  function paint() {
    var v = Number(input.value);
    var ratio = max === min ? 0 : (v - min) / (max - min);
    bubble.textContent = format(v);
    /* Ручка 28 — её центр не доходит до краёв дорожки на 14 с каждой стороны.
       Баббл и заполнение считаем по той же дорожке, что и браузер, иначе на
       концах они разъезжаются с ручкой на те самые 14. */
    var w = el.querySelector('.slider-app__track').getBoundingClientRect().width;
    var travel = Math.max(0, w - 28);
    var x = 14 + ratio * travel;
    fill.style.width = x + 'px';
    bubble.style.left = (w ? (x / w) * 100 : 0) + '%';
  }

  input.addEventListener('input', function () {
    paint();
    if (config.onInput) config.onInput(Number(input.value));
  });

  return {
    el: el,
    input: input,
    mount: paint,
    value: function () { return Number(input.value); },
    set: function (v) { input.value = v; paint(); }
  };
}
