/* Экран «Конкуренты в отчёте» (поверхность приложения) — комментарии агента.
 *
 * Разметка — comments-app.html, карточка — competitor-card-app.js (тот же рендер,
 * что на «Конкурентах объекта»), шторка и снекбар — компоненты ДС.
 * Макет: Figma «Доработки отчёта о цене и конкурентах», секция 818:82952.
 *
 * Куда ведёт: из настройки отчёта, кнопка «Добавить комментарии».
 *
 * Что можно: у каждого выбранного конкурента — приписка от агента. Её увидит
 * собственник в PDF-отчёте, поэтому она и живёт рядом с объектом, а не общим полем.
 *
 * Состояния карточки:
 *   без комментария — кнопка «Добавить комментарий» под цифрами;
 *   с комментарием  — оранжевая плашка с текстом, тап открывает правку;
 *   удалили         — снекбар с «Восстановить», текст возвращается по нажатию.
 *
 * ⚠️ Корзины в шапке карточки нет, хотя в макете (818:83038) она нарисована. На
 * соседнем экране ровно та же красная корзина означает «убрать объявление из
 * отслеживаемых», и здесь она читается так же — а этот экран объявлениями не
 * распоряжается, он только про приписки. Удаление живёт в шторке, где рядом виден
 * текст, который удаляют (решение Романа 2026-08-18).
 *
 * Параметры URL:
 *   n — сколько конкурентов в отчёте (по умолчанию 6, как в настройке)
 *   плюс проброс «Моего объекта» — он тут не показан, но летит дальше по ссылкам.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var esc = CompetitorCardApp.esc;
  var LIMIT = 80;                       /* счётчик в макете — «28/80» */

  var total = (typeof ALL_COMPETITORS !== 'undefined' && ALL_COMPETITORS.length) || 0;
  /* Ноль — законное значение (агент убрал из отслеживаемых всех), и подменять его
     шестёркой значит показать комментарии к объектам, которых в отчёте нет. */
  var n = parseInt(params.get('n') || '6', 10);
  if (!(n >= 0)) n = 6;
  n = Math.min(n, total);

  /* Комментарии переживают уход на соседний экран и возврат: без этого демонстрация
     разваливается на первом же «назад». sessionStorage, а не localStorage — прототип
     не должен помнить прошлую сессию. */
  var STORE = 'comments-app';
  var comments = {};
  try { comments = JSON.parse(sessionStorage.getItem(STORE) || 'null') || {}; }
  catch (_) { comments = {}; }

  /* Первый заход — показываем оба состояния сразу, как в макете: у второго объекта
     комментарий уже есть. Дальше состояние ведёт пользователь. */
  if (!sessionStorage.getItem(STORE) && n > 1) {
    comments['1'] = 'Мощный объект, сам бы купил! Обратите внимание на ремонт в туалете';
  }

  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(comments)); } catch (_) {}
  }

  /* ------------------------------------------------------------------ *
   *  Список                                                             *
   * ------------------------------------------------------------------ */

  var listEl = document.getElementById('cards');

  function addButton() {
    return '<button class="btn-app btn-app--small btn-app--primary btn-app--main btn-app--block"'
      + ' type="button" data-action="comment">Добавить комментарий</button>';
  }

  function commentPlate(text) {
    /* Плашка — кнопка: тап по тексту открывает ту же шторку на правку. Отдельной
       кнопки «изменить» в макете нет, и правильно: сам текст и есть цель. */
    return '<button class="competitor-card-app__comment" type="button" data-action="comment">'
      + esc(text) + '</button>';
  }

  function render() {
    listEl.innerHTML = ALL_COMPETITORS.slice(0, n).map(function (c, idx) {
      var text = comments[idx];
      return CompetitorCardApp.render(c, {
        idx: idx,
        archived: !!c.removed,
        tail: text ? commentPlate(text) : addButton()
      });
    }).join('');
  }

  /* ------------------------------------------------------------------ *
   *  Шторка комментария                                                 *
   * ------------------------------------------------------------------ */

  function openComment(idx) {
    var current = comments[idx] || '';
    var sheet = openSheet({
      base: '../_design-system/',
      ariaLabel: 'Комментарий к объекту',
      barTitle: 'Комментарий',
      /* «Удалить» показываем только когда есть что удалять — в макете 818:83217
         это состояние правки, а в 818:83082 (новый комментарий) справа пусто. */
      barAction: current ? { title: 'Удалить', tone: 'negative', onClick: function () { remove(idx); } } : null,
      content:
        '<div class="textarea-app comment-sheet-app__field">'
          + '<textarea class="textarea-app__control" id="comment-text" maxlength="' + LIMIT + '"'
            + ' placeholder="Что особенного в этом объекте или на что нужно обратить внимание"'
            + '>' + esc(current) + '</textarea>'
          + '<p class="textarea-app__counter" id="comment-counter">'
            + current.length + '/' + LIMIT + '</p>'
        + '</div>',
      footer:
        '<div class="screen-footer-app">'
          + '<div class="screen-footer-app__buttons">'
            + '<button class="btn-app btn-app--medium btn-app--primary btn-app--main btn-app--block"'
              + ' type="button" data-action="save">Сохранить</button>'
          + '</div>'
        + '</div>'
    });

    var field = sheet.el.querySelector('#comment-text');
    var counter = sheet.el.querySelector('#comment-counter');

    field.addEventListener('input', function () {
      counter.textContent = field.value.length + '/' + LIMIT;
    });

    sheet.el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-action="save"]')) return;
      var text = field.value.trim();
      /* Пустое поле = отказ от комментария, а не пустая плашка. Сохранять нечего,
         поэтому просто закрываем — снекбар «сохранён» тут был бы враньём. */
      if (text) {
        comments[idx] = text;
        save();
        render();
        showSnackbarApp('Комментарий сохранён');
      }
      sheet.close();
    });

    /* Курсор в поле сразу: в макете шторка открыта с клавиатурой. */
    setTimeout(function () { field.focus(); }, 50);
  }

  function remove(idx) {
    var text = comments[idx];
    if (!text) return;
    delete comments[idx];
    save();
    render();
    /* Возврат — обязательная часть удаления: комментарий писали руками, и
       случайное «Удалить» не должно стоить текста. */
    showSnackbarApp('Комментарий удалён', {
      action: {
        title: 'Восстановить',
        onClick: function () { comments[idx] = text; save(); render(); }
      }
    });
  }

  /* Делегат на список: карточки перерисовываются целиком, вешать обработчики
     на каждую кнопку заново — плодить утечки. */
  listEl.addEventListener('click', function (e) {
    var card = e.target.closest('.competitor-card-app');
    if (!card) return;
    var idx = parseInt(card.getAttribute('data-idx'), 10);
    if (e.target.closest('[data-action="comment"]')) openComment(idx);
  });

  /* Объект и число конкурентов едут дальше по ссылкам — иначе возврат в настройку
     сбросит экран к значениям по умолчанию. */
  var qs = new URLSearchParams({ n: n });
  ['desc', 'price', 'photo', 'u'].forEach(function (key) {
    if (params.get(key)) qs.set(key, params.get(key));
  });
  document.getElementById('back').setAttribute('href', 'owner-report-app.html?' + qs);

  render();
})();
