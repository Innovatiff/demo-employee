/* ==========================================================================
   Crewline · Manager console shell (sidebar + topbar)
   ========================================================================== */
(function (global) {
  'use strict';
  const { $, $$, el, icon, esc, avatar, relative } = UI;

  const NAV = [
    { label: 'Workspace' },
    { id: 'dashboard', label: 'Dashboard', icon: 'grid-outline', href: 'index.html' },
    { id: 'employees', label: 'Employees', icon: 'people-outline', href: 'employees.html' },
    { id: 'schedule', label: 'Schedule', icon: 'calendar-outline', href: 'schedule.html' },
    { id: 'attendance', label: 'Time & Attendance', icon: 'time-outline', href: 'attendance.html' },
    { id: 'timeoff', label: 'Time Off', icon: 'airplane-outline', href: 'time-off.html', count: () => Store.timeOff({ status: 'pending' }).length },
    { id: 'payroll', label: 'Payroll', icon: 'cash-outline', href: 'payroll.html' },
    { id: 'messages', label: 'Messages', icon: 'chatbubbles-outline', href: 'messages.html', count: () => { const v = Store.data.session.managerId; const { channels, dms } = Store.channelsFor(v); return [...channels, ...dms].reduce((n, c) => n + Store.unreadCount(v, c.id), 0); } },
    { id: 'settings', label: 'Settings', icon: 'settings-outline', href: 'settings.html' },
    { label: 'Apps' },
    { id: 'employee-app', label: 'Employee app', icon: 'phone-portrait-outline', href: '../employee/index.html', external: true },
    { id: 'kiosk', label: 'Clock-in kiosk', icon: 'tablet-landscape-outline', href: '../kiosk/index.html', external: true },
  ];

  const PAGE_TITLES = { dashboard: 'Dashboard', employees: 'Employees', schedule: 'Schedule', attendance: 'Time & Attendance', timeoff: 'Time Off', payroll: 'Payroll', messages: 'Messages', settings: 'Settings' };

  function render() {
    const page = document.body.dataset.page;
    const manager = Store.manager();
    const sidebar = $('#sidebar');
    const topbar = $('#topbar');

    sidebar.innerHTML = `
      <a class="brand" href="../index.html" title="Back to demo portal">
        <span class="brand-mark">${icon('people')}</span>
        <span class="brand-name">Crewline<small>Manager console</small></span>
      </a>
      <nav class="nav" aria-label="Main">
        ${NAV.map((n) => {
          if (!n.id) return `<div class="nav-label">${esc(n.label)}</div>`;
          const count = n.count ? n.count() : 0;
          return `<a class="nav-item ${n.id === page ? 'active' : ''} ${n.external ? 'external' : ''}" href="${n.href}" ${n.external ? 'target="_blank" rel="noopener"' : ''} ${n.id === page ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(n.label)}</span>${count ? `<em class="count">${count}</em>` : ''}${n.external ? icon('open-outline', 'ext') : ''}</a>`;
        }).join('')}
      </nav>
      <div class="sidebar-foot">
        <div class="user-card" id="userCard" tabindex="0">${avatar(manager, 'md')}<div><div class="name">${esc(manager.name)}</div><div class="role">${esc(Store.position(manager.positionId).name)}</div></div>${icon('chevron-expand-outline')}</div>
      </div>`;

    const today = new Date();
    topbar.innerHTML = `
      <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Open menu">${icon('menu-outline')}</button>
      <label class="search" id="globalSearch">${icon('search-outline')}<input type="search" placeholder="Search employees, pages…" autocomplete="off" aria-label="Search"><kbd>/</kbd></label>
      <div class="spacer"></div>
      <div class="date-pill">${icon('calendar-clear-outline')}${today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
      <button class="icon-btn" id="notifBtn" aria-label="Notifications">${icon('notifications-outline')}<span class="dot" id="notifDot"></span></button>
      <a class="icon-btn" href="settings.html" aria-label="Settings" title="Settings">${icon('settings-outline')}</a>
      <div class="topbar-user" id="topbarUser" tabindex="0">${avatar(manager, 'sm')}<div><div class="name">${esc(manager.name)}</div><div class="role">${esc(Store.position(manager.positionId).name)}</div></div>${icon('chevron-down-outline')}</div>`;

    document.title = `${PAGE_TITLES[page] || 'Crewline'} · Crewline`;

    // Notifications
    const notifs = Store.notifications(manager.id);
    $('#notifDot').hidden = notifs.length === 0;
    $('#notifBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleNotifs($('#notifBtn')); });

    // User menu
    const userMenu = (anchor) => UI.menu(anchor, [
      { type: 'label', label: manager.email },
      { label: 'Profile & settings', icon: 'person-outline', onClick: () => (location.href = 'settings.html') },
      { label: 'Open employee app', icon: 'phone-portrait-outline', onClick: () => window.open('../employee/index.html', '_blank') },
      { label: 'Open kiosk', icon: 'tablet-landscape-outline', onClick: () => window.open('../kiosk/index.html', '_blank') },
      'divider',
      { label: 'Reset demo data', icon: 'refresh-outline', onClick: resetDemo },
      { label: 'Sign out', icon: 'log-out-outline', onClick: () => (location.href = '../index.html') },
    ]);
    $('#topbarUser').addEventListener('click', (e) => { e.stopPropagation(); userMenu($('#topbarUser')); });
    $('#userCard').addEventListener('click', (e) => { e.stopPropagation(); UI.menu($('#userCard'), [
      { type: 'label', label: manager.email },
      { label: 'Profile & settings', icon: 'person-outline', onClick: () => (location.href = 'settings.html') },
      { label: 'Reset demo data', icon: 'refresh-outline', onClick: resetDemo },
      { label: 'Sign out', icon: 'log-out-outline', onClick: () => (location.href = '../index.html') },
    ], { align: 'left' }); });

    // Mobile sidebar
    $('#menuToggle').addEventListener('click', () => {
      sidebar.classList.add('open');
      const bd = el('<div class="sidebar-backdrop"></div>');
      bd.addEventListener('click', () => { sidebar.classList.remove('open'); bd.remove(); });
      document.body.appendChild(bd);
    });

    // Global search
    const input = $('#globalSearch input');
    document.addEventListener('keydown', (e) => { if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); input.focus(); } });
    input.addEventListener('input', () => showSearch(input));
    input.addEventListener('focus', () => showSearch(input));
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.blur(); closeSearch(); } if (e.key === 'Enter') { const first = $('.search-results button'); first && first.click(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('#globalSearch') && !e.target.closest('.search-results')) closeSearch(); });
  }

  let notifPanel = null;
  function toggleNotifs(anchor) {
    if (notifPanel) { closeNotifs(); return; }
    UI.closeMenus();
    const manager = Store.manager();
    const notifs = Store.notifications(manager.id);
    notifPanel = el(`<div class="notif-panel" role="dialog" aria-label="Notifications">
      <div class="head">Notifications <span id="notifClear">Mark all read</span></div>
      <div class="list" style="max-height:420px;overflow:auto">${notifs.length ? notifs.map((n) => `<a class="list-item" href="${n.href}"><span class="list-icon ${n.tone}">${icon(n.icon)}</span><div class="grow"><div class="t">${n.text}</div><div class="d">${relative(n.at)}</div></div></a>`).join('') : `<div class="empty">${icon('checkmark-done-outline')}<div class="t">You're all caught up</div></div>`}</div>
    </div>`);
    document.body.appendChild(notifPanel);
    const r = anchor.getBoundingClientRect();
    notifPanel.style.top = `${r.bottom + 8}px`; notifPanel.style.left = `${Math.max(8, Math.min(r.right - notifPanel.offsetWidth, window.innerWidth - notifPanel.offsetWidth - 8))}px`;
    $('#notifClear', notifPanel).addEventListener('click', () => { const v = Store.data.session.managerId; const { channels, dms } = Store.channelsFor(v); [...channels, ...dms].forEach((c) => Store.markRead(v, c.id)); closeNotifs(); $('#notifDot').hidden = true; UI.toast('All notifications marked as read', { type: 'info' }); });
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(e) { if (notifPanel && !notifPanel.contains(e.target)) closeNotifs(); }
  function closeNotifs() { if (notifPanel) { notifPanel.remove(); notifPanel = null; } document.removeEventListener('click', onDocClick); }

  function showSearch(input) {
    const q = input.value.trim().toLowerCase();
    closeSearch();
    if (!q) return;
    const people = Store.employees().filter((e) => e.name.toLowerCase().includes(q) || Store.position(e.positionId).name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)).slice(0, 5);
    const pages = NAV.filter((n) => n.id && !n.external && n.label.toLowerCase().includes(q));
    const box = el(`<div class="menu search-results" style="min-width:340px;transform-origin:top left"></div>`);
    if (people.length) box.appendChild(el('<div class="menu-label">People</div>'));
    people.forEach((p) => { const b = el(`<button>${avatar(p, 'xs')}<span>${esc(p.name)}</span><span class="subtle" style="margin-left:auto;font-size:12px">${esc(Store.position(p.positionId).name)}</span></button>`); b.addEventListener('click', () => (location.href = `employees.html?q=${encodeURIComponent(p.name)}`)); box.appendChild(b); });
    if (pages.length) box.appendChild(el('<div class="menu-label">Pages</div>'));
    pages.forEach((p) => { const b = el(`<button>${icon(p.icon)}<span>${esc(p.label)}</span></button>`); b.addEventListener('click', () => (location.href = p.href)); box.appendChild(b); });
    if (!people.length && !pages.length) box.appendChild(el(`<div class="menu-label">No results for “${esc(q)}”</div>`));
    document.body.appendChild(box);
    const r = input.closest('.search').getBoundingClientRect();
    box.style.left = `${r.left}px`; box.style.top = `${r.bottom + 6}px`;
  }
  function closeSearch() { $$('.search-results').forEach((n) => n.remove()); }

  async function resetDemo() {
    const ok = await UI.confirm({ title: 'Reset demo data?', message: 'This restores the sample company, schedules, time entries and messages. Anything you changed in the demo will be lost.', confirmText: 'Reset demo', tone: 'danger', iconName: 'refresh-outline' });
    if (!ok) return;
    Store.reset();
    UI.toast('Demo data has been reset', { type: 'info' });
    setTimeout(() => location.reload(), 600);
  }

  document.addEventListener('DOMContentLoaded', () => { render(); UI.reveal(); UI.bindSwitches(); });
  global.Shell = { render, resetDemo, NAV };
})(window);
