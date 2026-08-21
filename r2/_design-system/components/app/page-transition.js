/* Направление перехода между экранами приложения.
 *
 * Саму анимацию делает браузер (см. page-transition.css). Ему не хватает одного:
 * он не знает, вперёд мы идём или назад. Для движка любая наша ссылка — обычный
 * переход, а «назад» на этой поверхности — это стрелка в навбаре, то есть ссылка
 * на предыдущий экран, ничем не отличающаяся от прочих.
 *
 * Поэтому направление называет уходящая страница — по тому, на что нажали, — и
 * кладёт в sessionStorage. Новая страница забирает его в `pagereveal`: это первое
 * событие нового документа, оно приходит ДО того, как переход начнёт рисоваться,
 * и атрибут успевает попасть в CSS.
 *
 * Кнопка «назад» браузера и свайп-жест сюда не попадают — там никто не нажимал
 * нашу ссылку. Их видно по `navigation.activation.navigationType === 'traverse'`.
 *
 * Скрипт подключается в <head> и без DOMContentLoaded: слушатель делегированный,
 * а `pagereveal` ждать нельзя — он приходит раньше конца парсинга.
 */
(function () {
  'use strict';

  /* Движок без cross-document переходов — уходим молча: анимации не будет,
     навигация останется обычной. */
  if (!('onpagereveal' in window)) return;

  var KEY = 'nav-app-dir';
  /* Что считаем «назад»: стрелка навбара и всё, что помечено явно
     (например «Сохранить и выйти» — по смыслу возврат, а не следующий экран). */
  var BACK = '[data-nav="back"], .navbar-app__icon--back';

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    try { sessionStorage.setItem(KEY, a.matches(BACK) ? 'back' : 'forward'); } catch (_) {}
  }, true);

  window.addEventListener('pagereveal', function () {
    var dir = 'forward';
    try {
      var act = window.navigation && window.navigation.activation;
      if (act && act.navigationType === 'traverse') {
        /* Шаг по истории: назад это или вперёд, говорит номер записи, а не сам
           факт traverse — иначе «вперёд» браузера играло бы возврат. */
        dir = (act.entry && act.from && act.entry.index < act.from.index) ? 'back' : 'forward';
      } else {
        dir = sessionStorage.getItem(KEY) || 'forward';
      }
      sessionStorage.removeItem(KEY);
    } catch (_) {}
    document.documentElement.setAttribute('data-nav', dir);
  });
})();
