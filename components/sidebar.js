/**
 * Shared Sidebar component.
 * Usage: <div id="sidebar"></div> + renderSidebar({ active: 'Мои объявления' })
 */
function renderSidebar(opts) {
  const active = (opts && opts.active) || '';
  const el = document.getElementById('sidebar');
  if (!el) return;

  const items = [
    { label: 'Сводка' },
    { label: 'Мои объявления', count: '5', href: 'index.html' },
    { label: 'Мои уведомления', count: '9+' },
    { label: 'Сообщения', count: '7' },
    { label: 'Пакеты размещений', arrow: true },
    { label: 'Кошелёк', arrow: true },
    { label: 'Отчёты', arrow: true },
    { label: 'Мои сделки', count: '100' },
    { label: 'Заявки', count: '1 238' },
    { label: 'Электронная регистрация' },
    { label: 'Мои ипотечные заявки' },
    { label: 'Зарабатывайте с Циан' },
    { label: 'Профиль', arrow: true },
    { label: 'Качество сервиса' },
    { label: 'Жалобы' },
    { label: 'Скрытые объявления' },
    { label: 'Индивидуальные тарифы' },
    { label: 'Профпоиск' },
    { label: 'Вакансии агентств' },
  ];

  const menuHtml = items.map(it => {
    const cls = it.label === active ? ' active' : '';
    let suffix = '';
    if (it.count) suffix = `<span class="count">${it.count}</span>`;
    if (it.arrow) suffix = `<span class="arrow">›</span>`;
    const link = it.href || '#';
    return `<a class="sidebar-item${cls}" href="${link}">${it.label} ${suffix}</a>`;
  }).join('\n      ');

  el.outerHTML = `
<aside class="sidebar">
  <div class="sidebar-menu">
    ${menuHtml}
  </div>
  <div class="sidebar-divider"></div>
  <div class="sidebar-bottom">
    <a class="sidebar-item" href="#">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#697797" stroke-width="1.2"/><path d="M8 5v3M8 10h.01" stroke="#697797" stroke-width="1.2" stroke-linecap="round"/></svg>
      Настройки
    </a>
    <a class="sidebar-item" href="#">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#697797" stroke-width="1.2"/><path d="M8 5v3.5" stroke="#697797" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="11" r="0.7" fill="#697797"/></svg>
      Поддержка
    </a>
    <a class="sidebar-item" href="#">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3H4a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="#697797" stroke-width="1.2" stroke-linecap="round"/><path d="M7 9l6-6M10 3h3v3" stroke="#697797" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Выйти
    </a>
  </div>
</aside>`;
}
