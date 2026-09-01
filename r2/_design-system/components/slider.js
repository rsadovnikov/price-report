/* === SLIDER (веб) — механика ===
 * Ручку везёт браузер (нативный `input[type=range]`), скрипту остаётся одно:
 * тянуть полосу заполнения за её центром.
 *
 * ⚠️ Заполнение считается по `width − 20`, а не по всей ширине. Центр ручки не
 * доходит до краёв на 10 с каждой стороны — таков нативный элемент, — и без этой
 * поправки полоса убегала бы от ручки, сильнее всего на концах. Ровно та же
 * поправка на поверхности приложения, там ручка 28 и вычитается 28.
 *
 * ⚠️ У самого кита поправки нет: там и полоса, и ручка стоят на одном проценте от
 * ПОЛНОЙ ширины, а ручка свисает за края на 10. Это не расхождение чисел, а разные
 * носители: свой DOM волен свисать, нативная ручка — нет.
 */
function mountSlider(root) {
  var input = root.querySelector('.slider__input');
  var track = root.querySelector('.slider__track');
  if (!input || !track) return null;

  function paint() {
    var min = Number(input.min), max = Number(input.max);
    var ratio = max > min ? (Number(input.value) - min) / (max - min) : 0;
    var w = root.getBoundingClientRect().width;
    track.style.width = (10 + ratio * Math.max(0, w - 20)) + 'px';
  }

  input.addEventListener('input', paint);
  /* Панель может открыться раньше, чем у неё есть ширина (её кладут в документ и
     только потом позиционируют), — тогда первый расчёт даст ноль. Наблюдатель
     догоняет: он же перерисует полосу, если панель переедет или сменит ширину. */
  if (typeof ResizeObserver === 'function') {
    var ro = new ResizeObserver(paint);
    ro.observe(root);
  }
  paint();
  return { paint: paint, input: input };
}
